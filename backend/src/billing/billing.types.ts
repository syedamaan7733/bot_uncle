import type { BillableRequest } from './billing.request-types';

export type BillingActor = {
  userId?: string;
  businessId?: string;
};

export type BillableActionOptions = {
  /**
   * For public store routes: resolve tenant from `req.params.slug` via DB.
   * Skipped when an explicit `actorResolver` is provided.
   */
  actorFromStoreSlug?: boolean;
  /** Defaults to 1 */
  unitsResolver?: (
    req: BillableRequest,
    responseBody: unknown,
  ) => number | Promise<number>;
  /** Defaults to JWT req.user hybrid fields when present */
  actorResolver?: (
    req: BillableRequest,
    responseBody: unknown,
  ) => BillingActor | Promise<BillingActor>;
  metadataResolver?: (
    req: BillableRequest,
    responseBody: unknown,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
  /** If false, skip charge */
  when?: (
    req: BillableRequest,
    responseBody: unknown,
  ) => boolean | Promise<boolean>;
};

export type BillableActionMetadata = {
  action: string;
} & BillableActionOptions;

export type ChargeUserParams = {
  userId?: string | null;
  businessId?: string | null;
  action: string;
  units?: number;
  metadata?: Record<string, unknown>;
};
