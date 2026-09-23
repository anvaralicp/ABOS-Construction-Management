'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { DocumentUploadDropzone } from './DocumentUploadDropzone';
import { Document } from '../types';

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess?: (doc: Document) => void;
}

export function DocumentUploadDialog({ open, onOpenChange, onUploadSuccess }: DocumentUploadDialogProps) {
  const handleSuccess = (doc: Document) => {
    if (onUploadSuccess) {
      onUploadSuccess(doc);
    }
  };

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-lg font-semibold text-surface-900">Upload Document</h2>
          <p className="mt-1 text-sm text-surface-500">
            Select a file to upload to the organization's secure storage.
          </p>
        </DialogHeader>
        <div className="mt-4">
          <DocumentUploadDropzone onUploadSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
