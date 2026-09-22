import { IsString, IsNotEmpty, IsNumber, IsOptional, MaxLength, Min, Max, Matches, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentStatus {
  PENDING = 'PENDING',
  AVAILABLE = 'AVAILABLE',
  FAILED = 'FAILED'
}

export class CreateDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  filename: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  mime_type: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(104857600) // Max 100MB
  size_bytes: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  client_created_at?: string;
}

export class UpdateDocumentStatusDto {
  @ApiProperty({ enum: DocumentStatus })
  @IsEnum(DocumentStatus)
  status: DocumentStatus;
}

export class DocumentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
