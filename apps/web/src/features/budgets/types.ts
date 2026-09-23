export type BudgetStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export interface BudgetLine {
  id: string;
  category_id: string;
  amount: number;
  currency: string;
  category?: {
    name: string;
  };
}

export interface Budget {
  id: string;
  organization_id: string;
  project_id: string;
  name: string | null;
  notes: string | null;
  total_amount: number;
  currency: string;
  status: BudgetStatus;
  version: number;
  created_at: string;
  updated_at: string;
  project?: {
    name: string;
    code: string | null;
  };
  lines?: BudgetLine[];
}

export interface CreateBudgetLineDto {
  category_id: string;
  amount: number;
  currency: string;
}

export interface CreateBudgetDto {
  project_id: string;
  name?: string;
  notes?: string;
  total_amount: number;
  currency: string;
  lines?: CreateBudgetLineDto[];
}

export interface UpdateBudgetDto {
  version: number;
  name?: string;
  notes?: string;
  total_amount?: number;
  status?: BudgetStatus;
}

export interface UpdateBudgetLineDto {
  amount?: number;
}

export interface BudgetSummaryCategory {
  category_id: string;
  category_name: string;
  budgeted: number;
  actual: number;
  remaining: number;
  variance: number;
  utilization: number;
  is_unbudgeted: boolean;
}

export interface BudgetSummary {
  budget_id: string;
  project_id: string;
  currency: string;
  totals: {
    budgeted: number;
    actual: number;
    remaining: number;
    variance: number;
    utilization: number;
  };
  breakdown: BudgetSummaryCategory[];
}
