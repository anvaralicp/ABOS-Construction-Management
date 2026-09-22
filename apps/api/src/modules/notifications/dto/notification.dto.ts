import { IsString, IsOptional, IsEnum, IsUUID, IsObject, IsDateString, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationSeverity } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty()
  @IsUUID()
  user_id: string; // The recipient

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  project_id?: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ enum: NotificationSeverity, default: NotificationSeverity.INFO })
  @IsEnum(NotificationSeverity)
  @IsOptional()
  severity?: NotificationSeverity;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expires_at?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deduplication_key?: string;
}

export class NotificationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_read?: boolean;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ enum: NotificationSeverity })
  @IsOptional()
  @IsEnum(NotificationSeverity)
  severity?: NotificationSeverity;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
