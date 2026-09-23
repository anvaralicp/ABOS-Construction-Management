export type ExpenseStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface Expense {
  id: string;
  organization_id: string;
  project_id: string;
  category_id: string;
  vendor_id: string | null;
  tax_config_id: string | null;
  
  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;
  cess_amount: number | null;
  cgst_rate: string | number | null;
  sgst_rate: string | number | null;
  igst_rate: string | number | null;
  cess_rate: string | number | null;
  
  item: string;
  quantity: string | number; // Decimal mapped to string/number
  unit: string | null;
  unit_price: number;
  subtotal: number;
  taxable_amount: number;
  tax_rate: string | number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  
  vendor_reference: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  payment_status: PaymentStatus;
  payment_mode: string | null;
  remarks: string | null;
  
  status: ExpenseStatus;
  version: number;
  
  client_created_at: string | null;
  client_updated_at: string | null;
}

export interface CreateExpenseDto {
  project_id: string;
  category_id: string;
  vendor_id?: string | null;
  item: string;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  tax_rate: number;
  is_taxable?: boolean | null;
  currency: string;

  subtotal?: number;
  taxable_amount?: number;
  tax_amount?: number;
  total_amount?: number;

  vendor_reference?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  payment_status?: PaymentStatus;
  payment_mode?: string | null;
  remarks?: string | null;
  status?: ExpenseStatus;

  client_created_at?: string;
  client_updated_at?: string;
  id?: string;
}

export interface UpdateExpenseDto {
  version: number;
  project_id?: string;
  category_id?: string;
  vendor_id?: string | null;
  item?: string;
  quantity?: number;
  unit?: string | null;
  unit_price?: number;
  tax_rate?: number;
  is_taxable?: boolean | null;
  currency?: string;
  vendor_reference?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  payment_status?: PaymentStatus;
  payment_mode?: string | null;
  remarks?: string | null;
  status?: ExpenseStatus;

  client_updated_at?: string;
}

export interface ExpenseQueryDto {
  project_id?: string;
  category_id?: string;
  vendor_id?: string;
  status?: ExpenseStatus;
  from_date?: string;
  to_date?: string;
  page?: string;
  limit?: string;
}

export interface Document {
  id: string;
  organization_id: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
  created_at: string;
}

export interface ExpenseAttachment {
  id: string;
  organization_id: string;
  expense_id: string;
  document_id: string;
  document?: Document;
}

