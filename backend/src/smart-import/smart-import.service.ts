import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ImportStatus } from '@prisma/client';
import { lastValueFrom } from 'rxjs';
import { v2 as cloudinary } from 'cloudinary';

import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { SmartImportRepository } from './smart-import.repository';
import { ConfirmProductDto } from './dto/confirm.dto';

@Injectable()
export class SmartImportService {
    private readonly logger = new Logger(SmartImportService.name);
    private readonly pythonServiceUrl: string;

    constructor(
        private readonly repo: SmartImportRepository,
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
        private readonly searchService: SearchService,
        private readonly configService: ConfigService,
    ) {
        this.pythonServiceUrl =
            this.configService.get<string>('PYTHON_SERVICE_URL') ||
            'http://localhost:8000';

        cloudinary.config({
            cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
        });
    }

    // ─── Phase 3: Upload ────────────────────────────────────────────────────────

    async upload(businessId: string, file: Express.Multer.File) {
        this.logger.log(`Starting smart import upload for business ${businessId}`);

        // 1. Upload image to Cloudinary (no transformation — keep full resolution for OCR)
        const fileUrl = await this.uploadToCloudinay(file);
        this.logger.log(`Catalog image uploaded to Cloudinary: ${fileUrl}`);

        // 2. Create import job
        const job = await this.repo.createJob(businessId, fileUrl);
        this.logger.log(`SmartImportJob created: ${job.id}`);

        // 3. Fetch business categories for Python service
        const categories = await this.prisma.category.findMany({
            where: { businessId },
            select: { id: true, name: true },
            orderBy: { displayOrder: 'asc' },
        });

        // 4. Fire-and-forget: call Python service, update status in background
        this.processCatalogAsync(job.id, fileUrl, categories).catch((err) =>
            this.logger.error(`Background processing failed for job ${job.id}`, err),
        );

        // 5. Mark as PROCESSING and return immediately
        await this.repo.updateJobStatus(job.id, ImportStatus.PROCESSING);

        return { jobId: job.id };
    }

    private async uploadToCloudinay(file: Express.Multer.File): Promise<string> {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'catalog-imports', quality: 'auto' },
                (error, result) => {
                    if (error) return reject(error);
                    if (result) return resolve(result.secure_url);
                    reject(new Error('No result from Cloudinary'));
                },
            );
            stream.end(file.buffer);
        });
    }

    private async processCatalogAsync(
        jobId: string,
        fileUrl: string,
        categories: { id: string; name: string }[],
    ) {
        try {
            this.logger.log(`Calling Python AI service for job ${jobId}`);

            const response = await lastValueFrom(
                this.httpService.post(
                    `${this.pythonServiceUrl}/process-image`,
                    { imageUrl: fileUrl, categories },
                    { timeout: 120_000 },
                ),
            );

            const resultJson = response.data;
            this.logger.log(
                `Python service returned ${resultJson?.products?.length ?? 0} products for job ${jobId}`,
            );

            await this.repo.updateJobStatus(
                jobId,
                ImportStatus.READY_FOR_REVIEW,
                resultJson,
            );
        } catch (error) {
            this.logger.error(
                `Python service call failed for job ${jobId}: ${error.message}`,
            );
            await this.repo.updateJobStatus(jobId, ImportStatus.FAILED);
        }
    }

    // ─── Phase 4: Get Job Status ────────────────────────────────────────────────

    async getJob(jobId: string, businessId: string) {
        const job = await this.repo.findJobById(jobId, businessId);
        if (!job) {
            throw new NotFoundException(`Import job ${jobId} not found`);
        }
        return {
            jobId: job.id,
            status: job.status,
            fileUrl: job.fileUrl,
            resultJson: job.resultJson,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        };
    }

    // ─── Phase 5: Confirm Import ────────────────────────────────────────────────

    async confirmImport(
        jobId: string,
        businessId: string,
        products: ConfirmProductDto[],
    ) {
        const job = await this.repo.findJobById(jobId, businessId);
        if (!job) {
            throw new NotFoundException(`Import job ${jobId} not found`);
        }

        if (
            job.status !== ImportStatus.READY_FOR_REVIEW &&
            job.status !== ImportStatus.COMPLETED
        ) {
            throw new BadRequestException(
                `Job is not ready for confirmation (current status: ${job.status})`,
            );
        }

        if (products.length === 0) {
            throw new BadRequestException('No products provided for import');
        }

        if (products.length > 20) {
            throw new BadRequestException('Maximum 20 products per import');
        }

        this.logger.debug(`Incoming products payload: ${JSON.stringify(products)}`);

        // Each product must have either an existing categoryId or a new category name
        const missingCategory = products.filter(
            (p) => !p.categoryId && !p.newCategoryName?.trim(),
        );
        if (missingCategory.length > 0) {
            this.logger.debug(`Found ${missingCategory.length} missing categories. First invalid product: ${JSON.stringify(missingCategory[0])}`);
            throw new BadRequestException(
                `${missingCategory.length} product(s) are missing a category assignment`,
            );
        }

        this.logger.log(
            `Confirming import for job ${jobId}: creating ${products.length} products`,
        );

        // ── Step 1: Verify existing categoryIds belong to this business ────────
        const existingCategoryIds = [
            ...new Set(products.filter((p) => p.categoryId).map((p) => p.categoryId!)),
        ];

        if (existingCategoryIds.length > 0) {
            const validCategories = await this.prisma.category.findMany({
                where: { id: { in: existingCategoryIds }, businessId },
                select: { id: true },
            });
            const validIdSet = new Set(validCategories.map((c) => c.id));
            const invalid = existingCategoryIds.filter((id) => !validIdSet.has(id));
            if (invalid.length > 0) {
                throw new BadRequestException(
                    `Invalid or unauthorized category IDs: ${invalid.join(', ')}`,
                );
            }
        }

        // ── Step 2: Create new categories (deduplicated by name) ───────────────
        const newCategoryNames = [
            ...new Set(
                products
                    .filter((p) => !p.categoryId && p.newCategoryName?.trim())
                    .map((p) => p.newCategoryName!.trim()),
            ),
        ];

        const newCategoryMap = new Map<string, string>(); // name → categoryId

        for (const rawName of newCategoryNames) {
            const name = rawName.trim();
            const slug = this.generateSlug(name);

            // Upsert: reuse if the slug already exists for this business
            const existing = await this.prisma.category.findUnique({
                where: { businessId_slug: { businessId, slug } },
            });

            if (existing) {
                this.logger.log(
                    `Category '${name}' already exists → reusing id ${existing.id}`,
                );
                newCategoryMap.set(name, existing.id);
            } else {
                const created = await this.prisma.category.create({
                    data: { businessId, name, slug, displayOrder: 0 },
                });
                this.logger.log(`Created new category '${name}' → ${created.id}`);
                newCategoryMap.set(name, created.id);
            }
        }

        // ── Step 3: Resolve final categoryId for every product ─────────────────
        const resolvedProducts = products.map((p) => ({
            ...p,
            categoryId: p.categoryId ?? newCategoryMap.get(p.newCategoryName!.trim())!,
        }));

        // ── Step 4: Create products ────────────────────────────────────────────
        const createdProducts = await Promise.all(
            resolvedProducts.map((p) =>
                this.prisma.product.create({
                    data: {
                        businessId,
                        categoryId: p.categoryId,
                        name: p.name,
                        price: p.price,
                        line1: p.line1 ?? null,
                        line2: p.line2 ?? null,
                        line3: p.line3 ?? null,
                        imageUrls: p.imageUrls ?? [],
                    },
                    include: { category: true },
                }),
            ),
        );

        // ── Step 5: Trigger embeddings (non-blocking) ──────────────────────────
        createdProducts.forEach((product) => {
            this.searchService
                .indexProduct(product.id)
                .catch((err) =>
                    this.logger.error(`Embedding failed for product ${product.id}`, err),
                );
        });

        await this.repo.updateJobStatus(jobId, ImportStatus.COMPLETED);

        this.logger.log(
            `Import job ${jobId} done — ${createdProducts.length} products, ${newCategoryMap.size} new categories`,
        );

        return {
            imported: createdProducts.length,
            newCategoriesCreated: newCategoryMap.size,
            products: createdProducts,
        };
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
}
