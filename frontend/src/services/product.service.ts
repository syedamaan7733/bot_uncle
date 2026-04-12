import { api } from './api';
import type {
    Product,
    CreateProductDto,
    UpdateProductDto,
} from '../types/product';

export const productService = {
    getAll: async (categoryId?: string): Promise<Product[]> => {
        const params = categoryId ? { categoryId } : {};
        const response = await api.get<Product[]>('/products', { params });
        return response.data;
    },

    getOne: async (id: string): Promise<Product> => {
        const response = await api.get<Product>(`/products/${id}`);
        return response.data;
    },

    create: async (data: CreateProductDto): Promise<Product> => {
        const response = await api.post<Product>('/products', data);
        return response.data;
    },

    update: async (id: string, data: UpdateProductDto): Promise<Product> => {
        const response = await api.patch<Product>(`/products/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/products/${id}`);
    },

    uploadImages: async (
        id: string,
        formData: FormData,
        options?: { skipImageVision?: boolean },
    ): Promise<string[]> => {
        const params =
            options?.skipImageVision === true ? { skipImageVision: 'true' } : {};
        const response = await api.post<string[]>(`/products/${id}/images`, formData, {
            params,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /** Same vision caption used when indexing product embeddings (dashboard add flow). */
    previewImageDescription: async (file: File): Promise<{ description: string }> => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await api.post<{ description: string }>(
            '/products/image-description/preview',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return response.data;
    },

    removeImages: async (id: string, imageUrls: string[]): Promise<string[]> => {
        const response = await api.delete<string[]>(`/products/${id}/images`, {
            data: { imageUrls },
        });
        return response.data;
    },
};
