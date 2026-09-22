# Vendor Payments & Settlement Module

## Purpose
The Vendor Payments & Settlement module acts as the financial ledger for outgoing payments made to suppliers and subcontractors within ABOS Construction Management. It provides structural visibility into what has been paid against logged `Expenses`, calculates outstanding balances safely, and prevents overpayment without acting as a full General Ledger (GL) accounting system.

## Data Model & Tenancy
*   **VendorPayment**: The core transactional entity representing a money transfer (`organization_id`, `vendor_id`, `amount`, `currency`, `payment_date`, `payment_method`, `status`). 
*   **Tenant Isolation**: Strict cross-tenant boundaries are enforced. When a payment is created, the system verifies that the authenticated `TenantContext` owns the `Vendor`, the `Project` (if provided), and the `Expense` (if allocated).

## Payment Allocation & Expense Settlement
Payments can be optionally allocated to a specific `Expense`.
*   **Safe Allocation**: If `expense_id` is provided, the API dynamically sums existing valid payments (excluding `FAILED` or `CANCELED` statuses) and compares it against the `Expense.total_amount`. If the proposed payment exceeds the outstanding balance, the request is structurally rejected. Negative allocations are impossible.
*   **Project Consistency**: If a payment specifies both an `expense_id` and a `project_id`, the API enforces that they match.
*   **Settlement Summaries**: Authoritative read-only views are available:
    *   `/api/v1/vendor-payments/expense/:expenseId/summary` -> Outstanding calculation per expense.
    *   `/api/v1/vendor-payments/vendor/:vendorId/summary` -> Outstanding calculation per vendor across all their expenses.

## Concurrency
Vendor Payments use optimistic concurrency controls (`version` tracking).
*   Updates require the exact `version` number.
*   Modifications to the `amount` or `status` that would alter an `Expense` allocation trigger a re-calculation of the outstanding balance.
*   To prevent race conditions during concurrent payment submissions on the same `Expense`, the Prisma transaction operates at the `Serializable` isolation level.

## Financial Precision
*   All monetary `amount` values are strictly persisted as integer minor units (e.g., paise, cents) to prevent floating-point drift.
*   No JavaScript floating-point arithmetic is used for storing totals.

## Payment Methods & Statuses
Standardized Enums prevent free-text divergence:
*   **PaymentMethod**: `CASH`, `BANK_TRANSFER`, `CHEQUE`, `UPI`, `CARD`.
*   **PaymentStatus**: `PENDING`, `COMPLETED`, `FAILED`, `CANCELED`.

## Soft Deletion & Historical Safety
*   Payments are soft-deleted via `deleted_at`. They are logically excluded from outstanding calculations.
*   Cascade deletion is prohibited. Deleting a Project, Vendor, or Expense does not silently obliterate historical financial records.

## Permissions
Access relies on the standard RBAC framework via `PermissionsGuard`. The following formal permissions have been seeded into the database and attached to the `Organization Admin` role:
*   `vendor_payments:read`
*   `vendor_payments:write`
*   `vendor_payments:delete`
*   `vendor_payments:summary`

## API Endpoints
All endpoints operate under `/api/v1/vendor-payments`:
*   `POST /vendor-payments` - Create a payment
*   `GET /vendor-payments` - List and filter payments
*   `GET /vendor-payments/:id` - Get payment details
*   `PATCH /vendor-payments/:id` - Update a payment
*   `DELETE /vendor-payments/:id` - Archive a payment
*   `GET /vendor-payments/expense/:expenseId/summary` - Expense outstanding summary
*   `GET /vendor-payments/vendor/:vendorId/summary` - Vendor overall outstanding summary

## Known Runtime Verification Limitations
Because the Windows host environment blocks standard NPM script executions (resulting in infinite hangs for dependency installation and Prisma client generation), runtime validation such as NestJS application startup, OpenAPI generation, and automated test execution is **NOT VERIFIED**. The logic strictly adheres to NestJS paradigms but remains logically inferred rather than physically run.
