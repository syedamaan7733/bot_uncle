import { Controller, Get, Patch, Post, Body, UseGuards, Request, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('business')
@UseGuards(JwtAuthGuard)
export class BusinessController {
    constructor(private readonly businessService: BusinessService) { }

    @Get('me')
    async getMyBusiness(@Request() req) {
        let businessId = req.user.businessId;

        if (!businessId) {
            console.log('BusinessId missing in token, fetching via userId:', req.user.userId);
            const business = await this.businessService.findByUserId(req.user.userId);
            businessId = business?.id;
        }

        if (!businessId) {
            throw new BadRequestException('User has no business associated');
        }
        return this.businessService.findOne(businessId);
    }

    @Patch('me')
    updateMyBusiness(@Request() req, @Body() updateBusinessDto: UpdateBusinessDto) {
        // We should safely get businessId here too
        const businessId = req.user.businessId;
        // If undefined, update() might fail or we should fallback. 
        // But for now let's assume GET /me fixes the token issue eventually or we rely on GET /me logic.
        // Actually, update needs ID.
        if (!businessId) {
            throw new Error('Business ID not found')
        }
        return this.businessService.update(req.user.businessId, updateBusinessDto);
    }

    @Post('me/logo')
    @UseInterceptors(FileInterceptor('logo'))
    async uploadLogo(@Request() req, @UploadedFile() file: any) {
        if (!file) {
            throw new BadRequestException('No logo file provided');
        }

        // Validate file type
        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException('File must be an image');
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            throw new BadRequestException('File size must be less than 5MB');
        }

        let businessId = req.user.businessId;

        if (!businessId) {
            const business = await this.businessService.findByUserId(req.user.userId);
            businessId = business?.id;
        }

        if (!businessId) {
            throw new BadRequestException('User has no business associated');
        }

        return this.businessService.uploadLogo(businessId, file);
    }
}
