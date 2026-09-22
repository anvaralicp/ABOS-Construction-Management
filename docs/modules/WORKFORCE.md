# Workforce & Attendance Module

## Purpose
The Workforce module acts as the central labor registry for ABOS Construction Management. It formally models workforce members, their contractual/assignment presence on projects, and tracks daily site attendance. This module tracks hours and rates strictly for construction progress and cost calculations, actively avoiding HR or direct payroll execution processing.

## Data Model & Tenancy
*   **WorkforceMember**: The organization's labor catalog (`name`, `trade`, `hourly_rate`, `status`). Strictly scoped to an `organization_id`.
*   **ProjectWorkforceAssignment**: The bridge explicitly permitting a worker to log hours against a project (`project_id`, `workforce_member_id`, `start_date`, `end_date`, `role`, `status`). Prevents unassigned labor costs.
*   **DailyAttendance**: The daily timesheet record (`project_id`, `workforce_member_id`, `date`, `hours`, `status`). Uniquely constrained per worker, per project, per day to prevent duplicate daily entries unless the canonical design specifically scales out to shift-based models in the future.

Cross-tenant contamination is structurally impossible. All operations require and validate the `organization_id` derived securely from the authenticated `TenantContext`.

## Assignment & Business Rules
*   **Inactive Workers**: A `WorkforceMember` marked as `INACTIVE` cannot be assigned to new projects. Historical data is preserved.
*   **Archived Projects**: Workers cannot be assigned to projects that are `ARCHIVED` or soft-deleted.
*   **Start/End Dates**: If an assignment defines both dates, `end_date` must logically equal or succeed `start_date`.
*   **Duplicate Assignments**: A worker may only hold one `ACTIVE` assignment per project simultaneously.
*   **Authorized Attendance**: `DailyAttendance` records are structurally blocked unless an `ACTIVE` `ProjectWorkforceAssignment` exists for that worker on that project.

## Offline Attendance Capability
`DailyAttendance` is optimized for construction environments lacking stable internet:
*   **Idempotency**: Clients must generate and provide a UUID `id`. If a network failure occurs and the client retries the `POST`, the API safely intercepts the duplicate UUID and returns a successful response without fabricating duplicate hours.
*   **Concurrency**: Uses the explicit `version` optimistic concurrency mechanism (`updateMany({ where: { id, version: expected }, data: { version: { increment: 1 } } })`). Stale updates throw a `ConflictException`.
*   **Client Timestamps**: Client-captured telemetry (`client_created_at`, `client_updated_at`) is securely captured for conflict resolution mapping without trusting it as the server's authoritative row timestamp.

## Expense Compatibility
The current canonical model manages `Expense` records distinctly from `DailyAttendance`. While `DailyAttendance` implies cost (`hours` * `hourly_rate`), it operates independently from `Expenses` until a future cost-aggregation/wage-settlement module (such as Vendor Payments / Payroll) processes it. We have intentionally avoided shoehorning an uncanonical `Expense` relationship into `DailyAttendance`.

## Permissions
Access relies on the standard RBAC framework via `PermissionsGuard`. The following formal permissions have been seeded into the database and attached to the `Organization Admin` role:
*   `workforce:read` / `workforce:write` / `workforce:delete`
*   `workforce_assignments:read` / `workforce_assignments:write` / `workforce_assignments:delete`
*   `attendance:read` / `attendance:write` / `attendance:delete`

## API Endpoints
All endpoints operate under `/api/v1/workforce` (or `/api/v1/projects` where semantically aligned):
*   `POST /workforce` - Create a worker
*   `GET /workforce` - List workers
*   `GET /workforce/:id` - Get worker details
*   `PATCH /workforce/:id` - Update a worker
*   `DELETE /workforce/:id` - Archive a worker
*   `POST /workforce/:id/assignments` - Assign worker to project
*   `GET /workforce/:id/assignments` - View a worker's assignments
*   `PATCH /workforce/:id/assignments/:assignmentId` - Modify an assignment
*   `POST /workforce/:id/attendance` - Record daily attendance
*   `PATCH /workforce/:id/attendance/:attendanceId` - Edit attendance hours/remarks
*   `GET /projects/:projectId/workforce` - View all active workers assigned to a project

## Known Runtime Verification Limitations
Because the Windows host environment blocks standard NPM script executions (resulting in infinite hangs for dependency installation and Prisma client generation), runtime validation such as NestJS application startup, OpenAPI generation, and automated test execution is **NOT VERIFIED**. The logic strictly adheres to NestJS paradigms but remains logically inferred rather than physically run.
