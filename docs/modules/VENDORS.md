# Vendors Module

## Purpose
The Vendors module manages suppliers, subcontractors, and other third parties. It provides the necessary entity foundation required by the future Expenses, Materials, and Vendor Payments modules. 

## Data Model
*   **Vendor**: Represents the primary business entity. Key fields include `name`, `code` (optional, unique per organization), `tax_id` (optional, unique per organization), `status`, `address`, and `notes`. It is strictly bound to an organization via `organization_id`.
*   **VendorContact**: Represents a person associated with the vendor. Key fields include `name`, `designation`, `email`, `phone`, `alternate_phone`, and `is_primary`. Contacts are bound to their parent vendor and organization.

## Tenant Isolation
Every database query inside the module enforces the authenticated user's organization boundary. 
*   `Vendor` operations are protected using `where: { id_organization_id: { id, organization_id } }`.
*   `VendorContact` operations verify that the parent `vendor_id` belongs to the correct organization *before* permitting any action, and strictly persist the contact with the parent's `organization_id`.
*   Cross-organization access to vendors or contacts is impossible.

## Duplicate Handling
Duplicate names are permitted unless constrained by canonical code or tax ID.
*   If a `code` is provided, it must be unique within the organization.
*   If a `tax_id` is provided, it must be unique within the organization.

## Lifecycle and Deletion Behavior
*   Vendors and contacts support soft-deletion via `deleted_at`.
*   Hard deletion is prohibited to ensure historical transactional safety. When a vendor is referenced by a historical expense or payment, its metadata remains accessible even after deletion.
*   Deleted vendors and contacts are excluded from standard list queries.

## Permissions
Access relies on the standard RBAC framework via `PermissionsGuard`. The following formal permissions have been seeded into the database and attached to the `Organization Admin` role:
*   `vendors:read`
*   `vendors:write`
*   `vendors:delete`
*   `vendor_contacts:read`
*   `vendor_contacts:write`
*   `vendor_contacts:delete`

## Future Compatibility
### Expense Module
The current `Expense` schema supports an optional `vendor_id`. A foreign key relationship already exists. The future `ExpensesService` must strictly constrain this lookup (e.g., `where: { id: vendorId, organization_id: tenant.organizationId }`) before associating a vendor with an expense.

### Vendor Payment Module
The canonical `VendorPayment` model is represented in the database and relates safely to `Vendor`. The current `Vendor` entity is fully structurally capable of tracking incoming payments without any schema modifications. Logic for vendor payments is deferred to a future module.

## Audit Events
The module logs the following audit events via `AuditService`:
*   `VENDOR_CREATED`
*   `VENDOR_UPDATED`
*   `VENDOR_STATUS_CHANGED`
*   `VENDOR_DELETED`
*   `VENDOR_CONTACT_CREATED`
*   `VENDOR_CONTACT_UPDATED`
*   `VENDOR_CONTACT_DELETED`

## Known Runtime Verification Limitations
Because the Windows host environment blocks standard NPM script executions (resulting in infinite hangs for dependency installation and Prisma client generation), runtime validation such as NestJS application startup, OpenAPI generation, and automated test execution is **NOT VERIFIED**. The logic strictly adheres to NestJS paradigms but remains logically inferred rather than physically run.
