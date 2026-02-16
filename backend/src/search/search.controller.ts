import { Controller, Get, Query, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessService } from '../business/business.service';

@Controller('search')
export class SearchController {
    constructor(
        private readonly searchService: SearchService,
        private readonly businessService: BusinessService
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    async search(@Request() req, @Query('q') query: string) {
        if (!query) {
            throw new BadRequestException('Query parameter "q" is required');
        }

        // Fallback logic for businessId (from previous fix)
        let businessId = req.user.businessId;
        if (!businessId) {
            const business = await this.businessService.findByUserId(req.user.userId);
            businessId = business?.id;
        }
        if (!businessId) {
            throw new BadRequestException('User has no business associated');
        }

        const results = await this.searchService.search(businessId, query);
        // map results to return product and score
        return results.map(r => ({
            ...r.product,
            _score: r.score
        }));
    }
}
