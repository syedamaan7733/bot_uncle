import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';
import { BusinessModule } from '../business/business.module';

import { SmartImportController } from './smart-import.controller';
import { SmartImportService } from './smart-import.service';
import { SmartImportRepository } from './smart-import.repository';

@Module({
    imports: [
        PrismaModule,
        SearchModule,
        BusinessModule,
        HttpModule,
    ],
    controllers: [SmartImportController],
    providers: [SmartImportService, SmartImportRepository],
    exports: [SmartImportService],
})
export class SmartImportModule { }
