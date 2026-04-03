import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_PRICE_PER_UNIT } from './billing.constants';
import type { ChargeUserParams } from './billing.types';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fire-and-forget safe wrapper: never throws; logs errors.
   */
  async safeCharge(params: ChargeUserParams): Promise<void> {
    try {
      await this.chargeUser(params);
    } catch (err) {
      this.logger.error(
        `Billing safeCharge failed (action=${params.action}): ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  async chargeUser(params: ChargeUserParams): Promise<{
    usageLogId: string;
    totalCost: number;
    costPerUnit: number;
    units: number;
  }> {
    const {
      userId: rawUserId,
      businessId: rawBusinessId,
      action,
      units: rawUnits = 1,
      metadata = {},
    } = params;

    const userId = rawUserId ?? undefined;
    const businessId = rawBusinessId ?? undefined;

    if (!userId && !businessId) {
      throw new Error('chargeUser requires userId and/or businessId');
    }

    const units = Number(rawUnits);
    if (!Number.isFinite(units) || units <= 0) {
      throw new Error(`Invalid billing units: ${rawUnits}`);
    }

    const costPerUnit = await this.resolvePricePerUnit(
      action,
      businessId,
      userId,
    );
    const totalCost = units * costPerUnit;

    return this.prisma.$transaction(async (tx) => {
      const log = await tx.usageLog.create({
        data: {
          userId: userId ?? null,
          businessId: businessId ?? null,
          action,
          units,
          costPerUnit,
          totalCost,
          metadata:
            metadata && Object.keys(metadata).length
              ? (metadata as object)
              : undefined,
        },
      });

      if (businessId) {
        await tx.userBalance.upsert({
          where: { businessId },
          create: {
            businessId,
            balance: -totalCost,
          },
          update: {
            balance: { decrement: totalCost },
          },
        });
      } else if (userId) {
        await tx.userBalance.upsert({
          where: { userId },
          create: {
            userId,
            balance: -totalCost,
          },
          update: {
            balance: { decrement: totalCost },
          },
        });
      }

      return {
        usageLogId: log.id,
        totalCost,
        costPerUnit,
        units,
      };
    });
  }

  /** Precedence: business pricing → user pricing → hardcoded defaults */
  async resolvePricePerUnit(
    action: string,
    businessId?: string,
    userId?: string,
  ): Promise<number> {
    if (businessId) {
      const row = await this.prisma.pricingConfig.findFirst({
        where: { businessId, action, isActive: true },
      });
      if (row) return row.pricePerUnit;
    }
    if (userId) {
      const row = await this.prisma.pricingConfig.findFirst({
        where: { userId, action, isActive: true },
      });
      if (row) return row.pricePerUnit;
    }
    const fallback = DEFAULT_PRICE_PER_UNIT[action];
    if (fallback == null) {
      this.logger.warn(
        `No PricingConfig or default for action=${action}; using 0`,
      );
      return 0;
    }
    return fallback;
  }

  async resolveActorFromStoreSlug(slug: string | undefined): Promise<{
    businessId?: string;
    userId?: string;
  }> {
    if (!slug) return {};
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: { id: true, userId: true },
    });
    if (!business) return {};
    return { businessId: business.id, userId: business.userId };
  }
}
