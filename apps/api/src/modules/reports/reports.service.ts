import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { Prisma, PaymentStatus, ExpenseStatus, BudgetStatus, AttendanceStatus, EquipmentStatus, AssignmentStatus } from '@prisma/client';
import { ProjectSummaryQueryDto, ExpenseReportQueryDto, BudgetReportQueryDto, VendorReportQueryDto, WorkforceReportQueryDto, ProgressReportQueryDto, EquipmentReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureProjectAccess(context: TenantContext, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organization_id: context.organizationId,
        deleted_at: null
      }
    });

    if (!project) {
      throw new NotFoundException('Project not found or not accessible.');
    }
    return project;
  }

  async getFinancialSummary(context: TenantContext, projectId?: string, dateFrom?: string, dateTo?: string) {
    // 1. Budget Total (sum of active budget lines)
    const budgetWhere: Prisma.BudgetLineWhereInput = {
      organization_id: context.organizationId,
      budget: {
        status: BudgetStatus.ACTIVE,
        deleted_at: null
      }
    };
    if (projectId) budgetWhere.project_id = projectId;
    
    const budgetSum = await this.prisma.budgetLine.aggregate({
      where: budgetWhere,
      _sum: { amount: true }
    });
    const budget_total = budgetSum._sum.amount || 0;

    // 2. Actual Expense Total
    const expenseWhere: Prisma.ExpenseWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
      status: { not: ExpenseStatus.REJECTED } // Standard assumption: draft, pending, approved, paid count towards actual unless strictly paid. Let's assume non-rejected non-draft or just not rejected/deleted. We'll exclude DRAFT and REJECTED to be safe.
    };
    expenseWhere.status = { notIn: [ExpenseStatus.DRAFT, ExpenseStatus.REJECTED] };

    if (projectId) expenseWhere.project_id = projectId;
    if (dateFrom || dateTo) {
      expenseWhere.invoice_date = {};
      if (dateFrom) expenseWhere.invoice_date.gte = new Date(dateFrom);
      if (dateTo) expenseWhere.invoice_date.lte = new Date(dateTo);
    }

    const expenseSum = await this.prisma.expense.aggregate({
      where: expenseWhere,
      _sum: { total_amount: true }
    });
    const actual_expense_total = expenseSum._sum.total_amount || 0;

    // 3. Paid to Vendors
    const paymentWhere: Prisma.VendorPaymentWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
      status: { notIn: [PaymentStatus.CANCELED, PaymentStatus.FAILED] }
    };
    if (projectId) paymentWhere.project_id = projectId;
    if (dateFrom || dateTo) {
      paymentWhere.payment_date = {};
      if (dateFrom) paymentWhere.payment_date.gte = new Date(dateFrom);
      if (dateTo) paymentWhere.payment_date.lte = new Date(dateTo);
    }

    const paymentSum = await this.prisma.vendorPayment.aggregate({
      where: paymentWhere,
      _sum: { amount: true }
    });
    const paid_to_vendors = paymentSum._sum.amount || 0;

    // Outstanding Vendor Amount
    // We must calculate this PER vendor, not globally, to prevent overpayments to Vendor A
    // from artificially reducing the outstanding balance of Vendor B.
    const vendorExpenseWhere = { ...expenseWhere, vendor_id: { not: null } };
    
    const expensesGrouped = await this.prisma.expense.groupBy({
      by: ['vendor_id'],
      where: vendorExpenseWhere,
      _sum: { total_amount: true }
    });
    
    const paymentsGrouped = await this.prisma.vendorPayment.groupBy({
      by: ['vendor_id'],
      where: paymentWhere,
      _sum: { amount: true }
    });

    const vendorPaymentsMap = new Map(paymentsGrouped.map(p => [p.vendor_id, p._sum.amount || 0]));
    
    let outstanding_vendor_amount = 0;
    for (const expGroup of expensesGrouped) {
      const vendorExp = expGroup._sum.total_amount || 0;
      const vendorPay = vendorPaymentsMap.get(expGroup.vendor_id) || 0;
      outstanding_vendor_amount += Math.max(0, vendorExp - vendorPay);
    }

    const variance = budget_total - actual_expense_total;

    return {
      budget_total,
      actual_expense_total,
      paid_to_vendors,
      outstanding_vendor_amount,
      variance
    };
  }

  async getProjectSummary(context: TenantContext, query: ProjectSummaryQueryDto) {
    const { project_id, date_from, date_to } = query;
    const project = await this.ensureProjectAccess(context, project_id);

    const financial = await this.getFinancialSummary(context, project_id, date_from, date_to);

    const expenseWhere: Prisma.ExpenseWhereInput = {
      organization_id: context.organizationId,
      project_id,
      deleted_at: null,
      status: { notIn: [ExpenseStatus.DRAFT, ExpenseStatus.REJECTED] }
    };
    if (date_from || date_to) {
      expenseWhere.invoice_date = {};
      if (date_from) expenseWhere.invoice_date.gte = new Date(date_from);
      if (date_to) expenseWhere.invoice_date.lte = new Date(date_to);
    }
    const expensesCount = await this.prisma.expense.count({ where: expenseWhere });

    const attendanceWhere: Prisma.DailyAttendanceWhereInput = {
      organization_id: context.organizationId,
      project_id
    };
    if (date_from || date_to) {
      attendanceWhere.date = {};
      if (date_from) attendanceWhere.date.gte = new Date(date_from);
      if (date_to) attendanceWhere.date.lte = new Date(date_to);
    }
    const attendanceCount = await this.prisma.dailyAttendance.count({ where: attendanceWhere });

    const assignedWorkforceCount = await this.prisma.projectWorkforceAssignment.count({
      where: {
        organization_id: context.organizationId,
        project_id,
        status: AssignmentStatus.ACTIVE
      }
    });

    const activeEquipmentCount = await this.prisma.projectEquipmentAssignment.count({
      where: {
        organization_id: context.organizationId,
        project_id,
        status: AssignmentStatus.ACTIVE
      }
    });
    const totalEquipmentAssigned = await this.prisma.projectEquipmentAssignment.count({
      where: {
        organization_id: context.organizationId,
        project_id
      }
    });

    const progressWhere: Prisma.ProgressReportWhereInput = {
      organization_id: context.organizationId,
      project_id,
      deleted_at: null
    };
    if (date_from || date_to) {
      progressWhere.report_date = {};
      if (date_from) progressWhere.report_date.gte = new Date(date_from);
      if (date_to) progressWhere.report_date.lte = new Date(date_to);
    }
    const progressCount = await this.prisma.progressReport.count({ where: progressWhere });
    
    // Get latest progress
    const latestProgress = await this.prisma.progressReport.findFirst({
      where: { organization_id: context.organizationId, project_id, deleted_at: null },
      orderBy: { report_date: 'desc' },
      select: { report_date: true, summary: true } // Assuming no direct percentage field in schema, if there is none, return null. The schema doesn't have progress_percentage. So we'll return null for percentage.
    });

    return {
      project: {
        id: project.id,
        name: project.name,
        code: project.code,
        status: project.status
      },
      financial,
      expenses: {
        count: expensesCount,
        total: financial.actual_expense_total
      },
      workforce: {
        assigned: assignedWorkforceCount,
        attendance_records: attendanceCount
      },
      equipment: {
        assigned: totalEquipmentAssigned,
        active: activeEquipmentCount
      },
      progress: {
        report_count: progressCount,
        latest_progress_percentage: null, // Model lacks progress_percentage natively
        latest_report_date: latestProgress?.report_date || null
      }
    };
  }

  async getExpensesReport(context: TenantContext, query: ExpenseReportQueryDto) {
    const { project_id, category_id, vendor_id, status, date_from, date_to, page = 1, limit = 50 } = query;

    const where: Prisma.ExpenseWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null
    };

    if (project_id) where.project_id = project_id;
    if (category_id) where.category_id = category_id;
    if (vendor_id) where.vendor_id = vendor_id;
    if (status) where.status = status as ExpenseStatus;
    if (date_from || date_to) {
      where.invoice_date = {};
      if (date_from) where.invoice_date.gte = new Date(date_from);
      if (date_to) where.invoice_date.lte = new Date(date_to);
    }

    const aggregations = await this.prisma.expense.aggregate({
      where,
      _sum: {
        subtotal: true,
        tax_amount: true,
        total_amount: true
      },
      _count: true
    });

    const categoryGroups = await this.prisma.expense.groupBy({
      by: ['category_id'],
      where,
      _sum: { total_amount: true },
      _count: true
    });

    const vendorGroups = await this.prisma.expense.groupBy({
      by: ['vendor_id'],
      where,
      _sum: { total_amount: true },
      _count: true
    });

    // Populate category names manually since groupBy doesn't include relations
    const catIds = categoryGroups.map(g => g.category_id);
    const categories = await this.prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } });
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    const mappedCategories = categoryGroups.map(g => ({
      category_id: g.category_id,
      category_name: catMap.get(g.category_id) || 'Unknown',
      expense_count: g._count,
      total_amount: g._sum.total_amount || 0
    }));

    const skip = (page - 1) * limit;
    const items = await this.prisma.expense.findMany({
      where,
      take: limit,
      skip,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        item: true,
        total_amount: true,
        status: true,
        created_at: true,
        category: { select: { id: true, name: true } },
        vendor: { select: { id: true, name: true } }
      }
    });

    return {
      total_expense_amount: aggregations._sum.total_amount || 0,
      subtotal: aggregations._sum.subtotal || 0,
      tax_amount: aggregations._sum.tax_amount || 0,
      expense_count: aggregations._count || 0,
      category_summary: mappedCategories,
      vendor_summary: vendorGroups.map(g => ({
        vendor_id: g.vendor_id,
        expense_count: g._count,
        total_amount: g._sum.total_amount || 0
      })),
      data: items,
      meta: { total: aggregations._count, page, limit, pages: Math.ceil(aggregations._count / limit) }
    };
  }

  async getBudgetReport(context: TenantContext, query: BudgetReportQueryDto) {
    const { project_id } = query;

    const budgetWhere: Prisma.BudgetLineWhereInput = {
      organization_id: context.organizationId,
      budget: { status: BudgetStatus.ACTIVE, deleted_at: null }
    };
    if (project_id) budgetWhere.project_id = project_id;

    const budgetLines = await this.prisma.budgetLine.groupBy({
      by: ['category_id'],
      where: budgetWhere,
      _sum: { amount: true }
    });

    const expenseWhere: Prisma.ExpenseWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
      status: { notIn: [ExpenseStatus.DRAFT, ExpenseStatus.REJECTED] }
    };
    if (project_id) expenseWhere.project_id = project_id;

    const actualExpenses = await this.prisma.expense.groupBy({
      by: ['category_id'],
      where: expenseWhere,
      _sum: { total_amount: true }
    });

    const allCatIds = new Set([...budgetLines.map(b => b.category_id), ...actualExpenses.map(a => a.category_id)]);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: Array.from(allCatIds) }, organization_id: context.organizationId },
      select: { id: true, name: true }
    });
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    const budgetMap = new Map(budgetLines.map(b => [b.category_id, b._sum.amount || 0]));
    const actualMap = new Map(actualExpenses.map(a => [a.category_id, a._sum.total_amount || 0]));

    let totalBudget = 0;
    let totalActual = 0;

    const categoryBreakdown = Array.from(allCatIds).map(catId => {
      const bAmount = budgetMap.get(catId) || 0;
      const aAmount = actualMap.get(catId) || 0;
      totalBudget += bAmount;
      totalActual += aAmount;

      return {
        category_id: catId,
        category_name: catMap.get(catId) || 'Unknown',
        budget_amount: bAmount,
        actual_amount: aAmount,
        variance: bAmount - aAmount,
        utilization_percentage: bAmount > 0 ? Number(((aAmount / bAmount) * 100).toFixed(2)) : null
      };
    });

    return {
      budget_total: totalBudget,
      actual_total: totalActual,
      variance: totalBudget - totalActual,
      utilization_percentage: totalBudget > 0 ? Number(((totalActual / totalBudget) * 100).toFixed(2)) : null,
      categories: categoryBreakdown
    };
  }

  async getVendorsReport(context: TenantContext, query: VendorReportQueryDto) {
    const { vendor_id, project_id, date_from, date_to, page = 1, limit = 50 } = query;

    const expenseWhere: Prisma.ExpenseWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
      vendor_id: { not: null },
      status: { notIn: [ExpenseStatus.DRAFT, ExpenseStatus.REJECTED] }
    };
    if (project_id) expenseWhere.project_id = project_id;
    if (vendor_id) expenseWhere.vendor_id = vendor_id;
    if (date_from || date_to) {
      expenseWhere.invoice_date = {};
      if (date_from) expenseWhere.invoice_date.gte = new Date(date_from);
      if (date_to) expenseWhere.invoice_date.lte = new Date(date_to);
    }

    const expensesGrouped = await this.prisma.expense.groupBy({
      by: ['vendor_id'],
      where: expenseWhere,
      _sum: { total_amount: true },
      _count: true
    });

    const paymentWhere: Prisma.VendorPaymentWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
      status: { notIn: [PaymentStatus.CANCELED, PaymentStatus.FAILED] }
    };
    if (project_id) paymentWhere.project_id = project_id;
    if (vendor_id) paymentWhere.vendor_id = vendor_id;
    if (date_from || date_to) {
      paymentWhere.payment_date = {};
      if (date_from) paymentWhere.payment_date.gte = new Date(date_from);
      if (date_to) paymentWhere.payment_date.lte = new Date(date_to);
    }

    const paymentsGrouped = await this.prisma.vendorPayment.groupBy({
      by: ['vendor_id'],
      where: paymentWhere,
      _sum: { amount: true },
      _count: true
    });

    const expMap = new Map(expensesGrouped.map(e => [e.vendor_id, { total: e._sum.total_amount || 0, count: e._count }]));
    const payMap = new Map(paymentsGrouped.map(p => [p.vendor_id, { total: p._sum.amount || 0, count: p._count }]));

    const allVendorIds = new Set([...expMap.keys(), ...payMap.keys()].filter(id => id !== null) as string[]);
    
    // Pagination slicing
    const sortedVendorIds = Array.from(allVendorIds).sort();
    const totalVendors = sortedVendorIds.length;
    const skip = (page - 1) * limit;
    const paginatedVendorIds = sortedVendorIds.slice(skip, skip + limit);

    const vendors = await this.prisma.vendor.findMany({
      where: { id: { in: paginatedVendorIds }, organization_id: context.organizationId },
      select: { id: true, name: true }
    });

    const data = vendors.map(v => {
      const exp = expMap.get(v.id) || { total: 0, count: 0 };
      const pay = payMap.get(v.id) || { total: 0, count: 0 };
      return {
        vendor: { id: v.id, name: v.name },
        expense_total: exp.total,
        payment_total: pay.total,
        outstanding_total: Math.max(0, exp.total - pay.total),
        expense_count: exp.count,
        payment_count: pay.count
      };
    });

    return {
      data,
      meta: { total: totalVendors, page, limit, pages: Math.ceil(totalVendors / limit) }
    };
  }

  async getWorkforceReport(context: TenantContext, query: WorkforceReportQueryDto) {
    const { project_id, date_from, date_to, page = 1, limit = 50 } = query;

    const assignWhere: Prisma.ProjectWorkforceAssignmentWhereInput = {
      organization_id: context.organizationId,
      status: AssignmentStatus.ACTIVE
    };
    if (project_id) assignWhere.project_id = project_id;

    const assignedCount = await this.prisma.projectWorkforceAssignment.count({ where: assignWhere });

    const attendanceWhere: Prisma.DailyAttendanceWhereInput = {
      organization_id: context.organizationId
    };
    if (project_id) attendanceWhere.project_id = project_id;
    if (date_from || date_to) {
      attendanceWhere.date = {};
      if (date_from) attendanceWhere.date.gte = new Date(date_from);
      if (date_to) attendanceWhere.date.lte = new Date(date_to);
    }

    const attendanceStats = await this.prisma.dailyAttendance.groupBy({
      by: ['status'],
      where: attendanceWhere,
      _count: true
    });

    let present = 0, absent = 0, half_day = 0;
    let totalRecords = 0;

    for (const stat of attendanceStats) {
      if (stat.status === AttendanceStatus.PRESENT) present += stat._count;
      else if (stat.status === AttendanceStatus.ABSENT) absent += stat._count;
      else if (stat.status === AttendanceStatus.HALF_DAY) half_day += stat._count;
      totalRecords += stat._count;
    }

    const uniqueDaysCount = totalRecords > 0 ? (await this.prisma.dailyAttendance.groupBy({
      by: ['date'],
      where: attendanceWhere
    })).length : 0;

    const skip = (page - 1) * limit;
    const memberGroup = await this.prisma.dailyAttendance.groupBy({
      by: ['workforce_member_id'],
      where: attendanceWhere,
      _count: true,
      orderBy: { _count: { status: 'desc' } }, // Arbitrary sorting
      take: limit,
      skip
    });
    
    // We can fetch details for memberGroup, but just keeping it lightweight
    return {
      assigned_workforce_count: assignedCount,
      attendance_days: uniqueDaysCount,
      present_count: present,
      absent_count: absent,
      half_day_count: half_day,
      leave_count: absent, // Mapping leave to absent for report semantic
      total_attendance_records: totalRecords
    };
  }

  async getEquipmentReport(context: TenantContext, query: EquipmentReportQueryDto) {
    const { project_id } = query;

    const assignWhere: Prisma.ProjectEquipmentAssignmentWhereInput = {
      organization_id: context.organizationId
    };
    if (project_id) assignWhere.project_id = project_id;

    const total_assigned = await this.prisma.projectEquipmentAssignment.count({
      where: assignWhere
    });

    const active = await this.prisma.projectEquipmentAssignment.count({
      where: {
        ...assignWhere,
        status: AssignmentStatus.ACTIVE
      }
    });

    let available = 0, maintenance = 0, inactive = 0;

    // To get equipment statuses safely:
    const eqWhere: Prisma.EquipmentWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null
    };
    if (project_id) {
      eqWhere.assignments = { some: { project_id, status: AssignmentStatus.ACTIVE } };
    }
    
    const eqGroups = await this.prisma.equipment.groupBy({
      by: ['status'],
      where: eqWhere,
      _count: true
    });

    for (const g of eqGroups) {
      if (g.status === EquipmentStatus.AVAILABLE) available += g._count;
      else if (g.status === EquipmentStatus.MAINTENANCE) maintenance += g._count;
      else if (g.status === EquipmentStatus.INACTIVE) inactive += g._count;
    }

    return {
      total_assigned,
      currently_active: active,
      available,
      maintenance,
      inactive
    };
  }

  async getProgressReport(context: TenantContext, query: ProgressReportQueryDto) {
    const { project_id, date_from, date_to, page = 1, limit = 50 } = query;

    const where: Prisma.ProgressReportWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null
    };
    if (project_id) where.project_id = project_id;
    if (date_from || date_to) {
      where.report_date = {};
      if (date_from) where.report_date.gte = new Date(date_from);
      if (date_to) where.report_date.lte = new Date(date_to);
    }

    const reportCount = await this.prisma.progressReport.count({ where });

    const latest = await this.prisma.progressReport.findFirst({
      where,
      orderBy: { report_date: 'desc' },
      select: { report_date: true, summary: true, work_completed: true }
    });

    const skip = (page - 1) * limit;
    const history = await this.prisma.progressReport.findMany({
      where,
      orderBy: { report_date: 'desc' },
      take: limit,
      skip,
      select: {
        report_date: true,
        summary: true,
        work_completed: true,
        issues: true,
        next_day_plan: true
      }
    });

    const chronological_summary = history.map(h => ({
      report_date: h.report_date,
      progress_percentage: null, // No field
      work_summary: h.summary,
      accomplishments: h.work_completed,
      issues_blockers: h.issues,
      next_day_plan: h.next_day_plan
    }));

    return {
      report_count: reportCount,
      latest_report: latest ? {
        report_date: latest.report_date,
        summary: latest.summary
      } : null,
      average_progress_percentage: null,
      chronological_summary,
      meta: { total: reportCount, page, limit, pages: Math.ceil(reportCount / limit) }
    };
  }
}
