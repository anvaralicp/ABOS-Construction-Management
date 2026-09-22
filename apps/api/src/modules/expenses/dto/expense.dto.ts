import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsUUID, Min, MaxLength, IsDateString, IsNumberString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseStatus, PaymentStatus } from '@prisma/client';

export class CreateExpenseDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty()
  @IsUUID()
  category_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  item: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  unit_price: number; // minor units

  @ApiProperty()
  @IsNumber()
  @Min(0)
  tax_rate: number; // percentage (e.g., 18.5)

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_taxable?: boolean; // defaults to true if not provided

  @ApiProperty()
  @IsString()
  @MaxLength(10)
  currency: string;

  // Client-provided calculations for validation
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  subtotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  taxable_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  tax_amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  total_amount?: number;

  // Metadata
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor_reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoice_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  invoice_date?: string;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_mode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ enum: ExpenseStatus, default: ExpenseStatus.DRAFT })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  // Offline sync metadata
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  client_created_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  client_updated_at?: string;
  
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string; // Allows client to specify UUID for idempotency
}

export class UpdateExpenseDto {
  @ApiProperty()
  @IsInt()
  version: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  item?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  unit_price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax_rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_taxable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor_reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoice_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  invoice_date?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payment_mode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  client_updated_at?: string;
}

export class ExpenseQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @ApiPropertyOptional({ enum: ExpenseStatus })
  @IsOptional()
  @IsEnum(ExpenseStatus)
  status?: ExpenseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
