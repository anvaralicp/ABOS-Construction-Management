import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MaterialsPage from '../app/(dashboard)/materials/page';
import NewMaterialPage from '../app/(dashboard)/materials/new/page';
import EditMaterialPage from '../app/(dashboard)/materials/[id]/edit/page';
import MaterialDetailPage from '../app/(dashboard)/materials/[id]/page';
import { materialsApi } from '../features/materials/api/materials.api';
import { vendorsApi } from '../features/vendors/api/vendors.api';
import { usePermissions } from '../lib/permissions';
import { Material, MaterialRate } from '../features/materials/types';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useParams: () => ({ id: 'mat-123' }),
}));

jest.mock('../features/materials/api/materials.api');
jest.mock('../features/vendors/api/vendors.api');

jest.mock('../lib/permissions', () => ({
  usePermissions: jest.fn()
}));

const mockMaterial: Material = {
  id: 'mat-123',
  organization_id: 'org-1',
  name: 'Cement',
  code: 'CEMENT',
  description: 'Portland Cement',
  unit_of_measure: 'bags',
  status: 'ACTIVE',
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockRate: MaterialRate = {
  id: 'rate-1',
  material_id: 'mat-123',
  vendor_id: 'ven-1',
  rate: 1459, // 14.59
  currency: 'USD',
  effective_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  vendor: { id: 'ven-1', name: 'Vendor A' }
};

describe('Materials Web Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePermissions as jest.Mock).mockReturnValue({
      hasPermission: () => true
    });
  });

  describe('Materials List (/materials)', () => {
    it('should render materials list', async () => {
      (materialsApi.getMaterials as jest.Mock).mockResolvedValue({ data: [mockMaterial], meta: { total: 1 } });
      render(<MaterialsPage />);

      await waitFor(() => {
        expect(screen.getByText('Cement')).toBeInTheDocument();
        expect(screen.getByText('Code: CEMENT')).toBeInTheDocument();
      });
    });

    it('should handle API error gracefully', async () => {
      (materialsApi.getMaterials as jest.Mock).mockRejectedValue(new Error('API failed'));
      render(<MaterialsPage />);

      await waitFor(() => {
        expect(screen.getByText('API failed')).toBeInTheDocument();
      });
    });

    it('should show empty state when no materials exist', async () => {
      (materialsApi.getMaterials as jest.Mock).mockResolvedValue({ data: [] });
      render(<MaterialsPage />);

      await waitFor(() => {
        expect(screen.getByText('No materials found')).toBeInTheDocument();
      });
    });

    it('should gate access based on materials:read permission', () => {
      (usePermissions as jest.Mock).mockReturnValue({ hasPermission: (p: string) => p !== 'materials:read' });
      render(<MaterialsPage />);
      expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
    });
  });

  describe('Create Material (/materials/new)', () => {
    it('should render form and submit successfully', async () => {
      (materialsApi.createMaterial as jest.Mock).mockResolvedValue(mockMaterial);
      render(<NewMaterialPage />);

      fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Sand' } });
      fireEvent.change(screen.getByLabelText(/Unit of Measure/i), { target: { value: 'tons' } });
      
      fireEvent.click(screen.getByText('Save Material'));

      await waitFor(() => {
        expect(materialsApi.createMaterial).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Sand',
          unit_of_measure: 'tons',
        }));
        expect(mockPush).toHaveBeenCalledWith('/materials/mat-123');
      });
    });
  });

  describe('Edit Material (/materials/[id]/edit)', () => {
    it('should load material, retain version, and submit successfully without client increment', async () => {
      (materialsApi.getMaterial as jest.Mock).mockResolvedValue(mockMaterial);
      (materialsApi.updateMaterial as jest.Mock).mockResolvedValue({ ...mockMaterial, version: 2 });
      
      render(<EditMaterialPage params={{ id: 'mat-123' }} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Cement')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Cement Updated' } });
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(materialsApi.updateMaterial).toHaveBeenCalledWith('mat-123', expect.objectContaining({
          name: 'Cement Updated',
          version: 1 // Crucial: submits original version exactly
        }));
        expect(mockPush).toHaveBeenCalledWith('/materials/mat-123');
      });
    });

    it('should show conflict error on stale version', async () => {
      (materialsApi.getMaterial as jest.Mock).mockResolvedValue(mockMaterial);
      (materialsApi.updateMaterial as jest.Mock).mockRejectedValue(new Error('Version mismatch. Expected 2, but got 1.'));
      
      render(<EditMaterialPage params={{ id: 'mat-123' }} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Cement')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText(/updated by another user since you opened it/i)).toBeInTheDocument();
      });
    });
  });

  describe('Material Detail (/materials/[id])', () => {
    beforeEach(() => {
      (materialsApi.getMaterial as jest.Mock).mockResolvedValue(mockMaterial);
      (materialsApi.getLatestRate as jest.Mock).mockResolvedValue({ data: mockRate });
      (materialsApi.getRates as jest.Mock).mockResolvedValue({ data: [mockRate] });
      (vendorsApi.getVendors as jest.Mock).mockResolvedValue([]);
    });

    it('should render master info and rates', async () => {
      render(<MaterialDetailPage params={{ id: 'mat-123' }} />);

      await waitFor(() => {
        expect(screen.getByText('Cement')).toBeInTheDocument();
        expect(screen.getByText('bags')).toBeInTheDocument(); // unit
        expect(screen.getByText('Rate Ledger')).toBeInTheDocument();
        expect(screen.getAllByText('$14.59')[0]).toBeInTheDocument(); // Latest rate major unit
      });
    });

    it('should handle null latest rate gracefully', async () => {
      (materialsApi.getLatestRate as jest.Mock).mockResolvedValue({ data: null });
      render(<MaterialDetailPage params={{ id: 'mat-123' }} />);

      await waitFor(() => {
        expect(screen.getByText('No rate established')).toBeInTheDocument();
      });
    });

    it('should parse user input into minor units exactly during Append Rate', async () => {
      (materialsApi.createRate as jest.Mock).mockResolvedValue(mockRate);
      
      render(<MaterialDetailPage params={{ id: 'mat-123' }} />);

      await waitFor(() => {
        expect(screen.getByText('Append Rate')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Append Rate'));
      
      const input = screen.getByLabelText(/Rate Amount/i);
      fireEvent.change(input, { target: { value: '14.59' } });
      
      fireEvent.click(screen.getByText('Save Rate'));

      await waitFor(() => {
        expect(materialsApi.createRate).toHaveBeenCalledWith('mat-123', expect.objectContaining({
          rate: 1459 // Exactly verified conversion
        }));
      });
    });

    it('should reject invalid rate inputs completely', async () => {
      render(<MaterialDetailPage params={{ id: 'mat-123' }} />);

      await waitFor(() => {
        expect(screen.getByText('Append Rate')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Append Rate'));
      
      const input = screen.getByLabelText(/Rate Amount/i);
      fireEvent.change(input, { target: { value: 'invalid-string' } });
      
      fireEvent.click(screen.getByText('Save Rate'));

      await waitFor(() => {
        expect(screen.getByText(/non-numeric characters/i)).toBeInTheDocument();
        expect(materialsApi.createRate).not.toHaveBeenCalled();
      });
    });
  });
});
