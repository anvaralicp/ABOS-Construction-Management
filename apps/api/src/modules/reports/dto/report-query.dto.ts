import { IsOptional, IsString, IsUUID, IsDateString, IsNumber, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_to?: string;
}

export class ProjectSummaryQueryDto extends ReportQueryDto {
  @IsUUID()
  project_id: string; // Required for project summary
}

export class ExpenseReportQueryDto extends ReportQueryDto {
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
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class VendorReportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vendor_id?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class BudgetReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  project_id?: string;
}

export class EquipmentReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  project_id?: string;
}

export class WorkforceReportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export class ProgressReportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
