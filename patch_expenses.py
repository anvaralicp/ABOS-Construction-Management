import sys
import re

def patch_expenses_service(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Add Prisma Decimal if not imported
    if "import { Decimal }" not in content and "@prisma/client/runtime/library" not in content:
        content = content.replace("import { Prisma, ExpenseStatus, PaymentStatus } from '@prisma/client';", 
                                  "import { Prisma, ExpenseStatus, PaymentStatus } from '@prisma/client';\nimport { Decimal } from '@prisma/client/runtime/library';")

    validate_tax_fn = """
  private async validateTaxConfig(context: TenantContext, taxConfigId: string, invoiceDate: Date | null) {
    const config = await this.prisma.gstTaxConfig.findFirst({
      where: { id: taxConfigId, organization_id: context.organizationId, deleted_at: null }
    });
    if (!config || !config.is_active) {
      throw new BadRequestException('Tax configuration is invalid, inactive, or does not belong to the organization.');
    }
    const dateToCheck = invoiceDate || new Date();
    if (config.effective_from && dateToCheck < config.effective_from) {
      throw new BadRequestException('Tax configuration is not yet effective for this invoice date.');
    }
    if (config.effective_to && dateToCheck > config.effective_to) {
      throw new BadRequestException('Tax configuration is expired for this invoice date.');
    }
    return config;
  }
"""

    if "validateTaxConfig" not in content:
        content = content.replace(
            "async create(context: TenantContext, dto: CreateExpenseDto) {",
            validate_tax_fn + "\n  async create(context: TenantContext, dto: CreateExpenseDto) {"
        )

    # Use Prisma Decimal math for exact rounding to integer minor units
    calc_func = "const calcAmt = (rate: any) => rate ? new Decimal(calculated.taxable_amount).mul(rate).div(100).round().toNumber() : null;"
    
    create_body = f"""    let taxComponents: any = {{ cgst_amount: null, sgst_amount: null, igst_amount: null, cess_amount: null, cgst_rate: null, sgst_rate: null, igst_rate: null, cess_rate: null }};
    if (dto.tax_config_id) {{
      const config = await this.validateTaxConfig(context, dto.tax_config_id, dto.invoice_date ? new Date(dto.invoice_date) : null);
      if (Number(config.rate_percentage) !== dto.tax_rate) {{
         throw new BadRequestException('Provided tax_rate does not match the tax configuration rate.');
      }}
      
      {calc_func}
      taxComponents = {{
        cgst_rate: config.cgst_rate, sgst_rate: config.sgst_rate, igst_rate: config.igst_rate, cess_rate: config.cess_rate,
        cgst_amount: calcAmt(config.cgst_rate),
        sgst_amount: calcAmt(config.sgst_rate),
        igst_amount: calcAmt(config.igst_rate),
        cess_amount: calcAmt(config.cess_rate),
      }};
    }}"""
    
    content = content.replace(
        "this.validateCalculations(dto, calculated);",
        "this.validateCalculations(dto, calculated);\n" + create_body,
        1
    )
    
    content = content.replace(
        "created_by: context.userId,",
        "created_by: context.userId,\n        tax_config_id: dto.tax_config_id,\n        cgst_amount: taxComponents.cgst_amount,\n        sgst_amount: taxComponents.sgst_amount,\n        igst_amount: taxComponents.igst_amount,\n        cess_amount: taxComponents.cess_amount,\n        cgst_rate: taxComponents.cgst_rate,\n        sgst_rate: taxComponents.sgst_rate,\n        igst_rate: taxComponents.igst_rate,\n        cess_rate: taxComponents.cess_rate,"
    )

    if "async update(" in content:
        update_tax = f"""
    let taxComponents: any = {{}};
    if (dto.tax_config_id) {{
      const config = await this.validateTaxConfig(context, dto.tax_config_id, dto.invoice_date ? new Date(dto.invoice_date) : (existing.invoice_date || null));
      {calc_func}
      taxComponents = {{
        tax_config_id: dto.tax_config_id,
        cgst_rate: config.cgst_rate, sgst_rate: config.sgst_rate, igst_rate: config.igst_rate, cess_rate: config.cess_rate,
        cgst_amount: calcAmt(config.cgst_rate),
        sgst_amount: calcAmt(config.sgst_rate),
        igst_amount: calcAmt(config.igst_rate),
        cess_amount: calcAmt(config.cess_rate),
      }};
    }} else if (dto.tax_config_id === null) {{
      taxComponents = {{
        tax_config_id: null,
        cgst_rate: null, sgst_rate: null, igst_rate: null, cess_rate: null,
        cgst_amount: null, sgst_amount: null, igst_amount: null, cess_amount: null,
      }};
    }}
"""
        content = content.replace(
            "this.validateCalculations(dto, calculated);",
            "this.validateCalculations(dto, calculated);\n" + update_tax,
            1 
        )
        content = content.replace(
            "updated_by: context.userId,",
            "updated_by: context.userId,\n        ...taxComponents,"
        )

    with open(filepath, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    patch_expenses_service(sys.argv[1])
