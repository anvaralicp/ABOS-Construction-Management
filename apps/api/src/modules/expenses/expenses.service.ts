import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto } from './dto/expense.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private calculateFinancials(quantity: number, unitPrice: number, taxRate: number) {
    // subtotal = quantity * unit_price (minor units)
    const subtotal = Math.round(quantity * unitPrice);
    const taxableAmount = subtotal; // For this phase, entire subtotal is taxable
    const taxAmount = Math.round(taxableAmount * (taxRate / 100));
    const totalAmount = subtotal + taxAmount;

    return {
      subtotal,
      taxable_amount: taxableAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    };
  }

  private validateCalculations(dto: CreateExpenseDto | UpdateExpenseDto, calculated: any) {
    if (dto.subtotal !== undefined && Math.abs(dto.subtotal - calculated.subtotal) > 1) {
      throw new BadRequestException(\`Client subtotal (\${dto.subtotal}) does not match server calculation (\${calculated.subtotal}).\`);
    }
    if (dto.tax_amount !== undefined && Math.abs(dto.tax_amount - calculated.tax_amount) > 1) {
      throw new BadRequestException(\`Client tax_amount (\${dto.tax_amount}) does not match server calculation (\${calculated.tax_amount}).\`);
    }
    if (dto.total_amount !== undefined && Math.abs(dto.total_amount - calculated.total_amount) > 1) {
      throw new BadRequestException(\`Client total_amount (\${dto.total_amount}) does not match server calculation (\${calculated.total_amount}).\`);
    }
  }

  private async validateRelationships(context: TenantContext, projectId: string, categoryId: string, vendorId?: string) {
    const project = await this.prisma.project.findUnique({
      where: { id_organization_id: { id: projectId, organization_id: context.organizationId } }
    });
    if (!project || project.deleted_at) {
      throw new BadRequestException('Project is invalid or does not belong to the organization.');
    }

    const category = await this.prisma.category.findUnique({
      where: { id_organization_id: { id: categoryId, organization_id: context.organizationId } }
    });
    if (!category || category.deleted_at || !category.is_active) {
      throw new BadRequestException('Category is invalid, inactive, or does not belong to the organization.');
    }

    if (vendorId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id_organization_id: { id: vendorId, organization_id: context.organizationId } }
      });
      if (!vendor || vendor.deleted_at || vendor.status !== 'ACTIVE') {
        throw new BadRequestException('Vendor is invalid, inactive, or does not belong to the organization.');
      }
    }
  }

  async create(context: TenantContext, dto: CreateExpenseDto) {
    await this.validateRelationships(context, dto.project_id, dto.category_id, dto.vendor_id);

    const calculated = this.calculateFinancials(dto.quantity, dto.unit_price, dto.tax_rate);
    this.validateCalculations(dto, calculated);

    // Idempotency check for offline sync
    if (dto.id) {
      const existing = await this.prisma.expense.findUnique({
        where: { id_organization_id: { id: dto.id, organization_id: context.organizationId } }
      });
      if (existing) {
        return existing; // Already created, return safely (idempotent)
      }
    }

    const expense = await this.prisma.expense.create({
      data: {
        id: dto.id || undefined,
        organization_id: context.organizationId,
        project_id: dto.project_id,
        category_id: dto.category_id,
        vendor_id: dto.vendor_id,
        item: dto.item,
        quantity: dto.quantity,
        unit: dto.unit,
        unit_price: dto.unit_price,
        subtotal: calculated.subtotal,
        taxable_amount: calculated.taxable_amount,
        tax_rate: dto.tax_rate,
        tax_amount: calculated.tax_amount,
        total_amount: calculated.total_amount,
        currency: dto.currency,
        vendor_reference: dto.vendor_reference,
        invoice_number: dto.invoice_number,
        invoice_date: dto.invoice_date ? new Date(dto.invoice_date) : null,
        payment_status: dto.payment_status,
        payment_mode: dto.payment_mode,
        remarks: dto.remarks,
        status: dto.status,
        client_created_at: dto.client_created_at ? new Date(dto.client_created_at) : null,
        client_updated_at: dto.client_updated_at ? new Date(dto.client_updated_at) : null,
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'EXPENSE_CREATED',
      entityType: 'Expense',
      entityId: expense.id,
      metadata: { project_id: expense.project_id, total_amount: expense.total_amount }
    });

    return expense;
  }

  async findAll(context: TenantContext, query: ExpenseQueryDto) {
    const { project_id, category_id, vendor_id, status, from_date, to_date, page = '1', limit = '50' } = query;

    const where: Prisma.ExpenseWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
    };

    if (project_id) where.project_id = project_id;
    if (category_id) where.category_id = category_id;
    if (vendor_id) where.vendor_id = vendor_id;
    if (status) where.status = status;
    
    if (from_date || to_date) {
      where.created_at = {};
      if (from_date) where.created_at.gte = new Date(from_date);
      if (to_date) where.created_at.lte = new Date(to_date);
    }

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        take,
        skip,
        orderBy: { created_at: 'desc' },
        include: {
          project: { select: { name: true, code: true } },
          category: { select: { name: true } },
          vendor: { select: { name: true } }
        }
      }),
      this.prisma.expense.count({ where })
    ]);

    return {
      data: items,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: take,
        pages: Math.ceil(total / take)
      }
    };
  }

  async findOne(context: TenantContext, id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      include: {
        project: { select: { name: true, code: true } },
        category: { select: { name: true } },
        vendor: { select: { name: true } }
      }
    });

    if (!expense || expense.deleted_at) {
      throw new NotFoundException('Expense not found.');
    }

    return expense;
  }

  async update(context: TenantContext, id: string, dto: UpdateExpenseDto) {
    const existing = await this.findOne(context, id);

    // Optimistic Concurrency
    if (existing.version !== dto.version) {
      throw new ConflictException(\`Version mismatch. Expected \${existing.version}, but got \${dto.version}.\`);
    }

    const projectId = dto.project_id || existing.project_id;
    const categoryId = dto.category_id || existing.category_id;
    const vendorId = dto.vendor_id !== undefined ? dto.vendor_id : existing.vendor_id;

    if (dto.project_id || dto.category_id || dto.vendor_id !== undefined) {
      await this.validateRelationships(context, projectId, categoryId, vendorId);
    }

    const quantity = dto.quantity !== undefined ? dto.quantity : Number(existing.quantity);
    const unitPrice = dto.unit_price !== undefined ? dto.unit_price : existing.unit_price;
    const taxRate = dto.tax_rate !== undefined ? dto.tax_rate : Number(existing.tax_rate);

    const calculated = this.calculateFinancials(quantity, unitPrice, taxRate);
    this.validateCalculations(dto, calculated);

    const result = await this.prisma.expense.updateMany({
      where: { 
        id, 
        organization_id: context.organizationId,
        version: dto.version // Compare-and-swap
      },
      data: {
        project_id: projectId,
        category_id: categoryId,
        vendor_id: vendorId,
        item: dto.item !== undefined ? dto.item : existing.item,
        quantity: quantity,
        unit: dto.unit !== undefined ? dto.unit : existing.unit,
        unit_price: unitPrice,
        subtotal: calculated.subtotal,
        taxable_amount: calculated.taxable_amount,
        tax_rate: taxRate,
        tax_amount: calculated.tax_amount,
        total_amount: calculated.total_amount,
        currency: dto.currency !== undefined ? dto.currency : existing.currency,
        vendor_reference: dto.vendor_reference !== undefined ? dto.vendor_reference : existing.vendor_reference,
        invoice_number: dto.invoice_number !== undefined ? dto.invoice_number : existing.invoice_number,
        invoice_date: dto.invoice_date ? new Date(dto.invoice_date) : (dto.invoice_date === null ? null : existing.invoice_date),
        payment_status: dto.payment_status !== undefined ? dto.payment_status : existing.payment_status,
        payment_mode: dto.payment_mode !== undefined ? dto.payment_mode : existing.payment_mode,
        remarks: dto.remarks !== undefined ? dto.remarks : existing.remarks,
        status: dto.status !== undefined ? dto.status : existing.status,
        version: { increment: 1 },
        client_updated_at: dto.client_updated_at ? new Date(dto.client_updated_at) : existing.client_updated_at,
        updated_by: context.userId,
      }
    });

    if (result.count === 0) {
      throw new ConflictException('The expense was updated by another user.');
    }

    const updatedExpense = await this.findOne(context, id);

    await this.audit.logEvent(context, {
      action: 'EXPENSE_UPDATED',
      entityType: 'Expense',
      entityId: id,
      metadata: { version: updatedExpense.version, total_amount: updatedExpense.total_amount }
    });

    return updatedExpense;
  }

  async delete(context: TenantContext, id: string) {
    const expense = await this.findOne(context, id);

    await this.prisma.expense.update({
      where: { id_organization_id: { id, organization_id: context.organizationId } },
      data: {
        deleted_at: new Date(),
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'EXPENSE_DELETED',
      entityType: 'Expense',
      entityId: id,
      metadata: { item: expense.item }
    });

    return { success: true };
  }
}
