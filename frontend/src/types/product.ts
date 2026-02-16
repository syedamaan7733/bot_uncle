export interface Category {
    id: string;
    businessId: string;
    name: string;
    slug: string;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    _count?: {
        products: number;
    };
}

export interface Product {
    id: string;
    businessId: string;
    categoryId: string;
    name: string;
    price: string;
    line1: string | null;
    line2: string | null;
    line3: string | null;
    imageUrls: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    category?: Category;
}

export interface CreateCategoryDto {
    name: string;
    displayOrder?: number;
}

export interface UpdateCategoryDto {
    name?: string;
    displayOrder?: number;
}

export interface CreateProductDto {
    name: string;
    categoryId: string;
    price: number;
    line1?: string;
    line2?: string;
    line3?: string;
    imageUrls?: string[];
}

export interface UpdateProductDto {
    name?: string;
    categoryId?: string;
    price?: number;
    line1?: string;
    line2?: string;
    line3?: string;
    imageUrls?: string[];
    isActive?: boolean;
}
