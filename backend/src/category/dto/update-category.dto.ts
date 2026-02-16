import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class UpdateCategoryDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    displayOrder?: number;
}
