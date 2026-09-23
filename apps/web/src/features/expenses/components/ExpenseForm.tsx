'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/ui/form';
import { Expense, ExpenseStatus, PaymentStatus } from '../types';
import { expensesApi } from '../api/expenses.api';
import { parseMoneyToMinorUnits, formatMoney } from '@/features/projects/utils/money';
import { calculateExpensePreview, parseDecimalStrict } from '../utils/financials';

// Import references
import { projectsApi } from '@/features/projects/api/projects.api';
import { categoriesApi } from '@/features/categories/api/categories.api';
import { vendorsApi } from '@/features/vendors/api/vendors.api';
import { Project } from '@/features/projects/types';
import { Category } from '@/features/categories/types';
import { Vendor } from '@/features/vendors/types';

interface ExpenseFormProps {
  initialData?: Expense;
  isEdit?: boolean;
}

export function ExpenseForm({ initialData, isEdit }: ExpenseFormProps) {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // We maintain raw string values for monetary inputs to prevent floating point issues in UI
  const [formData, setFormData] = useState({
    project_id: initialData?.project_id || '',
    category_id: initialData?.category_id || '',
    vendor_id: initialData?.vendor_id || '',
    item: initialData?.item || '',
    quantity: initialData?.quantity ? String(initialData.quantity) : '',
    unit: initialData?.unit || '',
    unit_price: initialData ? String(initialData.unit_price / 100) : '',
    tax_rate: initialData?.tax_rate ? String(initialData.tax_rate) : '0',
    currency: initialData?.currency || 'USD',
    vendor_reference: initialData?.vendor_reference || '',
    invoice_number: initialData?.invoice_number || '',
    invoice_date: initialData?.invoice_date ? initialData.invoice_date.split('T')[0] : '',
    payment_status: initialData?.payment_status || 'PENDING',
    payment_mode: initialData?.payment_mode || '',
    remarks: initialData?.remarks || '',
    status: initialData?.status || 'DRAFT',
  });

  const [idempotencyKey] = useState(() => initialData?.id || crypto.randomUUID());

  useEffect(() => {
    Promise.all([
      projectsApi.getProjects(),
      categoriesApi.getCategories(true),
      vendorsApi.getVendors()
    ]).then(([p, c, v]) => {
      setProjects(p);
      setCategories(c);
      setVendors(v);
    }).catch(err => {
      console.error('Failed to load references', err);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const getPreview = () => {
    const q = parseDecimalStrict(formData.quantity);
    const moneyResult = parseMoneyToMinorUnits(formData.unit_price);
    const tr = parseDecimalStrict(formData.tax_rate);

    if (q !== null && moneyResult.kind === 'valid' && tr !== null) {
      return calculateExpensePreview(q, moneyResult.minorUnits, tr);
    }
    return null;
  };

  const preview = getPreview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const quantity = parseDecimalStrict(formData.quantity);
      if (quantity === null) throw new Error('Invalid quantity');

      const tax_rate = parseDecimalStrict(formData.tax_rate);
      if (tax_rate === null) throw new Error('Invalid tax rate');

      const moneyResult = parseMoneyToMinorUnits(formData.unit_price);
      if (moneyResult.kind !== 'valid') {
        throw new Error(moneyResult.kind === 'invalid' ? moneyResult.reason : 'Unit price is required');
      }
      
      const unit_price = moneyResult.minorUnits;
      const calc = calculateExpensePreview(quantity, unit_price, tax_rate);

      if (isEdit && initialData) {
        await expensesApi.updateExpense(initialData.id, {
          version: initialData.version,
          project_id: formData.project_id || undefined,
          category_id: formData.category_id || undefined,
          vendor_id: formData.vendor_id || null, // send explicit null if cleared
          item: formData.item,
          quantity,
          unit: formData.unit || null,
          unit_price,
          tax_rate,
          currency: formData.currency,
          vendor_reference: formData.vendor_reference || null,
          invoice_number: formData.invoice_number || null,
          invoice_date: formData.invoice_date || null,
          payment_status: formData.payment_status as PaymentStatus,
          payment_mode: formData.payment_mode || null,
          remarks: formData.remarks || null,
          status: formData.status as ExpenseStatus,
        });
        router.push(`/expenses/${initialData.id}`);
      } else {
        const created = await expensesApi.createExpense({
          id: idempotencyKey,
          project_id: formData.project_id,
          category_id: formData.category_id,
          vendor_id: formData.vendor_id || null,
          item: formData.item,
          quantity,
          unit: formData.unit || null,
          unit_price,
          tax_rate,
          currency: formData.currency,
          subtotal: calc.subtotal,
          taxable_amount: calc.taxable_amount,
          tax_amount: calc.tax_amount,
          total_amount: calc.total_amount,
          vendor_reference: formData.vendor_reference || null,
          invoice_number: formData.invoice_number || null,
          invoice_date: formData.invoice_date || null,
          payment_status: formData.payment_status as PaymentStatus,
          payment_mode: formData.payment_mode || null,
          remarks: formData.remarks || null,
          status: formData.status as ExpenseStatus,
        });
        router.push(`/expenses/${created.id}`);
      }
    } catch (err: any) {
      if (err.status === 409) {
        setError('This expense was modified by another user. Please reload and try again.');
      } else {
        setError(err.message || 'Failed to save expense');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {error && (
        <div className="p-4 bg-danger-50 text-danger-700 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Project" htmlFor="project_id">
          <Select id="project_id" name="project_id" value={formData.project_id} onChange={handleChange} required>
            <option value="">Select Project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </FormField>
        
        <FormField label="Category" htmlFor="category_id">
          <Select id="category_id" name="category_id" value={formData.category_id} onChange={handleChange} required>
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </FormField>

        <FormField label="Vendor (Optional)" htmlFor="vendor_id">
          <Select id="vendor_id" name="vendor_id" value={formData.vendor_id} onChange={handleChange}>
            <option value="">No Vendor</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
        </FormField>

        <FormField label="Currency" htmlFor="currency">
          <Select id="currency" name="currency" value={formData.currency} onChange={handleChange} required>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-4">
          <FormField label="Item / Description" htmlFor="item">
            <Input id="item" name="item" value={formData.item} onChange={handleChange} required maxLength={500} />
          </FormField>
        </div>

        <FormField label="Quantity" htmlFor="quantity">
          <Input id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} required />
        </FormField>

        <FormField label="Unit (e.g. hrs, pcs)" htmlFor="unit">
          <Input id="unit" name="unit" value={formData.unit} onChange={handleChange} />
        </FormField>

        <FormField label="Unit Price" htmlFor="unit_price">
          <Input id="unit_price" name="unit_price" value={formData.unit_price} onChange={handleChange} required />
        </FormField>

        <FormField label="Tax Rate (%)" htmlFor="tax_rate">
          <Input id="tax_rate" name="tax_rate" value={formData.tax_rate} onChange={handleChange} required />
        </FormField>
      </div>

      <div className="p-4 bg-surface-50 rounded-lg border border-surface-200">
        <h4 className="text-sm font-semibold text-surface-900 mb-2">Preview Totals (Calculated)</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-surface-500 block">Subtotal</span>
            <span className="font-medium text-surface-900">{preview ? formatMoney(preview.subtotal, formData.currency) : '—'}</span>
          </div>
          <div>
            <span className="text-surface-500 block">Tax</span>
            <span className="font-medium text-surface-900">{preview ? formatMoney(preview.tax_amount, formData.currency) : '—'}</span>
          </div>
          <div>
            <span className="text-surface-500 block">Total</span>
            <span className="font-medium text-brand-700 text-lg">{preview ? formatMoney(preview.total_amount, formData.currency) : '—'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField label="Invoice Number" htmlFor="invoice_number">
          <Input id="invoice_number" name="invoice_number" value={formData.invoice_number} onChange={handleChange} />
        </FormField>
        
        <FormField label="Invoice Date" htmlFor="invoice_date">
          <Input id="invoice_date" name="invoice_date" type="date" value={formData.invoice_date} onChange={handleChange} />
        </FormField>

        <FormField label="Vendor Ref" htmlFor="vendor_reference">
          <Input id="vendor_reference" name="vendor_reference" value={formData.vendor_reference} onChange={handleChange} />
        </FormField>

        <FormField label="Status" htmlFor="status">
          <Select id="status" name="status" value={formData.status} onChange={handleChange} required>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </FormField>

        <FormField label="Payment Status" htmlFor="payment_status">
          <Select id="payment_status" name="payment_status" value={formData.payment_status} onChange={handleChange} required>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </Select>
        </FormField>

        <FormField label="Payment Mode" htmlFor="payment_mode">
          <Input id="payment_mode" name="payment_mode" value={formData.payment_mode} onChange={handleChange} />
        </FormField>
      </div>
      
      <FormField label="Remarks" htmlFor="remarks">
        <Textarea id="remarks" name="remarks" value={formData.remarks} onChange={handleChange} rows={3} />
      </FormField>

      <div className="flex justify-end gap-3 pt-6 border-t border-surface-200">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : (isEdit ? 'Update Expense' : 'Create Expense')}</Button>
      </div>
    </form>
  );
}
