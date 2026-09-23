'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { budgetsApi } from '@/features/budgets/api/budgets.api';
import { Budget, BudgetStatus } from '@/features/budgets/types';
import { parseMoneyToMinorUnits } from '@/features/projects/utils/money';
import { usePermissions } from '@/lib/permissions';

export default function EditBudgetPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { hasPermission } = usePermissions();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [status, setStatus] = useState<BudgetStatus>('DRAFT');
  
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoadingData(true);
      setInitError(null);
      const b = await budgetsApi.getBudget(id);
      setBudget(b);
      setName(b.name || '');
      setNotes(b.notes || '');
      setTotalAmount((b.total_amount / 100).toFixed(2));
      setStatus(b.status);
    } catch (err: any) {
      setInitError(err.message || 'Failed to load budget');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (hasPermission('budgets:write')) {
      loadData();
    }
  }, [hasPermission, id]);

  if (loadingData) return <LoadingState />;
  if (!hasPermission('budgets:write')) return <ErrorState message="You do not have permission to edit budgets." />;
  if (initError) return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <ErrorState message={initError} onRetry={loadData} />
      <div className="flex justify-center">
        <Link href={`/budgets/${id}`}>
          <Button variant="outline">Back to Budget</Button>
        </Link>
      </div>
    </div>
  );
  if (!budget) return <ErrorState message="Budget not found" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const parseResult = parseMoneyToMinorUnits(totalAmount);
    if (parseResult.kind !== 'valid' || parseResult.minorUnits < 0) {
      setSubmitError(parseResult.kind === 'invalid' ? parseResult.reason : 'Invalid total amount');
      return;
    }

    const amountMinor = parseResult.minorUnits;

    setSubmitting(true);
    try {
      await budgetsApi.updateBudget(id, {
        version: budget.version,
        name: name.trim() || undefined,
        notes: notes.trim() || undefined,
        total_amount: amountMinor,
        status
      });
      router.push(`/budgets/${id}`);
    } catch (err: any) {
      // Show explicit concurrency warning if 409
      const msg = err.message || 'Failed to update budget';
      if (msg.toLowerCase().includes('version') || msg.toLowerCase().includes('conflict')) {
        setSubmitError('This budget has been modified by another user. Please refresh the page to see the latest changes.');
      } else {
        setSubmitError(msg);
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Edit Budget</h1>
        <Link href={`/budgets/${id}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">
                {submitError}
              </div>
            )}

            <FormField label="Status" htmlFor="status">
              <select
                id="status"
                value={status}
                onChange={e => setStatus(e.target.value as BudgetStatus)}
                required
                className="w-full h-10 px-3 rounded-md border border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="CLOSED">Closed</option>
              </select>
            </FormField>

            <FormField label="Budget Name (Optional)" htmlFor="name">
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Q3 Operations Budget"
                maxLength={255}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Total Amount" htmlFor="totalAmount">
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                />
              </FormField>

              <FormField label="Currency" htmlFor="currency">
                <Input
                  id="currency"
                  disabled
                  value={budget.currency}
                  className="bg-surface-50 cursor-not-allowed"
                />
              </FormField>
            </div>

            <FormField label="Notes (Optional)" htmlFor="notes">
              <textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              />
            </FormField>

            <div className="pt-4 flex justify-end">
              <Button type="submit" disabled={submitting || !totalAmount}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
