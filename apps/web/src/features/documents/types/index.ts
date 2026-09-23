export type DocumentStatus = 'PENDING' | 'AVAILABLE' | 'FAILED';

export interface Document {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: DocumentStatus;
  created_by: string;
  client_created_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentDto {
  id?: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  client_created_at?: string;
}

export interface StorageUploadData {
  uploadUrl: string;
  fields?: Record<string, string>;
}

export interface CreateDocumentResponse {
  document: Document;
  uploadData: StorageUploadData;
}

export interface DocumentQueryDto {
  page?: string;
  limit?: string;
}

export interface DocumentListResponse {
  data: Document[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface UpdateDocumentStatusDto {
  status: DocumentStatus;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
}
