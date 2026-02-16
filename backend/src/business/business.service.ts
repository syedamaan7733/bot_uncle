import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
    constructor(private prisma: PrismaService) { }

    async findOne(id: string) {
        return this.prisma.business.findUnique({
            where: { id },
        });
    }

    async findByUserId(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { businesses: true },
        });
        return user?.businesses[0];
    }

    async update(id: string, updateBusinessDto: UpdateBusinessDto) {
        // Check if slug is taken by another business if it's being updated
        if (updateBusinessDto.slug) {
            const existing = await this.prisma.business.findFirst({
                where: {
                    slug: updateBusinessDto.slug,
                    NOT: { id },
                },
            });
            if (existing) {
                throw new BadRequestException('Business slug is already taken');
            }
        }

        return this.prisma.business.update({
            where: { id },
            data: updateBusinessDto,
        });
    }
}
