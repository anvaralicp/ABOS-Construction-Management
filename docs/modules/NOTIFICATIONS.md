# Notifications & Alerts Module

## Purpose
The Notifications & Alerts module provides a secure, tenant-isolated foundation for delivering in-app notifications and system alerts to authenticated users. It is designed to be the central notification hub consumed by Web, Android, and iOS clients.

## Deduplication
Concurrent notification creation is safely prevented by a native database partial unique index on (organization_id, deduplication_key) where the key is not null. A race-safe fallback gracefully handles Prisma P2002 constraint violations during idempotency checks.

## Data Model
The underlying `Notification` model handles structural properties such as:
- **Title and Body:** The core message.
- **Severity and Type:** Enums mapping directly to system events (e.g. `INFO`, `CRITICAL`, `BUDGET_ALERT`, `EXPENSE`).
- **Read State:** Real-time sync tracking via `is_read` and `read_at`.
- **Metadata:** A structured `Json` object enabling rich client integrations and actionable deep-links without hardcoding external URLs into database fields.
- **Expiration:** Time-bound relevancy via `expires_at`.
- **Deduplication:** An optional key to prevent redundant notification generation in asynchronous background workers.

## Tenant & Recipient Isolation
- **Organization Boundary:** Every query inherently binds to the `organization_id` of the authenticated user's context. Cross-organization access is structurally impossible.
- **Recipient Boundary:** Client-facing read operations enforce `user_id = context.userId`. A user in the same organization cannot query another user's notifications.

## Expiration & Soft Deletion
- **Expiration:** The module intelligently filters out expired notifications (`expires_at > now()`) without destructively purging records, retaining them for potential historical audit unless purged by a cron job later.
- **Soft Deletion:** standard ABOS soft deletion is supported (`deleted_at`).

## API Endpoints
- `POST /api/v1/notifications` (Admin/Service only)
- `GET /api/v1/notifications` - Paginated list of user's active notifications.
- `GET /api/v1/notifications/unread-count` - Returns a deterministic count of unread notifications via native database aggregation.
- `GET /api/v1/notifications/:id`
- `PATCH /api/v1/notifications/read-all` - Bulk marks all of the user's unread notifications as read.
- `PATCH /api/v1/notifications/:id/read`
- `PATCH /api/v1/notifications/:id/unread`
- `DELETE /api/v1/notifications/:id` - Soft deletes a specific notification.

## Audit Logging
Routine read-state operations (markRead, markUnread, markAllRead) intentionally do not generate audit events to prevent excessive log bloat. Structural mutations like notification creation and deletion are fully audited.

## Permissions
Access is strictly managed via RBAC tokens:
- `notifications:create`
- `notifications:read`
- `notifications:update`
- `notifications:delete`

## Service Integration (Internal)
Other backend services (like Budgets or Workflows) can utilize `NotificationsService.create` and `NotificationsService.createMany` to safely instantiate events. The module strictly focuses on delivery and avoids injecting domain-specific business logic.

## Current Limitations
- **No External Providers:** Push Notifications (APNs/FCM), SMS, and Email are NOT currently supported. The architecture facilitates future adaptation when these mediums are required.
