import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { StorageService } from '../../core/storage/storage.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { DocumentStatus } from './dto/document.dto';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prisma: any;
  let audit: any;
  let storage: any;
  let mockContext: TenantContext;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return callback;
      }),
      document: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      expenseAttachment: {
        count: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      progressReportAttachment: {
        count: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      }
    };

    audit = {
      logEvent: jest.fn(),
    };

    storage = {
      generateObjectKey: jest.fn().mockReturnValue('org-1/doc-1/uuid'),
      getUploadUrl: jest.fn().mockResolvedValue({ uploadUrl: 'https://upload.url', fields: {} }),
      getDownloadUrl: jest.fn().mockResolvedValue('https://download.url'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      verifyFile: jest.fn().mockResolvedValue({ exists: true, sizeBytes: 1000, contentType: 'application/pdf' })
    };

    mockContext = {
      organizationId: 'org-1',
      userId: 'user-1',
      permissions: ['documents:create', 'documents:read', 'documents:update', 'documents:delete', 'documents:download'],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('Create Document', () => {
    it('should create document and return upload url data', async () => {
      prisma.document.create.mockResolvedValue({ id: 'doc-1', filename: 'test.pdf', storage_key: 'org-1/doc-1/uuid' });
      
      const result = await service.create(mockContext, {
        filename: 'test.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1000
      });

      expect(prisma.document.create).toHaveBeenCalled();
      expect(storage.getUploadUrl).toHaveBeenCalled();
      expect(result.uploadData.uploadUrl).toEqual('https://upload.url');
      expect(audit.logEvent).toHaveBeenCalled();
    });

    it('should reject unsupported mime type', async () => {
      await expect(service.create(mockContext, {
        filename: 'test.exe',
        mime_type: 'application/x-msdownload',
        size_bytes: 1000
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid extension', async () => {
      await expect(service.create(mockContext, {
        filename: 'test.exe',
        mime_type: 'application/pdf',
        size_bytes: 1000
      })).rejects.toThrow(BadRequestException);
    });

    it('should reject path traversal in filename', async () => {
      await expect(service.create(mockContext, {
        filename: '../test.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1000
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('Update Status & State Machine', () => {
    it('should allow PENDING to AVAILABLE if object exists and size is valid', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'PENDING', version: 1, size_bytes: 1000, storage_key: 'key' });
      prisma.document.updateMany.mockResolvedValue({ count: 1 });
      prisma.document.findUnique.mockResolvedValue({ id: 'doc-1', status: 'AVAILABLE', version: 2 });
      
      const result = await service.updateStatus(mockContext, 'doc-1', { status: DocumentStatus.AVAILABLE });
      
      expect(storage.verifyFile).toHaveBeenCalledWith('key');
      expect(prisma.document.updateMany).toHaveBeenCalled();
      expect(result.status).toEqual('AVAILABLE');
    });

    it('should reject PENDING to AVAILABLE if object missing', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'PENDING', version: 1, size_bytes: 1000, storage_key: 'key' });
      storage.verifyFile.mockResolvedValue({ exists: false });
      
      await expect(service.updateStatus(mockContext, 'doc-1', { status: DocumentStatus.AVAILABLE }))
        .rejects.toThrow(NotFoundException);
    });

    it('should reject PENDING to AVAILABLE if object exceeds max size', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'PENDING', version: 1, size_bytes: 1000, storage_key: 'key' });
      storage.verifyFile.mockResolvedValue({ exists: true, sizeBytes: 104857601 }); // > 100MB
      
      await expect(service.updateStatus(mockContext, 'doc-1', { status: DocumentStatus.AVAILABLE }))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject PENDING to AVAILABLE if object is larger than declared size', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'PENDING', version: 1, size_bytes: 1000, storage_key: 'key' });
      storage.verifyFile.mockResolvedValue({ exists: true, sizeBytes: 5000 }); // > declared size
      
      await expect(service.updateStatus(mockContext, 'doc-1', { status: DocumentStatus.AVAILABLE }))
        .rejects.toThrow(BadRequestException);
    });

    it('should allow PENDING to FAILED', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'PENDING', version: 1, size_bytes: 1000, storage_key: 'key' });
      prisma.document.updateMany.mockResolvedValue({ count: 1 });
      prisma.document.findUnique.mockResolvedValue({ id: 'doc-1', status: 'FAILED', version: 2 });
      
      await service.updateStatus(mockContext, 'doc-1', { status: DocumentStatus.FAILED });
      expect(prisma.document.updateMany).toHaveBeenCalled();
    });

    it('should reject AVAILABLE to PENDING', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'AVAILABLE', version: 1 });
      await expect(service.updateStatus(mockContext, 'doc-1', { status: DocumentStatus.PENDING }))
        .rejects.toThrow(ConflictException);
    });

    it('should reject AVAILABLE to FAILED', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'AVAILABLE', version: 1 });
      await expect(service.updateStatus(mockContext, 'doc-1', { status: DocumentStatus.FAILED }))
        .rejects.toThrow(ConflictException);
    });

    it('should reject FAILED to AVAILABLE', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'FAILED', version: 1 });
      await expect(service.updateStatus(mockContext, 'doc-1', { status: DocumentStatus.AVAILABLE }))
        .rejects.toThrow(ConflictException);
    });

    it('should reject update if document was concurrently deleted (version mismatch / deleted_at)', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'PENDING', version: 1, size_bytes: 1000, storage_key: 'key' });
      prisma.document.updateMany.mockResolvedValue({ count: 0 }); // Concurrency failure
      
      await expect(service.updateStatus(mockContext, 'doc-1', { status: DocumentStatus.AVAILABLE }))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('Get Download URL', () => {
    it('should reject if document is not available', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'PENDING', storage_key: 'org-1/doc-1/uuid', filename: 'test.pdf' });
      await expect(service.getDownloadUrl(mockContext, 'doc-1')).rejects.toThrow(ConflictException);
    });

    it('should generate download url if available', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'AVAILABLE', storage_key: 'org-1/doc-1/uuid', filename: 'test.pdf' });
      prisma.expenseAttachment.findMany.mockResolvedValue([]);
      prisma.progressReportAttachment.findMany.mockResolvedValue([]);
      mockContext.permissions = ['documents:download'];
      
      const result = await service.getDownloadUrl(mockContext, 'doc-1');
      expect(result.downloadUrl).toEqual('https://download.url');
      expect(storage.getDownloadUrl).toHaveBeenCalled();
    });

    it('should allow download if attached to expense and user has expenses:read', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'AVAILABLE', storage_key: 'org-1/doc-1/uuid', filename: 'test.pdf' });
      prisma.expenseAttachment.findMany.mockResolvedValue([{ id: 'att-1' }]);
      prisma.progressReportAttachment.findMany.mockResolvedValue([]);
      
      mockContext.permissions = ['expenses:read']; // User has parent permission
      
      const result = await service.getDownloadUrl(mockContext, 'doc-1');
      expect(result.downloadUrl).toEqual('https://download.url');
    });

    it('should reject download if attached to expense but user lacks expenses:read', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'AVAILABLE', storage_key: 'org-1/doc-1/uuid', filename: 'test.pdf' });
      prisma.expenseAttachment.findMany.mockResolvedValue([{ id: 'att-1' }]);
      prisma.progressReportAttachment.findMany.mockResolvedValue([]);
      
      mockContext.permissions = ['documents:download']; // Has global doc perm, but lacks parent perm!
      
      await expect(service.getDownloadUrl(mockContext, 'doc-1')).rejects.toThrow(ForbiddenException);
    });

    it('should allow download if unattached and user has documents:download', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', status: 'AVAILABLE', storage_key: 'org-1/doc-1/uuid', filename: 'test.pdf' });
      prisma.expenseAttachment.findMany.mockResolvedValue([]);
      prisma.progressReportAttachment.findMany.mockResolvedValue([]);
      
      mockContext.permissions = ['documents:download'];
      
      const result = await service.getDownloadUrl(mockContext, 'doc-1');
      expect(result.downloadUrl).toEqual('https://download.url');
    });
  });

  describe('Delete Document', () => {
    it('should reject if document is attached to expense or progress report', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1' });
      prisma.expenseAttachment.count.mockResolvedValue(1);
      prisma.progressReportAttachment.count.mockResolvedValue(0);

      await expect(service.delete(mockContext, 'doc-1')).rejects.toThrow(ConflictException);
    });

    it('should soft delete and call storage delete', async () => {
      prisma.document.findFirst.mockResolvedValue({ id: 'doc-1', storage_key: 'org-1/doc-1/uuid', filename: 'test.pdf' });
      prisma.expenseAttachment.count.mockResolvedValue(0);
      prisma.progressReportAttachment.count.mockResolvedValue(0);

      prisma.document.updateMany.mockResolvedValue({ count: 1 });
      await service.delete(mockContext, 'doc-1');
      expect(prisma.document.updateMany).toHaveBeenCalled();
      expect(storage.deleteFile).toHaveBeenCalledWith('org-1/doc-1/uuid');
      expect(audit.logEvent).toHaveBeenCalled();
    });
  });
});
