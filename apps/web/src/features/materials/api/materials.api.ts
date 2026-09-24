import { fetchApi } from '@/lib/api';
import {
  Material,
  MaterialRate,
  CreateMaterialDto,
  UpdateMaterialDto,
  CreateMaterialRateDto,
  MaterialQueryDto,
  MaterialRateQueryDto,
  PaginatedResponse,
  LatestRateResponse
} from '../types';

export const materialsApi = {
  getMaterials: async (query?: MaterialQueryDto): Promise<PaginatedResponse<Material>> => {
    const searchParams = new URLSearchParams();
    if (query?.status) searchParams.set('status', query.status);
    if (query?.search) searchParams.set('search', query.search);
    if (query?.page) searchParams.set('page', query.page.toString());
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    
    const qs = searchParams.toString();
    const url = qs ? `/materials?${qs}` : '/materials';
    return fetchApi(url);
  },

  getMaterial: async (id: string): Promise<Material> => {
    return fetchApi(`/materials/${id}`);
  },

  createMaterial: async (data: CreateMaterialDto): Promise<Material> => {
    return fetchApi('/materials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateMaterial: async (id: string, data: UpdateMaterialDto): Promise<Material> => {
    return fetchApi(`/materials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteMaterial: async (id: string): Promise<void> => {
    return fetchApi(`/materials/${id}`, {
      method: 'DELETE',
    });
  },

  getRates: async (id: string, query?: MaterialRateQueryDto): Promise<PaginatedResponse<MaterialRate>> => {
    const searchParams = new URLSearchParams();
    if (query?.vendor_id) searchParams.set('vendor_id', query.vendor_id);
    if (query?.from_date) searchParams.set('from_date', query.from_date);
    if (query?.to_date) searchParams.set('to_date', query.to_date);
    if (query?.page) searchParams.set('page', query.page.toString());
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    
    const qs = searchParams.toString();
    const url = qs ? `/materials/${id}/rates?${qs}` : `/materials/${id}/rates`;
    return fetchApi(url);
  },

  getLatestRate: async (id: string, vendorId?: string): Promise<LatestRateResponse> => {
    const qs = vendorId ? `?vendor_id=${vendorId}` : '';
    return fetchApi(`/materials/${id}/rates/latest${qs}`);
  },

  createRate: async (id: string, data: CreateMaterialRateDto): Promise<MaterialRate> => {
    return fetchApi(`/materials/${id}/rates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
};
