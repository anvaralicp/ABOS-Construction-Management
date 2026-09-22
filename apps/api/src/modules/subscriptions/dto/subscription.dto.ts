import { IsString, IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsUUID()
  organization_id: string;

  @ApiProperty()
  @IsUUID()
  plan_id: string;

  @ApiProperty({ enum: SubscriptionStatus })
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  started_at?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  current_period_start?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  current_period_end?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  trial_ends_at?: string;
}

export class UpdateSubscriptionStatusDto {
  @ApiProperty({ enum: SubscriptionStatus })
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  current_period_end?: string;
}
