import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaxConfigDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tax_type?: string;

  @ApiProperty({ description: 'Total tax rate percentage' })
  @IsNumber()
  rate_percentage: number;

  @ApiPropertyOptional({ description: 'CGST rate percentage' })
  @IsNumber()
  @IsOptional()
  cgst_rate?: number;

  @ApiPropertyOptional({ description: 'SGST rate percentage' })
  @IsNumber()
  @IsOptional()
  sgst_rate?: number;

  @ApiPropertyOptional({ description: 'IGST rate percentage' })
  @IsNumber()
  @IsOptional()
  igst_rate?: number;

  @ApiPropertyOptional({ description: 'CESS rate percentage' })
  @IsNumber()
  @IsOptional()
  cess_rate?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  effective_from?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  effective_to?: string;
}

export class UpdateTaxConfigDto extends CreateTaxConfigDto {}

export class ValidateGstinDto {
  @ApiProperty({ description: '15 character Indian GSTIN' })
  @IsString()
  @Length(15, 15)
  @Matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i, { message: 'Invalid GSTIN format' })
  gstin: string;
}
