import { IsString, IsOptional, IsUUID, IsDateString, IsNumber, IsInt, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProgressReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string; // Optional client-generated UUID for offline support

  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty()
  @IsDateString()
  report_date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  work_completed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issues?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  delays?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  next_day_plan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  client_created_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  client_updated_at?: string;
}

export class UpdateProgressReportDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  version: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  work_completed?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issues?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  delays?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  next_day_plan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  client_updated_at?: string;
}

export class ProgressReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  project_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  report_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}

export class AttachDocumentDto {
  @ApiProperty()
  @IsUUID()
  document_id: string;
}
