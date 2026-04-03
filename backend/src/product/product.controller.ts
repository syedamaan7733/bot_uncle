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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessService } from '../business/business.service';
import { BillableAction } from '../billing/billing.decorator';
import { BillingActions } from '../billing/billing.constants';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly businessService: BusinessService,
  ) {}

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
  @BillableAction(BillingActions.PRODUCT_ADD)
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

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 8))
  async uploadImages(
    @Request() req,
    @Param('id') id: string,
    @UploadedFiles() files: any[],
  ) {
    if (!files || files.length === 0) {
      throw new Error('No image files provided');
    }

    const businessId = await this.getBusinessId(req);
    return this.productService.uploadImages(id, businessId, files);
  }

  @Delete(':id/images')
  async removeImages(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { imageUrls: string[] },
  ) {
    const businessId = await this.getBusinessId(req);
    return this.productService.removeImages(id, businessId, body.imageUrls);
  }
}
