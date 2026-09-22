import sys
import re

def rewrite_tax_service(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Update updateConfig to prevent modification of referenced configs
    update_logic = """  async updateConfig(context: TenantContext, id: string, dto: UpdateTaxConfigDto) {
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
  }"""
    
    # regex replace updateConfig
    content = re.sub(r'  async updateConfig\(.*?\).*?return updated;\n  }', update_logic, content, flags=re.DOTALL)
    
    # 2. Add ConflictException import
    if "ConflictException" not in content:
        content = content.replace("NotFoundException, BadRequestException", "NotFoundException, BadRequestException, ConflictException")
        # Fix the import we injected locally
        content = content.replace("import { ConflictException } from '@nestjs/common';", "")

    # 3. Add effective_from/to validation in createConfig
    create_logic = """  async createConfig(context: TenantContext, dto: CreateTaxConfigDto) {
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
    }"""
    
    content = re.sub(r'  async createConfig\(context: TenantContext, dto: CreateTaxConfigDto\) \{.*?if \(dto\.code\) \{', create_logic.replace('if (dto.code) {', 'if (dto.code) {'), content, flags=re.DOTALL)


    # 4. Rewrite Reports
    
    reports_code = """
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
}"""

    # Replace everything from `async getSummaryReport` to the end
    content = re.sub(r'  private calculateTaxComponents.*?$', reports_code, content, flags=re.DOTALL)
    
    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    rewrite_tax_service(sys.argv[1])
