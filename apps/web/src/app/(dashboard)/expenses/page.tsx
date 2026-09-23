'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/states';
import { usePermissions } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-context';
import { expensesApi } from '@/features/expenses/api/expenses.api';
import { Expense } from '@/features/expenses/types';
import { formatMoney } from '@/features/projects/utils/money';
import { Plus, RefreshCw } from 'lucide-react';

export default function ExpensesListPage() {
  const { hasPermission } = usePermissions();
  const { isLoading: permsLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [projectIdFilter, setProjectIdFilter] = useState(searchParams.get('project_id') || '');

  const page = Number(searchParams.get('page')) || 1;
  const limit = 10; // default

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs: any = { page: String(page), limit: String(limit) };
      if (statusFilter) qs.status = statusFilter;
      if (projectIdFilter) qs.project_id = projectIdFilter;

      const res = await expensesApi.getExpenses(qs);
      if (Array.isArray(res)) {
        setExpenses(res);
      } else if (res && res.data) {
        setExpenses(res.data);
      } else {
        setExpenses([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, projectIdFilter]);

  useEffect(() => {
    if (permsLoading) return;
    loadData();
  }, [loadData, permsLoading]);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    if (statusFilter) params.set('status', statusFilter);
    else params.delete('status');
    
    if (projectIdFilter) params.set('project_id', projectIdFilter);
    else params.delete('project_id');

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setProjectIdFilter('');
    router.push(pathname);
  };

  if (permsLoading) return <LoadingState />;
  if (!hasPermission('expenses:read')) return <ErrorState message="You do not have permission to view expenses." />;

  const canWrite = hasPermission('expenses:write');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Expenses</h1>
          <p className="text-sm text-surface-500">Manage organizational expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canWrite && (
            <Button>
              <Link href="/expenses/new">
                <Plus className="w-4 h-4 mr-2" />
                New Expense
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-surface-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Status</label>
          <Select className="w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-surface-700">Project ID</label>
          <Input 
            className="w-48" 
            placeholder="Filter by UUID..." 
            value={projectIdFilter} 
            onChange={e => setProjectIdFilter(e.target.value)} 
          />
        </div>
        <Button onClick={applyFilters} variant="primary">Filter</Button>
        {(statusFilter || projectIdFilter) && (
          <Button onClick={clearFilters} variant="ghost">Clear</Button>
        )}
      </div>

      {loading && expenses.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : expenses.length === 0 ? (
        <EmptyState 
          title="No expenses found" 
          description="Get started by creating a new expense or adjusting your filters." 
          action={canWrite ? <Button><Link href="/expenses/new">Create Expense</Link></Button> : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border border-surface-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium text-surface-900 max-w-[200px] truncate">
                    {expense.item}
                    <div className="text-xs text-surface-500 mt-1 font-normal truncate">Project: {expense.project_id}</div>
                  </TableCell>
                  <TableCell>{formatMoney(expense.total_amount, expense.currency)}</TableCell>
                  <TableCell>
                    <Badge variant={expense.status === 'APPROVED' ? 'success' : expense.status === 'REJECTED' ? 'danger' : 'default'}>
                      {expense.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={expense.payment_status === 'PAID' ? 'success' : 'warning'}>
                      {expense.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Link href={`/expenses/${expense.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="p-4 border-t border-surface-200 flex items-center justify-between">
            <span className="text-sm text-surface-500">
              Showing page {page}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('page', String(page - 1));
                  router.push(`${pathname}?${params.toString()}`);
                }}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={expenses.length < limit}
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('page', String(page + 1));
                  router.push(`${pathname}?${params.toString()}`);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






