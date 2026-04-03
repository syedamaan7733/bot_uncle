import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [PrismaModule, SearchModule, BillingModule],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
