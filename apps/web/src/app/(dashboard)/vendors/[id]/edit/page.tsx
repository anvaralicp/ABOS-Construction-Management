'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { Select } from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { vendorsApi } from '@/features/vendors/api/vendors.api';
import { Vendor } from '@/features/vendors/types';

export default function EditVendorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
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

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoadingInitial(true);
      setError(null);
      const data = await vendorsApi.getVendor(id);
      setVendor(data);
      setFormData({
        name: data.name,
        code: data.code || '',
        tax_id: data.tax_id || '',
        status: data.status,
        address: data.address || '',
        notes: data.notes || ''
      });
    } catch (err: any) {
      if (err.message.includes('404')) {
        setError('Vendor not found.');
      } else {
        setError(err.message || 'Failed to load vendor details.');
      }
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        name: formData.name.trim(),
        status: formData.status as 'ACTIVE' | 'INACTIVE',
      };

      // Nullable PATCH semantics
      payload.code = formData.code.trim() === '' ? null : formData.code.trim();
      payload.tax_id = formData.tax_id.trim() === '' ? null : formData.tax_id.trim();
      payload.address = formData.address.trim() === '' ? null : formData.address.trim();
      payload.notes = formData.notes.trim() === '' ? null : formData.notes.trim();

      await vendorsApi.updateVendor(id, payload);
      router.push(`/vendors/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update vendor.');
      setLoading(false);
    }
  };

  if (loadingInitial) return <LoadingState />;
  if (error && !vendor) return (
    <div className="space-y-4">
      <ErrorState message={error} onRetry={loadData} />
      <div className="flex justify-center">
        <Link href={`/vendors/${id}`}><Button variant="outline">Back to Vendor</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/vendors/${id}`}>
          <Button variant="outline" size="sm">Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-surface-900">Edit Vendor</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Vendor Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{error}</div>}

            <FormField label="Vendor Name" htmlFor="name">
              <Input id="name" name="name" required maxLength={255} value={formData.name} onChange={handleChange} />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Vendor Code" htmlFor="code">
                <Input id="code" name="code" maxLength={100} value={formData.code} onChange={handleChange} />
              </FormField>
              <FormField label="Tax ID / GSTIN" htmlFor="tax_id">
                <Input id="tax_id" name="tax_id" maxLength={100} value={formData.tax_id} onChange={handleChange} />
              </FormField>
            </div>

            <FormField label="Status" htmlFor="status">
              <Select id="status" name="status" value={formData.status} onChange={handleChange}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </FormField>

            <FormField label="Address" htmlFor="address">
              <Input id="address" name="address" maxLength={1000} value={formData.address} onChange={handleChange} />
            </FormField>

            <FormField label="Notes" htmlFor="notes">
              <Input id="notes" name="notes" value={formData.notes} onChange={handleChange} />
            </FormField>

          </CardContent>
          <CardFooter className="flex justify-end gap-2 bg-surface-50">
            <Link href={`/vendors/${id}`}><Button variant="outline" type="button">Cancel</Button></Link>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

