'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { budgetsApi } from '@/features/budgets/api/budgets.api';
import { categoriesApi } from '@/features/categories/api/categories.api';
import { Budget, BudgetSummary, BudgetStatus, BudgetLine } from '@/features/budgets/types';
import { Category } from '@/features/categories/types';
import { usePermissions } from '@/lib/permissions';
import { formatMoney, parseMoneyToMinorUnits } from '@/features/projects/utils/money';
import { Trash2, Edit2, Plus } from 'lucide-react';

const StatusBadge = ({ status }: { status: BudgetStatus }) => {
  const statusConfig: Record<BudgetStatus, { label: string, variant: 'default' | 'success' | 'warning' | 'danger' }> = {
    DRAFT: { label: 'Draft', variant: 'default' },
    ACTIVE: { label: 'Active', variant: 'success' },
    CLOSED: { label: 'Closed', variant: 'default' }
  };
  const config = statusConfig[status] || { label: status, variant: 'default' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default function BudgetDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Categories cache
  const [categories, setCategories] = useState<Category[]>([]);

  // Add line dialog
  const [showAddLine, setShowAddLine] = useState(false);
  const [addLineCategory, setAddLineCategory] = useState('');
  const [addLineAmount, setAddLineAmount] = useState('');
  const [addLineLoading, setAddLineLoading] = useState(false);
  const [addLineError, setAddLineError] = useState<string | null>(null);

  // Edit line dialog
  const [editLineId, setEditLineId] = useState<string | null>(null);
  const [editLineAmount, setEditLineAmount] = useState('');
  const [editLineLoading, setEditLineLoading] = useState(false);
  const [editLineError, setEditLineError] = useState<string | null>(null);

  // Delete line dialog
  const [deleteLineId, setDeleteLineId] = useState<string | null>(null);
  const [deleteLineLoading, setDeleteLineLoading] = useState(false);
  const [deleteLineError, setDeleteLineError] = useState<string | null>(null);

  // Delete budget dialog
  const [showDeleteBudget, setShowDeleteBudget] = useState(false);
  const [deleteBudgetLoading, setDeleteBudgetLoading] = useState(false);
  const [deleteBudgetError, setDeleteBudgetError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [bData, cats] = await Promise.all([
        budgetsApi.getBudget(id),
        categoriesApi.getCategories(true).catch(() => [])
      ]);
      setBudget(bData);
      setCategories(cats);

      if (hasPermission('budgets:summary')) {
        const sData = await budgetsApi.getBudgetSummary(id).catch(() => null);
        setSummary(sData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load budget');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasPermission('budgets:read')) {
      loadData();
    }
  }, [hasPermission, id]);

  if (loading) return <LoadingState />;
  if (!hasPermission('budgets:read')) return <ErrorState message="You do not have permission to view budgets." />;
  if (error || !budget) return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <ErrorState message={error || 'Budget not found.'} onRetry={loadData} />
      <div className="flex justify-center">
        <Link href="/budgets"><Button variant="outline">Back to Budgets</Button></Link>
      </div>
    </div>
  );

  const canWrite = hasPermission('budgets:write');
  const canDelete = hasPermission('budgets:delete');
  const canSeeSummary = hasPermission('budgets:summary');
  
  const displayLines = summary?.breakdown || budget.lines?.map(l => ({
    category_id: l.category_id,
    category_name: categories.find(c => c.id === l.category_id)?.name || 'Unknown',
    is_unbudgeted: false,
    budgeted: l.amount,
    actual: 0,
    remaining: l.amount,
    utilization: 0
  })) || [];
  const handleDeleteBudget = async () => {
    setDeleteBudgetLoading(true);
    setDeleteBudgetError(null);
    try {
      await budgetsApi.deleteBudget(id);
      router.push('/budgets');
    } catch (err: any) {
      setDeleteBudgetError(err.message || 'Failed to delete budget.');
      setDeleteBudgetLoading(false);
    }
  };

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLineError(null);
    const parseResult = parseMoneyToMinorUnits(addLineAmount);
    if (parseResult.kind !== 'valid' || parseResult.minorUnits < 0) {
      setAddLineError(parseResult.kind === 'invalid' ? parseResult.reason : 'Invalid amount');
      return;
    }
    setAddLineLoading(true);
    try {
      await budgetsApi.addBudgetLine(id, {
        category_id: addLineCategory,
        amount: parseResult.minorUnits,
        currency: budget.currency
      });
      setShowAddLine(false);
      setAddLineCategory('');
      setAddLineAmount('');
      await loadData();
    } catch (err: any) {
      setAddLineError(err.message || 'Failed to add line');
    } finally {
      setAddLineLoading(false);
    }
  };

  const handleEditLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLineId) return;
    setEditLineError(null);
    const parseResult = parseMoneyToMinorUnits(editLineAmount);
    if (parseResult.kind !== 'valid' || parseResult.minorUnits < 0) {
      setEditLineError(parseResult.kind === 'invalid' ? parseResult.reason : 'Invalid amount');
      return;
    }
    setEditLineLoading(true);
    try {
      await budgetsApi.updateBudgetLine(id, editLineId, {
        amount: parseResult.minorUnits
      });
      setEditLineId(null);
      await loadData();
    } catch (err: any) {
      setEditLineError(err.message || 'Failed to update line');
    } finally {
      setEditLineLoading(false);
    }
  };

  const handleDeleteLine = async () => {
    if (!deleteLineId) return;
    setDeleteLineLoading(true);
    setDeleteLineError(null);
    try {
      await budgetsApi.deleteBudgetLine(id, deleteLineId);
      setDeleteLineId(null);
      await loadData();
    } catch (err: any) {
      setDeleteLineError(err.message || 'Failed to delete line');
      setDeleteLineLoading(false);
    }
  };

  const availableCategories = categories.filter(c => !budget.lines?.some(l => l.category_id === c.id));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{budget.name || 'Unnamed Budget'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={budget.status} />
            <span className="text-sm text-surface-500 font-medium">Project: {budget.project?.name}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Link href={`/budgets/${budget.id}/edit`}>
              <Button variant="outline">Edit Budget</Button>
            </Link>
          )}
          {canDelete && (
            <Button variant="outline" className="text-danger-600 hover:text-danger-700 hover:bg-danger-50" onClick={() => setShowDeleteBudget(true)}>
              Delete Budget
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-surface-500">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-surface-900">
              {formatMoney(budget.total_amount, budget.currency)}
            </div>
          </CardContent>
        </Card>

        {canSeeSummary && summary && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-surface-500">Actual Spend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-surface-900">
                  {formatMoney(summary.totals.actual, summary.currency)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-surface-500">Remaining</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.totals.remaining < 0 ? 'text-danger-600' : 'text-success-600'}`}>
                  {formatMoney(summary.totals.remaining, summary.currency)}
                </div>
                <div className="mt-1 text-xs text-surface-500">
                  {summary.totals.utilization.toFixed(1)}% utilized
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {budget.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-surface-700 whitespace-pre-wrap">{budget.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Budget Lines</CardTitle>
          {canWrite && (
            <Button size="sm" onClick={() => setShowAddLine(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Line
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {displayLines.length === 0 ? (
            <div className="p-6 text-center text-surface-500 text-sm">
              No budget lines or expenses found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-50 text-surface-500 border-b border-surface-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-right">Budgeted</th>
                    {canSeeSummary && (
                      <>
                        <th className="px-4 py-3 font-medium text-right">Actual</th>
                        <th className="px-4 py-3 font-medium text-right">Remaining</th>
                      </>
                    )}
                    {canWrite && <th className="px-4 py-3 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200">
                  {displayLines.map(line => {
                    // Find actual budget line ID if it exists
                    const bLine = budget.lines?.find(l => l.category_id === line.category_id);
                    return (
                      <tr key={line.category_id} className={`hover:bg-surface-50/50 transition-colors ${line.is_unbudgeted ? 'bg-danger-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-surface-900">{line.category_name}</div>
                          {line.is_unbudgeted && <span className="text-xs text-danger-600 font-medium">Unbudgeted Expense</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(line.budgeted, budget.currency)}
                        </td>
                        {canSeeSummary && (
                          <>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatMoney(line.actual, budget.currency)}
                            </td>
                            <td className={`px-4 py-3 text-right tabular-nums font-medium ${line.remaining < 0 ? 'text-danger-600' : 'text-surface-900'}`}>
                              {formatMoney(line.remaining, budget.currency)}
                              <div className="text-[10px] text-surface-400 font-normal mt-0.5">{line.utilization.toFixed(1)}% used</div>
                            </td>
                          </>
                        )}
                        {canWrite && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {bLine && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditLineId(bLine.id); setEditLineAmount((bLine.amount / 100).toFixed(2)); }}>
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-danger-600" onClick={() => setDeleteLineId(bLine.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Budget Dialog */}
      <Dialog open={showDeleteBudget} onClose={() => setShowDeleteBudget(false)}>
        <DialogHeader>
          <h2 className="text-lg font-bold text-danger-600">Delete Budget</h2>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {deleteBudgetError && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{deleteBudgetError}</div>}
            <p className="text-sm text-surface-700">Are you sure you want to delete this budget? This action cannot be undone.</p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteBudget(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteBudget} disabled={deleteBudgetLoading}>
            {deleteBudgetLoading ? 'Deleting...' : 'Delete Budget'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Add Line Dialog */}
      <Dialog open={showAddLine} onClose={() => setShowAddLine(false)}>
        <DialogHeader>
          <h2 className="text-lg font-bold">Add Budget Line</h2>
        </DialogHeader>
        <form onSubmit={handleAddLine}>
          <DialogContent>
            <div className="space-y-4">
              {addLineError && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{addLineError}</div>}
              <FormField label="Category" htmlFor="lineCategory">
                <select
                  id="lineCategory"
                  value={addLineCategory}
                  onChange={e => setAddLineCategory(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-md border border-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:text-sm"
                >
                  <option value="">Select category...</option>
                  {availableCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Amount" htmlFor="lineAmount">
                <Input
                  id="lineAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={addLineAmount}
                  onChange={e => setAddLineAmount(e.target.value)}
                />
              </FormField>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddLine(false)}>Cancel</Button>
            <Button type="submit" disabled={addLineLoading || !addLineCategory || !addLineAmount}>
              {addLineLoading ? 'Saving...' : 'Add Line'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Line Dialog */}
      <Dialog open={!!editLineId} onClose={() => setEditLineId(null)}>
        <DialogHeader>
          <h2 className="text-lg font-bold">Edit Budget Line</h2>
        </DialogHeader>
        <form onSubmit={handleEditLine}>
          <DialogContent>
            <div className="space-y-4">
              {editLineError && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{editLineError}</div>}
              <FormField label="Amount" htmlFor="editLineAmount">
                <Input
                  id="editLineAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editLineAmount}
                  onChange={e => setEditLineAmount(e.target.value)}
                />
              </FormField>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditLineId(null)}>Cancel</Button>
            <Button type="submit" disabled={editLineLoading || !editLineAmount}>
              {editLineLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Line Dialog */}
      <Dialog open={!!deleteLineId} onClose={() => setDeleteLineId(null)}>
        <DialogHeader>
          <h2 className="text-lg font-bold text-danger-600">Delete Budget Line</h2>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {deleteLineError && <div className="p-3 bg-danger-50 text-danger-700 text-sm rounded-md">{deleteLineError}</div>}
            <p className="text-sm text-surface-700">Are you sure you want to remove this budget line?</p>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteLineId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteLine} disabled={deleteLineLoading}>
            {deleteLineLoading ? 'Deleting...' : 'Delete Line'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
