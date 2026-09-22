import { Injectable, Inject } from '@nestjs/common';
import { StorageProvider, STORAGE_PROVIDER } from './storage.interface';

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider
  ) {}

  /**
   * Securely generates an object key for a document based on organization and UUID.
   * Format: organizations/{organizationId}/documents/{documentId}/{uuid}
   */
  generateObjectKey(organizationId: string, documentId: string, uniqueId: string): string {
    // We do NOT use the client's filename in the storage path.
    return `organizations/${organizationId}/documents/${documentId}/${uniqueId}`;
  }

  async getUploadUrl(key: string, contentType: string, expiresInSeconds: number = 3600, maxSizeBytes: number = 104857600) {
    return this.provider.generateUploadUrl(key, contentType, expiresInSeconds, maxSizeBytes);
  }

  async getDownloadUrl(key: string, originalFilename: string, expiresInSeconds: number = 3600): Promise<string> {
    return this.provider.generateDownloadUrl(key, originalFilename, expiresInSeconds);
  }

  async deleteFile(key: string): Promise<void> {
    await this.provider.deleteObject(key);
  }

  async verifyFile(key: string) {
    return this.provider.verifyObject(key);
  }
}
