import { Controller, Get, Param, Query } from '@nestjs/common';
import { StoreService } from './store.service';

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
}
