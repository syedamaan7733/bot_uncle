import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  IsObject,
  IsEnum,
} from 'class-validator';
import { PaymentSource } from '@prisma/client';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remark?: string;

  /** Public URL of payment proof screenshot (e.g. Cloudinary). */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsString()
  @MaxLength(64)
  paymentType!: string;

  @IsOptional()
  @IsObject()
  transactionDetails?: Record<string, unknown>;

  /** Client-supplied idempotency key to avoid duplicate submissions. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;

  @IsOptional()
  @IsEnum(PaymentSource)
  source?: PaymentSource;
}
