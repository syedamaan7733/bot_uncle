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

    uploadImages: async (id: string, formData: FormData): Promise<string[]> => {
        const response = await api.post<string[]>(`/products/${id}/images`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    removeImages: async (id: string, imageUrls: string[]): Promise<string[]> => {
        const response = await api.delete<string[]>(`/products/${id}/images`, {
            data: { imageUrls },
        });
        return response.data;
    },
};
