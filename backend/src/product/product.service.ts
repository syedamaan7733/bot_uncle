import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { SearchService } from '../search/search.service';

@Injectable()
export class ProductService {
    constructor(
        private prisma: PrismaService,
        private searchService: SearchService
    ) { }

    async create(businessId: string, createProductDto: CreateProductDto) {
        const { categoryId, ...productData } = createProductDto;

        // Verify category belongs to business
        const category = await this.prisma.category.findFirst({
            where: { id: categoryId, businessId },
        });

        if (!category) {
            throw new BadRequestException('Category not found or does not belong to your business');
        }

        const product = await this.prisma.product.create({
            data: {
                ...productData,
                businessId,
                categoryId,
                imageUrls: productData.imageUrls || [],
            },
            include: {
                category: true,
            },
        });

        this.searchService.indexProduct(product.id).catch(err => console.error('Indexing failed', err));

        return product;
    }

    async findAll(businessId: string, categoryId?: string) {
        const where: any = { businessId };

        if (categoryId) {
            where.categoryId = categoryId;
        }

        return this.prisma.product.findMany({
            where,
            include: {
                category: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: string, businessId: string) {
        const product = await this.prisma.product.findFirst({
            where: { id, businessId },
            include: {
                category: true,
            },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return product;
    }

    async update(id: string, businessId: string, updateProductDto: UpdateProductDto) {
        // Verify product exists and belongs to business
        await this.findOne(id, businessId);

        // If categoryId is being updated, verify it belongs to business
        if (updateProductDto.categoryId) {
            const category = await this.prisma.category.findFirst({
                where: { id: updateProductDto.categoryId, businessId },
            });

            if (!category) {
                throw new BadRequestException('Category not found or does not belong to your business');
            }
        }

        const product = await this.prisma.product.update({
            where: { id },
            data: updateProductDto,
            include: {
                category: true,
            },
        });

        this.searchService.indexProduct(product.id).catch(err => console.error('Indexing failed', err));

        return product;
    }

    async remove(id: string, businessId: string) {
        // Verify product exists and belongs to business
        await this.findOne(id, businessId);

        return this.prisma.product.delete({
            where: { id },
        });
    }
}
