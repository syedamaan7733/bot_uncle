import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessService } from '../business/business.service';
import { SmartImportService } from './smart-import.service';
import { ConfirmImportDto } from './dto/confirm.dto';
import { BillableAction } from '../billing/billing.decorator';
import { BillingActions } from '../billing/billing.constants';

@Controller('smart-import')
@UseGuards(JwtAuthGuard)
export class SmartImportController {
  private readonly logger = new Logger(SmartImportController.name);

  constructor(
    private readonly smartImportService: SmartImportService,
    private readonly businessService: BusinessService,
  ) {}

  private async getBusinessId(req: any): Promise<string> {
    let businessId = req.user.businessId;
    if (!businessId) {
      const business = await this.businessService.findByUserId(req.user.userId);
      businessId = business?.id;
    }
    if (!businessId) {
      throw new BadRequestException('User has no business associated');
    }
    return businessId;
  }

  /** POST /smart-import/upload */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for catalogs
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype.startsWith('image/') ||
          file.mimetype === 'application/pdf';
        if (!ok) {
          return cb(
            new BadRequestException('Only image or PDF files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async upload(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('A catalog file is required');
    }
    this.logger.log(
      `Received catalog upload: ${file.originalname} (${file.size} bytes)`,
    );
    const businessId = await this.getBusinessId(req);
    return this.smartImportService.upload(businessId, file);
  }

  /** GET /smart-import/:jobId */
  @Get(':jobId')
  async getJob(@Request() req, @Param('jobId') jobId: string) {
    const businessId = await this.getBusinessId(req);
    return this.smartImportService.getJob(jobId, businessId);
  }

  /** POST /smart-import/:jobId/confirm */
  @Post(':jobId/confirm')
  @BillableAction(BillingActions.SMART_IMPORT, {
    unitsResolver: (_req, body: unknown) => {
      const imported =
        body &&
        typeof body === 'object' &&
        'imported' in body &&
        typeof (body as { imported?: unknown }).imported === 'number'
          ? (body as { imported: number }).imported
          : undefined;
      return imported != null && imported > 0 ? imported : 1;
    },
  })
  async confirmImport(
    @Request() req,
    @Param('jobId') jobId: string,
    @Body() confirmImportDto: ConfirmImportDto,
  ) {
    const businessId = await this.getBusinessId(req);
    return this.smartImportService.confirmImport(
      jobId,
      businessId,
      confirmImportDto.products,
    );
  }
}
