/** Action codes for usage metering (keep stable — stored in DB). */
export const BillingActions = {
  PRODUCT_ADD: 'PRODUCT_ADD',
  SMART_IMPORT: 'SMART_IMPORT',
  IMAGE_SEARCH: 'IMAGE_SEARCH',
  CHATBOT_MESSAGE: 'CHATBOT_MESSAGE',
  WHATSAPP_MESSAGE: 'WHATSAPP_MESSAGE',
  AI_SEARCH: 'AI_SEARCH',
  META_REGISTRATION: 'META_REGISTRATION',
} as const;

export type BillingActionCode =
  (typeof BillingActions)[keyof typeof BillingActions];

/**
 * INR defaults when no PricingConfig row exists (configurable via DB seed / PATCH).
 */
export const DEFAULT_PRICE_PER_UNIT: Record<string, number> = {
  [BillingActions.PRODUCT_ADD]: 0.5,
  [BillingActions.SMART_IMPORT]: 2,
  [BillingActions.IMAGE_SEARCH]: 1,
  [BillingActions.CHATBOT_MESSAGE]: 0.8,
  [BillingActions.WHATSAPP_MESSAGE]: 0.8,
  [BillingActions.AI_SEARCH]: 0.5,
  [BillingActions.META_REGISTRATION]: 500,
};

export const BILLABLE_ACTION_METADATA_KEY = 'billing:billableAction';
