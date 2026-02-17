import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class StoreService {
    constructor(
        private prisma: PrismaService,
        private searchService: SearchService,
    ) { }

    async getBusiness(slug: string) {
        const business = await this.prisma.business.findUnique({
            where: { slug },
            select: {
                id: true,
                name: true,
                slug: true,
                whatsappNumber: true,
                logoUrl: true,
            },
        });

        if (!business) {
            throw new NotFoundException('Store not found');
        }

        return business;
    }

    async getCategories(slug: string) {
        const business = await this.prisma.business.findUnique({
            where: { slug },
        });

        if (!business) {
            throw new NotFoundException('Store not found');
        }

        return this.prisma.category.findMany({
            where: { businessId: business.id },
            orderBy: { displayOrder: 'asc' },
            include: {
                _count: {
                    select: { products: true },
                },
            },
        });
    }

    async getProducts(slug: string, categoryId?: string, search?: string) {
        const business = await this.prisma.business.findUnique({
            where: { slug },
        });

        if (!business) {
            throw new NotFoundException('Store not found');
        }

        // If search query provided, use semantic search
        if (search && search.trim()) {
            const searchResults = await this.searchService.search(business.id, search.trim(), categoryId);
            return searchResults.map(result => result.product);
        }

        // Otherwise, return products with optional category filter
        const where: any = {
            businessId: business.id,
            isActive: true,
        };

        if (categoryId) {
            // Verify category belongs to business
            const category = await this.prisma.category.findFirst({
                where: { id: categoryId, businessId: business.id }
            });
            if (category) {
                where.categoryId = categoryId;
            }
        }

        return this.prisma.product.findMany({
            where,
            include: {
                category: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async searchByImage(slug: string, imageFile: Express.Multer.File, categoryId?: string) {
        const business = await this.prisma.business.findUnique({
            where: { slug },
        });

        if (!business) {
            throw new NotFoundException('Store not found');
        }

        // Generate text description from image
        const imageDescription = await this.searchService.generateImageDescriptionFromFile(imageFile);

        // Search using the generated description
        const searchResults = await this.searchService.search(business.id, imageDescription, categoryId);

        return {
            searchText: imageDescription,
            products: searchResults.map(result => result.product),
        };
    }
}
