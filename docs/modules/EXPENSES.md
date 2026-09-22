# Expenses Module

## Purpose
The Expenses module is the core financial transaction engine of ABOS Construction Management. It records financial outflows against projects, associating them with taxonomies (Categories) and third parties (Vendors). It supports rigorous offline synchronization, strict financial precision, and complete tenant isolation.

## Financial Precision
All monetary values are persisted as integers representing minor units (e.g., `125050` instead of `1250.50`). The precise fields are:
*   `unit_price`
*   `subtotal`
*   `taxable_amount`
*   `tax_amount`
*   `total_amount`

Tax rates (`tax_rate`) and quantities (`quantity`) are persisted using exact database numeric/decimal representations. No floating-point math is used for database storage.

## Calculations
The server is the ultimate authority on financial calculations:
1.  `subtotal = Math.round(quantity * unit_price)`
2.  `taxable_amount = subtotal` (for this phase, entire subtotal is taxable)
3.  `tax_amount = Math.round(taxable_amount * (tax_rate / 100))`
4.  `total_amount = subtotal + tax_amount`

If an offline client syncs a record containing these pre-calculated fields, the server strictly validates them against its own deterministic calculations. Material discrepancies result in immediate rejection (`BadRequestException`).

## Offline Synchronization
The module supports true offline capabilities:
*   **Idempotency**: Clients can optionally generate and send a UUID (`id`). If the API receives a creation request for an ID that already exists, it idempotently returns the existing record without duplicating the financial transaction.
*   **Metadata**: Preserves `client_created_at` and `client_updated_at` alongside reliable server timestamps.

## Optimistic Concurrency
To prevent "last write wins" data loss when multiple offline clients sync conflicting edits, the `Expense` model uses an explicit `version` integer.
Updates enforce Compare-And-Swap (CAS):
`updateMany({ where: { id, version: expectedVersion }, data: { version: { increment: 1 } } })`
If the expected version does not match the database, a `ConflictException` is thrown, halting the update.

## Tenant Isolation & Relationships
Cross-tenant contamination is structurally impossible. Before an expense is saved, the API verifies that the `project_id`, `category_id`, and `vendor_id` each belong exactly to the authenticated user's active tenant (`organization_id`).

## Soft Deletion
Expenses use `deleted_at` for deletion. 
Historical financial records are NEVER cascade-deleted. Hard deletion is forbidden to ensure financial auditability. Deleted expenses are omitted from normal listings.

## Permissions
Access relies on the standard RBAC framework via `PermissionsGuard`. The following formal permissions have been seeded into the database and attached to the `Organization Admin` role:
*   `expenses:read`
*   `expenses:write`
*   `expenses:delete`

## API Endpoints
All endpoints are located at `/api/v1/expenses`:
*   `POST /` - Create an expense (supports offline sync metadata and pre-generated UUIDs)
*   `GET /` - List expenses (supports pagination via `page`, `limit` and filters for `project_id`, `category_id`, `vendor_id`, `status`, `from_date`, `to_date`)
*   `GET /:id` - Get expense details
*   `PATCH /:id` - Update expense (requires correct `version`)
*   `DELETE /:id` - Archive/soft-delete an expense

## Attachments
The `ExpenseAttachment` model facilitates a many-to-many relationship securely linking `Expense` directly to `Document`. The `document_id` must separately clear tenant boundaries. Actual object storage upload mechanics are external to this specific module logic.

## Known GST Limitations
This module records exact transaction-level taxes (tax rate, taxable amount, tax amount) but does not split them into granular components (CGST/SGST/IGST). A dedicated GST module/dashboard will be implemented in the future to aggregate and parse these figures for compliance.

## Known Runtime Verification Limitations
Because the Windows host environment blocks standard NPM script executions (resulting in infinite hangs for dependency installation and Prisma client generation), runtime validation such as NestJS application startup, OpenAPI generation, and automated test execution is **NOT VERIFIED**. The logic strictly adheres to NestJS paradigms but remains logically inferred rather than physically run.
