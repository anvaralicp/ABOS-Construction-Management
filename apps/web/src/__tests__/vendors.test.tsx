import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VendorsPage from '../app/(dashboard)/vendors/page';
import CreateVendorPage from '../app/(dashboard)/vendors/new/page';
import VendorDetailPage from '../app/(dashboard)/vendors/[id]/page';
import EditVendorPage from '../app/(dashboard)/vendors/[id]/edit/page';
import { vendorsApi } from '../features/vendors/api/vendors.api';
import { usePermissions } from '../lib/permissions';

jest.mock('../features/vendors/api/vendors.api', () => ({
  vendorsApi: {
    getVendors: jest.fn(),
    getVendor: jest.fn(),
    createVendor: jest.fn(),
    updateVendor: jest.fn(),
    deleteVendor: jest.fn(),
    getContacts: jest.fn(),
    createContact: jest.fn(),
    updateContact: jest.fn(),
    deleteContact: jest.fn(),
  }
}));

jest.mock('../lib/permissions', () => ({
  usePermissions: jest.fn()
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('Vendors Web Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePermissions as jest.Mock).mockReturnValue({
      hasPermission: () => true
    });
  });

  describe('List View', () => {
    it('renders list and filters correctly', async () => {
      (vendorsApi.getVendors as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Acme', code: 'A01', tax_id: null, status: 'ACTIVE' },
        { id: '2', name: 'Globex', code: 'G02', tax_id: '123', status: 'INACTIVE' }
      ]);
      
      render(<VendorsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Acme')).toBeInTheDocument();
        expect(screen.getByText('Globex')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search vendors/i);
      await userEvent.type(searchInput, 'Acme');
      
      await waitFor(() => {
        expect(screen.getByText('Acme')).toBeInTheDocument();
        expect(screen.queryByText('Globex')).not.toBeInTheDocument();
      });
    });
  });

  describe('Create Vendor', () => {
    it('submits valid payload omitting undefined strings', async () => {
      (vendorsApi.createVendor as jest.Mock).mockResolvedValue({ id: 'v-1' });

      render(<CreateVendorPage />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Vendor Name/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/Vendor Name/i), 'NewVendor');
      // Intentionally omit code and tax_id
      
      await userEvent.click(screen.getByRole('button', { name: 'Save Vendor' }));
      
      await waitFor(() => {
        expect(vendorsApi.createVendor).toHaveBeenCalledWith(expect.objectContaining({
          name: 'NewVendor',
          status: 'ACTIVE',
          code: undefined,
          tax_id: undefined
        }));
      });
    });
  });

  describe('Edit Vendor', () => {
    it('transmits explicit null for intentionally cleared nullable fields', async () => {
      (vendorsApi.getVendor as jest.Mock).mockResolvedValue({
        id: '2', name: 'Acme', code: 'A01', tax_id: 'TAX123', status: 'ACTIVE', address: '123 Main'
      });
      (vendorsApi.updateVendor as jest.Mock).mockResolvedValue({});
      
      render(<EditVendorPage params={{ id: '2' }} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Vendor Code/i)).toHaveValue('A01');
      });
      
      await userEvent.clear(screen.getByLabelText(/Vendor Code/i));
      await userEvent.clear(screen.getByLabelText(/Address/i));
      
      await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
      
      await waitFor(() => {
        expect(vendorsApi.updateVendor).toHaveBeenCalledWith('2', expect.objectContaining({
          name: 'Acme',
          code: null,
          address: null,
          tax_id: 'TAX123'
        }));
      });
    });
  });

  describe('Vendor Contacts', () => {
    it('creates a new contact sending correct boolean and undefined payload mapping', async () => {
      (vendorsApi.getVendor as jest.Mock).mockResolvedValue({
        id: '1', name: 'Acme', status: 'ACTIVE'
      });
      (vendorsApi.getContacts as jest.Mock).mockResolvedValue([]);
      (vendorsApi.createContact as jest.Mock).mockResolvedValue({});
      
      render(<VendorDetailPage params={{ id: '1' }} />);
      
      await waitFor(() => {
        expect(screen.getByText('Acme')).toBeInTheDocument();
      });
      
      await userEvent.click(screen.getByRole('button', { name: 'Add Contact' }));
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/Name/i, { selector: 'input' }), 'John Doe');
      await userEvent.click(screen.getByLabelText(/Set as Primary/i));
      
      await userEvent.click(screen.getByRole('button', { name: 'Save Contact' }));
      
      await waitFor(() => {
        expect(vendorsApi.createContact).toHaveBeenCalledWith('1', expect.objectContaining({
          name: 'John Doe',
          is_primary: true,
          email: undefined
        }));
      });
    });
  });
});
