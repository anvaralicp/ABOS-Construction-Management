'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { usePermissions } from '@/lib/permissions';
import { useAuth } from '@/lib/auth-context';
import { expensesApi } from '@/features/expenses/api/expenses.api';
import { documentsApi } from '@/features/documents/api/documents.api';
import { Expense, ExpenseAttachment } from '@/features/expenses/types';
import { DocumentUploadDialog } from '@/features/documents/components/DocumentUploadDialog';
import { Document } from '@/features/documents/types';
import { formatMoney } from '@/features/projects/utils/money';
import { Trash2, Download, FileText, Plus } from 'lucide-react';

export default function ExpenseDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { isLoading: permsLoading } = useAuth();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const exp = await expensesApi.getExpense(id);
      setExpense(exp);
      const att = await expensesApi.getAttachments(id);
      setAttachments(att);
    } catch (err: any) {
      setError(err.message || 'Failed to load expense details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await expensesApi.deleteExpense(id);
      router.push('/expenses');
    } catch (err: any) {
      setError(err.message || 'Failed to delete expense');
      setShowDeleteDialog(false);
      setDeleteLoading(false);
    }
  };

  const handleUploadSuccess = async (doc: Document) => {
    setAttachError(null);
    try {
      await expensesApi.attachDocument(id, doc.id);
      const att = await expensesApi.getAttachments(id);
      setAttachments(att);
      setShowAttachDialog(false);
    } catch (err: any) {
      setAttachError(err.message || 'Failed to attach document to the expense.');
      // Dialog remains open showing the error
    }
  };

  const handleRemoveAttachment = async (attachmentId: string) => {
    try {
      await expensesApi.removeAttachment(id, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove attachment');
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await documentsApi.getDownloadUrl(documentId);
      window.location.href = res.downloadUrl;
    } catch (err: any) {
      alert(err.message || 'Failed to get download URL');
    }
  };

  if (permsLoading || loading) return <LoadingState />;
  if (!hasPermission('expenses:read')) return <ErrorState message="You do not have permission to view expenses." />;
  if (error) return <ErrorState message={error} />;
  if (!expense) return <ErrorState message="Expense not found." />;

  const canWrite = hasPermission('expenses:write');
  const canDelete = hasPermission('expenses:delete');
  const canCreateDocument = hasPermission('documents:create');
  const canDownloadDocument = hasPermission('documents:download');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">{expense.item}</h1>
          <p className="text-sm text-surface-500">Expense ID: {expense.id}</p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button variant="outline">
              <Link href={`/expenses/${expense.id}/edit`}>Edit</Link>
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" className="text-danger-600 hover:text-danger-700 hover:bg-danger-50" onClick={() => setShowDeleteDialog(true)}>
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-surface-500">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={expense.status === 'APPROVED' ? 'success' : expense.status === 'REJECTED' ? 'danger' : 'default'}>
                      {expense.status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-surface-500">Payment Status</dt>
                  <dd className="mt-1">
                    <Badge variant={expense.payment_status === 'PAID' ? 'success' : 'warning'}>
                      {expense.payment_status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-surface-500">Project</dt>
                  <dd className="mt-1 text-sm text-surface-900">{expense.project_id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-surface-500">Category</dt>
                  <dd className="mt-1 text-sm text-surface-900">{expense.category_id}</dd>
                </div>
                {expense.vendor_id && (
                  <div>
                    <dt className="text-sm font-medium text-surface-500">Vendor</dt>
                    <dd className="mt-1 text-sm text-surface-900">{expense.vendor_id}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-surface-500">Quantity</dt>
                  <dd className="mt-1 text-sm text-surface-900">{String(expense.quantity)} {expense.unit || ''}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-surface-500">Unit Price</dt>
                  <dd className="mt-1 text-sm text-surface-900">{formatMoney(expense.unit_price, expense.currency)}</dd>
                </div>
              </dl>

              {expense.remarks && (
                <div className="mt-6 border-t border-surface-200 pt-6">
                  <dt className="text-sm font-medium text-surface-500">Remarks</dt>
                  <dd className="mt-1 text-sm text-surface-900 whitespace-pre-wrap">{expense.remarks}</dd>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attachments</CardTitle>
              {canWrite && canCreateDocument && (
                <Button size="sm" variant="outline" onClick={() => setShowAttachDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Attach Document
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-4">No attachments found.</p>
              ) : (
                <ul className="divide-y divide-surface-200 border-t border-surface-200 mt-2">
                  {attachments.map(att => (
                    <li key={att.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-surface-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-surface-900">
                            {att.document?.filename || att.document_id}
                          </p>
                          {att.document && (
                            <p className="text-xs text-surface-500">
                              {(att.document.size_bytes / 1024 / 1024).toFixed(2)} MB • {att.document.mime_type.split('/')[1] || att.document.mime_type}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {canDownloadDocument && att.document && (
                          <Button aria-label="Download Attachment" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDownload(att.document_id)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {canWrite && (
                          <Button aria-label="Delete Attachment" variant="ghost" size="sm" className="text-danger-600 h-8 w-8 p-0" onClick={() => handleRemoveAttachment(att.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-surface-500">Subtotal</span>
                  <span className="font-medium text-surface-900">{formatMoney(expense.subtotal, expense.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-surface-500">Tax ({expense.tax_rate}%)</span>
                  <span className="font-medium text-surface-900">{formatMoney(expense.tax_amount, expense.currency)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold border-t border-surface-200 pt-4 mt-4">
                  <span className="text-surface-900">Total</span>
                  <span className="text-brand-700">{formatMoney(expense.total_amount, expense.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {(expense.invoice_number || expense.invoice_date || expense.vendor_reference) && (
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {expense.invoice_number && (
                    <div>
                      <dt className="text-xs font-medium text-surface-500 uppercase">Invoice Number</dt>
                      <dd className="mt-1 text-sm text-surface-900">{expense.invoice_number}</dd>
                    </div>
                  )}
                  {expense.invoice_date && (
                    <div>
                      <dt className="text-xs font-medium text-surface-500 uppercase">Invoice Date</dt>
                      <dd className="mt-1 text-sm text-surface-900">{expense.invoice_date.split('T')[0]}</dd>
                    </div>
                  )}
                  {expense.vendor_reference && (
                    <div>
                      <dt className="text-xs font-medium text-surface-500 uppercase">Vendor Ref</dt>
                      <dd className="mt-1 text-sm text-surface-900">{expense.vendor_reference}</dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogHeader>
          <h2 className="text-lg font-medium text-surface-900">Delete Expense</h2>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-surface-500">Are you sure you want to delete this expense? This action cannot be undone.</p>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button className="bg-danger-600 hover:bg-danger-700 text-white" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>

      <DocumentUploadDialog
        open={showAttachDialog}
        onOpenChange={setShowAttachDialog}
        onUploadSuccess={handleUploadSuccess}
      />

      {attachError && (
        <Dialog open={!!attachError} onClose={() => setAttachError(null)}>
          <DialogHeader>
            <h2 className="text-lg font-medium text-danger-600">Attachment Failed</h2>
          </DialogHeader>
          <DialogContent>
            <p className="text-sm text-surface-900">{attachError}</p>
            <p className="text-xs text-surface-500 mt-2">The document was uploaded successfully but failed to associate with this expense.</p>
          </DialogContent>
          <DialogFooter>
            <Button onClick={() => setAttachError(null)}>Close</Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}



