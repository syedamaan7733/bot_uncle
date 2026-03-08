import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportStatus } from '@prisma/client';

@Injectable()
export class SmartImportRepository {
    private readonly logger = new Logger(SmartImportRepository.name);

    constructor(private readonly prisma: PrismaService) { }

    async createJob(businessId: string, fileUrl: string) {
        return this.prisma.smartImportJob.create({
            data: { businessId, fileUrl },
        });
    }

    async findJobById(jobId: string, businessId: string) {
        return this.prisma.smartImportJob.findFirst({
            where: { id: jobId, businessId },
        });
    }

    async updateJobStatus(
        jobId: string,
        status: ImportStatus,
        resultJson?: any,
    ) {
        const data: any = { status };
        if (resultJson !== undefined) {
            data.resultJson = resultJson;
        }
        return this.prisma.smartImportJob.update({
            where: { id: jobId },
            data,
        });
    }
}
