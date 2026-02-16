import {
    IsNotEmpty,
    IsString,
    IsNumber,
    IsArray,
    IsOptional,
    Min,
} from 'class-validator';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    categoryId: string;

    @IsNumber()
    @Min(0)
    price: number;

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
}
