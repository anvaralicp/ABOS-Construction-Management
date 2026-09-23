'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { vendorsApi } from '@/features/vendors/api/vendors.api';
import { Vendor } from '@/features/vendors/types';
import { usePermissions } from '@/lib/permissions';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('vendors:write');

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vendorsApi.getVendors();
      setVendors(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const q = searchQuery.toLowerCase();
    return (
      vendor.name.toLowerCase().includes(q) ||
      (vendor.code && vendor.code.toLowerCase().includes(q)) ||
      (vendor.tax_id && vendor.tax_id.toLowerCase().includes(q))
    );
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadVendors} />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Vendors</h1>
          <p className="text-surface-500">Manage construction vendors and suppliers</p>
        </div>
        {canWrite && (
          <Link href="/vendors/new">
            <Button>Add Vendor</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-surface-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Vendor Directory</CardTitle>
            <Input 
              placeholder="Search vendors..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredVendors.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                title="No vendors found" 
                message={searchQuery ? 'Adjust your search terms.' : 'Add your first vendor to get started.'} 
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-50 text-surface-500 uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Code / Tax ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {filteredVendors.map(vendor => (
                    <tr key={vendor.id} className="hover:bg-surface-50">
                      <td className="px-4 py-3">
                        <Link href={`/vendors/${vendor.id}`} className="font-medium text-surface-900 hover:text-brand-600 hover:underline">
                          {vendor.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-surface-600">
                        <div className="flex flex-col">
                          {vendor.code && <span>{vendor.code}</span>}
                          {vendor.tax_id && <span className="text-xs text-surface-400">{vendor.tax_id}</span>}
                          {!vendor.code && !vendor.tax_id && <span className="text-surface-300">-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={vendor.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {vendor.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/vendors/${vendor.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
