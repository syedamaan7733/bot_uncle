export interface User {
    id: string;
    email: string;
    business: Business;
}

export interface Business {
    id: string;
    userId: string;
    name: string;
    slug: string;
    whatsappNumber: string | null;
    whatsappAccessToken: string | null;
    whatsappPhoneNumberId: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    businessName: string;
    whatsappNumber?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}
