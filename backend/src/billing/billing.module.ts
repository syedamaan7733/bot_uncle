import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingService } from './billing.service';
import { BillingInterceptor } from './billing.interceptor';
import { BillingController } from './billing.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    {
      provide: APP_INTERCEPTOR,
      useClass: BillingInterceptor,
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
