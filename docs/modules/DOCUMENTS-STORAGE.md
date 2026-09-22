# Documents & Storage Infrastructure

## Overview

The ABOS platform implements a provider-neutral, S3-compatible document storage architecture. The application code strictly depends on a `StorageService` interface, protecting the core business logic from AWS or object-storage specific APIs.

## Architecture

1.  **Storage Interface**: Located in `apps/api/src/core/storage/storage.interface.ts`. Defines `generateUploadUrl`, `generateDownloadUrl`, and `deleteObject`.
2.  **S3 Provider**: Implements the Storage interface (`s3-storage.provider.ts`) and is injected via standard NestJS DI. It generates secure presigned URLs to offload binary transfer directly to object storage, bypassing Node.js memory.
3.  **Database Metadata**: The `Document` model in PostgreSQL stores metadata (filename, mime type, size, status, and tracking IDs) while the binary resides in storage.

## Upload Lifecycle & State Machine

A document is not guaranteed to exist physically simply because a PostgreSQL record is present. The lifecycle enforces strict transitions:

1.  **PENDING**: Client requests upload. Server validates MIME type, extensions, path-traversal safety, and creates a `PENDING` database record. A secure object key is generated. A presigned POST upload policy is returned.
2.  **AVAILABLE**: Client uploads binary to storage. A subsequent API call updates the document to `AVAILABLE`. **The system actively verifies the object exists in storage and respects size constraints before allowing this transition.**
3.  **FAILED**: Upload aborted or failed. (Can transition back to `PENDING` to retry).

**Invalid transitions (e.g. `AVAILABLE` -> `PENDING`, `FAILED` -> `AVAILABLE`) are rejected.**

## Presigned Uploads & Max File Size

The application utilizes **Presigned POST Policies** (rather than basic PUT URLs). This allows the bucket itself to enforce a strict upload size limit of `100MB` (`content-length-range`).
*   The DTO declares the expected `size_bytes`.
*   The storage provider enforces the maximum size natively.
*   The backend verifies the actual size during the `AVAILABLE` status transition, rejecting objects that exceed limits or differ significantly from declared metadata.

## MIME & File Validation Limitation

**Important Boundary:** The initial upload MIME validation validates **client-provided metadata** (the `Content-Type` header and file extension). It does **NOT** validate actual binary file contents (magic bytes).

## Object Key Security

Object keys are generated entirely server-side using UUIDs to guarantee path safety and prevent collision.

Format: `organizations/{organizationId}/documents/{documentId}/{uuid}`

The client's original filename is stripped from the storage key and only stored safely in the database.

## Download & Authorization

Downloads are authorized explicitly. A user cannot download a document solely by possessing its UUID.

1.  **Direct Download**: A user with `documents:download` accesses `/api/v1/documents/:id/download-url`. The system verifies the document belongs to their Organization and is `AVAILABLE`.
2.  **Entity Context Authorization**: If a document is downloaded via an Expense or Progress Report context, the system verifies the attachment linkage actually exists, ensuring the user respects parent-entity isolation boundaries.

## Attachments

The infrastructure provides domain attachment links (e.g. `ExpenseAttachment`, `ProgressReportAttachment`) rather than polymorphic keys.

*   Tenant boundary is enforced during attachment.
*   Database unique constraints (`@@unique([organization_id, parent_id, document_id])`) block duplicate relationships.

## Document Deletion & Orphan Cleanup

**Database-First Strategy:** The database acts as the single source of truth.
1.  The system actively counts references in `ExpenseAttachment` and `ProgressReportAttachment`. If attached, deletion is rejected (`409 Conflict`).
2.  If safe, the DB record is **soft-deleted** (`deleted_at` timestamp set).
3.  An asynchronous storage deletion command is dispatched to object storage.
4.  If storage deletion fails, the failure is logged operationally, but the database deletion remains successful. This ensures safe application state over perfect object garbage collection.

**Stale PENDING Documents:** A cleanup job (to be scheduled in the future worker module) will identify and prune `PENDING` documents that have exceeded the upload retention period.

## Environment Configuration

Use standard `.env` configuration for the storage provider. Do NOT commit secrets.

```env
STORAGE_PROVIDER=s3
STORAGE_BUCKET=your-bucket-name
STORAGE_REGION=ap-south-1
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=your-access-key
STORAGE_SECRET_KEY=your-secret-key
```

## Runtime Limitations

This implementation is statically robust and heavily unit tested using mocked integrations. True live runtime testing with AWS/S3 dependencies cannot currently run locally due to Windows host environment/Prisma infinite-hang limitations.
