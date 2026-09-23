import { fetchApi } from '@/lib/api';
import { 
  Budget, 
  BudgetSummary,
  CreateBudgetDto, 
  UpdateBudgetDto, 
  CreateBudgetLineDto, 
  UpdateBudgetLineDto,
  BudgetLine
} from '../types';

export const budgetsApi = {
  getBudgets: async (): Promise<Budget[]> => {
    return fetchApi('/budgets');
  },

  getBudget: async (id: string): Promise<Budget> => {
    return fetchApi(`/budgets/${id}`);
  },

  createBudget: async (data: CreateBudgetDto): Promise<Budget> => {
    return fetchApi('/budgets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateBudget: async (id: string, data: UpdateBudgetDto): Promise<Budget> => {
    return fetchApi(`/budgets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  deleteBudget: async (id: string): Promise<void> => {
    return fetchApi(`/budgets/${id}`, {
      method: 'DELETE'
    });
  },

  addBudgetLine: async (id: string, data: CreateBudgetLineDto): Promise<BudgetLine> => {
    return fetchApi(`/budgets/${id}/lines`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateBudgetLine: async (id: string, lineId: string, data: UpdateBudgetLineDto): Promise<BudgetLine> => {
    return fetchApi(`/budgets/${id}/lines/${lineId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  deleteBudgetLine: async (id: string, lineId: string): Promise<void> => {
    return fetchApi(`/budgets/${id}/lines/${lineId}`, {
      method: 'DELETE'
    });
  },

  getBudgetSummary: async (id: string): Promise<BudgetSummary> => {
    return fetchApi(`/budgets/${id}/summary`);
  }
};
