'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { materialsApi } from '@/features/materials/api/materials.api';
import { Material, MaterialRate } from '@/features/materials/types';
import { usePermissions } from '@/lib/permissions';
import { formatMoney, parseMoneyToMinorUnits } from '@/features/projects/utils/money';
import { vendorsApi } from '@/features/vendors/api/vendors.api';

export default function MaterialDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const { hasPermission } = usePermissions();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [material, setMaterial] = useState<Material | null>(null);
  const [latestRate, setLatestRate] = useState<MaterialRate | null>(null);
  const [rates, setRates] = useState<MaterialRate[]>([]);
  
  const [rateFormOpen, setRateFormOpen] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [submittingRate, setSubmittingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  
  const [rateForm, setRateForm] = useState({
    vendor_id: '',
    rateInput: '',
    currency: 'USD',
    effective_date: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const mat = await materialsApi.getMaterial(id);
      setMaterial(mat);
      
      if (hasPermission('material_rates:read')) {
        const [latestRes, ledgerRes] = await Promise.all([
          materialsApi.getLatestRate(id),
          materialsApi.getRates(id, { limit: 50 })
        ]);
        setLatestRate(latestRes.data);
        setRates(ledgerRes.data);
      }
      
      if (hasPermission('material_rates:write')) {
        const vendorRes = await vendorsApi.getVendors();
        setVendors(vendorRes || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load material details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('materials:read')) {
      loadData();
    }
  }, [id, hasPermission]);

  if (!hasPermission('materials:read')) {
    return <ErrorState message="You do not have permission to view materials." />;
  }

  const handleDelete = async () => {
    if (!hasPermission('materials:delete')) return;
    if (!window.confirm('Are you sure you want to archive this material?')) return;
    
    try {
      await materialsApi.deleteMaterial(id);
      router.push('/materials');
    } catch (err: any) {
      setError(err.message || 'Failed to archive material.');
    }
  };

  const handleAppendRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('material_rates:write')) return;
    
    setSubmittingRate(true);
    setRateError(null);
    
    const parsedRate = parseMoneyToMinorUnits(rateForm.rateInput);
    if (parsedRate.kind !== 'valid') {
      setRateError(parsedRate.kind === 'invalid' ? parsedRate.reason : 'Please enter a valid rate.');
      setSubmittingRate(false);
      return;
    }
    
    try {
      const payload = {
        vendor_id: rateForm.vendor_id || undefined,
        rate: parsedRate.minorUnits,
        currency: rateForm.currency,
        effective_date: rateForm.effective_date,
      };
      
      await materialsApi.createRate(id, payload);
      setRateFormOpen(false);
      setRateForm({ ...rateForm, rateInput: '' });
      await loadData();
    } catch (err: any) {
      setRateError(err.message || 'Failed to append rate.');
    } finally {
      setSubmittingRate(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;
  if (!material) return <ErrorState message="Material not found." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold tracking-tight">{material.name}</h1>
          <Badge variant={material.status === 'ACTIVE' ? 'success' : 'default'}>
            {material.status === 'ACTIVE' ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex space-x-2">
          {hasPermission('materials:write') && (
            <Link href={`/materials/${id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
          )}
          {hasPermission('materials:delete') && (
            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
              Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Master Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Code</div>
              <div className="font-medium">{material.code || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Unit of Measure</div>
              <div className="font-medium">{material.unit_of_measure}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Description</div>
              <div className="font-medium whitespace-pre-wrap">{material.description || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Version</div>
              <div className="font-medium">{material.version}</div>
            </div>
          </CardContent>
        </Card>

        {hasPermission('material_rates:read') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Latest Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {latestRate ? (
                <div className="space-y-4">
                  <div className="text-4xl font-bold">
                    {formatMoney(latestRate.rate, latestRate.currency)} <span className="text-sm font-normal text-muted-foreground">/ {material.unit_of_measure}</span>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Vendor</div>
                    <div className="font-medium">{latestRate.vendor?.name || 'All Vendors'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Effective Date</div>
                    <div className="font-medium">{new Date(latestRate.effective_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ) : (
                <EmptyState title="No rate established" description="There are no rates recorded for this material." />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {hasPermission('material_rates:read') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Rate Ledger</CardTitle>
            {hasPermission('material_rates:write') && (
              <Button onClick={() => setRateFormOpen(!rateFormOpen)}>
                {rateFormOpen ? 'Cancel' : 'Append Rate'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {rateFormOpen && (
              <div className="mb-6 p-4 border rounded bg-muted/30">
                <h3 className="font-medium mb-4">Append New Rate</h3>
                {rateError && <div className="text-red-500 mb-4 text-sm">{rateError}</div>}
                <form onSubmit={handleAppendRate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <label htmlFor="vendor_id" className="text-sm">Vendor (Optional)</label>
                    <select 
                      id="vendor_id"
                      className="w-full border rounded p-2"
                      value={rateForm.vendor_id}
                      onChange={e => setRateForm({ ...rateForm, vendor_id: e.target.value })}
                    >
                      <option value="">Any Vendor</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="rateInput" className="text-sm">Rate Amount *</label>
                    <input 
                      id="rateInput"
                      type="text" 
                      required 
                      className="w-full border rounded p-2"
                      placeholder="e.g. 14.59"
                      value={rateForm.rateInput}
                      onChange={e => setRateForm({ ...rateForm, rateInput: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="currency" className="text-sm">Currency *</label>
                    <input 
                      id="currency"
                      type="text" 
                      required 
                      className="w-full border rounded p-2"
                      value={rateForm.currency}
                      onChange={e => setRateForm({ ...rateForm, currency: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="effective_date" className="text-sm">Effective Date *</label>
                    <input 
                      id="effective_date"
                      type="date" 
                      required 
                      className="w-full border rounded p-2"
                      value={rateForm.effective_date}
                      onChange={e => setRateForm({ ...rateForm, effective_date: e.target.value })}
                    />
                  </div>
                  <Button type="submit" disabled={submittingRate} className="w-full">
                    {submittingRate ? 'Saving...' : 'Save Rate'}
                  </Button>
                </form>
              </div>
            )}

            {rates.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No historical rates found. The ledger is empty.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3">Effective Date</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3">Recorded On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map(r => (
                      <tr key={r.id} className="border-b">
                        <td className="px-4 py-3 font-medium">{new Date(r.effective_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{r.vendor?.name || <span className="text-muted-foreground">Any Vendor</span>}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatMoney(r.rate, r.currency)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
