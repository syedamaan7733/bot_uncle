import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import * as multer from 'multer';

@Injectable()
export class BusinessService {
    constructor(
        private prisma: PrismaService,
        private cloudinaryService: CloudinaryService,
    ) { }

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
        console.log(updateBusinessDto)
        return this.prisma.business.update({
            where: { id },
            data: updateBusinessDto,
        });
    }

    async uploadLogo(id: string, logoFile: any) {
        // Get current business to check for existing logo
        const business = await this.prisma.business.findUnique({
            where: { id },
        });

        if (!business) {
            throw new BadRequestException('Business not found');
        }

        // Upload new logo to Cloudinary
        const uploadResult = await this.cloudinaryService.uploadImage(logoFile, 'business-logos');

        // Delete old logo if exists
        const businessWithLogo = business as any;
        if (businessWithLogo.logoUrl) {
            try {
                // Extract public_id from Cloudinary URL
                const publicId = this.extractPublicIdFromUrl(businessWithLogo.logoUrl);
                if (publicId) {
                    await this.cloudinaryService.deleteImage(publicId);
                }
            } catch (error) {
                console.warn('Failed to delete old logo:', error);
            }
        }

        // Update business with new logo URL
        return this.prisma.business.update({
            where: { id },
            data: { logoUrl: uploadResult.secure_url } as any,
        });
    }

    private extractPublicIdFromUrl(url: string): string | null {
        try {
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const publicId = `business-logos/${fileName.split('.')[0]}`;
            return publicId;
        } catch {
            return null;
        }
    }
}
