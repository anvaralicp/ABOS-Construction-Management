import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentList } from '../features/documents/components/DocumentList';
import { DocumentUploadDropzone } from '../features/documents/components/DocumentUploadDropzone';
import { documentsApi } from '../features/documents/api/documents.api';
import { useAuth } from '../lib/auth-context';
import { usePermissions } from '../lib/permissions';

jest.mock('../features/documents/api/documents.api');
jest.mock('../lib/auth-context');
jest.mock('../lib/permissions');

const mockUseAuth = useAuth as jest.Mock;
const mockUsePermissions = usePermissions as jest.Mock;
const mockDocumentsApi = documentsApi as jest.Mocked<typeof documentsApi>;

// Mock native fetch for S3 direct upload
global.fetch = jest.fn();

describe('Documents Web Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isLoading: false });
    mockUsePermissions.mockReturnValue({
      hasPermission: jest.fn().mockReturnValue(true) // give all perms
    });

    // Default fetch mock to success
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => ''
    });
  });

  describe('DocumentList', () => {
    it('renders unauthorized state if read permission is missing', async () => {
      mockUsePermissions.mockReturnValue({ hasPermission: () => false });
      render(<DocumentList />);
      expect(screen.getByText('You do not have permission to view documents.')).toBeInTheDocument();
    });

    it('displays documents from the API', async () => {
      mockDocumentsApi.getDocuments.mockResolvedValueOnce({
        data: [
          {
            id: 'doc-1',
            filename: 'test.pdf',
            mime_type: 'application/pdf',
            size_bytes: 1024,
            status: 'AVAILABLE',
            created_by: 'user-1',
            client_created_at: null,
            created_at: '2026-09-23T00:00:00Z',
            updated_at: '2026-09-23T00:00:00Z'
          }
        ],
        meta: { total: 1, page: 1, limit: 10 }
      });

      render(<DocumentList />);

      expect(await screen.findByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
    });

    it('handles document deletion', async () => {
      mockDocumentsApi.getDocuments.mockResolvedValueOnce({
        data: [
          {
            id: 'doc-1',
            filename: 'test.pdf',
            mime_type: 'application/pdf',
            size_bytes: 1024,
            status: 'AVAILABLE',
            created_by: 'user-1',
            client_created_at: null,
            created_at: '2026-09-23T00:00:00Z',
            updated_at: '2026-09-23T00:00:00Z'
          }
        ],
        meta: { total: 1, page: 1, limit: 10 }
      });

      mockDocumentsApi.deleteDocument.mockResolvedValueOnce(undefined);

      render(<DocumentList />);

      expect(await screen.findByText('test.pdf')).toBeInTheDocument();

      // Click delete button
      const deleteBtn = screen.getByTitle('Delete');
      fireEvent.click(deleteBtn);

      // Confirm dialog
      expect(screen.getByText('Are you sure you want to delete this document? This action cannot be undone.')).toBeInTheDocument();
      
      const confirmBtn = screen.getByRole('button', { name: 'Delete Document' });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(mockDocumentsApi.deleteDocument).toHaveBeenCalledWith('doc-1');
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
      });
    });
  });

  describe('DocumentUploadDropzone', () => {
    it('rejects oversized files without calling backend', async () => {
      const user = userEvent.setup();
      const { container } = render(<DocumentUploadDropzone />);

      // Create a large mock file > 100MB
      const largeFile = new File([''], 'huge.zip', { type: 'application/zip' });
      Object.defineProperty(largeFile, 'size', { value: 104857601 });

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, largeFile);

      // Click Upload
      fireEvent.click(screen.getByText('Upload File'));

      await waitFor(() => {
        expect(screen.getByText('File exceeds the maximum size limit of 100MB.')).toBeInTheDocument();
      });

      expect(mockDocumentsApi.createDocument).not.toHaveBeenCalled();
    });

    it('performs the full 3-step upload lifecycle successfully', async () => {
      const user = userEvent.setup();
      
      // Step 1 mock: create
      mockDocumentsApi.createDocument.mockResolvedValueOnce({
        document: { id: 'doc-new', filename: 'valid.txt', mime_type: 'text/plain', size_bytes: 50, status: 'PENDING', created_by: 'u1', created_at: '', updated_at: '', client_created_at: '' },
        uploadData: { uploadUrl: 'https://mock.s3.bucket', fields: { key: 'test/key' } }
      });

      // Step 2 mock: patch
      mockDocumentsApi.updateDocumentStatus.mockResolvedValueOnce({
        id: 'doc-new', filename: 'valid.txt', mime_type: 'text/plain', size_bytes: 50, status: 'AVAILABLE', created_by: 'u1', created_at: '', updated_at: '', client_created_at: ''
      });

      const onUploadSuccess = jest.fn();
      const { container } = render(<DocumentUploadDropzone onUploadSuccess={onUploadSuccess} />);

      const file = new File(['hello'], 'valid.txt', { type: 'text/plain' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      // Trigger upload
      fireEvent.click(screen.getByText('Upload File'));

      // Validate calls
      await waitFor(() => {
        expect(mockDocumentsApi.createDocument).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith('https://mock.s3.bucket', expect.objectContaining({ method: 'POST' }));
        expect(mockDocumentsApi.updateDocumentStatus).toHaveBeenCalledWith('doc-new', { status: 'AVAILABLE' });
        expect(onUploadSuccess).toHaveBeenCalled();
      });

      expect(screen.getByText('Upload completed successfully.')).toBeInTheDocument();
    });

    it('handles S3 upload failures gracefully', async () => {
      const user = userEvent.setup();
      
      mockDocumentsApi.createDocument.mockResolvedValueOnce({
        document: { id: 'doc-fail', filename: 'fail.txt', mime_type: 'text/plain', size_bytes: 50, status: 'PENDING', created_by: 'u1', created_at: '', updated_at: '', client_created_at: '' },
        uploadData: { uploadUrl: 'https://mock.s3.bucket', fields: {} }
      });

      // Make S3 fetch fail
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Signature Does Not Match'
      });

      const { container } = render(<DocumentUploadDropzone />);

      const file = new File(['hello'], 'fail.txt', { type: 'text/plain' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      fireEvent.click(screen.getByText('Upload File'));

      await waitFor(() => {
        expect(mockDocumentsApi.createDocument).toHaveBeenCalled();
        expect(screen.getByText(/Storage upload failed: 403 Forbidden/i)).toBeInTheDocument();
      });

      // It should NOT call update status if upload failed
      expect(mockDocumentsApi.updateDocumentStatus).not.toHaveBeenCalled();
    });

    it('handles verification failure gracefully', async () => {
      const user = userEvent.setup();
      
      mockDocumentsApi.createDocument.mockResolvedValueOnce({
        document: { id: 'doc-ver-fail', filename: 'fail-ver.txt', mime_type: 'text/plain', size_bytes: 50, status: 'PENDING', created_by: 'u1', created_at: '', updated_at: '', client_created_at: '' },
        uploadData: { uploadUrl: 'https://mock.s3.bucket', fields: {} }
      });

      // Storage upload succeeds (default mock)

      // Verification fails
      mockDocumentsApi.updateDocumentStatus.mockRejectedValueOnce(new Error('Backend verification failed: File size mismatch'));

      const { container } = render(<DocumentUploadDropzone />);

      const file = new File(['hello'], 'fail-ver.txt', { type: 'text/plain' });
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(input, file);

      fireEvent.click(screen.getByText('Upload File'));

      await waitFor(() => {
        expect(mockDocumentsApi.createDocument).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalled(); // S3 upload succeeded
        expect(mockDocumentsApi.updateDocumentStatus).toHaveBeenCalledWith('doc-ver-fail', { status: 'AVAILABLE' });
        // Error state shown
        expect(screen.getByText(/Backend verification failed: File size mismatch/i)).toBeInTheDocument();
      });
      
      // Success should NOT be visible
      expect(screen.queryByText('Upload completed successfully.')).not.toBeInTheDocument();
    });
  });
});
