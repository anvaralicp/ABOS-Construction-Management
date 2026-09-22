import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @RequirePermissions('categories:write')
  @ApiOperation({ summary: 'Create a new category' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(tenant, dto);
  }

  @Get('tree')
  @RequirePermissions('categories:read')
  @ApiOperation({ summary: 'List categories as a hierarchy tree' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  async getTree(@CurrentTenant() tenant: TenantContext, @Query('activeOnly') activeOnly?: string) {
    return this.categoriesService.getTree(tenant, activeOnly === 'true');
  }

  @Get()
  @RequirePermissions('categories:read')
  @ApiOperation({ summary: 'List organization categories (flat list)' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  async findAll(@CurrentTenant() tenant: TenantContext, @Query('activeOnly') activeOnly?: string) {
    return this.categoriesService.findAll(tenant, activeOnly === 'true');
  }

  @Get(':id')
  @RequirePermissions('categories:read')
  @ApiOperation({ summary: 'Get category details' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.categoriesService.findOne(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('categories:write')
  @ApiOperation({ summary: 'Update category details / activation status' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(tenant, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('categories:delete')
  @ApiOperation({ summary: 'Archive/Delete a category' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.categoriesService.delete(tenant, id);
  }
}
