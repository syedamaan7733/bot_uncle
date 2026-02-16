import { api } from './api';
import type {
    Category,
    CreateCategoryDto,
    UpdateCategoryDto,
} from '../types/product';

export const categoryService = {
    getAll: async (): Promise<Category[]> => {
        const response = await api.get<Category[]>('/categories');
        return response.data;
    },

    getOne: async (id: string): Promise<Category> => {
        const response = await api.get<Category>(`/categories/${id}`);
        return response.data;
    },

    create: async (data: CreateCategoryDto): Promise<Category> => {
        const response = await api.post<Category>('/categories', data);
        return response.data;
    },

    update: async (id: string, data: UpdateCategoryDto): Promise<Category> => {
        const response = await api.patch<Category>(`/categories/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/categories/${id}`);
    },
};
