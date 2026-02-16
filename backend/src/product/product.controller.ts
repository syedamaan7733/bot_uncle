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
    Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessService } from '../business/business.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
    constructor(
        private readonly productService: ProductService,
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
    async create(@Request() req, @Body() createProductDto: CreateProductDto) {
        const businessId = await this.getBusinessId(req);
        return this.productService.create(businessId, createProductDto);
    }

    @Get()
    async findAll(@Request() req, @Query('categoryId') categoryId?: string) {
        const businessId = await this.getBusinessId(req);
        return this.productService.findAll(businessId, categoryId);
    }

    @Get(':id')
    async findOne(@Request() req, @Param('id') id: string) {
        const businessId = await this.getBusinessId(req);
        return this.productService.findOne(id, businessId);
    }

    @Patch(':id')
    async update(
        @Request() req,
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
    ) {
        const businessId = await this.getBusinessId(req);
        return this.productService.update(id, businessId, updateProductDto);
    }

    @Delete(':id')
    async remove(@Request() req, @Param('id') id: string) {
        const businessId = await this.getBusinessId(req);
        return this.productService.remove(id, businessId);
    }
}
