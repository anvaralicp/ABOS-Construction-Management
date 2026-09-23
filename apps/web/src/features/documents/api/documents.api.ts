import { fetchApi } from '@/lib/api';
import {
  CreateDocumentDto,
  CreateDocumentResponse,
  DocumentQueryDto,
  DocumentListResponse,
  UpdateDocumentStatusDto,
  DownloadUrlResponse,
  Document
} from '../types';

export const documentsApi = {
  createDocument: async (dto: CreateDocumentDto): Promise<CreateDocumentResponse> => {
    return fetchApi('/documents', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  getDocuments: async (query?: DocumentQueryDto): Promise<DocumentListResponse> => {
    let qs = '';
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          params.append(k, String(v));
        }
      });
      const str = params.toString();
      if (str) qs = `?${str}`;
    }
    return fetchApi(`/documents${qs}`);
  },

  getDocument: async (id: string): Promise<Document> => {
    return fetchApi(`/documents/${id}`);
  },

  updateDocumentStatus: async (id: string, dto: UpdateDocumentStatusDto): Promise<Document> => {
    return fetchApi(`/documents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  getDownloadUrl: async (id: string): Promise<DownloadUrlResponse> => {
    return fetchApi(`/documents/${id}/download-url`);
  },

  deleteDocument: async (id: string): Promise<void> => {
    return fetchApi(`/documents/${id}`, {
      method: 'DELETE',
    });
  },
};
