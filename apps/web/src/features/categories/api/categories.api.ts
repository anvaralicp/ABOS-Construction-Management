import { fetchApi } from '@/lib/api';
import { Category, CategoryTreeNode } from '../types';

export const categoriesApi = {
  getCategories: async (activeOnly = false): Promise<Category[]> => {
    const qs = activeOnly ? '?activeOnly=true' : '';
    return fetchApi(`/categories${qs}`);
  },
  
  getCategoryTree: async (activeOnly = false): Promise<CategoryTreeNode[]> => {
    const qs = activeOnly ? '?activeOnly=true' : '';
    return fetchApi(`/categories/tree${qs}`);
  },

  getCategory: async (id: string): Promise<Category> => {
    return fetchApi(`/categories/${id}`);
  },

  createCategory: async (payload: Partial<Category>): Promise<Category> => {
    return fetchApi('/categories', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateCategory: async (id: string, payload: Partial<Category>): Promise<Category> => {
    return fetchApi(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  deleteCategory: async (id: string): Promise<void> => {
    return fetchApi(`/categories/${id}`, {
      method: 'DELETE'
    });
  }
};
