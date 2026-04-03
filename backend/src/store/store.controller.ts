import { Controller, Get, Param, Query, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { StoreService } from './store.service';
import { BillableAction } from '../billing/billing.decorator';
import { BillingActions } from '../billing/billing.constants';

// Note: This controller is public, so no @UseGuards(JwtAuthGuard)
@Controller('store')
export class StoreController {
    constructor(private readonly storeService: StoreService) { }

    @Get(':slug')
    getBusiness(@Param('slug') slug: string) {
        return this.storeService.getBusiness(slug);
    }

    @Get(':slug/categories')
    getCategories(@Param('slug') slug: string) {
        return this.storeService.getCategories(slug);
    }

    @Get(':slug/products')
    getProducts(
        @Param('slug') slug: string,
        @Query('categoryId') categoryId?: string,
        @Query('search') search?: string,
    ) {
        return this.storeService.getProducts(slug, categoryId, search);
    }

    @Post(':slug/image-search')
    @UseInterceptors(FileInterceptor('image', {
        storage: multer.memoryStorage(),
        limits: {
            fileSize: 5 * 1024 * 1024, // 5MB limit
        },
        fileFilter: (req, file, callback) => {
            if (!file.mimetype.startsWith('image/')) {
                return callback(new Error('Only image files are allowed'), false);
            }
            callback(null, true);
        },
    }))
    @BillableAction(BillingActions.IMAGE_SEARCH, {
        actorFromStoreSlug: true,
    })
    async searchByImage(
        @Param('slug') slug: string,
        @UploadedFile() file: Express.Multer.File,
        @Query('categoryId') categoryId?: string,
    ) {
        return this.storeService.searchByImage(slug, file, categoryId);
    }
}
