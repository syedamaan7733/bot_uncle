import { api } from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedProduct {
    name: string;
    price: number;
    line1?: string | null;
    line2?: string | null;
    line3?: string | null;
    categoryId?: string | null;
    category?: string | null;
    categorySuggestion?: string | null;
    /** True when AI could not match any existing category — user must accept/reject the new category. */
    isNewCategory?: boolean;
    confidence: number;
}

export type ImportStatus =
    | 'UPLOADED'
    | 'PROCESSING'
    | 'READY_FOR_REVIEW'
    | 'COMPLETED'
    | 'FAILED';

export interface SmartImportJob {
    jobId: string;
    status: ImportStatus;
    fileUrl: string;
    resultJson: { products: ExtractedProduct[] } | null;
    createdAt: string;
    updatedAt: string;
}

export interface ConfirmProduct {
    name: string;
    price: number;
    line1?: string | null;
    line2?: string | null;
    line3?: string | null;
    /** Existing category ID. Either this OR newCategoryName must be set. */
    categoryId?: string;
    /** New category name to create server-side when isNewCategory=true and user accepted. */
    newCategoryName?: string;
    imageUrls?: string[];
}

export interface ConfirmImportResponse {
    imported: number;
    newCategoriesCreated?: number;
    products: any[];
}

// ── Service ──────────────────────────────────────────────────────────────────

export const smartImportService = {
    /**
     * Upload a catalog image and start an import job.
     * Returns { jobId } immediately — processing happens in the background.
     */
    upload: async (file: File): Promise<{ jobId: string }> => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await api.post<{ jobId: string }>(
            '/smart-import/upload',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data;
    },

    /**
     * Poll the status of an import job.
     */
    getJob: async (jobId: string): Promise<SmartImportJob> => {
        const response = await api.get<SmartImportJob>(`/smart-import/${jobId}`);
        return response.data;
    },

    /**
     * Confirm the import — create products in the database.
     */
    confirmImport: async (
        jobId: string,
        products: ConfirmProduct[],
    ): Promise<ConfirmImportResponse> => {
        const response = await api.post<ConfirmImportResponse>(
            `/smart-import/${jobId}/confirm`,
            { products },
        );
        return response.data;
    },
};
