'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { materialsApi } from '@/features/materials/api/materials.api';
import { Material, MaterialStatus } from '@/features/materials/types';
import { usePermissions } from '@/lib/permissions';

const StatusBadge = ({ status }: { status: MaterialStatus }) => {
  const statusConfig: Record<MaterialStatus, { label: string, variant: 'default' | 'success' | 'warning' | 'danger' }> = {
    ACTIVE: { label: 'Active', variant: 'success' },
    INACTIVE: { label: 'Inactive', variant: 'default' }
  };
  
  const config = statusConfig[status] || { label: status, variant: 'default' };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const { hasPermission } = usePermissions();

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await materialsApi.getMaterials(search ? { search } : undefined);
      setMaterials(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load materials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('materials:read')) {
      loadMaterials();
    }
  }, [hasPermission]);

  if (!hasPermission('materials:read')) {
    return <ErrorState message="You do not have permission to view materials." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Materials</h1>
        {hasPermission('materials:write') && (
          <Link href="/materials/new">
            <Button>Add Material</Button>
          </Link>
        )}
      </div>

      <div className="flex space-x-2">
        <input 
          type="text" 
          placeholder="Search materials..." 
          className="border rounded p-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={loadMaterials} variant="outline">Search</Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadMaterials} />
      ) : materials.length === 0 ? (
        <EmptyState 
          title="No materials found"
          description={search ? "Try adjusting your search query." : "Add your first material to get started."}
        />
      ) : (
        <div className="grid gap-4">
          {materials.map((material) => (
            <Link key={material.id} href={`/materials/${material.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{material.name}</h3>
                      <div className="text-sm text-muted-foreground flex items-center space-x-2">
                        {material.code && <span>Code: {material.code}</span>}
                        {material.code && <span>•</span>}
                        <span>Unit: {material.unit_of_measure}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <StatusBadge status={material.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
