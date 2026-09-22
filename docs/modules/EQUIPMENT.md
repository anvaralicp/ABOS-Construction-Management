# Equipment Management Module

## Purpose
The Equipment module serves as the central registry for heavy machinery, tools, and assets used by ABOS Construction Management. It establishes the foundational master data and handles project assignments necessary for the future Progress & Daily Reports module. This module strictly handles allocation and status; it does not model fuel, rental billing, or deep maintenance histories.

## Data Model & Tenancy
*   **Equipment**: The master catalog of assets (`code`, `name`, `serial_number`, `registration_number`, `status`). Strictly scoped to an `organization_id` with database-level uniqueness enforced for identifiers (`code`, `serial_number`, `registration_number`).
*   **ProjectEquipmentAssignment**: The bridge permitting equipment to be formally utilized on a project (`project_id`, `equipment_id`, `assigned_from`, `assigned_to`, `status`). 
*   **Tenant Isolation**: Cross-tenant contamination is structurally impossible. All operations require and validate the `organization_id` derived securely from the authenticated `TenantContext`.

## Assignment Rules
*   **Inactive/Maintenance**: Equipment marked as `INACTIVE` or `MAINTENANCE` cannot receive new project assignments.
*   **Archived Projects**: Equipment cannot be assigned to projects that are soft-deleted or archived.
*   **Date Enforcement**: If an assignment defines both dates, `assigned_to` must logically equal or succeed `assigned_from`.
*   **No Overlapping Active**: A piece of equipment can only hold one `ACTIVE` project assignment at a time. The API physically checks for overlapping active statuses before permitting a new assignment inside a `Serializable` transaction to prevent race conditions.
*   **Status Syncing**: When an assignment becomes `ACTIVE`, its parent equipment master status is atomically transitioned to `ASSIGNED`. When an assignment is transitioned to `COMPLETED` or `INACTIVE`, the equipment automatically transitions back to `AVAILABLE` (if it holds no other `ACTIVE` assignments). This lifecycle state machine is protected via `Serializable` isolation level transactions.

## Lifecycle & Soft Deletion
*   Equipment creation allows enforcement of tenant-unique `code`, `serial_number`, and `registration_number`.
*   Equipment uses soft-deletion (`deleted_at`).
*   The API blocks soft-deletion of any equipment that still holds an `ACTIVE` project assignment, ensuring data integrity.
*   Assignments are not soft-deleted when closed; they are simply moved to a `COMPLETED` status to preserve historical utilization records safely.

## Permissions
Access relies on the standard RBAC framework via `PermissionsGuard`. The following formal permissions have been seeded into the database and attached to the `Organization Admin` role:
*   `equipment:read`
*   `equipment:create`
*   `equipment:update`
*   `equipment:delete`
*   `equipment:assign`

## API Endpoints
All endpoints operate under `/api/v1/equipment` (or `/api/v1/projects` where semantically aligned):
*   `POST /equipment` - Create an equipment record
*   `GET /equipment` - List equipment (with search and status filters)
*   `GET /equipment/:id` - Get equipment details
*   `PATCH /equipment/:id` - Update equipment / change status
*   `DELETE /equipment/:id` - Soft-delete equipment
*   `POST /equipment/:id/assignments` - Assign equipment to a project
*   `GET /equipment/:id/assignments` - View assignment history for equipment
*   `PATCH /equipment/:id/assignments/:assignmentId` - Modify or close an assignment
*   `GET /projects/:projectId/equipment` - View all equipment assigned to a project

## Future Integration
By maintaining historical assignments and strict date boundaries, the upcoming Progress & Daily Reports module can definitively identify what equipment was present and available for reporting on a specific project on a specific day.

## Known Runtime Verification Limitations
Because the Windows host environment blocks standard NPM script executions (resulting in infinite hangs for dependency installation and Prisma client generation), runtime validation such as NestJS application startup, OpenAPI generation, and automated test execution is **NOT VERIFIED**. The logic strictly adheres to NestJS paradigms but remains logically inferred rather than physically run.
