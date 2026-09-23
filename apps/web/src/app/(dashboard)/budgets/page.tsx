'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { budgetsApi } from '@/features/budgets/api/budgets.api';
import { Budget, BudgetStatus } from '@/features/budgets/types';
import { usePermissions } from '@/lib/permissions';
import { formatMoney } from '@/features/projects/utils/money';

const StatusBadge = ({ status }: { status: BudgetStatus }) => {
  const statusConfig: Record<BudgetStatus, { label: string, variant: 'default' | 'success' | 'warning' | 'danger' }> = {
    DRAFT: { label: 'Draft', variant: 'default' },
    ACTIVE: { label: 'Active', variant: 'success' },
    CLOSED: { label: 'Closed', variant: 'default' }
  };
  
  const config = statusConfig[status] || { label: status, variant: 'default' };
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { hasPermission } = usePermissions();

  const loadBudgets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await budgetsApi.getBudgets();
      setBudgets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  if (!hasPermission('budgets:read')) return <ErrorState message="You do not have permission to view budgets." />;

  const canWrite = hasPermission('budgets:write');

  if (loading && budgets.length === 0) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadBudgets} />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-surface-900">Budgets</h1>
        {canWrite && (
          <Link href="/budgets/new">
            <Button>Create Budget</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {budgets.length === 0 ? (
            <div className="p-6">
              <EmptyState 
                title="No budgets found" 
                description="Create your first budget to get started." 
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-50 text-surface-500 border-b border-surface-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Budget Name</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Total Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {budgets.map((budget) => (
                    <tr key={budget.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-surface-900">
                          {budget.name || 'Unnamed Budget'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-surface-900">
                          {budget.project?.name || 'Unknown Project'}
                        </div>
                        {budget.project?.code && (
                          <div className="text-xs text-surface-500">{budget.project.code}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={budget.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(budget.total_amount, budget.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/budgets/${budget.id}`}>
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
