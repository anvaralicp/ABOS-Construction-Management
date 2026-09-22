import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsUUID, Min, MaxLength, IsDateString, IsNumberString, IsDecimal } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkforceStatus, AssignmentStatus, AttendanceStatus } from '@prisma/client';

// --- Workforce Member ---
export class CreateWorkforceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  hourly_rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ enum: WorkforceStatus, default: WorkforceStatus.ACTIVE })
  @IsOptional()
  @IsEnum(WorkforceStatus)
  status?: WorkforceStatus;
}

export class UpdateWorkforceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  hourly_rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ enum: WorkforceStatus })
  @IsOptional()
  @IsEnum(WorkforceStatus)
  status?: WorkforceStatus;
}

// --- Project Assignment ---
export class CreateAssignmentDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

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
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ enum: AssignmentStatus, default: AssignmentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

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
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ enum: AssignmentStatus })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;
}

// --- Daily Attendance ---
export class CreateAttendanceDto {
  @ApiProperty()
  @IsUUID()
  id: string; // Client-generated UUID

  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  hours: number;

  @ApiPropertyOptional({ enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  client_created_at?: string;
}

export class UpdateAttendanceDto {
  @ApiProperty()
  @IsInt()
  version: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  hours?: number;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  client_updated_at?: string;
}

export class WorkforceQueryDto {
  @ApiPropertyOptional({ enum: WorkforceStatus })
  @IsOptional()
  @IsEnum(WorkforceStatus)
  status?: WorkforceStatus;

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
