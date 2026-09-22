import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CurrentTenant } from '../../common/decorators/tenant.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { VendorPaymentsService } from './vendor-payments.service';
import { CreateVendorPaymentDto, UpdateVendorPaymentDto, VendorPaymentQueryDto } from './dto/vendor-payment.dto';

@ApiTags('Vendor Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiHeader({ name: 'x-organization-id', required: true })
@Controller('vendor-payments')
export class VendorPaymentsController {
  constructor(private readonly vendorPaymentsService: VendorPaymentsService) {}

  @Post()
  @RequirePermissions('vendor_payments:write')
  @ApiOperation({ summary: 'Create a new vendor payment' })
  async create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreateVendorPaymentDto) {
    return this.vendorPaymentsService.create(tenant, dto);
  }

  @Get()
  @RequirePermissions('vendor_payments:read')
  @ApiOperation({ summary: 'List vendor payments' })
  async findAll(@CurrentTenant() tenant: TenantContext, @Query() query: VendorPaymentQueryDto) {
    return this.vendorPaymentsService.findAll(tenant, query);
  }

  @Get(':id')
  @RequirePermissions('vendor_payments:read')
  @ApiOperation({ summary: 'Get vendor payment details' })
  async findOne(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.vendorPaymentsService.findOne(tenant, id);
  }

  @Patch(':id')
  @RequirePermissions('vendor_payments:write')
  @ApiOperation({ summary: 'Update vendor payment' })
  async update(@CurrentTenant() tenant: TenantContext, @Param('id') id: string, @Body() dto: UpdateVendorPaymentDto) {
    return this.vendorPaymentsService.update(tenant, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vendor_payments:delete')
  @ApiOperation({ summary: 'Archive vendor payment' })
  async delete(@CurrentTenant() tenant: TenantContext, @Param('id') id: string) {
    return this.vendorPaymentsService.delete(tenant, id);
  }

  // --- Settlements ---

  @Get('expense/:expenseId/summary')
  @RequirePermissions('vendor_payments:summary')
  @ApiOperation({ summary: 'Get payment settlement summary for an expense' })
  async getExpenseSettlementSummary(@CurrentTenant() tenant: TenantContext, @Param('expenseId') expenseId: string) {
    return this.vendorPaymentsService.getExpenseSettlementSummary(tenant, expenseId);
  }

  @Get('vendor/:vendorId/summary')
  @RequirePermissions('vendor_payments:summary')
  @ApiOperation({ summary: 'Get overall payment settlement summary for a vendor' })
  async getVendorSettlementSummary(@CurrentTenant() tenant: TenantContext, @Param('vendorId') vendorId: string) {
    return this.vendorPaymentsService.getVendorSettlementSummary(tenant, vendorId);
  }
}
