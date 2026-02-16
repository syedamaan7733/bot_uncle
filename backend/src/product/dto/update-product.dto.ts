import {
    IsString,
    IsNumber,
    IsArray,
    IsOptional,
    IsBoolean,
    Min,
} from 'class-validator';

export class UpdateProductDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    price?: number;

    @IsString()
    @IsOptional()
    line1?: string;

    @IsString()
    @IsOptional()
    line2?: string;

    @IsString()
    @IsOptional()
    line3?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    imageUrls?: string[];

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
