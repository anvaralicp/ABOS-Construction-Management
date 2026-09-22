# Progress & Daily Reports Module

## Purpose
The Progress & Daily Reports module provides the daily construction site progress narrative. It brings together work descriptions, safety notes, next-day plans, and integrates tightly with authoritative transaction records (Workforce/Attendance, Equipment, and Expenses) to produce a cohesive daily snapshot of a project. 

This module does *not* calculate payroll, recalculate expenses, or duplicate master data; instead, it provides aggregated operational context for a single working date.

## One Report Per Project Per Day
The core rule of the module is that there is exactly **one** Progress Report per Project per Date.
*   **Database enforcement**: Uniqueness is physically enforced in the database schema via `@@unique([organization_id, project_id, report_date])`.
*   **Conflict Handling**: If multiple offline users attempt to sync a report for the exact same project and date concurrently, the Prisma `P2002` constraint error is intercepted and returned as a standard `409 Conflict`.

## Offline Behavior & Concurrency
Daily Reports are an offline-capable entity.
*   **Idempotency**: Clients create reports using client-generated UUIDs. 
*   **Optimistic Concurrency**: The `version` field prevents silent overwrites (last-write-wins is explicitly avoided). If `updateMany({ where: { id, version: expected } })` returns a 0 count, the API safely rejects the update.
*   **Timestamps**: `client_created_at` and `client_updated_at` can be passed to preserve true field times.

## Daily Context Integrations
The API exposes an aggregated `/api/v1/progress-reports/:id/daily-context` endpoint to prevent N+1 frontend queries. The backend independently queries and groups:
1.  **Attendance**: Queries `DailyAttendance` for the specific `project_id` on the 24-hour boundary of the `report_date`.
2.  **Expenses**: Queries `Expense` for the specific `project_id` matching the `expense_date`. The database inherently aggregates the total (`_sum`) and count (`_count`) without pulling records into memory, ensuring this endpoint does not act as a second transactional ledger.
3.  **Equipment**: Queries `ProjectEquipmentAssignment` to locate equipment where `assigned_from` is on or before the end of the `report_date`, and `assigned_to` is either null or on/after the start of the `report_date`.

## Documents & Attachments
Reports use the central Document storage infrastructure. 
*   Photos or files uploaded via the `Documents` module can be attached directly to the report via `ProgressReportAttachment`.
*   Attachments adhere strictly to the standard soft-delete and tenant-safe isolation patterns.
*   **Database Enforcement**: The schema enforces `@@unique([organization_id, progress_report_id, document_id])` to guarantee concurrent attach requests to the same document fail with standard `409 Conflict`.

## Timezone Configuration & Reporting Date Limitations
Currently, ABOS Architecture does not store `timezone` attributes at the `Organization` or `Project` levels. 
*   **Reporting Date Meaning**: `report_date` is treated as a UTC date. Temporal queries in the daily context logic explicitly boundary the date using `setUTCHours(0,0,0,0)` to `23:59:59.999`. 
*   **Production Implication**: This assumes the site's reporting schedule maps cleanly to UTC boundaries. If the platform is deployed in a timezone significantly offset from UTC (e.g. UTC+10), events happening early in the morning might technically fall into the previous UTC day's bounds. 
*   **Recommendation**: Before multi-timezone production deployment, a platform-level timezone architecture (e.g. storing timezone at the Project level and passing offsets to query boundaries) must be introduced.

## Authorization & Project Membership
Access relies on the standard RBAC framework via `PermissionsGuard`. The following formal permissions have been seeded into the database and attached to the `Organization Admin` role:
*   `progress_reports:read`
*   `progress_reports:create`
*   `progress_reports:update`
*   `progress_reports:delete`

**Project Membership Decision**: Based on the existing pattern found in `ProjectsService.findOne()` which only checks `organization_id` for scoping, authorization at the progress-report layer relies on the user possessing the Organization-level `progress_reports:read` permission. Project-level strict containment (checking the `ProjectMember` table before allowing reads) is intentionally omitted here to align with the core ABOS module visibility behaviors, meaning any user granted `progress_reports:read` at the organization level can view reports across all projects within that organization.

## Audit Event Transaction Integrity
To prevent isolated loss of audit trails in the event of an application crash:
*   Business mutations (`create`, `update`, `delete`, and attachment operations) operate inside Prisma `$transaction` scopes.
*   The `AuditService` has been enhanced to accept a transaction client (`tx`). The business mutation and the audit event are committed atomically.
Because the Windows host environment blocks standard NPM script executions (resulting in infinite hangs for dependency installation and Prisma client generation), runtime validation such as NestJS application startup, OpenAPI generation, and automated test execution is **NOT VERIFIED**. The logic strictly adheres to NestJS paradigms but remains logically inferred rather than physically run.
