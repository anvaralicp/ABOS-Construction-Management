import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateVendorPaymentDto, UpdateVendorPaymentDto, VendorPaymentQueryDto } from './dto/vendor-payment.dto';
import { Prisma, PaymentStatus } from '@prisma/client';

@Injectable()
export class VendorPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(context: TenantContext, dto: CreateVendorPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Vendor
      const vendor = await tx.vendor.findUnique({
        where: { id_organization_id: { id: dto.vendor_id, organization_id: context.organizationId } }
      });
      if (!vendor || vendor.deleted_at) {
        throw new BadRequestException('Vendor is invalid or does not belong to the organization.');
      }

      // 2. Validate Project (if provided)
      if (dto.project_id) {
        const project = await tx.project.findUnique({
          where: { id_organization_id: { id: dto.project_id, organization_id: context.organizationId } }
        });
        if (!project || project.deleted_at) {
          throw new BadRequestException('Project is invalid or does not belong to the organization.');
        }
      }

      // 3. Validate Expense and check outstanding amount (if provided)
      if (dto.expense_id) {
        const expense = await tx.expense.findFirst({
          where: { id: dto.expense_id, organization_id: context.organizationId, deleted_at: null }
        });
        
        if (!expense) {
          throw new BadRequestException('Expense is invalid or does not belong to the organization.');
        }

        if (expense.vendor_id && expense.vendor_id !== dto.vendor_id) {
          throw new BadRequestException('Expense belongs to a different vendor.');
        }

        if (dto.project_id && expense.project_id !== dto.project_id) {
          throw new BadRequestException('Project mismatch between payment and expense.');
        }

        // Calculate current outstanding
        const existingPayments = await tx.vendorPayment.aggregate({
          where: { 
            expense_id: dto.expense_id, 
            status: { notIn: [PaymentStatus.CANCELED, PaymentStatus.FAILED] },
            deleted_at: null 
          },
          _sum: { amount: true }
        });

        const paidSoFar = existingPayments._sum.amount || 0;
        const outstanding = expense.total_amount - paidSoFar;

        if (dto.amount > outstanding) {
          throw new BadRequestException(\`Payment amount (\${dto.amount}) exceeds outstanding expense balance (\${outstanding}).\`);
        }
      }

      // 4. Create Payment
      const payment = await tx.vendorPayment.create({
        data: {
          organization_id: context.organizationId,
          vendor_id: dto.vendor_id,
          project_id: dto.project_id,
          expense_id: dto.expense_id,
          amount: dto.amount,
          currency: dto.currency,
          payment_date: new Date(dto.payment_date),
          payment_method: dto.payment_method,
          reference_number: dto.reference_number,
          status: dto.status,
          remarks: dto.remarks,
          created_by: context.userId,
        }
      });

      await this.audit.logEvent(context, {
        action: 'VENDOR_PAYMENT_CREATED',
        entityType: 'VendorPayment',
        entityId: payment.id,
        metadata: { vendor_id: payment.vendor_id, amount: payment.amount, expense_id: payment.expense_id }
      });

      return payment;
    }, {
      // Use serializable isolation to prevent concurrent payment creations from exceeding outstanding balance
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }

  async findAll(context: TenantContext, query: VendorPaymentQueryDto) {
    const { vendor_id, project_id, expense_id, status, from_date, to_date, page = '1', limit = '50' } = query;

    const where: Prisma.VendorPaymentWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
    };

    if (vendor_id) where.vendor_id = vendor_id;
    if (project_id) where.project_id = project_id;
    if (expense_id) where.expense_id = expense_id;
    if (status) where.status = status;
    if (from_date || to_date) {
      where.payment_date = {};
      if (from_date) where.payment_date.gte = new Date(from_date);
      if (to_date) where.payment_date.lte = new Date(to_date);
    }

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vendorPayment.findMany({
        where,
        take,
        skip,
        orderBy: { payment_date: 'desc' },
        include: {
          vendor: { select: { name: true, code: true } }
        }
      }),
      this.prisma.vendorPayment.count({ where })
    ]);

    return {
      data: items,
      meta: { total, page: parseInt(page, 10), limit: take, pages: Math.ceil(total / take) }
    };
  }

  async findOne(context: TenantContext, id: string) {
    const payment = await this.prisma.vendorPayment.findFirst({
      where: { id, organization_id: context.organizationId, deleted_at: null },
      include: {
        vendor: { select: { name: true, code: true } },
        expense: { select: { receipt_number: true, total_amount: true } },
        project: { select: { name: true, code: true } },
      }
    });

    if (!payment) {
      throw new NotFoundException('Vendor payment not found.');
    }

    return payment;
  }

  async update(context: TenantContext, id: string, dto: UpdateVendorPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.vendorPayment.findFirst({
        where: { id, organization_id: context.organizationId, deleted_at: null }
      });

      if (!existing) {
        throw new NotFoundException('Vendor payment not found.');
      }

      if (existing.version !== dto.version) {
        throw new ConflictException(\`Version mismatch. Expected \${existing.version}, but got \${dto.version}.\`);
      }

      // If amount or status changes and it's tied to an expense, re-evaluate outstanding balance
      if (existing.expense_id && (dto.amount !== undefined || dto.status !== undefined)) {
        const expense = await tx.expense.findUnique({
          where: { id: existing.expense_id }
        });

        const newAmount = dto.amount !== undefined ? dto.amount : existing.amount;
        const newStatus = dto.status !== undefined ? dto.status : existing.status;
        
        const isNewStatusCounted = ![PaymentStatus.CANCELED, PaymentStatus.FAILED].includes(newStatus);
        const isOldStatusCounted = ![PaymentStatus.CANCELED, PaymentStatus.FAILED].includes(existing.status);

        // Calculate other payments' sum
        const otherPayments = await tx.vendorPayment.aggregate({
          where: { 
            expense_id: existing.expense_id,
            id: { not: existing.id },
            status: { notIn: [PaymentStatus.CANCELED, PaymentStatus.FAILED] },
            deleted_at: null 
          },
          _sum: { amount: true }
        });

        const otherPaid = otherPayments._sum.amount || 0;
        const proposedTotalPaid = otherPaid + (isNewStatusCounted ? newAmount : 0);

        if (proposedTotalPaid > expense.total_amount) {
          throw new BadRequestException(\`Proposed update exceeds outstanding expense balance (\${expense.total_amount - otherPaid}).\`);
        }
      }

      const updated = await tx.vendorPayment.update({
        where: { id },
        data: {
          amount: dto.amount !== undefined ? dto.amount : existing.amount,
          payment_date: dto.payment_date ? new Date(dto.payment_date) : existing.payment_date,
          payment_method: dto.payment_method !== undefined ? dto.payment_method : existing.payment_method,
          reference_number: dto.reference_number !== undefined ? dto.reference_number : existing.reference_number,
          status: dto.status !== undefined ? dto.status : existing.status,
          remarks: dto.remarks !== undefined ? dto.remarks : existing.remarks,
          version: { increment: 1 },
          updated_by: context.userId,
        }
      });

      await this.audit.logEvent(context, {
        action: 'VENDOR_PAYMENT_UPDATED',
        entityType: 'VendorPayment',
        entityId: id,
        metadata: { version: updated.version, status: updated.status }
      });

      return updated;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }

  async delete(context: TenantContext, id: string) {
    const payment = await this.findOne(context, id);

    await this.prisma.vendorPayment.updateMany({
      where: { id, organization_id: context.organizationId },
      data: {
        deleted_at: new Date(),
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'VENDOR_PAYMENT_DELETED',
      entityType: 'VendorPayment',
      entityId: id,
      metadata: { vendor_id: payment.vendor_id }
    });

    return { success: true };
  }

  // --- Settlements ---

  async getExpenseSettlementSummary(context: TenantContext, expenseId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, organization_id: context.organizationId, deleted_at: null }
    });

    if (!expense) {
      throw new NotFoundException('Expense not found.');
    }

    const payments = await this.prisma.vendorPayment.findMany({
      where: { 
        expense_id: expenseId, 
        organization_id: context.organizationId,
        deleted_at: null 
      },
      orderBy: { payment_date: 'asc' }
    });

    let totalPaid = 0;
    for (const payment of payments) {
      if (![PaymentStatus.CANCELED, PaymentStatus.FAILED].includes(payment.status)) {
        totalPaid += payment.amount;
      }
    }

    const outstanding = Math.max(0, expense.total_amount - totalPaid);

    return {
      expense_id: expense.id,
      total_amount: expense.total_amount,
      total_paid: totalPaid,
      outstanding_amount: outstanding,
      currency: expense.currency,
      is_fully_paid: outstanding === 0,
      payments
    };
  }

  async getVendorSettlementSummary(context: TenantContext, vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id_organization_id: { id: vendorId, organization_id: context.organizationId } }
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found.');
    }

    // 1. Total expenses for this vendor
    const expenseSum = await this.prisma.expense.aggregate({
      where: { vendor_id: vendorId, organization_id: context.organizationId, deleted_at: null },
      _sum: { total_amount: true }
    });

    // 2. Total paid to this vendor
    const paymentSum = await this.prisma.vendorPayment.aggregate({
      where: { 
        vendor_id: vendorId, 
        organization_id: context.organizationId, 
        status: { notIn: [PaymentStatus.CANCELED, PaymentStatus.FAILED] },
        deleted_at: null 
      },
      _sum: { amount: true }
    });

    const totalExpenseAmount = expenseSum._sum.total_amount || 0;
    const totalPaid = paymentSum._sum.amount || 0;
    const outstanding = Math.max(0, totalExpenseAmount - totalPaid);

    return {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      total_expense_amount: totalExpenseAmount,
      total_paid: totalPaid,
      outstanding_amount: outstanding
    };
  }
}
