import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoryModule } from '../category/category.module';
import { ProductModule } from '../product/product.module';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [
        PrismaModule,
        HttpModule,
        CategoryModule,
        ProductModule
    ],
    controllers: [WhatsappController],
    providers: [WhatsappService],
    exports: [WhatsappService],
})
export class WhatsappModule { }
