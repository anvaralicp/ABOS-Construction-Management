import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto, UpdateMaterialDto, CreateMaterialRateDto, MaterialQueryDto, MaterialRateQueryDto } from './dto/material.dto';

@ApiTags('Materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  @RequirePermissions('materials:write')
  @ApiOperation({ summary: 'Create a new material master record' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateMaterialDto) {
    return this.materialsService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('materials:read')
  @ApiOperation({ summary: 'List organization materials' })
  async findAll(@CurrentTenant() tenant: TenantContext, @Query() query: MaterialQueryDto) {
    return this.materialsService.findAll(tenant, query);
  }

  @Get(':id')
  @RequirePermissions('materials:read')
  @ApiOperation({ summary: 'Get material details' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.materialsService.findOne(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('materials:write')
  @ApiOperation({ summary: 'Update material details' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateMaterialDto) {
    return this.materialsService.update(tenant, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('materials:delete')
  @ApiOperation({ summary: 'Archive/Delete a material' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.materialsService.delete(tenant, id);
  }

  // --- Rates ---

  @Post(':id/rates')
  @RequirePermissions('material_rates:write')
  @ApiOperation({ summary: 'Add a new rate to material history' })
  async addRate(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: CreateMaterialRateDto) {
    return this.materialsService.createRate(tenant, id, dto);
  }

  @Get(':id/rates')
  @RequirePermissions('material_rates:read')
  @ApiOperation({ summary: 'Get material rate history' })
  async getRates(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Query() query: MaterialRateQueryDto) {
    return this.materialsService.getRates(tenant, id, query);
  }

  @Get(':id/rates/latest')
  @RequirePermissions('material_rates:read')
  @ApiOperation({ summary: 'Get latest effective material rate' })
  async getLatestRate(
    @CurrentTenant() tenant: TenantContext, 
    @Param('id') id: string,
    @Query('vendor_id') vendorId?: string
  ) {
    const rate = await this.materialsService.getLatestRate(tenant, id, vendorId);
    return rate ? { data: rate } : { data: null };
  }
}
