import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoriesPage from '../app/(dashboard)/categories/page';
import CreateCategoryPage from '../app/(dashboard)/categories/new/page';
import CategoryDetailPage from '../app/(dashboard)/categories/[id]/page';
import EditCategoryPage from '../app/(dashboard)/categories/[id]/edit/page';
import { categoriesApi } from '../features/categories/api/categories.api';
import { usePermissions } from '../lib/permissions';

jest.mock('../features/categories/api/categories.api', () => ({
  categoriesApi: {
    getCategories: jest.fn(),
    getCategoryTree: jest.fn(),
    getCategory: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  }
}));

jest.mock('../lib/permissions', () => ({
  usePermissions: jest.fn()
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('Categories Web Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePermissions as jest.Mock).mockReturnValue({
      hasPermission: () => true
    });
  });

  describe('List / Tree View', () => {
    it('renders category tree with appropriate hierarchy boundaries', async () => {
      (categoriesApi.getCategoryTree as jest.Mock).mockResolvedValue([
        { 
          id: '1', name: 'Materials', is_active: true, children: [
            { id: '2', name: 'Steel', is_active: true, children: [] }
          ] 
        }
      ]);
      
      render(<CategoriesPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Materials')).toBeInTheDocument();
        expect(screen.getByText('Steel')).toBeInTheDocument();
      });
    });
  });

  describe('Create Category', () => {
    it('submits valid payload ignoring undefined optionals', async () => {
      (categoriesApi.getCategoryTree as jest.Mock).mockResolvedValue([]);
      (categoriesApi.createCategory as jest.Mock).mockResolvedValue({ id: 'cat-1' });

      render(<CreateCategoryPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Category Name/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/Category Name/i), 'Labor');
      await userEvent.click(screen.getByRole('button', { name: 'Create Category' }));
      
      await waitFor(() => {
        expect(categoriesApi.createCategory).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Labor',
          is_active: true
        }));
      });
    });
  });

  describe('Edit Category', () => {
    it('transmits explicit null natively when intentionally clearing nullable description & parent', async () => {
      (categoriesApi.getCategory as jest.Mock).mockResolvedValue({
        id: '2', name: 'Steel', description: 'Metals', parent_id: '1', is_active: true
      });
      (categoriesApi.getCategoryTree as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Materials', children: [{ id: '2', name: 'Steel', children: [] }] }
      ]);
      (categoriesApi.updateCategory as jest.Mock).mockResolvedValue({});
      
      render(<EditCategoryPage params={{ id: '2' }} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Description/i)).toHaveValue('Metals');
      });
      
      // Intentional clearance
      await userEvent.clear(screen.getByLabelText(/Description/i));
      await userEvent.selectOptions(screen.getByLabelText(/Parent Category/i), '');
      
      await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
      
      await waitFor(() => {
        expect(categoriesApi.updateCategory).toHaveBeenCalledWith('2', expect.objectContaining({
          name: 'Steel',
          description: null,
          parent_id: null
        }));
      });
    });
  });

  describe('Detail / Delete', () => {
    it('calls authoritative backend delete upon confirmation', async () => {
      (categoriesApi.getCategory as jest.Mock).mockResolvedValue({
        id: '1', name: 'Materials', is_active: true
      });
      (categoriesApi.getCategoryTree as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Materials', children: [] }
      ]);
      (categoriesApi.deleteCategory as jest.Mock).mockResolvedValue({});
      
      render(<CategoryDetailPage params={{ id: '1' }} />);
      
      await waitFor(() => {
        expect(screen.getByText('Materials')).toBeInTheDocument();
      });
      
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete Category' }));
      
      await waitFor(() => {
        expect(categoriesApi.deleteCategory).toHaveBeenCalledWith('1');
        expect(mockPush).toHaveBeenCalledWith('/categories');
      });
    });
  });
});
