'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { materialsApi } from '@/features/materials/api/materials.api';
import { usePermissions } from '@/lib/permissions';
import { Material, MaterialStatus } from '@/features/materials/types';

export default function EditMaterialPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<boolean>(false);
  const [originalMaterial, setOriginalMaterial] = useState<Material | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    unit_of_measure: '',
    status: 'ACTIVE' as MaterialStatus,
  });

  const loadMaterial = async () => {
    try {
      setLoading(true);
      setError(null);
      setConflict(false);
      const data = await materialsApi.getMaterial(id);
      setOriginalMaterial(data);
      setFormData({
        name: data.name,
        code: data.code || '',
        description: data.description || '',
        unit_of_measure: data.unit_of_measure,
        status: data.status,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load material.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('materials:write')) {
      loadMaterial();
    }
  }, [id, hasPermission]);

  if (!hasPermission('materials:write')) {
    return <ErrorState message="You do not have permission to edit materials." />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalMaterial) return;

    try {
      setSubmitting(true);
      setError(null);
      setConflict(false);
      
      const payload = {
        version: originalMaterial.version,
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        unit_of_measure: formData.unit_of_measure,
        status: formData.status,
      };
      
      await materialsApi.updateMaterial(id, payload);
      router.push(`/materials/${id}`);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('version mismatch')) {
        setConflict(true);
        setError('This material has been updated by another user since you opened it.');
      } else if (err.message && err.message.toLowerCase().includes('updated by another user')) {
        setConflict(true);
        setError('The material was updated by another user.');
      } else {
        setError(err.message || 'Failed to update material.');
      }
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (!originalMaterial && error) return <ErrorState message={error} onRetry={loadMaterial} />;
  if (!originalMaterial) return <ErrorState message="Material not found." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Material</h1>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="p-4 text-red-700">
            <p className="font-semibold">{error}</p>
            {conflict && (
              <Button 
                variant="outline" 
                className="mt-4 bg-red-600 hover:bg-red-700 text-white"
                onClick={loadMaterial}
              >
                Reload Latest Version
              </Button>
            )}
          </CardContent>
        </Card>
      )}

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
                disabled={submitting || conflict}
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
                disabled={submitting || conflict}
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
                disabled={submitting || conflict}
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
                disabled={submitting || conflict}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <select 
                id="status"
                className="w-full border rounded p-2"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as MaterialStatus })}
                disabled={submitting || conflict}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="pt-4 flex items-center space-x-4">
              <Button type="submit" disabled={submitting || conflict}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
              <div className="text-xs text-muted-foreground">
                Version: {originalMaterial.version}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
