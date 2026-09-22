import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AuditService } from '../../../infrastructure/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateTaxConfigDto, UpdateTaxConfigDto, ValidateGstinDto } from './dto/tax-config.dto';
import { TaxReportQueryDto } from './dto/tax-query.dto';
import { Prisma, ExpenseStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class TaxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  // ---------------------------------------------------------
  // CONFIGURATION
  // ---------------------------------------------------------

  async createConfig(context: TenantContext, dto: CreateTaxConfigDto) {
    if (dto.effective_from && dto.effective_to) {
      if (new Date(dto.effective_from) > new Date(dto.effective_to)) {
        throw new BadRequestException('effective_from cannot be after effective_to');
      }
    }

    if (dto.code) {
      const existing = await this.prisma.gstTaxConfig.findFirst({
        where: { organization_id: context.organizationId, code: dto.code, deleted_at: null }
      });
      // Allow if we want historical versions, but if both are active, it's a conflict
      if (existing && existing.is_active && dto.is_active !== false) {
        throw new BadRequestException('Active tax config with this code already exists');
      }
    }

    const config = await this.prisma.gstTaxConfig.create({
      data: {
        organization_id: context.organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        tax_type: dto.tax_type,
        rate_percentage: new Decimal(dto.rate_percentage),
        cgst_rate: dto.cgst_rate ? new Decimal(dto.cgst_rate) : null,
        sgst_rate: dto.sgst_rate ? new Decimal(dto.sgst_rate) : null,
        igst_rate: dto.igst_rate ? new Decimal(dto.igst_rate) : null,
        cess_rate: dto.cess_rate ? new Decimal(dto.cess_rate) : null,
        is_active: dto.is_active ?? true,
        effective_from: dto.effective_from ? new Date(dto.effective_from) : null,
        effective_to: dto.effective_to ? new Date(dto.effective_to) : null,
      }
    });

    await this.audit.log(context, 'tax_config.create', 'gst_tax_config', config.id, { new_data: dto });
    return config;
  }

  async getConfigs(context: TenantContext) {
    return this.prisma.gstTaxConfig.findMany({
      where: { organization_id: context.organizationId, deleted_at: null },
      orderBy: { created_at: 'desc' }
    });
  }

  async getConfig(context: TenantContext, id: string) {
    const config = await this.prisma.gstTaxConfig.findUnique({
      where: { id }
    });

    if (!config || config.organization_id !== context.organizationId || config.deleted_at) {
      throw new NotFoundException('Tax config not found');
    }
    return config;
  }

  async updateConfig(context: TenantContext, id: string, dto: UpdateTaxConfigDto) {
    const config = await this.getConfig(context, id);
    
    // Check if effective dates are valid
    if (dto.effective_from && dto.effective_to) {
      if (new Date(dto.effective_from) > new Date(dto.effective_to)) {
        throw new BadRequestException('effective_from cannot be after effective_to');
      }
    }

    // Check if referenced
    const referenced = await this.prisma.expense.findFirst({
      where: { tax_config_id: id }
    });

    if (referenced) {
      // Allow metadata changes, but reject financial field changes
      const financialChanged = 
        (dto.rate_percentage !== undefined && dto.rate_percentage !== Number(config.rate_percentage)) ||
        (dto.cgst_rate !== undefined && dto.cgst_rate !== Number(config.cgst_rate)) ||
        (dto.sgst_rate !== undefined && dto.sgst_rate !== Number(config.sgst_rate)) ||
        (dto.igst_rate !== undefined && dto.igst_rate !== Number(config.igst_rate)) ||
        (dto.cess_rate !== undefined && dto.cess_rate !== Number(config.cess_rate)) ||
        (dto.tax_type !== undefined && dto.tax_type !== config.tax_type) ||
        (dto.effective_from !== undefined && new Date(dto.effective_from).getTime() !== config.effective_from?.getTime()) ||
        (dto.effective_to !== undefined && new Date(dto.effective_to).getTime() !== config.effective_to?.getTime());
      
      if (financialChanged) {
        import { ConflictException } from '@nestjs/common';
        throw new ConflictException('Cannot modify financial fields of a tax configuration already referenced by historical expenses. Create a new configuration instead.');
      }
    }

    const updated = await this.prisma.gstTaxConfig.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        tax_type: dto.tax_type,
        rate_percentage: dto.rate_percentage !== undefined ? new Decimal(dto.rate_percentage) : undefined,
        cgst_rate: dto.cgst_rate !== undefined ? new Decimal(dto.cgst_rate) : undefined,
        sgst_rate: dto.sgst_rate !== undefined ? new Decimal(dto.sgst_rate) : undefined,
        igst_rate: dto.igst_rate !== undefined ? new Decimal(dto.igst_rate) : undefined,
        cess_rate: dto.cess_rate !== undefined ? new Decimal(dto.cess_rate) : undefined,
        is_active: dto.is_active,
        effective_from: dto.effective_from ? new Date(dto.effective_from) : undefined,
        effective_to: dto.effective_to ? new Date(dto.effective_to) : undefined,
      }
    });

    await this.audit.log(context, 'tax_config.update', 'gst_tax_config', config.id, { old_data: config, new_data: dto });
    return updated;
  }

  async deleteConfig(context: TenantContext, id: string) {
    const config = await this.getConfig(context, id);

    await this.prisma.gstTaxConfig.update({
      where: { id },
      data: { deleted_at: new Date(), is_active: false }
    });

    await this.audit.log(context, 'tax_config.delete', 'gst_tax_config', config.id, {});
    return { success: true };
  }

  // ---------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------

  validateGstin(dto: ValidateGstinDto) {
    // Structural validation is handled by class-validator regex.
    // Further checksum validation logic could reside here.
    return { valid: true, gstin: dto.gstin.toUpperCase() };
  }

  // ---------------------------------------------------------
  // REPORTS
  // ---------------------------------------------------------
  
  private buildExpenseWhere(context: TenantContext, query: TaxReportQueryDto): Prisma.ExpenseWhereInput {
    const { project_id, date_from, date_to } = query;
    const where: Prisma.ExpenseWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
      status: { notIn: [ExpenseStatus.DRAFT, ExpenseStatus.REJECTED] }
    };
    if (project_id) where.project_id = project_id;
    if (date_from || date_to) {
      where.invoice_date = {};
      if (date_from) where.invoice_date.gte = new Date(date_from);
      if (date_to) where.invoice_date.lte = new Date(date_to);
    }
    return where;
  }


  async getSummaryReport(context: TenantContext, query: TaxReportQueryDto) {
    const where = this.buildExpenseWhere(context, query);
    
    const groups = await this.prisma.expense.groupBy({
      by: ['tax_config_id'],
      where,
      _sum: { taxable_amount: true, tax_amount: true, cgst_amount: true, sgst_amount: true, igst_amount: true, cess_amount: true },
      _count: true
    });

    let taxable_amount = 0;
    let tax_amount = 0;
    let cgst_amount = 0;
    let sgst_amount = 0;
    let igst_amount = 0;
    let cess_amount = 0;
    let transaction_count = 0;

    for (const g of groups) {
      taxable_amount += g._sum.taxable_amount || 0;
      tax_amount += g._sum.tax_amount || 0;
      cgst_amount += g._sum.cgst_amount || 0;
      sgst_amount += g._sum.sgst_amount || 0;
      igst_amount += g._sum.igst_amount || 0;
      cess_amount += g._sum.cess_amount || 0;
      transaction_count += g._count;
    }

    return {
      taxable_amount,
      tax_amount,
      cgst_amount,
      sgst_amount,
      igst_amount,
      cess_amount,
      transaction_count
    };
  }

  async getVendorsReport(context: TenantContext, query: TaxReportQueryDto) {
    const where = this.buildExpenseWhere(context, query);
    where.vendor_id = { not: null };

    const groups = await this.prisma.expense.groupBy({
      by: ['vendor_id'],
      where,
      _sum: { taxable_amount: true, tax_amount: true, cgst_amount: true, sgst_amount: true, igst_amount: true, cess_amount: true },
      _count: true
    });

    const vendorIds = groups.map(g => g.vendor_id as string);
    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, name: true, tax_id: true }
    });
    const vendorMap = new Map(vendors.map(v => [v.id, v]));

    return groups.map(g => {
      const v = vendorMap.get(g.vendor_id as string);
      return {
        vendor_id: g.vendor_id,
        vendor_name: v?.name || 'Unknown',
        vendor_gstin: v?.tax_id || null,
        taxable_amount: g._sum.taxable_amount || 0,
        tax_amount: g._sum.tax_amount || 0,
        cgst_amount: g._sum.cgst_amount || 0,
        sgst_amount: g._sum.sgst_amount || 0,
        igst_amount: g._sum.igst_amount || 0,
        cess_amount: g._sum.cess_amount || 0,
        transaction_count: g._count
      };
    });
  }

  async getProjectsReport(context: TenantContext, query: TaxReportQueryDto) {
    const where = this.buildExpenseWhere(context, query);

    const groups = await this.prisma.expense.groupBy({
      by: ['project_id'],
      where,
      _sum: { taxable_amount: true, tax_amount: true, cgst_amount: true, sgst_amount: true, igst_amount: true, cess_amount: true },
      _count: true
    });

    const projectIds = groups.map(g => g.project_id);
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true }
    });
    const projectMap = new Map(projects.map(p => [p.id, p]));

    return groups.map(g => {
      const p = projectMap.get(g.project_id);
      return {
        project_id: g.project_id,
        project_name: p?.name || 'Unknown',
        taxable_amount: g._sum.taxable_amount || 0,
        tax_amount: g._sum.tax_amount || 0,
        cgst_amount: g._sum.cgst_amount || 0,
        sgst_amount: g._sum.sgst_amount || 0,
        igst_amount: g._sum.igst_amount || 0,
        cess_amount: g._sum.cess_amount || 0,
        transaction_count: g._count
      };
    });
  }
}
