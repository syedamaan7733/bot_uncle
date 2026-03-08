import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { StoreModule } from './store/store.module';
import { BusinessModule } from './business/business.module';
import { SearchModule } from './search/search.module';
import { SmartImportModule } from './smart-import/smart-import.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    CategoryModule,
    ProductModule,
    WhatsappModule,
    StoreModule,
    BusinessModule,
    SearchModule,
    SmartImportModule,
  ],
})
export class AppModule { }
