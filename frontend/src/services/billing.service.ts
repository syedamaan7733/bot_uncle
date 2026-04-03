import { api } from "./api";

export type BillingBalance = {
  balance: number;
  creditLimit: number | null;
  updatedAt: string | null;
  pendingPayments: {
    count: number;
    totalAmount: number;
  };
};

export type UsageLogItem = {
  id: string;
  userId: string | null;
  businessId: string | null;
  action: string;
  units: number;
  costPerUnit: number;
  totalCost: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type UsageResponse = {
  items: UsageLogItem[];
  total: number;
  limit: number;
  offset: number;
};

export type PaymentRecord = {
  id: string;
  userId: string;
  businessId: string;
  amount: number;
  currency: string;
  remark: string | null;
  image: string | null;
  metadata: Record<string, unknown> | null;
  paymentType: string;
  transactionDetails: Record<string, unknown> | null;
  status: string;
  referenceCode: string | null;
  gatewayProvider: string | null;
  gatewayTransactionId: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  failureReason: string | null;
  idempotencyKey: string | null;
  processedAt: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type PaymentsResponse = {
  items: PaymentRecord[];
  total: number;
  limit: number;
  offset: number;
};

export type CreatePaymentPayload = {
  amount: number;
  currency?: string;
  remark?: string;
  image?: string;
  metadata?: Record<string, unknown>;
  paymentType: string;
  transactionDetails?: Record<string, unknown>;
  idempotencyKey?: string;
};

export const billingService = {
  getBalance: async (): Promise<BillingBalance> => {
    const res = await api.get<BillingBalance>("/billing/balance");
    return res.data;
  },

  getUsage: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<UsageResponse> => {
    const res = await api.get<UsageResponse>("/billing/usage", { params });
    return res.data;
  },

  getPayments: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaymentsResponse> => {
    const res = await api.get<PaymentsResponse>("/billing/payments", {
      params,
    });
    return res.data;
  },

  createPayment: async (
    payload: CreatePaymentPayload,
  ): Promise<PaymentRecord> => {
    const res = await api.post<PaymentRecord>("/billing/payments", payload);
    return res.data;
  },
};
