import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { CloudinaryService } from './cloudinary.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [BusinessController],
    providers: [BusinessService, CloudinaryService],
    exports: [BusinessService, CloudinaryService],
})
export class BusinessModule { }
