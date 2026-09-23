'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/states';
import { Dialog, DialogContent, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { FileText, Download, Trash2, File, FileImage, FileSpreadsheet, FileArchive } from 'lucide-react';
import { usePermissions } from '@/lib/permissions';
import { documentsApi } from '../api/documents.api';
import { Document, DocumentStatus } from '../types';
import { formatFileSize } from '../utils/format';

export function DocumentList() {
  const { hasPermission } = usePermissions();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canRead = hasPermission('documents:read');
  const canDelete = hasPermission('documents:delete');
  const canDownload = hasPermission('documents:download');

  const loadData = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await documentsApi.getDocuments();
      setDocuments(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownload = async (id: string, filename: string) => {
    try {
      const res = await documentsApi.getDownloadUrl(id);
      
      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      link.href = res.downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'Failed to download document');
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      setDeleteError(null);
      await documentsApi.deleteDocument(deletingId);
      setDocuments(prev => prev.filter(d => d.id !== deletingId));
      setDeletingId(null);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete document');
    }
  };

  if (!canRead) {
    return <ErrorState message="You do not have permission to view documents." />;
  }

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div>
        <ErrorState message={error} />
        <Button variant="outline" size="sm" onClick={loadData} className="mt-4">Retry</Button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState 
        title="No Documents" 
        description="There are no documents in the organization's repository." 
      />
    );
  }

  const getFileIcon = (mime: string) => {
    if (mime.includes('image/')) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (mime.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    if (mime.includes('zip') || mime.includes('compressed')) return <FileArchive className="w-5 h-5 text-yellow-500" />;
    return <File className="w-5 h-5 text-surface-500" />;
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="success">Available</Badge>;
      case 'PENDING': return <Badge variant="warning">Pending</Badge>;
      case 'FAILED': return <Badge variant="danger">Failed</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-surface-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map(doc => (
            <TableRow key={doc.id}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  {getFileIcon(doc.mime_type)}
                  <span className="font-medium text-surface-900 line-clamp-1" title={doc.filename}>{doc.filename}</span>
                </div>
              </TableCell>
              <TableCell className="text-surface-600">
                {formatFileSize(doc.size_bytes)}
              </TableCell>
              <TableCell>
                {getStatusBadge(doc.status)}
              </TableCell>
              <TableCell className="text-surface-600">
                {new Date(doc.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  {canDownload && doc.status === 'AVAILABLE' && (
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.id, doc.filename)} title="Download">
                      <Download className="w-4 h-4 text-surface-600" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => setDeletingId(doc.id)} title="Delete">
                      <Trash2 className="w-4 h-4 text-danger-600" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!deletingId} onClose={() => setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-surface-900">Delete Document</h2>
            <p className="mt-1 text-sm text-surface-500">
              Are you sure you want to delete this document? This action cannot be undone.
              {deleteError && (
                <span className="block mt-2 text-danger-600 font-medium">{deleteError}</span>
              )}
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
