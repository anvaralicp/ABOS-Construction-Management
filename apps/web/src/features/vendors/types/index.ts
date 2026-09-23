export interface Vendor {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  tax_id: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface VendorContact {
  id: string;
  organization_id: string;
  vendor_id: string;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
