# Materials Module

## Purpose
The Materials module establishes the master catalog for physical items and strictly tracks their associated historical costs across different vendors. This module provides critical rate reference data required by other domains but explicitly does *not* function as an inventory or stock management system.

## Data Model & Tenancy
*   **Material**: The primary master record (`name`, `code`, `unit_of_measure`, `status`). Strongly scoped to a specific `organization_id`. `code` uniqueness is enforced per organization.
*   **MaterialRate**: The historical pricing ledger (`material_id`, `vendor_id`, `rate`, `effective_date`). Strongly scoped to `organization_id` and inherently tied to a Material and optionally a Vendor. 

Cross-tenant operations (e.g., retrieving a Material for Org A using a Vendor from Org B) are blocked at the database query level using strict composite constraints (`id_organization_id`).

## Historical Safety & Rate Lookup
*   **Immutability**: Material rates are appended historically. Modifying or destroying a historical rate via standard CRUD paths is intentionally prevented to preserve financial auditability.
*   **Latest Rate Calculation**: The `GET /api/v1/materials/:id/rates/latest` endpoint deterministically returns the currently active rate by querying the `MaterialRate` table ordered by `effective_date` descending. It handles "no rate found" cases safely by returning `null` rather than a falsified zero value.

## Financial Precision
Rates (`rate`) are stored exclusively as integers representing minor currency units (e.g., paise, cents) to evade floating-point arithmetic errors.

## Lifecycle & Deletion
*   A Material can be marked `INACTIVE`. When inactive, the API rejects the creation of new `MaterialRate` records.
*   Soft deletion (`deleted_at`) is utilized for Material masters. Hard deletion is forbidden to ensure historical rate queries and references remain fully intact even if the master material is archived.
*   Deleting a Material does *not* cascade-delete `MaterialRate` records, safeguarding the integrity of historical purchasing analysis.

## Expense Compatibility
The current architectural implementation of `Expense` does *not* formally mandate a foreign key to `Material` within the canonical specification. Should future integration be required, a tenant-safe `material_id` can be appended to `Expense` without risking current operational isolation.

## Permissions
Access relies on the standard RBAC framework via `PermissionsGuard`. The following formal permissions have been seeded into the database and attached to the `Organization Admin` role:
*   `materials:read`
*   `materials:write`
*   `materials:delete`
*   `material_rates:read`
*   `material_rates:write`
*   `material_rates:delete`

## API Endpoints
All endpoints are located at `/api/v1/materials`:
*   `POST /` - Create a material master
*   `GET /` - List materials (supports search, pagination)
*   `GET /:id` - Get material details
*   `PATCH /:id` - Update material master
*   `DELETE /:id` - Archive a material
*   `POST /:id/rates` - Append a new rate historically
*   `GET /:id/rates` - Get material rate history
*   `GET /:id/rates/latest` - Get the current applicable rate (optionally scoped by `vendor_id`)

## Known Runtime Verification Limitations
Because the Windows host environment blocks standard NPM script executions (resulting in infinite hangs for dependency installation and Prisma client generation), runtime validation such as NestJS application startup, OpenAPI generation, and automated test execution is **NOT VERIFIED**. The logic strictly adheres to NestJS paradigms but remains logically inferred rather than physically run.
