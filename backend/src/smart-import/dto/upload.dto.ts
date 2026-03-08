import { IsOptional, IsString } from 'class-validator';

export class UploadImportDto {
    @IsOptional()
    @IsString()
    notes?: string;
}
