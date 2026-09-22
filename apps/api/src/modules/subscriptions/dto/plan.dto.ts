import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntitlementType } from '@prisma/client';

export class EntitlementDto {
  @ApiProperty()
  @IsString()
  feature_key: string;

  @ApiProperty({ enum: EntitlementType })
  @IsEnum(EntitlementType)
  type: EntitlementType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  value_int?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  value_bool?: boolean;
}

export class CreateSubscriptionPlanDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsString()
  billing_cycle: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sort_order?: number;

  @ApiPropertyOptional({ type: [EntitlementDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EntitlementDto)
  @IsOptional()
  entitlements?: EntitlementDto[];
}

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  billing_cycle?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sort_order?: number;
}
