'use client';

import React, { useState } from 'react';
import { DocumentList } from '@/features/documents/components/DocumentList';
import { DocumentUploadDialog } from '@/features/documents/components/DocumentUploadDialog';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { Upload } from 'lucide-react';

export default function DocumentsPage() {
  const { isLoading: loading } = useAuth();
  const { hasPermission } = usePermissions();
  const [showUpload, setShowUpload] = useState(false);

  // We add a key to force re-render the list after a successful upload
  const [listKey, setListKey] = useState(0);

  if (loading) return <LoadingState />;
  if (!hasPermission('documents:read')) return <ErrorState message="You do not have permission to view documents." />;

  const canCreate = hasPermission('documents:create');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Documents</h1>
          <p className="text-sm text-surface-500 mt-1">Manage organization files and attachments</p>
        </div>
        {canCreate && (
          <Button variant="primary" onClick={() => setShowUpload(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        )}
      </div>

      <DocumentList key={listKey} />

      <DocumentUploadDialog 
        open={showUpload} 
        onOpenChange={setShowUpload} 
        onUploadSuccess={() => {
          setListKey(prev => prev + 1); // Refresh list
          setShowUpload(false);
        }}
      />
    </div>
  );
}
