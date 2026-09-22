import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentStatusDto, DocumentQueryDto } from './dto/document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @RequirePermissions('documents:create')
  @ApiOperation({ summary: 'Create a new document and get upload URL' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('documents:read')
  @ApiOperation({ summary: 'List organization documents' })
  async findAll(@CurrentTenant() tenant: TenantContext, @Query() query: DocumentQueryDto) {
    return this.documentsService.findAll(tenant, query);
  }

  @Get(':id')
  @RequirePermissions('documents:read')
  @ApiOperation({ summary: 'Get document metadata' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.documentsService.findOne(tenant, id);
  }

  @Patch(':id/status')
  @RequirePermissions('documents:update')
  @ApiOperation({ summary: 'Update document status (e.g., after upload success)' })
  async updateStatus(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateDocumentStatusDto) {
    return this.documentsService.updateStatus(tenant, id, dto);
  }

  @Get(':id/download-url')
  @RequirePermissions('documents:download')
  @ApiOperation({ summary: 'Get a presigned download URL' })
  async getDownloadUrl(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.documentsService.getDownloadUrl(tenant, id);
  }

  @Delete(':id')
  @RequirePermissions('documents:delete')
  @ApiOperation({ summary: 'Delete a document' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.documentsService.delete(tenant, id);
  }
}
