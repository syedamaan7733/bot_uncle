import { IsOptional, IsString } from 'class-validator';

export class UpdateBusinessDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    slug?: string;

    @IsOptional()
    @IsString()
    whatsappNumber?: string;

    @IsOptional()
    @IsString()
    whatsappPhoneNumberId?: string;

    @IsOptional()
    @IsString()
    whatsappAccessToken?: string;
}
