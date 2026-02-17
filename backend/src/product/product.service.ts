import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { SearchService } from '../search/search.service';
import { CloudinaryService } from '../business/cloudinary.service';

@Injectable()
export class ProductService {
    constructor(
        private prisma: PrismaService,
        private searchService: SearchService,
        private cloudinaryService: CloudinaryService,
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

    async uploadImages(id: string, businessId: string, imageFiles: any[]): Promise<string[]> {
        // Verify product exists and belongs to business
        const product = await this.findOne(id, businessId);

        // Validate file count (max 8 images)
        if (imageFiles.length > 8) {
            throw new BadRequestException('Maximum 8 images allowed per product');
        }

        // Validate files
        for (const file of imageFiles) {
            if (!file.mimetype.startsWith('image/')) {
                throw new BadRequestException('All files must be images');
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB
                throw new BadRequestException('Each image must be less than 5MB');
            }
        }

        try {
            // Upload all images to Cloudinary
            const uploadPromises = imageFiles.map(file =>
                this.cloudinaryService.uploadImage(file, 'product-images')
            );

            const uploadResults = await Promise.all(uploadPromises);
            const imageUrls = uploadResults.map(result => result.secure_url);

            // Update product with new image URLs
            await this.prisma.product.update({
                where: { id },
                data: { imageUrls } as any,
            });

            // Re-index for search
            this.searchService.indexProduct(id).catch(err => console.error('Indexing failed', err));

            return imageUrls;
        } catch (error) {
            throw new BadRequestException('Failed to upload images');
        }
    }

    async removeImages(id: string, businessId: string, imageUrlsToRemove: string[]) {
        // Verify product exists and belongs to business
        const product = await this.findOne(id, businessId);

        // Delete images from Cloudinary
        const deletePromises = imageUrlsToRemove.map(async (url) => {
            try {
                const publicId = this.extractPublicIdFromUrl(url);
                if (publicId) {
                    await this.cloudinaryService.deleteImage(publicId);
                }
            } catch (error) {
                console.warn(`Failed to delete image ${url}:`, error);
            }
        });

        await Promise.all(deletePromises);

        // Update product by removing the deleted image URLs
        const remainingImages = (product as any).imageUrls.filter((url: string) =>
            !imageUrlsToRemove.includes(url)
        );

        await this.prisma.product.update({
            where: { id },
            data: { imageUrls: remainingImages } as any,
        });

        // Re-index for search
        this.searchService.indexProduct(id).catch(err => console.error('Indexing failed', err));

        return remainingImages;
    }

    private extractPublicIdFromUrl(url: string): string | null {
        try {
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const publicId = `product-images/${fileName.split('.')[0]}`;
            return publicId;
        } catch {
            return null;
        }
    }
}
