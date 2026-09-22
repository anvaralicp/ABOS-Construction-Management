import { IsOptional, IsUUID, IsString, IsISO8601, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Start date (inclusive)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'End date (inclusive)' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Filter by actor ID (user UUID)' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Filter by action name' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by entity type' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Filter by entity ID' })
  @IsOptional()
  @IsUUID()
  entityId?: string;
}
