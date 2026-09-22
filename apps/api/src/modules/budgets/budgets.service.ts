import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateBudgetDto, UpdateBudgetDto, CreateBudgetLineDto, UpdateBudgetLineDto } from './dto/budget.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async validateProject(context: TenantContext, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id_organization_id: { id: projectId, organization_id: context.organizationId } }
    });
    if (!project || project.deleted_at) {
      throw new BadRequestException('Project is invalid or does not belong to the organization.');
    }
  }

  private async validateCategories(context: TenantContext, categoryIds: string[]) {
    if (categoryIds.length === 0) return;
    
    const categories = await this.prisma.category.findMany({
      where: { 
        id: { in: categoryIds },
        organization_id: context.organizationId,
        deleted_at: null,
        is_active: true
      }
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('One or more categories are invalid, inactive, or do not belong to the organization.');
    }
  }

  async create(context: TenantContext, dto: CreateBudgetDto) {
    await this.validateProject(context, dto.project_id);
    if (dto.lines && dto.lines.length > 0) {
      await this.validateCategories(context, dto.lines.map(l => l.category_id));
    }

    const budget = await this.prisma.budget.create({
      data: {
        organization_id: context.organizationId,
        project_id: dto.project_id,
        name: dto.name,
        notes: dto.notes,
        total_amount: dto.total_amount,
        currency: dto.currency,
        created_by: context.userId,
        lines: {
          create: dto.lines?.map(line => ({
            organization_id: context.organizationId,
            project_id: dto.project_id,
            category_id: line.category_id,
            amount: line.amount,
            currency: line.currency,
            created_by: context.userId,
          })) || []
        }
      },
      include: { lines: true }
    });

    await this.audit.logEvent(context, {
      action: 'BUDGET_CREATED',
      entityType: 'Budget',
      entityId: budget.id,
      metadata: { project_id: budget.project_id, total_amount: budget.total_amount }
    });

    return budget;
  }

  async findAll(context: TenantContext) {
    return this.prisma.budget.findMany({
      where: { organization_id: context.organizationId, deleted_at: null },
      include: {
        project: { select: { name: true, code: true } }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async findOne(context: TenantContext, id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id_organization_id_project_id: undefined, id }, // Prisma handles unique id constraint, but we scope with first
    });

    // Actually, @@unique([id, organization_id, project_id]) requires project_id. Let's just findFirst:
    const scopedBudget = await this.prisma.budget.findFirst({
      where: { id, organization_id: context.organizationId, deleted_at: null },
      include: {
        project: { select: { name: true, code: true } },
        lines: {
          include: { category: { select: { name: true } } }
        }
      }
    });

    if (!scopedBudget) {
      throw new NotFoundException('Budget not found.');
    }

    return scopedBudget;
  }

  async update(context: TenantContext, id: string, dto: UpdateBudgetDto) {
    const existing = await this.findOne(context, id);

    if (existing.version !== dto.version) {
      throw new ConflictException(\`Version mismatch. Expected \${existing.version}, but got \${dto.version}.\`);
    }

    const result = await this.prisma.budget.updateMany({
      where: { 
        id, 
        organization_id: context.organizationId,
        version: dto.version
      },
      data: {
        name: dto.name !== undefined ? dto.name : existing.name,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        total_amount: dto.total_amount !== undefined ? dto.total_amount : existing.total_amount,
        status: dto.status !== undefined ? dto.status : existing.status,
        version: { increment: 1 },
        updated_by: context.userId,
      }
    });

    if (result.count === 0) {
      throw new ConflictException('The budget was updated by another user.');
    }

    const updated = await this.findOne(context, id);

    await this.audit.logEvent(context, {
      action: 'BUDGET_UPDATED',
      entityType: 'Budget',
      entityId: id,
      metadata: { version: updated.version, status: updated.status }
    });

    return updated;
  }

  async delete(context: TenantContext, id: string) {
    const budget = await this.findOne(context, id);

    await this.prisma.budget.updateMany({
      where: { id, organization_id: context.organizationId },
      data: {
        deleted_at: new Date(),
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'BUDGET_DELETED',
      entityType: 'Budget',
      entityId: id,
      metadata: { project_id: budget.project_id }
    });

    return { success: true };
  }

  // --- Budget Lines ---

  async addLine(context: TenantContext, budgetId: string, dto: CreateBudgetLineDto) {
    const budget = await this.findOne(context, budgetId);
    await this.validateCategories(context, [dto.category_id]);

    // Ensure category doesn't already have a line in this budget (canonical standard)
    const existingLine = await this.prisma.budgetLine.findFirst({
      where: { budget_id: budgetId, category_id: dto.category_id }
    });

    if (existingLine) {
      throw new ConflictException('Budget line for this category already exists.');
    }

    const line = await this.prisma.budgetLine.create({
      data: {
        organization_id: context.organizationId,
        project_id: budget.project_id,
        budget_id: budget.id,
        category_id: dto.category_id,
        amount: dto.amount,
        currency: dto.currency,
        created_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'BUDGET_LINE_CREATED',
      entityType: 'BudgetLine',
      entityId: line.id,
      metadata: { budgetId, category_id: dto.category_id }
    });

    return line;
  }

  async updateLine(context: TenantContext, budgetId: string, lineId: string, dto: UpdateBudgetLineDto) {
    await this.findOne(context, budgetId); // verify tenant

    const line = await this.prisma.budgetLine.findFirst({
      where: { id: lineId, budget_id: budgetId, organization_id: context.organizationId }
    });

    if (!line) {
      throw new NotFoundException('Budget line not found.');
    }

    const updated = await this.prisma.budgetLine.update({
      where: { id: line.id },
      data: {
        amount: dto.amount !== undefined ? dto.amount : line.amount,
        updated_by: context.userId,
      }
    });

    await this.audit.logEvent(context, {
      action: 'BUDGET_LINE_UPDATED',
      entityType: 'BudgetLine',
      entityId: line.id,
      metadata: { budgetId }
    });

    return updated;
  }

  async deleteLine(context: TenantContext, budgetId: string, lineId: string) {
    await this.findOne(context, budgetId);

    const line = await this.prisma.budgetLine.findFirst({
      where: { id: lineId, budget_id: budgetId, organization_id: context.organizationId }
    });

    if (!line) {
      throw new NotFoundException('Budget line not found.');
    }

    await this.prisma.budgetLine.delete({
      where: { id: line.id }
    });

    await this.audit.logEvent(context, {
      action: 'BUDGET_LINE_DELETED',
      entityType: 'BudgetLine',
      entityId: line.id,
      metadata: { budgetId }
    });

    return { success: true };
  }

  // --- Summary ---

  async getSummary(context: TenantContext, id: string) {
    const budget = await this.findOne(context, id);

    // Aggregate expenses for this project using DB aggregation
    const expenseGroups = await this.prisma.expense.groupBy({
      by: ['category_id'],
      where: {
        organization_id: context.organizationId,
        project_id: budget.project_id,
        deleted_at: null,
      },
      _sum: {
        total_amount: true,
      }
    });

    const expenseMap = new Map<string, number>();
    let totalActual = 0;

    for (const group of expenseGroups) {
      const amt = group._sum.total_amount || 0;
      expenseMap.set(group.category_id, amt);
      totalActual += amt;
    }

    const totalBudget = budget.total_amount;
    const remaining = totalBudget - totalActual;
    const variance = totalBudget - totalActual; // Positive = under budget, Negative = over budget
    const utilization = totalBudget === 0 ? 0 : (totalActual / totalBudget) * 100;

    const breakdown = budget.lines.map(line => {
      const lineBudget = line.amount;
      const lineActual = expenseMap.get(line.category_id) || 0;
      const lineRemaining = lineBudget - lineActual;
      const lineVariance = lineBudget - lineActual;
      const lineUtilization = lineBudget === 0 ? 0 : (lineActual / lineBudget) * 100;

      // Remove from map to track unbudgeted expenses
      expenseMap.delete(line.category_id);

      return {
        category_id: line.category_id,
        category_name: (line as any).category.name,
        budgeted: lineBudget,
        actual: lineActual,
        remaining: lineRemaining,
        variance: lineVariance,
        utilization: lineUtilization,
        is_unbudgeted: false,
      };
    });

    // Add remaining categories that have expenses but no budget line
    for (const [categoryId, actualAmount] of expenseMap.entries()) {
      // Find category name
      const category = await this.prisma.category.findUnique({ where: { id: categoryId }});
      breakdown.push({
        category_id: categoryId,
        category_name: category?.name || 'Unknown',
        budgeted: 0,
        actual: actualAmount,
        remaining: -actualAmount,
        variance: -actualAmount,
        utilization: actualAmount > 0 ? 100 : 0, // Convention for overspend on 0 budget
        is_unbudgeted: true,
      });
    }

    return {
      budget_id: budget.id,
      project_id: budget.project_id,
      currency: budget.currency,
      totals: {
        budgeted: totalBudget,
        actual: totalActual,
        remaining,
        variance,
        utilization,
      },
      breakdown,
    };
  }
}
