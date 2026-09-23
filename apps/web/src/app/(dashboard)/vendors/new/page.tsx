'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { Select } from '@/components/ui/select';
import { vendorsApi } from '@/features/vendors/api/vendors.api';

export default function CreateVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    tax_id: '',
    status: 'ACTIVE',
    address: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        tax_id: formData.tax_id.trim() || undefined,
        status: formData.status as 'ACTIVE' | 'INACTIVE',
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      };

      const newVendor = await vendorsApi.createVendor(payload);
      router.push(`/vendors/${newVendor.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create vendor.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/vendors">
          <Button variant="outline" size="sm">Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900">Add Vendor</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{error}</div>}

            <FormField label="Vendor Name" htmlFor="name">
              <Input id="name" name="name" required maxLength={255} value={formData.name} onChange={handleChange} placeholder="e.g. Acme Supplies" />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Vendor Code" htmlFor="code">
                <Input id="code" name="code" maxLength={100} value={formData.code} onChange={handleChange} placeholder="Optional" />
              </FormField>
              <FormField label="Tax ID / GSTIN" htmlFor="tax_id">
                <Input id="tax_id" name="tax_id" maxLength={100} value={formData.tax_id} onChange={handleChange} placeholder="Optional" />
              </FormField>
            </div>

            <FormField label="Status" htmlFor="status">
              <Select id="status" name="status" value={formData.status} onChange={handleChange}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </FormField>

            <FormField label="Address" htmlFor="address">
              <Input id="address" name="address" maxLength={1000} value={formData.address} onChange={handleChange} placeholder="Physical or billing address" />
            </FormField>

            <FormField label="Notes" htmlFor="notes">
              <Input id="notes" name="notes" value={formData.notes} onChange={handleChange} placeholder="Internal notes" />
            </FormField>

          </CardContent>
          <CardFooter className="flex justify-end gap-2 bg-surface-50">
            <Link href="/vendors"><Button variant="outline" type="button">Cancel</Button></Link>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Vendor'}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

