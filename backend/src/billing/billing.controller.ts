import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Request,
  UseGuards,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import type { AuthorizedRequest } from './billing.request-types';
import { PaymentService } from '../payment/payment.service';
import { CreatePaymentDto } from '../payment/dto/create-payment.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  private async resolveActor(req: AuthorizedRequest): Promise<{
    userId: string;
    businessId: string;
  }> {
    const userId = req.user.userId;
    if (!userId) {
      throw new BadRequestException('Unauthorized');
    }
    let businessId = req.user.businessId;
    if (!businessId) {
      const business = await this.prisma.business.findFirst({
        where: { userId },
      });
      businessId = business?.id;
    }
    if (!businessId) {
      throw new BadRequestException('User has no business associated');
    }
    return { userId, businessId };
  }

  @Get('usage')
  async getUsage(
    @Request() req: AuthorizedRequest,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ) {
    const { userId, businessId } = await this.resolveActor(req);
    const limit = Math.min(
      Math.max(parseInt(limitRaw ?? '50', 10) || 50, 1),
      200,
    );
    const offset = Math.max(parseInt(offsetRaw ?? '0', 10) || 0, 0);

    const where = {
      OR: [{ businessId }, { userId }],
    };

    const [items, total] = await Promise.all([
      this.prisma.usageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.usageLog.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  @Get('balance')
  async getBalance(@Request() req: AuthorizedRequest) {
    const { userId, businessId } = await this.resolveActor(req);

    const row =
      (await this.prisma.userBalance.findUnique({
        where: { businessId },
      })) ??
      (await this.prisma.userBalance.findUnique({
        where: { userId },
      }));

    const pendingPayments =
      await this.paymentService.getPendingSummary(businessId);

    return {
      balance: row?.balance ?? 0,
      creditLimit: row?.creditLimit ?? null,
      updatedAt: row?.updatedAt ?? null,
      pendingPayments,
    };
  }

  @Get('payments')
  async getPayments(
    @Request() req: AuthorizedRequest,
    @Query('status') statusRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('offset') offsetRaw?: string,
  ) {
    const { userId, businessId } = await this.resolveActor(req);
    const limit = Math.min(
      Math.max(parseInt(limitRaw ?? '50', 10) || 50, 1),
      200,
    );
    const offset = Math.max(parseInt(offsetRaw ?? '0', 10) || 0, 0);

    let status: PaymentStatus | undefined;
    if (statusRaw) {
      if (!Object.values(PaymentStatus).includes(statusRaw as PaymentStatus)) {
        throw new BadRequestException('Invalid status filter');
      }
      status = statusRaw as PaymentStatus;
    }

    return this.paymentService.listPayments(userId, businessId, {
      status,
      limit,
      offset,
    });
  }

  @Post('payments')
  async createPayment(
    @Request() req: AuthorizedRequest,
    @Body() dto: CreatePaymentDto,
  ) {
    const { userId, businessId } = await this.resolveActor(req);
    return this.paymentService.createPayment(userId, businessId, dto);
  }

  @Patch('pricing')
  async updatePricing(
    @Request() req: AuthorizedRequest,
    @Body() dto: UpdatePricingDto,
  ) {
    const { businessId, userId } = await this.resolveActor(req);

    const isActive = dto.isActive ?? true;

    if (businessId) {
      return this.prisma.pricingConfig.upsert({
        where: {
          businessId_action: {
            businessId,
            action: dto.action,
          },
        },
        create: {
          businessId,
          action: dto.action,
          pricePerUnit: dto.pricePerUnit,
          isActive,
        },
        update: {
          pricePerUnit: dto.pricePerUnit,
          isActive,
        },
      });
    }

    return this.prisma.pricingConfig.upsert({
      where: {
        userId_action: {
          userId,
          action: dto.action,
        },
      },
      create: {
        userId,
        action: dto.action,
        pricePerUnit: dto.pricePerUnit,
        isActive,
      },
      update: {
        pricePerUnit: dto.pricePerUnit,
        isActive,
      },
    });
  }
}
