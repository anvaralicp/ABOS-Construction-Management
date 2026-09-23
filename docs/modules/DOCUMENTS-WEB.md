# Documents Web Module

The Documents Web Module (`apps/web/src/features/documents`) provides the foundation for uploading, managing, and deleting organization files.

## Architecture

The module utilizes a **3-Step Direct-to-Storage Upload** architecture to ensure secure, highly scalable file ingestion without routing binary data through the Node.js backend.

### Upload Lifecycle

1. **Prepare (POST /documents):** 
   - The frontend calls the backend with file metadata (name, size, MIME type).
   - The backend validates the metadata and creates a `PENDING` Document record.
   - The backend returns the Document record alongside a **Presigned POST Policy** (`uploadData`).
   
2. **Direct Upload (Native `fetch` to S3):**
   - The frontend constructs a `FormData` object containing the presigned policy `fields` and the binary `file`.
   - The frontend executes a native `fetch` POST directly to the `uploadUrl`. 
   - *Security Note:* We explicitly bypass the shared `fetchApi` interceptors here to ensure internal JWT tokens or Organization headers are not sent to the S3 bucket, preventing CORS / Signature Mismatch errors.

3. **Verify (PATCH /documents/:id/status):**
   - Upon a `2xx` response from S3, the frontend calls the backend to update the Document status to `AVAILABLE`.
   - The backend synchronously queries the storage bucket (`verifyFile`) to ensure the file exists and its byte size matches expectations (guarding against malicious policy bypasses).
   - Once verified, the Document is permanently available for use.

## API Endpoints

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| `POST` | `/documents` | Creates pending document & issues presigned URL |
| `GET` | `/documents` | Lists organization documents |
| `GET` | `/documents/:id` | Retrieves single document metadata |
| `PATCH`| `/documents/:id/status` | Transitions status to `AVAILABLE` |
| `GET` | `/documents/:id/download-url`| Generates a 3600s TTL presigned download URL |
| `DELETE`| `/documents/:id` | Soft deletes record and triggers async storage sweep |

## Validation

- **Client-Side:** The React Dropzone enforces a strict `< 100MB` check before making any API calls to preserve bandwidth.
- **Backend:** `CreateDocumentDto` strictly validates MIME types against an allowlist and enforces the 100MB cap in the presigned policy generation.

## Permissions

The module respects the global `usePermissions()` architecture:
- `documents:create`: Required to upload.
- `documents:read`: Required to view the list.
- `documents:update`: Required to trigger verification.
- `documents:download`: Required to get download URLs.
- `documents:delete`: Required to remove files.

## Relationship to Expense Attachments

This module serves as the **upload foundation** for Expense Attachments. Currently, Expense Attachments only link existing `document_id`s. In a subsequent integration, the `DocumentUploadDialog` created here will be embedded into the `ExpenseDetailPage` to allow users to seamlessly upload files and immediately attach the resulting `document_id` to an expense.
