import { api } from './api';

export interface UpdateBusinessDto {
    name?: string;
    slug?: string;
    whatsappNumber?: string;
    whatsappPhoneNumberId?: string;
    whatsappAccessToken?: string;
}

export const businessService = {
    getMyBusiness: async () => {
        const response = await api.get('/business/me');
        return response.data;
    },

    updateMyBusiness: async (data: UpdateBusinessDto) => {
        const response = await api.patch('/business/me', data);
        return response.data;
    },

    uploadLogo: async (formData: FormData) => {
        const response = await api.post('/business/me/logo', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};
