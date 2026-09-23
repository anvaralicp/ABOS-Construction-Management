import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpensesListPage from '../app/(dashboard)/expenses/page';
import NewExpensePage from '../app/(dashboard)/expenses/new/page';
import EditExpensePage from '../app/(dashboard)/expenses/[id]/edit/page';
import ExpenseDetailPage from '../app/(dashboard)/expenses/[id]/page';
import { expensesApi } from '../features/expenses/api/expenses.api';
import { projectsApi } from '../features/projects/api/projects.api';
import { categoriesApi } from '../features/categories/api/categories.api';
import { vendorsApi } from '../features/vendors/api/vendors.api';
import { usePermissions } from '../lib/permissions';
import { useAuth } from '../lib/auth-context';
import { parseMoneyToMinorUnits } from '../features/projects/utils/money';
import { parseDecimalStrict, calculateExpensePreview } from '../features/expenses/utils/financials';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  usePathname: () => '/expenses',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'exp-123' }),
}));

// Mock API
jest.mock('../features/expenses/api/expenses.api');
jest.mock('../features/projects/api/projects.api');
jest.mock('../features/categories/api/categories.api');
jest.mock('../features/vendors/api/vendors.api');

// Mock permissions
jest.mock('../lib/auth-context', () => ({
  useAuth: jest.fn()
}));

jest.mock('../lib/permissions', () => ({
  usePermissions: jest.fn()
}));

const mockExpense = {
  id: 'exp-123',
  project_id: 'proj-1',
  category_id: 'cat-1',
  vendor_id: 'ven-1',
  item: 'Cement Bags',
  quantity: 5,
  unit_price: 1500050, // 15000.50
  tax_rate: 18,
  currency: 'USD',
  subtotal: 7500250,
  tax_amount: 1350045,
  total_amount: 8850295,
  status: 'DRAFT',
  payment_status: 'PENDING',
  version: 1
};

describe('Expenses Web Module', () => {
  beforeAll(() => {
  Object.defineProperty(global, 'crypto', {
    value: { randomUUID: () => 'test-uuid-1234' }
  });
});
  beforeEach(() => {
    jest.clearAllMocks();
    (usePermissions as jest.Mock).mockReturnValue({ hasPermission: () => true });
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false });
    
    (projectsApi.getProjects as jest.Mock).mockResolvedValue([{ id: 'proj-1', name: 'Project 1' }]);
    (categoriesApi.getCategories as jest.Mock).mockResolvedValue([{ id: 'cat-1', name: 'Category 1' }]);
    (vendorsApi.getVendors as jest.Mock).mockResolvedValue([{ id: 'ven-1', name: 'Vendor 1' }]);
  });

  describe('List Page', () => {
    it('renders loading state initially', () => {
      (expensesApi.getExpenses as jest.Mock).mockReturnValue(new Promise(() => {}));
      render(<ExpensesListPage />);
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('renders empty state if no expenses', async () => {
      (expensesApi.getExpenses as jest.Mock).mockResolvedValue({ data: [] });
      render(<ExpensesListPage />);
      await waitFor(() => {
        expect(screen.getByText('No expenses found')).toBeInTheDocument();
      });
    });

    it('renders expenses and pagination', async () => {
      (expensesApi.getExpenses as jest.Mock).mockResolvedValue({ data: [mockExpense] });
      render(<ExpensesListPage />);
      await waitFor(() => {
        expect(screen.getByText('Cement Bags')).toBeInTheDocument();
        expect(screen.getByText('$88,502.95')).toBeInTheDocument();
        expect(screen.getByText('Showing page 1')).toBeInTheDocument();
      });
    });
  });

  describe('Create Page', () => {
    it('renders form and creates an expense with explicit null for vendor if cleared', async () => {
      (expensesApi.createExpense as jest.Mock).mockResolvedValue({ id: 'new-exp-123' });
      
      render(<NewExpensePage />);
      
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Project 1' })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      
      await user.selectOptions(screen.getByLabelText(/Project/i), 'proj-1');
      await user.selectOptions(screen.getByLabelText(/Category/i), 'cat-1');
      
      // Vendor remains empty to test explicit null
      await user.type(screen.getByLabelText(/Item/i), 'New Item');
      await user.type(screen.getByLabelText(/Quantity/i), '1.5');
      await user.type(screen.getByLabelText(/Unit Price/i), '100.25');
      await user.type(screen.getByLabelText(/Tax Rate/i), '{backspace}5'); // Change 0 to 5

      await user.click(screen.getByRole('button', { name: /Create Expense/i }));

      await waitFor(() => {
        expect(expensesApi.createExpense).toHaveBeenCalledWith(
          expect.objectContaining({
            project_id: 'proj-1',
            category_id: 'cat-1',
            vendor_id: null,
            item: 'New Item',
            quantity: 1.5,
            unit_price: 10025,
            tax_rate: 5,
            subtotal: 15038, // 10025 * 1.5 = 15037.5 -> rounded to 15038
          })
        );
      });
    });
  });

  describe('Edit Page', () => {
        it('loads existing data and submits with version for optimistic concurrency, ensuring calculated fields are omitted and null semantics are preserved', async () => {
      (expensesApi.getExpense as jest.Mock).mockResolvedValue(mockExpense);
      (expensesApi.updateExpense as jest.Mock).mockResolvedValue({ id: 'exp-123' });

      render(<EditExpensePage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cement Bags')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.clear(screen.getByLabelText(/Item/i));
      await user.type(screen.getByLabelText(/Item/i), 'Updated Item');

      await user.selectOptions(screen.getByLabelText(/Vendor \(Optional\)/i), '');

      await user.click(screen.getByRole('button', { name: /Update Expense/i }));

      await waitFor(() => {
        expect(expensesApi.updateExpense).toHaveBeenCalledWith(
          'exp-123',
          expect.objectContaining({
            version: 1, // must pass original version
            item: 'Updated Item',
            vendor_id: null, // explicitly null
            quantity: 5,
            unit_price: 1500050,
            tax_rate: 18,
          })
        );
        
        const payload = (expensesApi.updateExpense as jest.Mock).mock.calls[0][1];
        expect(payload).not.toHaveProperty('subtotal');
        expect(payload).not.toHaveProperty('taxable_amount');
        expect(payload).not.toHaveProperty('tax_amount');
        expect(payload).not.toHaveProperty('total_amount');
      });
    });

    it('displays 409 conflict error clearly', async () => {
      (expensesApi.getExpense as jest.Mock).mockResolvedValue(mockExpense);
      (expensesApi.updateExpense as jest.Mock).mockRejectedValue({ status: 409 });

      render(<EditExpensePage />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Cement Bags')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /Update Expense/i }));

      await waitFor(() => {
        expect(screen.getByText('This expense was modified by another user. Please reload and try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Detail Page', () => {
    it('displays server-authoritative financial values and handles attachments', async () => {
      (expensesApi.getExpense as jest.Mock).mockResolvedValue(mockExpense);
      (expensesApi.getAttachments as jest.Mock).mockResolvedValue([{ id: 'att-1', document_id: 'doc-1' }]);
      (expensesApi.attachDocument as jest.Mock).mockResolvedValue({});

      render(<ExpenseDetailPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Cement Bags')).toBeInTheDocument();
        expect(screen.getByText('$88,502.95')).toBeInTheDocument();
        expect(screen.getByText('doc-1')).toBeInTheDocument();
      });
    });
  });

  describe('Financial Safety - Deterministic Parsing', () => {
    it('preserves empty string vs invalid string', () => {
      expect(parseMoneyToMinorUnits('')).toEqual({ kind: 'empty' });
      expect(parseMoneyToMinorUnits('   ')).toEqual({ kind: 'empty' });
      expect(parseMoneyToMinorUnits('abc')).toEqual({ kind: 'invalid', reason: 'Contains non-numeric characters.' });
    });

    it('rounds deterministic currency securely', () => {
      expect(parseMoneyToMinorUnits('1')).toEqual({ kind: 'valid', minorUnits: 100 });
      expect(parseMoneyToMinorUnits('1.00')).toEqual({ kind: 'valid', minorUnits: 100 });
      expect(parseMoneyToMinorUnits('1.01')).toEqual({ kind: 'valid', minorUnits: 101 });
      expect(parseMoneyToMinorUnits('1.004')).toEqual({ kind: 'valid', minorUnits: 100 });
      expect(parseMoneyToMinorUnits('1.005')).toEqual({ kind: 'valid', minorUnits: 101 });
      expect(parseMoneyToMinorUnits('10.10')).toEqual({ kind: 'valid', minorUnits: 1010 });
      expect(parseMoneyToMinorUnits('15000.50')).toEqual({ kind: 'valid', minorUnits: 1500050 });
    });

    it('rejects overflow safely', () => {
      // Something dangerously close to JS Max Safe Int for minor units
      expect(parseMoneyToMinorUnits('90071992547409.92')).toEqual({ kind: 'invalid', reason: 'Value exceeds maximum safe integer limits.' });
    });

    it('validates decimals safely via parseDecimalStrict', () => {
      expect(parseDecimalStrict('1.5')).toBe(1.5);
      expect(parseDecimalStrict('0')).toBe(0);
      expect(parseDecimalStrict('0.00')).toBe(0);
      expect(parseDecimalStrict('100')).toBe(100);
      expect(parseDecimalStrict('abc')).toBeNull();
      expect(parseDecimalStrict('')).toBeNull();
      expect(parseDecimalStrict('-1')).toBeNull(); // negative quantity/tax rate not allowed in strict parser context here
    });

    it('calculates preview accurately according to server formula', () => {
      // subtotal = Math.round(quantity * unitPrice)
      expect(calculateExpensePreview(1.5, 10025, 5)).toEqual({
        subtotal: 15038,
        taxable_amount: 15038,
        tax_amount: 752, // 15038 * 0.05 = 751.9 -> 752
        total_amount: 15790
      });
    });
  });
});




