import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';

@Module({
    imports: [PrismaModule, SearchModule],
    controllers: [StoreController],
    providers: [StoreService],
})
export class StoreModule { }
