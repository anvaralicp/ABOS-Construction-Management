import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TaxReportQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  project_id?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  date_from?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  date_to?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tax_code?: string;
}
