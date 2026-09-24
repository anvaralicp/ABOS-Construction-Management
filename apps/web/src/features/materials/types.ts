export type MaterialStatus = 'ACTIVE' | 'INACTIVE';

export interface Material {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  description: string | null;
  unit_of_measure: string;
  status: MaterialStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialRate {
  id: string;
  material_id: string;
  vendor_id: string | null;
  rate: number;
  currency: string;
  effective_date: string;
  created_at: string;
  vendor?: {
    id: string;
    name: string;
  };
}

export interface CreateMaterialDto {
  name: string;
  code?: string;
  description?: string;
  unit_of_measure: string;
  status?: MaterialStatus;
}

export interface UpdateMaterialDto {
  version: number;
  name?: string;
  code?: string;
  description?: string;
  unit_of_measure?: string;
  status?: MaterialStatus;
}

export interface CreateMaterialRateDto {
  vendor_id?: string;
  rate: number;
  currency: string;
  effective_date: string;
}

export interface MaterialQueryDto {
  status?: MaterialStatus;
  search?: string;
  page?: string | number;
  limit?: string | number;
}

export interface MaterialRateQueryDto {
  vendor_id?: string;
  from_date?: string;
  to_date?: string;
  page?: string | number;
  limit?: string | number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface LatestRateResponse {
  data: MaterialRate | null;
}
