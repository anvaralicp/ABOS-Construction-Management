import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsUUID, Min, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetStatus } from '@prisma/client';

export class CreateBudgetLineDto {
  @ApiProperty()
  @IsUUID()
  category_id: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsString()
  @MaxLength(10)
  currency: string;
}

export class CreateBudgetDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  total_amount: number;

  @ApiProperty()
  @IsString()
  @MaxLength(10)
  currency: string;

  @ApiPropertyOptional({ type: [CreateBudgetLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetLineDto)
  lines?: CreateBudgetLineDto[];
}

export class UpdateBudgetDto {
  @ApiProperty()
  @IsInt()
  version: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  total_amount?: number;

  @ApiPropertyOptional({ enum: BudgetStatus })
  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;
}

export class UpdateBudgetLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;
}
