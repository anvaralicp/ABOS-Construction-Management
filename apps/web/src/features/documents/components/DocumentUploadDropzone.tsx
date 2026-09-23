'use client';

import React, { useRef, useState, useCallback } from 'react';
import { UploadCloud, File as FileIcon, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useDocumentUpload, MAX_FILE_SIZE } from '../hooks/useDocumentUpload';
import { formatFileSize } from '../utils/format';
import { Button } from '@/components/ui/button';
import { Document } from '../types';

interface DocumentUploadDropzoneProps {
  onUploadSuccess?: (doc: Document) => void;
  className?: string;
}

export function DocumentUploadDropzone({ onUploadSuccess, className = '' }: DocumentUploadDropzoneProps) {
  const { state, error, document, uploadFile, reset } = useDocumentUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    reset(); // Clear previous states
  };

  const onUploadClick = async () => {
    if (!selectedFile) return;
    const doc = await uploadFile(selectedFile);
    if (doc && onUploadSuccess) {
      onUploadSuccess(doc);
    }
  };

  const onCancel = () => {
    setSelectedFile(null);
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isUploadingState = state === 'preparing' || state === 'uploading' || state === 'verifying';

  return (
    <div className={`w-full ${className}`}>
      {/* Dropzone Area */}
      {!selectedFile && (
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-surface-300 hover:border-primary-400 bg-surface-50'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleChange}
          />
          <UploadCloud className="mx-auto h-12 w-12 text-surface-400 mb-4" />
          <p className="text-sm font-medium text-surface-900">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-surface-500 mt-1">
            Max file size: {formatFileSize(MAX_FILE_SIZE)}
          </p>
        </div>
      )}

      {/* Selected File / Upload Progress Area */}
      {selectedFile && (
        <div className="border border-surface-200 rounded-lg p-4 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                <FileIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-surface-900 line-clamp-1">{selectedFile.name}</p>
                <p className="text-xs text-surface-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            
            {state === 'idle' && (
              <button onClick={onCancel} className="text-surface-400 hover:text-surface-600">
                <X className="h-5 w-5" />
              </button>
            )}
            {state === 'success' && (
              <CheckCircle2 className="h-6 w-6 text-success-500" />
            )}
            {state === 'error' && (
              <AlertCircle className="h-6 w-6 text-danger-500" />
            )}
          </div>

          {/* Status Text & Loading Indicator */}
          {state !== 'idle' && (
            <div className="mt-4">
              <div className="flex items-center space-x-2 text-sm">
                {isUploadingState && <Loader2 className="h-4 w-4 animate-spin text-primary-500" />}
                <span className={`font-medium ${state === 'error' ? 'text-danger-600' : state === 'success' ? 'text-success-600' : 'text-surface-600'}`}>
                  {state === 'preparing' && 'Preparing upload...'}
                  {state === 'uploading' && 'Uploading to secure storage...'}
                  {state === 'verifying' && 'Verifying file integrity...'}
                  {state === 'success' && 'Upload completed successfully.'}
                  {state === 'error' && error}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {state === 'idle' && (
            <div className="mt-4 flex justify-end space-x-3">
              <Button variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={onUploadClick}>
                Upload File
              </Button>
            </div>
          )}
          {state === 'error' && (
            <div className="mt-4 flex justify-end space-x-3">
              <Button variant="outline" size="sm" onClick={onCancel}>
                Remove
              </Button>
              <Button variant="primary" size="sm" onClick={onUploadClick}>
                Retry Upload
              </Button>
            </div>
          )}
          {state === 'success' && (
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={onCancel}>
                Upload Another
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
