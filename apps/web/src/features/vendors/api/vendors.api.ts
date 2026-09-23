import { fetchApi } from '@/lib/api';
import { Vendor, VendorContact } from '../types';

export const vendorsApi = {
  getVendors: async (): Promise<Vendor[]> => {
    return fetchApi('/vendors');
  },

  getVendor: async (id: string): Promise<Vendor> => {
    return fetchApi(`/vendors/${id}`);
  },

  createVendor: async (payload: Partial<Vendor>): Promise<Vendor> => {
    return fetchApi('/vendors', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateVendor: async (id: string, payload: Partial<Vendor>): Promise<Vendor> => {
    return fetchApi(`/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  deleteVendor: async (id: string): Promise<void> => {
    return fetchApi(`/vendors/${id}`, {
      method: 'DELETE'
    });
  },

  getContacts: async (vendorId: string): Promise<VendorContact[]> => {
    return fetchApi(`/vendors/${vendorId}/contacts`);
  },

  createContact: async (vendorId: string, payload: Partial<VendorContact>): Promise<VendorContact> => {
    return fetchApi(`/vendors/${vendorId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateContact: async (vendorId: string, contactId: string, payload: Partial<VendorContact>): Promise<VendorContact> => {
    return fetchApi(`/vendors/${vendorId}/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  deleteContact: async (vendorId: string, contactId: string): Promise<void> => {
    return fetchApi(`/vendors/${vendorId}/contacts/${contactId}`, {
      method: 'DELETE'
    });
  }
};
