import { Type } from 'class-transformer';
import {
    IsArray,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from 'class-validator';

export class ConfirmProductDto {
    @IsString()
    name: string;

    @IsNumber()
    price: number;

    @IsOptional()
    @IsString()
    line1?: string;

    @IsOptional()
    @IsString()
    line2?: string;

    @IsOptional()
    @IsString()
    line3?: string;

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsString()
    newCategoryName?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    imageUrls?: string[];
}

export class ConfirmImportDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ConfirmProductDto)
    products: ConfirmProductDto[];
}
