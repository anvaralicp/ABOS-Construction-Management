import { IsString, IsEnum, IsInt, Matches, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WeekStart } from '@prisma/client';

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+$/, { message: 'Must be a valid IANA timezone (e.g. UTC, Asia/Kolkata)' })
  timezone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'Must be a valid 3-letter ISO 4217 currency code' })
  currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Matches(/^[a-z]{2}-[A-Z]{2}$/, { message: 'Must be a valid BCP 47 locale (e.g. en-IN, en-US)' })
  locale?: string;

  @ApiPropertyOptional({ enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] })
  @IsString()
  @IsOptional()
  @Matches(/^(DD\/MM\/YYYY|MM\/DD\/YYYY|YYYY-MM-DD)$/, { message: 'Must be a valid date format' })
  date_format?: string;

  @ApiPropertyOptional({ enum: ['IN', 'US', 'EU'] })
  @IsString()
  @IsOptional()
  @Matches(/^(IN|US|EU)$/, { message: 'Must be a valid number format' })
  number_format?: string;

  @ApiPropertyOptional({ enum: WeekStart })
  @IsEnum(WeekStart)
  @IsOptional()
  week_start?: WeekStart;

  @ApiProperty()
  @IsInt()
  version: number;
}
