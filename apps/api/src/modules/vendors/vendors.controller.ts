import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto, CreateVendorContactDto, UpdateVendorContactDto } from './dto/vendor.dto';

@ApiTags('Vendors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @RequirePermissions('vendors:write')
  @ApiOperation({ summary: 'Create a new vendor' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateVendorDto) {
    return this.vendorsService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('vendors:read')
  @ApiOperation({ summary: 'List organization vendors' })
  async findAll(@CurrentTenant() tenant: TenantContext) {
    return this.vendorsService.findAll(tenant);
  }

  @Get(':id')
  @RequirePermissions('vendors:read')
  @ApiOperation({ summary: 'Get vendor details' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.vendorsService.findOne(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('vendors:write')
  @ApiOperation({ summary: 'Update vendor details' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return this.vendorsService.update(tenant, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vendors:delete')
  @ApiOperation({ summary: 'Archive/Delete a vendor' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.vendorsService.delete(tenant, id);
  }

  // --- Contacts ---

  @Get(':id/contacts')
  @RequirePermissions('vendor_contacts:read')
  @ApiOperation({ summary: 'List vendor contacts' })
  async listContacts(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.vendorsService.listContacts(tenant, id);
  }

  @Post(':id/contacts')
  @RequirePermissions('vendor_contacts:write')
  @ApiOperation({ summary: 'Create a new vendor contact' })
  async createContact(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: CreateVendorContactDto) {
    return this.vendorsService.createContact(tenant, id, dto);
  }

  @Patch(':id/contacts/:contactId')
  @RequirePermissions('vendor_contacts:write')
  @ApiOperation({ summary: 'Update a vendor contact' })
  async updateContact(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Param('contactId') contactId: string, @Body() dto: UpdateVendorContactDto) {
    return this.vendorsService.updateContact(tenant, id, contactId, dto);
  }

  @Delete(':id/contacts/:contactId')
  @RequirePermissions('vendor_contacts:delete')
  @ApiOperation({ summary: 'Delete a vendor contact' })
  async deleteContact(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Param('contactId') contactId: string) {
    return this.vendorsService.deleteContact(tenant, id, contactId);
  }
}
