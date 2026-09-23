'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm';
import { usePermissions } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-context';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { expensesApi } from '@/features/expenses/api/expenses.api';
import { Expense } from '@/features/expenses/types';

export default function EditExpensePage() {
  const { id } = useParams() as { id: string };
  const { hasPermission } = usePermissions();
  const { isLoading: permsLoading } = useAuth();
  
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    expensesApi.getExpense(id)
      .then(setExpense)
      .catch(err => setError(err.message || 'Failed to load expense'))
      .finally(() => setLoading(false));
  }, [id]);

  if (permsLoading || loading) return <LoadingState />;
  if (!hasPermission('expenses:write')) return <ErrorState message="You do not have permission to edit expenses." />;
  if (error) return <ErrorState message={error} />;
  if (!expense) return <ErrorState message="Expense not found." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-surface-900">Edit Expense</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm initialData={expense} isEdit />
        </CardContent>
      </Card>
    </div>
  );
}
