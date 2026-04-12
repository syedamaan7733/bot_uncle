import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type HealthCheckStatus = 'up' | 'down';

export interface HealthCheckDetail {
  status: HealthCheckStatus;
  latencyMs?: number;
  error?: string;
}

export interface HealthResponseBody {
  status: 'healthy' | 'unhealthy';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckDetail;
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponseBody> {
    const database = await this.checkDatabase();

    const healthy = database.status === 'up';

    return {
      status: healthy ? 'healthy' : 'unhealthy',
      service: 'bot-uncle-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      version: process.env.SERVICE_VERSION ?? '0.0.1',
      environment: process.env.NODE_ENV ?? 'development',
      checks: {
        database,
      },
    };
  }

  private async checkDatabase(): Promise<HealthCheckDetail> {
    const started = Date.now();
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'up', latencyMs: Date.now() - started };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return { status: 'down', error: message };
    }
  }
}
