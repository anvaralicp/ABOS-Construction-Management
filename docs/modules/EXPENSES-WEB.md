# Expenses Web Module

## Overview
The Expenses Web Module provides the UI for creating, editing, and managing organizational construction expenses. 

## Endpoints
This module strictly consumes the backend authoritative endpoints:
* `POST /expenses`
* `GET /expenses`
* `GET /expenses/:id`
* `PATCH /expenses/:id`
* `DELETE /expenses/:id`
* `GET /expenses/:id/attachments`
* `POST /expenses/:id/attachments`
* `DELETE /expenses/:id/attachments/:attachmentId`

## Financial Strategy
**Backend financial calculations are authoritative.** 
Web-side calculations exist only to construct a request compatible with the current backend validation contract and to provide UI feedback.
1. The UI captures user monetary inputs as raw strings to avoid floating-point loss.
2. The UI uses `parseMoneyToMinorUnits()` (deterministic half-up rounding) strictly for converting `unit_price` strings into integer minor units before submission.
3. The UI uses `parseFloat()` strictly for scalar multipliers like `quantity` and `tax_rate`.
4. The UI executes `Math.round(quantity * unit_price)` to construct the `subtotal` for the validation payload, fulfilling the backend contract.
5. All financial data displayed in the detail views (`/expenses/[id]`) is rendered directly from the server's response.

## Version and Concurrency Handling
Updates (PATCH) are protected by optimistic concurrency. The `version` integer returned by the server is held in state and passed back during updates.
If the server returns `HTTP 409 Conflict`, the UI blocks the update and prompts the user to reload. It does not overwrite the server version automatically.

## Idempotency
During expense creation, `crypto.randomUUID()` generates an `id` client-side which is submitted as the idempotency key. This ensures that duplicate network requests or retries do not spawn multiple expenses.

## Nullable Field Handling
Fields like `vendor_id`, `invoice_number`, etc. are nullable. When intentionally cleared in the edit form, the UI explicitly sets them to `null` on the payload to ensure the backend removes the relation/data, rather than dropping the property.

## Attachments

The Expenses module utilizes the Documents Web upload workflow for physical document handling. 

### Relationship vs Document Ownership
The Expenses module strictly owns the *Expense ↔ Document relationship*. The Documents module owns the physical binary file and its lifecycle in storage. When an Expense attachment is deleted via the UI, only the relationship record (`ExpenseAttachment`) is removed from the database; the underlying physical Document is not deleted.

### Upload Workflow
The workflow relies on a 4-step process utilizing `DocumentUploadDialog`:
1. **Presigned Upload**: The Documents module executes a `POST /documents` followed by a direct-to-storage upload, and verifies it with `PATCH /documents/:id/status`.
2. **Association**: Only after a document reaches the `AVAILABLE` status does the Expenses module execute `POST /expenses/:id/attachments` with the returned `document_id`.

### Association Failure Behavior and Orphan Limitation
If a Document successfully uploads and verifies but the subsequent `POST /expenses/:id/attachments` association request fails:
* The user is shown an explicit error indicating that the attachment failed to associate.
* The attachment is **not** shown in the list.
* The underlying Document remains in the system as an **orphan**. The backend currently does not provide a safe transactional rollback or garbage collection mechanism for this edge case. This is a known, accepted limitation.

### Download Behavior
Downloads use a temporary, short-lived presigned URL obtained via `documentsApi.getDownloadUrl(documentId)`. Storage URLs are never constructed manually or persisted.

## Permissions
* View list and details: `expenses:read`
* Add attachment: Requires both `expenses:write` and `documents:create`
* Remove attachment: Requires `expenses:write` (but does *not* require `documents:delete`)
* Download attachment: Requires `documents:download`
* Delete expense: `expenses:delete`

## Tests
The module is covered by Jest testing (`__tests__/expenses.test.tsx`), verifying form validation, optimistic concurrency 409 handling, explicit null patching, list pagination, and secure financial parsing limits.
