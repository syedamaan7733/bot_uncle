import { SetMetadata } from '@nestjs/common';
import { BILLABLE_ACTION_METADATA_KEY } from './billing.constants';
import type { BillableActionOptions } from './billing.types';

export function BillableAction(
  action: string,
  options: BillableActionOptions = {},
) {
  return SetMetadata(BILLABLE_ACTION_METADATA_KEY, {
    action,
    ...options,
  });
}
