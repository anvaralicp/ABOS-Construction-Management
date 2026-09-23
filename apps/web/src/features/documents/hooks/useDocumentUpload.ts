import { useState, useCallback } from 'react';
import { documentsApi } from '../api/documents.api';
import { Document } from '../types';

export type UploadState = 'idle' | 'preparing' | 'uploading' | 'verifying' | 'success' | 'error';

export const MAX_FILE_SIZE = 104857600; // 100 MB

export function useDocumentUpload() {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<Document | null>(null);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setError(null);
    setDocument(null);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    reset();

    // 1. Client-Side Validation
    if (file.size > MAX_FILE_SIZE) {
      setState('error');
      setError('File exceeds the maximum size limit of 100MB.');
      return null;
    }

    try {
      // 2. Prepare - Create Document in DB
      setState('preparing');
      const createRes = await documentsApi.createDocument({
        filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        client_created_at: new Date().toISOString()
      });

      const { document: pendingDoc, uploadData } = createRes;
      setDocument(pendingDoc);

      // 3. Upload - Direct to Storage via Presigned POST
      setState('uploading');
      
      const formData = new FormData();
      if (uploadData.fields) {
        Object.entries(uploadData.fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      formData.append('file', file);

      // We use native fetch without any interceptors/headers to avoid CORS/Signature errors
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        let errText = await uploadResponse.text().catch(() => '');
        throw new Error(`Storage upload failed: ${uploadResponse.status} ${uploadResponse.statusText} ${errText}`);
      }

      // 4. Verify - Tell backend to verify the file in storage
      setState('verifying');
      const verifiedDoc = await documentsApi.updateDocumentStatus(pendingDoc.id, {
        status: 'AVAILABLE'
      });

      setDocument(verifiedDoc);
      setState('success');
      return verifiedDoc;

    } catch (err: any) {
      setState('error');
      setError(err.message || 'An unknown error occurred during upload.');
      return null;
    }
  }, [reset]);

  return {
    state,
    progress,
    error,
    document,
    uploadFile,
    reset
  };
}
