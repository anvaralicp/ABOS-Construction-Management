import { fetchApi } from '@/lib/api';
import { Expense, CreateExpenseDto, UpdateExpenseDto, ExpenseQueryDto, ExpenseAttachment } from '../types';

export interface ExpenseListResponse {
  data: Expense[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export const expensesApi = {
  getExpenses: async (query?: ExpenseQueryDto): Promise<ExpenseListResponse> => {
    let qs = '';
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
      const str = params.toString();
      if (str) qs = `?${str}`;
    }
    // Assumes backend returns { data, meta } for paginated responses, based on ABOS standard
    // If backend returns flat array, we handle it in component
    return fetchApi(`/expenses${qs}`);
  },

  getExpense: async (id: string): Promise<Expense> => {
    return fetchApi(`/expenses/${id}`);
  },

  createExpense: async (data: CreateExpenseDto): Promise<Expense> => {
    return fetchApi('/expenses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateExpense: async (id: string, data: UpdateExpenseDto): Promise<Expense> => {
    return fetchApi(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  deleteExpense: async (id: string): Promise<void> => {
    return fetchApi(`/expenses/${id}`, {
      method: 'DELETE'
    });
  },

  getAttachments: async (id: string): Promise<ExpenseAttachment[]> => {
    return fetchApi(`/expenses/${id}/attachments`);
  },

  attachDocument: async (id: string, document_id: string): Promise<ExpenseAttachment> => {
    return fetchApi(`/expenses/${id}/attachments`, {
      method: 'POST',
      body: JSON.stringify({ document_id })
    });
  },

  removeAttachment: async (id: string, attachmentId: string): Promise<void> => {
    return fetchApi(`/expenses/${id}/attachments/${attachmentId}`, {
      method: 'DELETE'
    });
  }
};

