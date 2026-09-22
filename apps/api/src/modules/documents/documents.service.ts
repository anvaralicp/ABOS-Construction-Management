import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { StorageService } from '../../core/storage/storage.service';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { CreateDocumentDto, UpdateDocumentStatusDto, DocumentQueryDto, DocumentStatus } from './dto/document.dto';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  private readonly allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  private readonly allowedExtensions = ['.pdf', '.jpeg', '.jpg', '.png', '.doc', '.docx', '.xls', '.xlsx', '.txt'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService
  ) {}

  private validateFileMetadata(filename: string, mimeType: string) {
    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`Unsupported MIME type: ${mimeType}`);
    }

    const ext = path.extname(filename).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      throw new BadRequestException(`Unsupported file extension: ${ext}`);
    }

    // Basic sanitization
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename');
    }
  }

  async create(context: TenantContext, dto: CreateDocumentDto) {
    this.validateFileMetadata(dto.filename, dto.mime_type);

    const documentId = dto.id || uuidv4();
    const storageKey = this.storage.generateObjectKey(context.organizationId, documentId, uuidv4());

    return this.prisma.$transaction(async (tx) => {
      try {
        const document = await tx.document.create({
          data: {
            id: documentId,
            organization_id: context.organizationId,
            filename: dto.filename.replace(/[^a-zA-Z0-9.\-_ ]/g, ''), // sanitize metadata
            mime_type: dto.mime_type,
            size_bytes: dto.size_bytes,
            storage_key: storageKey,
            status: 'PENDING',
            created_by: context.userId,
            client_created_at: dto.client_created_at ? new Date(dto.client_created_at) : null
          }
        });

        await this.audit.logEvent(context, {
          action: 'DOCUMENT_CREATED',
          entityType: 'Document',
          entityId: document.id,
          metadata: { filename: document.filename }
        }, tx);

        // Generate presigned POST policy
        const uploadData = await this.storage.getUploadUrl(storageKey, dto.mime_type, 3600, dto.size_bytes);

        return {
          document,
          uploadData
        };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ConflictException('A document with this ID already exists.');
        }
        throw error;
      }
    });
  }

  async updateStatus(context: TenantContext, id: string, dto: UpdateDocumentStatusDto) {
    const document = await this.findOne(context, id);

    // State Machine Transitions
    const allowedTransitions: Record<DocumentStatus, DocumentStatus[]> = {
      PENDING: [DocumentStatus.AVAILABLE, DocumentStatus.FAILED],
      AVAILABLE: [], // Terminal
      FAILED: [DocumentStatus.PENDING], // Retry upload workflow
    };

    if (!allowedTransitions[document.status as DocumentStatus].includes(dto.status)) {
      throw new ConflictException(`Invalid status transition from ${document.status} to ${dto.status}.`);
    }

    // Storage Verification before allowing AVAILABLE
    if (dto.status === DocumentStatus.AVAILABLE) {
      const metadata = await this.storage.verifyFile(document.storage_key);
      if (!metadata.exists) {
        throw new NotFoundException('Object not found in storage. Cannot mark document as AVAILABLE.');
      }
      
      if (metadata.sizeBytes !== undefined) {
        // Enforce max size and catch malicious clients claiming small size but uploading huge size
        if (metadata.sizeBytes > 104857600) {
          throw new BadRequestException('Uploaded object exceeds maximum permitted size (100MB).');
        }
        
        // Ensure size mismatch isn't huge (e.g. they uploaded something different than declared)
        // Here we require it to be somewhat close or exact. Since it's critical, let's reject if it exceeds what they declared.
        // Or we can just update the size to the real size. We'll rely on the provider enforcing POST limits, but we double check here.
        if (metadata.sizeBytes > document.size_bytes) {
          throw new BadRequestException('Uploaded object is larger than declared size.');
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Optimistic concurrency check
      const result = await tx.document.updateMany({
        where: { 
          id, 
          organization_id: context.organizationId,
          version: document.version,
          deleted_at: null 
        },
        data: { 
          status: dto.status,
          version: { increment: 1 }
        }
      });

      if (result.count === 0) {
        throw new ConflictException('The document was updated or deleted by another user.');
      }

      const updated = await tx.document.findUnique({
        where: { id_organization_id: { id, organization_id: context.organizationId } }
      });

      await this.audit.logEvent(context, {
        action: 'DOCUMENT_STATUS_UPDATED',
        entityType: 'Document',
        entityId: id,
        metadata: { status: dto.status }
      }, tx);

      return updated;
    });
  }

  async findAll(context: TenantContext, query: DocumentQueryDto) {
    const { page = '1', limit = '50' } = query;

    const where: Prisma.DocumentWhereInput = {
      organization_id: context.organizationId,
      deleted_at: null,
    };

    const take = parseInt(limit, 10);
    const skip = (parseInt(page, 10) - 1) * take;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        take,
        skip,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.document.count({ where })
    ]);

    return {
      data: items,
      meta: { total, page: parseInt(page, 10), limit: take, pages: Math.ceil(total / take) }
    };
  }

  async findOne(context: TenantContext, id: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, organization_id: context.organizationId, deleted_at: null }
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    return document;
  }

  async delete(context: TenantContext, id: string) {
    const document = await this.findOne(context, id);

    // Ensure it's not referenced by checking related attachments
    // The DB enforces restrict, but checking beforehand gives a better error
    const expenses = await this.prisma.expenseAttachment.count({ where: { document_id: id } });
    const progress = await this.prisma.progressReportAttachment.count({ where: { document_id: id } });

    if (expenses > 0 || progress > 0) {
      throw new ConflictException('Cannot delete document because it is attached to an entity.');
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.document.updateMany({
        where: { 
          id, 
          organization_id: context.organizationId,
          version: document.version,
          deleted_at: null
        },
        data: { 
          deleted_at: new Date(),
          version: { increment: 1 } 
        }
      });

      if (result.count === 0) {
        throw new ConflictException('The document was updated or deleted by another user.');
      }

      // Storage object lifecycle handling:
      // Note: we delete the object from storage asynchronously to avoid blocking the DB transaction,
      // or we can await it. If storage deletion fails, the soft delete in DB is still valid (orphan object).
      // A robust system uses a background job to sweep deleted objects.
      try {
        await this.storage.deleteFile(document.storage_key);
      } catch (err) {
        this.logger.error(`Failed to delete storage object for document ${id}`, err);
      }

      await this.audit.logEvent(context, {
        action: 'DOCUMENT_DELETED',
        entityType: 'Document',
        entityId: id,
        metadata: { filename: document.filename }
      }, tx);

      return { success: true };
    });
  }

  async getDownloadUrl(context: TenantContext, id: string) {
    const document = await this.findOne(context, id);

    if (document.status !== 'AVAILABLE') {
      throw new ConflictException('Document is not available for download.');
    }

    // Authorization: Verify if document is attached to any entities.
    // In a multi-tenant strict model, we want to ensure the user has access to at least one parent.
    // For ABOS, permissions are organization-scoped (e.g. expenses:read).
    const expenseAttachments = await this.prisma.expenseAttachment.findMany({ where: { document_id: id, organization_id: context.organizationId } });
    const progressAttachments = await this.prisma.progressReportAttachment.findMany({ where: { document_id: id, organization_id: context.organizationId } });

    const isAttachedToExpense = expenseAttachments.length > 0;
    const isAttachedToProgress = progressAttachments.length > 0;
    const isUnattached = !isAttachedToExpense && !isAttachedToProgress;

    // If attached to expenses, user must have expenses:read
    // If attached to progress reports, user must have progress_reports:read
    // If attached to multiple, having ANY of the required permissions grants access.
    // If unattached, require documents:download
    let authorized = false;

    if (isUnattached && context.permissions.includes('documents:download')) {
      authorized = true;
    }
    if (isAttachedToExpense && context.permissions.includes('expenses:read')) {
      authorized = true;
    }
    if (isAttachedToProgress && context.permissions.includes('progress_reports:read')) {
      authorized = true;
    }

    if (!authorized) {
      throw new ForbiddenException('User lacks permission to access the parent entities of this document.');
    }

    const downloadUrl = await this.storage.getDownloadUrl(document.storage_key, document.filename, 3600);
    return { downloadUrl };
  }
}
