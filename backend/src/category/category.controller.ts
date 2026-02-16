import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessService } from '../business/business.service';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
    constructor(
        private readonly categoryService: CategoryService,
        private readonly businessService: BusinessService
    ) { }

    private async getBusinessId(req: any): Promise<string> {
        let businessId = req.user.businessId;
        if (!businessId) {
            const business = await this.businessService.findByUserId(req.user.userId);
            businessId = business?.id;
        }
        if (!businessId) {
            throw new Error('User has no business associated');
        }
        return businessId;
    }

    @Post()
    async create(@Request() req, @Body() createCategoryDto: CreateCategoryDto) {
        const businessId = await this.getBusinessId(req);
        return this.categoryService.create(businessId, createCategoryDto);
    }

    @Get()
    async findAll(@Request() req) {
        const businessId = await this.getBusinessId(req);
        return this.categoryService.findAll(businessId);
    }

    @Get(':id')
    async findOne(@Request() req, @Param('id') id: string) {
        const businessId = await this.getBusinessId(req);
        return this.categoryService.findOne(id, businessId);
    }

    @Patch(':id')
    async update(
        @Request() req,
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ) {
        const businessId = await this.getBusinessId(req);
        return this.categoryService.update(id, businessId, updateCategoryDto);
    }

    @Delete(':id')
    async remove(@Request() req, @Param('id') id: string) {
        const businessId = await this.getBusinessId(req);
        return this.categoryService.remove(id, businessId);
    }
}
