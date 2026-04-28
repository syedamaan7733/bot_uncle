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
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
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

  @Post('image-description/preview')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new Error('Only image files are allowed'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  @BillableAction(BillingActions.AI_SEARCH)
  async previewImageDescription(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.getBusinessId(req);
    if (!file) {
      throw new BadRequestException('No image file provided');
    }
    return this.productService.previewImageDescription(file);
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
    @Query('skipImageVision') skipImageVision?: string,
  ) {
    if (!files || files.length === 0) {
      throw new Error('No image files provided');
    }

    const businessId = await this.getBusinessId(req);
    const skipVision =
      skipImageVision === 'true' || skipImageVision === '1';
    return this.productService.uploadImages(id, businessId, files, {
      skipImageVisionDescription: skipVision,
    });
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
