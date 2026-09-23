import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BudgetsPage from '../app/(dashboard)/budgets/page';
import NewBudgetPage from '../app/(dashboard)/budgets/new/page';
import EditBudgetPage from '../app/(dashboard)/budgets/[id]/edit/page';
import BudgetDetailPage from '../app/(dashboard)/budgets/[id]/page';
import { budgetsApi } from '../features/budgets/api/budgets.api';
import { projectsApi } from '../features/projects/api/projects.api';
import { categoriesApi } from '../features/categories/api/categories.api';
import { usePermissions } from '../lib/permissions';
import { Budget, BudgetSummary } from '../features/budgets/types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useParams: () => ({ id: 'budg-123' }),
}));

jest.mock('../features/budgets/api/budgets.api');
jest.mock('../features/projects/api/projects.api');
jest.mock('../features/categories/api/categories.api');

jest.mock('../lib/permissions', () => ({
  usePermissions: jest.fn()
}));

const mockBudgets: Budget[] = [
  {
    id: 'budg-123',
    organization_id: 'org-1',
    project_id: 'proj-1',
    name: 'Main Budget',
    notes: 'Some notes',
    total_amount: 5000000,
    currency: 'USD',
    status: 'ACTIVE',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    project: { name: 'Proj A', code: 'PA' },
    lines: [
      { id: 'line-1', category_id: 'cat-1', amount: 1000000, currency: 'USD', category: { name: 'Labor' } }
    ]
  }
];

const mockSummary: BudgetSummary = {
  budget_id: 'budg-123',
  project_id: 'proj-1',
  currency: 'USD',
  totals: { budgeted: 5000000, actual: 2000000, remaining: 3000000, variance: 3000000, utilization: 40 },
  breakdown: [
    { category_id: 'cat-1', category_name: 'Labor', budgeted: 1000000, actual: 500000, remaining: 500000, variance: 500000, utilization: 50, is_unbudgeted: false },
    { category_id: 'cat-unbudg', category_name: 'Unknown', budgeted: 0, actual: 20000, remaining: -20000, variance: -20000, utilization: 100, is_unbudgeted: true }
  ]
};

describe('Budgets Module', () => {
  let mockHasPermission: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission = jest.fn().mockReturnValue(true);
    (usePermissions as jest.Mock).mockReturnValue({
      hasPermission: mockHasPermission
    });
  });

  describe('List Page', () => {
    it('renders budgets and matches elements', async () => {
      (budgetsApi.getBudgets as jest.Mock).mockResolvedValue(mockBudgets);
      render(<BudgetsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Main Budget')).toBeInTheDocument();
      });
      expect(screen.getByText('Proj A')).toBeInTheDocument();
      expect(screen.getByText('$50,000.00')).toBeInTheDocument(); // 5000000 cents
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('handles permission denied', () => {
      mockHasPermission.mockImplementation((p) => p !== 'budgets:read');
      render(<BudgetsPage />);
      expect(screen.getByText('You do not have permission to view budgets.')).toBeInTheDocument();
    });
  });

  describe('Create Page', () => {
    it('submits a valid budget payload', async () => {
      (projectsApi.getProjects as jest.Mock).mockResolvedValue([{ id: 'proj-1', name: 'Proj A', code: 'PA' }]);
      (budgetsApi.createBudget as jest.Mock).mockResolvedValue({ id: 'budg-999' });

      render(<NewBudgetPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /project/i })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.selectOptions(screen.getByRole('combobox', { name: /project/i }), 'proj-1');
      await user.type(screen.getByLabelText(/budget name/i), 'New Budg');
      await user.type(screen.getByLabelText(/total amount/i), '123.45');
      
      const form = screen.getByRole('button', { name: /create budget/i }).closest('form');
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(budgetsApi.createBudget).toHaveBeenCalledWith({
          project_id: 'proj-1',
          name: 'New Budg',
          notes: undefined,
          total_amount: 12345,
          currency: 'USD'
        });
      });
      expect(mockPush).toHaveBeenCalledWith('/budgets/budg-999');
    });

    it('blocks submission on invalid monetary input', async () => {
      (projectsApi.getProjects as jest.Mock).mockResolvedValue([{ id: 'proj-1', name: 'Proj A', code: 'PA' }]);
      (budgetsApi.createBudget as jest.Mock).mockClear();

      render(<NewBudgetPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /project/i })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.selectOptions(screen.getByRole('combobox', { name: /project/i }), 'proj-1');
      await user.type(screen.getByLabelText(/budget name/i), 'New Budg');
      await user.type(screen.getByLabelText(/total amount/i), 'invalid-123');
      
      const form = screen.getByRole('button', { name: /create budget/i }).closest('form');
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Invalid total amount')).toBeInTheDocument();
      });
      expect(budgetsApi.createBudget).not.toHaveBeenCalled();
    });

    it('handles precision-sensitive monetary input accurately', async () => {
      (projectsApi.getProjects as jest.Mock).mockResolvedValue([{ id: 'proj-1', name: 'Proj A', code: 'PA' }]);
      (budgetsApi.createBudget as jest.Mock).mockResolvedValue({ id: 'budg-999' });

      render(<NewBudgetPage />);
      
      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /project/i })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.selectOptions(screen.getByRole('combobox', { name: /project/i }), 'proj-1');
      await user.type(screen.getByLabelText(/budget name/i), 'New Budg');
      await user.type(screen.getByLabelText(/total amount/i), '1.13'); // 1.13 * 100 = 112.99999999999999
      
      const form = screen.getByRole('button', { name: /create budget/i }).closest('form');
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(budgetsApi.createBudget).toHaveBeenCalledWith(expect.objectContaining({
          total_amount: 113
        }));
      });
    });
  });

  describe('Detail Page', () => {
    it('renders budget info and summary', async () => {
      (budgetsApi.getBudget as jest.Mock).mockResolvedValue(mockBudgets[0]);
      (budgetsApi.getBudgetSummary as jest.Mock).mockResolvedValue(mockSummary);
      (categoriesApi.getCategories as jest.Mock).mockResolvedValue([]);

      render(<BudgetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Budget')).toBeInTheDocument();
      });

      expect(screen.getByText('$50,000.00')).toBeInTheDocument(); // total
      expect(screen.getByText('$20,000.00')).toBeInTheDocument(); // actual
      expect(screen.getByText('$30,000.00')).toBeInTheDocument(); // remaining
      expect(screen.getByText('40.0% utilized')).toBeInTheDocument();
      expect(screen.getByText('Labor')).toBeInTheDocument();
      expect(screen.getByText('Unbudgeted Expense')).toBeInTheDocument();
    });

    it('handles line additions', async () => {
      (budgetsApi.getBudget as jest.Mock).mockResolvedValue(mockBudgets[0]);
      (budgetsApi.getBudgetSummary as jest.Mock).mockResolvedValue(mockSummary);
      (categoriesApi.getCategories as jest.Mock).mockResolvedValue([{ id: 'cat-2', name: 'Material' }]);
      (budgetsApi.addBudgetLine as jest.Mock).mockResolvedValue({});

      render(<BudgetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Add Line')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Add Line'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByLabelText(/category/i), 'cat-2');
      await user.type(screen.getByLabelText(/amount/i), '50.00');
      
      const buttons = screen.getAllByRole('button', { name: /add line/i });
      const submitBtn = buttons.find(b => b.getAttribute('type') === 'submit');
      if (submitBtn) await user.click(submitBtn);

      await waitFor(() => {
        expect(budgetsApi.addBudgetLine).toHaveBeenCalledWith('budg-123', {
          category_id: 'cat-2',
          amount: 5000,
          currency: 'USD'
        });
      });
    });

    it('handles deletions', async () => {
      (budgetsApi.getBudget as jest.Mock).mockResolvedValue(mockBudgets[0]);
      (budgetsApi.getBudgetSummary as jest.Mock).mockResolvedValue(mockSummary);
      (categoriesApi.getCategories as jest.Mock).mockResolvedValue([]);
      (budgetsApi.deleteBudget as jest.Mock).mockResolvedValue({});

      render(<BudgetDetailPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Delete Budget').length).toBeGreaterThan(0);
      });

      const user = userEvent.setup();
      const deleteButtons = screen.getAllByRole('button', { name: /delete budget/i });
      await user.click(deleteButtons[0]); // opens modal

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const modalButtons = screen.getAllByRole('button', { name: /delete budget/i });
      // The last one is usually the one inside the modal footer
      await user.click(modalButtons[modalButtons.length - 1]);

      await waitFor(() => {
        expect(budgetsApi.deleteBudget).toHaveBeenCalledWith('budg-123');
      });
      expect(mockPush).toHaveBeenCalledWith('/budgets');
    });

    it('hides summary when permission is denied', async () => {
      mockHasPermission.mockImplementation((p) => p !== 'budgets:summary');
      (budgetsApi.getBudget as jest.Mock).mockResolvedValue(mockBudgets[0]);
      (budgetsApi.getBudgetSummary as jest.Mock).mockResolvedValue(mockSummary);
      (categoriesApi.getCategories as jest.Mock).mockResolvedValue([]);

      render(<BudgetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Main Budget')).toBeInTheDocument();
      });

      // Assert summary elements are not rendered
      expect(screen.queryByText('Actual Spend')).not.toBeInTheDocument();
      expect(screen.queryByText('40.0% utilized')).not.toBeInTheDocument();
    });

    it('handles line edits', async () => {
      (budgetsApi.getBudget as jest.Mock).mockResolvedValue(mockBudgets[0]);
      (budgetsApi.getBudgetSummary as jest.Mock).mockResolvedValue(mockSummary);
      (categoriesApi.getCategories as jest.Mock).mockResolvedValue([]);
      (budgetsApi.updateBudgetLine as jest.Mock).mockResolvedValue({});

      render(<BudgetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Labor')).toBeInTheDocument(); // category name in line
      });

      const user = userEvent.setup();
      
      const editButtons = screen.getAllByRole('button').filter(b => b.innerHTML.includes('lucide-pen'));
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.clear(screen.getByLabelText(/amount/i));
      await user.type(screen.getByLabelText(/amount/i), '200.55');
      
      const buttons = screen.getAllByRole('button', { name: /save changes/i });
      const submitBtn = buttons.find(b => b.getAttribute('type') === 'submit');
      if (submitBtn) await user.click(submitBtn);

      await waitFor(() => {
        expect(budgetsApi.updateBudgetLine).toHaveBeenCalledWith('budg-123', 'line-1', {
          amount: 20055
        });
      });
      // Verifies reload
      expect(budgetsApi.getBudget).toHaveBeenCalledTimes(2);
    });

    it('handles line deletions', async () => {
      (budgetsApi.getBudget as jest.Mock).mockResolvedValue(mockBudgets[0]);
      (budgetsApi.getBudgetSummary as jest.Mock).mockResolvedValue(mockSummary);
      (categoriesApi.getCategories as jest.Mock).mockResolvedValue([]);
      (budgetsApi.deleteBudgetLine as jest.Mock).mockResolvedValue({});

      render(<BudgetDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Labor')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const deleteButtons = screen.getAllByRole('button').filter(b => b.innerHTML.includes('lucide-trash2'));
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const modalButtons = screen.getAllByRole('button', { name: /delete line/i });
      await user.click(modalButtons[modalButtons.length - 1]);

      await waitFor(() => {
        expect(budgetsApi.deleteBudgetLine).toHaveBeenCalledWith('budg-123', 'line-1');
      });
      expect(budgetsApi.getBudget).toHaveBeenCalledTimes(2); // +1 from deletion
    });
  });

  describe('Edit Page', () => {
    it('handles 409 concurrency conflict appropriately', async () => {
      (budgetsApi.getBudget as jest.Mock).mockResolvedValue(mockBudgets[0]);
      (budgetsApi.updateBudget as jest.Mock).mockRejectedValue(new Error('version mismatch'));

      render(<EditBudgetPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('50000.00')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.clear(screen.getByLabelText(/total amount/i));
      await user.type(screen.getByLabelText(/total amount/i), '60000.00');
      
      const form = screen.getByRole('button', { name: /save changes/i }).closest('form');
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/modified by another user/i)).toBeInTheDocument();
      });
    });

    it('handles successful budget update', async () => {
      (budgetsApi.getBudget as jest.Mock).mockResolvedValue(mockBudgets[0]);
      (budgetsApi.updateBudget as jest.Mock).mockResolvedValue({});

      render(<EditBudgetPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('50000.00')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.clear(screen.getByLabelText(/total amount/i));
      await user.type(screen.getByLabelText(/total amount/i), '123.45');
      
      const form = screen.getByRole('button', { name: /save changes/i }).closest('form');
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(budgetsApi.updateBudget).toHaveBeenCalledWith('budg-123', {
          version: 1, // exact version
          name: 'Main Budget',
          notes: 'Some notes',
          total_amount: 12345, // exact amount parsed correctly
          status: 'ACTIVE'
        });
      });
      expect(mockPush).toHaveBeenCalledWith('/budgets/budg-123');
    });

    it('blocks submission on invalid monetary input', async () => {
      (budgetsApi.getBudget as jest.Mock).mockResolvedValue(mockBudgets[0]);
      (budgetsApi.updateBudget as jest.Mock).mockClear();

      render(<EditBudgetPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('50000.00')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.clear(screen.getByLabelText(/total amount/i));
      await user.type(screen.getByLabelText(/total amount/i), 'invalid-123.45');
      
      const form = screen.getByRole('button', { name: /save changes/i }).closest('form');
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Invalid total amount')).toBeInTheDocument();
      });
      expect(budgetsApi.updateBudget).not.toHaveBeenCalled();
    });

    it('handles precision-sensitive monetary input accurately', async () => {
      (budgetsApi.getBudget as jest.Mock).mockResolvedValue(mockBudgets[0]);
      (budgetsApi.updateBudget as jest.Mock).mockResolvedValue({});
      (budgetsApi.updateBudget as jest.Mock).mockClear();

      render(<EditBudgetPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('50000.00')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.clear(screen.getByLabelText(/total amount/i));
      // floating point issue: 1.13 * 100 is 112.99999999999999
      await user.type(screen.getByLabelText(/total amount/i), '1.13');
      
      const form = screen.getByRole('button', { name: /save changes/i }).closest('form');
      if (form) fireEvent.submit(form);

      await waitFor(() => {
        expect(budgetsApi.updateBudget).toHaveBeenCalledWith('budg-123', expect.objectContaining({
          total_amount: 113 // strict minor units conversion handles it deterministically without float errors
        }));
      });
    });
  });
});
