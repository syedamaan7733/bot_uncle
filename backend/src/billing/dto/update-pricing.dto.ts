import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdatePricingDto {
  @IsString()
  action!: string;

  @IsNumber()
  @Min(0)
  pricePerUnit!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
