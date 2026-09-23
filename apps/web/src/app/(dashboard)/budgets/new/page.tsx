'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { budgetsApi } from '@/features/budgets/api/budgets.api';
import { projectsApi } from '@/features/projects/api/projects.api';
import { parseMoneyToMinorUnits } from '@/features/projects/utils/money';
import { Project } from '@/features/projects/types';
import { usePermissions } from '@/lib/permissions';

export default function NewBudgetPage() {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState('USD');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const projs = await projectsApi.getProjects();
        setProjects(projs);
      } catch (err: any) {
        setInitError(err.message || 'Failed to load projects');
      } finally {
        setLoadingData(false);
      }
    }
    if (hasPermission('budgets:write')) {
      loadData();
    }
  }, [hasPermission]);

  if (loadingData) return <LoadingState />;
  if (!hasPermission('budgets:write')) return <ErrorState message="You do not have permission to create budgets." />;
  if (initError) return <ErrorState message={initError} />;

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
      const budget = await budgetsApi.createBudget({
        project_id: projectId,
        name: name.trim() || undefined,
        notes: notes.trim() || undefined,
        total_amount: amountMinor,
        currency
      });
      router.push(`/budgets/${budget.id}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to create budget');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900">Create Budget</h1>
        <Link href="/budgets">
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

            <FormField label="Project" htmlFor="projectId">
              <select
                id="projectId"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-md border border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm"
              >
                <option value="">Select a project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>
                ))}
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
                  placeholder="0.00"
                />
              </FormField>

              <FormField label="Currency" htmlFor="currency">
                <Input
                  id="currency"
                  required
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  maxLength={10}
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
              <Button type="submit" disabled={submitting || !projectId || !totalAmount}>
                {submitting ? 'Creating...' : 'Create Budget'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
