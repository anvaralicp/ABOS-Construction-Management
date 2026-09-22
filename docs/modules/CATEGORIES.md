# Categories Module

## Purpose
The Categories module provides the hierarchical taxonomy required by the Expense system (e.g., Labor, Materials, Subcontractor, Equipment). It establishes a safe, organization-scoped structure for classifying construction financial outflows.

## Data Model
*   **Category**: Represents a classification node. Core fields include `name`, `description`, `parent_id`, and `is_active`. It is strictly bound to an organization via `organization_id`.

## Hierarchy
The module supports an infinitely nested self-referencing hierarchy using `parent_id` (Adjacency List model). 
Safe hierarchy rules are strictly enforced during creation and updates:
*   A category cannot reference itself as a parent.
*   Circular hierarchies are detected and blocked.
*   Parents must belong to the exact same organization.
*   Parents must be actively enabled and not deleted.

## Lifecycle
*   Categories support activation and deactivation (`is_active` boolean).
*   Inactive categories remain structurally available for historical expense records but will be filtered out (or rejected by transactional validators) for new usage.

## Deletion Behavior
*   **Soft Deletion**: Implemented via `deleted_at`. Hard deletion is considered unsafe because future transactional records (Expenses, Budgets, Materials) will reference these categories. Soft deletion preserves structural safety.
*   A category cannot be deleted if it has undeleted subcategories (children).

## Tenant Isolation
Every database query in the module is strictly scoped using `where: { id_organization_id: { id, organization_id } }`. An organization cannot view, modify, delete, or link to a category belonging to another organization. 

## Permissions
Access relies on the standard RBAC framework via `PermissionsGuard`. The following formal permissions have been seeded into the database and attached to the `Organization Admin` role:
*   `categories:read`
*   `categories:write`
*   `categories:delete`

## API Endpoints
All endpoints are located at `/api/v1/categories`:
*   `POST /` - Create a category
*   `GET /tree` - Retrieve the entire organization's category hierarchy as a nested tree
*   `GET /` - List all organization categories (flat list)
*   `GET /:id` - Get category details
*   `PATCH /:id` - Update category details and active status
*   `DELETE /:id` - Soft-delete a category

*Note*: The `GET /` and `GET /tree` endpoints support an optional `activeOnly=true` query parameter to filter out inactive categories.

## Default Category Seeding
Default categories explicitly supported by the ABOS tracker specification (`Labor`, `Materials`, `Subcontractor`, `Equipment`, `General & Administrative`, `Permits & Fees`) are seeded idempotently in `seed.ts`. When the global seed script is run, it discovers all existing organizations and ensures these default categories exist as root categories for each organization independently. 

## Audit Behavior
The module logs the following audit events:
*   `CATEGORY_CREATED`
*   `CATEGORY_UPDATED`
*   `CATEGORY_ACTIVATED`
*   `CATEGORY_DEACTIVATED`
*   `CATEGORY_DELETED`

## Known Runtime Verification Limitations
Because the Windows host environment blocks standard NPM script executions (resulting in infinite hangs for dependency installation and Prisma client generation), runtime validation such as NestJS application startup, OpenAPI generation, and automated test execution is **NOT VERIFIED**. The logic strictly adheres to NestJS paradigms but remains logically inferred rather than physically run.
