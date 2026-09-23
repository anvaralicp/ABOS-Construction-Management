'use client';

import React from 'react';
import { ExpenseForm } from '@/features/expenses/components/ExpenseForm';
import { usePermissions } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-context';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function NewExpensePage() {
  const { hasPermission } = usePermissions();
  const { isLoading: loading } = useAuth();

  if (loading) return <LoadingState />;
  if (!hasPermission('expenses:write')) return <ErrorState message="You do not have permission to create expenses." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-surface-900">New Expense</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm />
        </CardContent>
      </Card>
    </div>
  );
}



