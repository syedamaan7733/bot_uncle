import { Controller, Get, HttpException, HttpStatus, Header } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Liveness: process is up (no dependency checks). Use for cheap probes.
   */
  @Get('live')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  getLive() {
    return {
      status: 'ok',
      service: 'bot-uncle-api',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness: verifies database connectivity.
   * 200 when healthy, 503 when database is unreachable.
   */
  @Get()
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  async getHealth() {
    const body = await this.healthService.getHealth();

    if (body.status === 'unhealthy') {
      throw new HttpException(body, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return body;
  }
}
