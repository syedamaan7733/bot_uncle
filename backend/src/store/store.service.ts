import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoreService {
    constructor(private prisma: PrismaService) { }

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

        // Simple search (name contains) - Phase 4 will add vector search
        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        return this.prisma.product.findMany({
            where,
            include: {
                category: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
