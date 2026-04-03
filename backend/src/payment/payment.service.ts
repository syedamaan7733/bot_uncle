import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentSource, PaymentStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  private buildReferenceCode(): string {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `PAY-${day}-${suffix}`;
  }

  async assertBusinessOwnedByUser(
    businessId: string,
    userId: string,
  ): Promise<void> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, userId },
      select: { id: true },
    });
    if (!business) {
      throw new ForbiddenException('Business not found for this user');
    }
  }

  async createPayment(
    userId: string,
    businessId: string,
    dto: CreatePaymentDto,
  ) {
    await this.assertBusinessOwnedByUser(businessId, userId);

    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findFirst({
        where: {
          businessId,
          idempotencyKey: dto.idempotencyKey,
          deletedAt: null,
        },
      });
      if (existing) {
        return existing;
      }
    }

    const currency = (dto.currency ?? 'INR').toUpperCase();

    for (let attempt = 0; attempt < 5; attempt++) {
      const referenceCode = this.buildReferenceCode();
      try {
        return await this.prisma.payment.create({
          data: {
            userId,
            businessId,
            amount: dto.amount,
            currency,
            remark: dto.remark ?? null,
            image: dto.image ?? null,
            metadata: dto.metadata as Prisma.InputJsonValue | undefined,
            paymentType: dto.paymentType,
            transactionDetails: dto.transactionDetails as
              | Prisma.InputJsonValue
              | undefined,
            status: PaymentStatus.PENDING,
            referenceCode,
            source: dto.source ?? PaymentSource.MANUAL,
            idempotencyKey: dto.idempotencyKey ?? null,
          },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          continue;
        }
        throw e;
      }
    }

    throw new BadRequestException('Could not allocate a unique reference code');
  }

  async listPayments(
    userId: string,
    businessId: string,
    opts: { status?: PaymentStatus; limit: number; offset: number },
  ) {
    await this.assertBusinessOwnedByUser(businessId, userId);

    const where: Prisma.PaymentWhereInput = {
      businessId,
      deletedAt: null,
      ...(opts.status ? { status: opts.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: opts.limit,
        skip: opts.offset,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, limit: opts.limit, offset: opts.offset };
  }

  async getPendingSummary(businessId: string) {
    const where = {
      businessId,
      status: PaymentStatus.PENDING,
      deletedAt: null,
    };
    const [count, agg] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);
    return {
      count,
      totalAmount: agg._sum.amount ?? 0,
    };
  }

  /**
   * Credits `UserBalance` once. Safe to retry (idempotent) after VERIFIED + processedAt.
   * Not exposed over HTTP in this phase — call from internal jobs / future webhooks.
   */
  async verifyPaymentInternal(params: {
    paymentId: string;
    businessId: string;
    verifiedBy?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const lock = await tx.payment.findFirst({
        where: {
          id: params.paymentId,
          businessId: params.businessId,
          deletedAt: null,
        },
      });
      if (!lock) {
        throw new NotFoundException('Payment not found');
      }
      if (lock.status === PaymentStatus.VERIFIED && lock.processedAt) {
        return lock;
      }
      if (lock.status !== PaymentStatus.PENDING) {
        throw new BadRequestException(
          `Payment cannot be verified (status=${lock.status})`,
        );
      }

      const updated = await tx.payment.updateMany({
        where: {
          id: params.paymentId,
          businessId: params.businessId,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.VERIFIED,
          verifiedAt: new Date(),
          verifiedBy: params.verifiedBy ?? 'system',
          processedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        const again = await tx.payment.findUnique({
          where: { id: params.paymentId },
        });
        if (again?.status === PaymentStatus.VERIFIED && again.processedAt) {
          return again;
        }
        throw new BadRequestException('Payment verify race — retry');
      }

      await tx.userBalance.upsert({
        where: { businessId: params.businessId },
        create: {
          businessId: params.businessId,
          balance: lock.amount,
        },
        update: {
          balance: { increment: lock.amount },
        },
      });

      return tx.payment.findUniqueOrThrow({
        where: { id: params.paymentId },
      });
    });
  }

  /**
   * Internal-only reject path (no balance change).
   */
  async rejectPaymentInternal(params: {
    paymentId: string;
    businessId: string;
    rejectionReason?: string;
  }) {
    const lock = await this.prisma.payment.findFirst({
      where: {
        id: params.paymentId,
        businessId: params.businessId,
        deletedAt: null,
      },
    });
    if (!lock) {
      throw new NotFoundException('Payment not found');
    }
    if (lock.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment cannot be rejected (status=${lock.status})`,
      );
    }

    return this.prisma.payment.update({
      where: { id: params.paymentId },
      data: {
        status: PaymentStatus.REJECTED,
        rejectionReason: params.rejectionReason ?? null,
      },
    });
  }
}
