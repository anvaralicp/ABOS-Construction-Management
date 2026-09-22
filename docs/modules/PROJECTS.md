# Projects Module

## Purpose
The Projects module manages the core construction-domain entity representing a construction project. It establishes the organizational boundaries for construction activities, financials, and workforce assignments.

## Entities
*   **Project**: Represents a specific construction project. Fields include canonical values like `code`, `name`, `expected_end_date`, `budget_amount`, and `currency`. It is tenant-scoped via `organization_id`.
*   **ProjectMember**: A junction entity linking a user (via `OrganizationMembership`) to a `Project`. This strict relationship guarantees that only users actively belonging to the organization can be added to the organization's projects.

## Lifecycle
Projects move through strict canonical statuses:
*   `DRAFT` → `ACTIVE` or `CANCELLED`
*   `ACTIVE` → `ON_HOLD`, `COMPLETED`, or `CANCELLED`
*   `ON_HOLD` → `ACTIVE` or `CANCELLED`
*   `COMPLETED` / `CANCELLED` are terminal states.

## Membership Model
A project member *must* reference the Project and the Organization Membership. A user cannot be added directly via their `user_id`, enforcing strict tenant isolation boundaries. Attempting to add a member from another organization is blocked.

## Authorization
Project authorization integrates with the existing `TenantGuard` and `PermissionsGuard`.
Specific RBAC permissions seeded include:
*   `projects:read`
*   `projects:write`
*   `projects:delete`
*   `project_members:read`
*   `project_members:write`

## API Endpoints
All endpoints sit under `/api/v1/projects`:
*   `POST /` - Create project
*   `GET /` - List projects
*   `GET /:id` - Get project
*   `PATCH /:id` - Update project details
*   `PATCH /:id/status` - Update lifecycle status
*   `DELETE /:id` - Archive/soft-delete project
*   `GET /:id/members` - List project members
*   `POST /:id/members` - Add member
*   `DELETE /:id/members/:memberId` - Remove member

## Tenant Isolation
Every query inside `ProjectsService` is fully tenant-scoped. Operations use composite foreign keys and composite `where` clauses (`where: { id_organization_id: { id, organization_id } }`). Cross-organization queries and bypasses are structurally impossible.

## Audit Events
`AuditService` logs the following:
*   `PROJECT_CREATED`
*   `PROJECT_UPDATED`
*   `PROJECT_STATUS_CHANGED`
*   `PROJECT_DELETED`
*   `PROJECT_MEMBER_ADDED`
*   `PROJECT_MEMBER_REMOVED`

## Deletion Behavior
Soft-deletion is employed on `Project` via `deleted_at`. Any active query filters out records where `deleted_at` is not null. Relational data (e.g. expenses, budgets) are not cascade-deleted, maintaining historical structural integrity.

## Known Runtime Verification Limitations
Because the development environment blocks dependency installation (`npm install`) and database execution (`npx prisma`), the runtime functionality (TypeScript compilation, NestJS startup, automated tests, and Prisma schema generation) is **NOT VERIFIED**. The code is written strictly according to standard NestJS/Prisma patterns but has not been executed.
