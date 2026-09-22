import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsUUID, Min, MaxLength, IsDateString, IsNumberString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialStatus } from '@prisma/client';

export class CreateMaterialDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  unit_of_measure: string;

  @ApiPropertyOptional({ enum: MaterialStatus, default: MaterialStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MaterialStatus)
  status?: MaterialStatus;
}

export class UpdateMaterialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit_of_measure?: string;

  @ApiPropertyOptional({ enum: MaterialStatus })
  @IsOptional()
  @IsEnum(MaterialStatus)
  status?: MaterialStatus;
}

export class CreateMaterialRateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  rate: number;

  @ApiProperty()
  @IsString()
  @MaxLength(10)
  currency: string;

  @ApiProperty()
  @IsDateString()
  effective_date: string;
}

export class UpdateMaterialRateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effective_date?: string;
}

export class MaterialQueryDto {
  @ApiPropertyOptional({ enum: MaterialStatus })
  @IsOptional()
  @IsEnum(MaterialStatus)
  status?: MaterialStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class MaterialRateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

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
