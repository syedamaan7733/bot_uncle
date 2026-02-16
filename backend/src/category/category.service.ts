import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
    constructor(private prisma: PrismaService) { }

    async create(businessId: string, createCategoryDto: CreateCategoryDto) {
        const { name, displayOrder } = createCategoryDto;
        const slug = this.generateSlug(name);

        // Check if category with same slug exists for this business
        const existing = await this.prisma.category.findUnique({
            where: {
                businessId_slug: {
                    businessId,
                    slug,
                },
            },
        });

        if (existing) {
            throw new ConflictException('Category with this name already exists');
        }

        return this.prisma.category.create({
            data: {
                businessId,
                name,
                slug,
                displayOrder: displayOrder || 0,
            },
        });
    }

    async findAll(businessId: string) {
        return this.prisma.category.findMany({
            where: { businessId },
            orderBy: { displayOrder: 'asc' },
            include: {
                _count: {
                    select: { products: true },
                },
            },
        });
    }

    async findOne(id: string, businessId: string) {
        const category = await this.prisma.category.findFirst({
            where: { id, businessId },
            include: {
                products: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!category) {
            throw new NotFoundException('Category not found');
        }

        return category;
    }

    async update(id: string, businessId: string, updateCategoryDto: UpdateCategoryDto) {
        // Verify category exists and belongs to business
        await this.findOne(id, businessId);

        const updateData: any = {};

        if (updateCategoryDto.name) {
            updateData.name = updateCategoryDto.name;
            updateData.slug = this.generateSlug(updateCategoryDto.name);
        }

        if (updateCategoryDto.displayOrder !== undefined) {
            updateData.displayOrder = updateCategoryDto.displayOrder;
        }

        return this.prisma.category.update({
            where: { id },
            data: updateData,
        });
    }

    async remove(id: string, businessId: string) {
        // Verify category exists and belongs to business
        await this.findOne(id, businessId);

        return this.prisma.category.delete({
            where: { id },
        });
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
}
