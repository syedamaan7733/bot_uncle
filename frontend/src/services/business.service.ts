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
};
