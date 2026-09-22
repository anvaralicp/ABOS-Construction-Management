export interface StorageUploadData {
  uploadUrl: string;
  fields?: Record<string, string>;
}

export interface StorageObjectMetadata {
  exists: boolean;
  sizeBytes?: number;
  contentType?: string;
}

export interface StorageProvider {
  /**
   * Generates a pre-signed URL or POST policy for uploading a file directly to storage.
   * Can include fields needed for POST-based uploads (e.g. enforcing max file size).
   */
  generateUploadUrl(key: string, contentType: string, expiresInSeconds: number, maxSizeBytes: number): Promise<StorageUploadData>;

  /**
   * Generates a pre-signed URL for downloading a file directly from storage.
   */
  generateDownloadUrl(key: string, originalFilename: string, expiresInSeconds: number): Promise<string>;

  /**
   * Deletes an object from storage.
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Verify if the object exists and retrieve its metadata
   */
  verifyObject(key: string): Promise<StorageObjectMetadata>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
