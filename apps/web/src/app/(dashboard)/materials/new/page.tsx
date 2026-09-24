'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/states';
import { materialsApi } from '@/features/materials/api/materials.api';
import { usePermissions } from '@/lib/permissions';
import { MaterialStatus } from '@/features/materials/types';

export default function NewMaterialPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    unit_of_measure: '',
    status: 'ACTIVE' as MaterialStatus,
  });

  if (!hasPermission('materials:write')) {
    return <ErrorState message="You do not have permission to create materials." />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      
      const payload = {
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        unit_of_measure: formData.unit_of_measure,
        status: formData.status,
      };
      
      const material = await materialsApi.createMaterial(payload);
      router.push(`/materials/${material.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create material.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Add Material</h1>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      <Card>
        <CardHeader>
          <CardTitle>Material Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Name *</label>
              <input 
                id="name"
                type="text" 
                required 
                className="w-full border rounded p-2"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">Code (Optional)</label>
              <input 
                id="code"
                type="text" 
                className="w-full border rounded p-2"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="unit_of_measure" className="text-sm font-medium">Unit of Measure *</label>
              <input 
                id="unit_of_measure"
                type="text" 
                required 
                className="w-full border rounded p-2"
                value={formData.unit_of_measure}
                onChange={e => setFormData({ ...formData, unit_of_measure: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description (Optional)</label>
              <textarea 
                id="description"
                className="w-full border rounded p-2"
                rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <select 
                id="status"
                className="w-full border rounded p-2"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as MaterialStatus })}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Material'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
