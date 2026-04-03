import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BILLABLE_ACTION_METADATA_KEY } from './billing.constants';
import { BillingService } from './billing.service';
import type { BillableActionMetadata } from './billing.types';
import type { BillableRequest } from './billing.request-types';

@Injectable()
export class BillingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(BillingInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly billing: BillingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<BillableActionMetadata | undefined>(
      BILLABLE_ACTION_METADATA_KEY,
      context.getHandler(),
    );

    if (!meta?.action) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<BillableRequest>();

    return next.handle().pipe(
      tap((responseBody) => {
        void this.runBilling(meta, req, responseBody).catch((err) =>
          this.logger.error(
            `Billing interceptor error: ${(err as Error).message}`,
            (err as Error).stack,
          ),
        );
      }),
    );
  }

  private async runBilling(
    meta: BillableActionMetadata,
    req: BillableRequest,
    responseBody: unknown,
  ): Promise<void> {
    try {
      if (meta.when && !(await meta.when(req, responseBody))) {
        return;
      }

      const units = meta.unitsResolver
        ? await meta.unitsResolver(req, responseBody)
        : 1;

      let actor = this.defaultActor(req);
      if (meta.actorResolver) {
        actor = await meta.actorResolver(req, responseBody);
      } else if (meta.actorFromStoreSlug) {
        const slug =
          typeof req.params?.slug === 'string' ? req.params.slug : undefined;
        actor = await this.billing.resolveActorFromStoreSlug(slug);
      }

      const extraMeta = meta.metadataResolver
        ? await meta.metadataResolver(req, responseBody)
        : undefined;

      await this.billing.safeCharge({
        userId: actor.userId ?? null,
        businessId: actor.businessId ?? null,
        action: meta.action,
        units,
        metadata: extraMeta,
      });
    } catch (err) {
      this.logger.error(
        `runBilling failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  private defaultActor(req: BillableRequest): {
    userId?: string;
    businessId?: string;
  } {
    const u = req.user;
    if (!u) return {};
    return {
      userId: u.userId,
      businessId: u.businessId,
    };
  }
}
