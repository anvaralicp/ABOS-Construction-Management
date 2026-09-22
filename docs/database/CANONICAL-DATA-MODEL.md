# ABOS Canonical Data Model

## Common Conventions
* **Identifiers:** All entities use UUID v4 for primary keys (`id`).
* **Timestamps:** Standard `created_at` and `updated_at` timestamps on all entities.
* **Offline Timestamps:** Offline-capable business entities must support `client_created_at` and `client_updated_at`. We do NOT add `synced_at` to every business table.
* **Tenant Isolation:** All organization-level and project-level entities MUST include an `organization_id`. Project-owned entities carry both `organization_id` and `project_id` where appropriate to enforce strict boundary checks at both application and database levels.
* **Concurrency:** Entities involved in offline sync or critical business state (e.g., Expenses, Budgets, Vendor Payments) must include an optimistic concurrency `version` integer field. We do not use blanket last-write-wins.
* **Auditability:** `created_by` and `updated_by` on all transactional records.
* **Soft Deletion Strategy:** `deleted_at` timestamp used for soft deletion. Financial and transactional records must not be cascade-soft-deleted. Deleting or archiving a parent entity (like a Project) must preserve its historical expenses, budgets, payments, reports, documents, and audit records. Parent archival must not destroy financial history.
* **Status Fields:** Use explicit enum values for status fields.
* **Financial Precision:** All monetary amounts are stored as integer minor units (e.g., INR ₹1.00 = 100 paise). The `currency` must be explicit. Percentages, tax rates, and other non-monetary rates may use NUMERIC/DECIMAL with appropriate precision. Floating-point values are never used for financial amounts.

## Platform Entities

### Organization
* **Purpose:** The primary tenant boundary for the multi-tenant SaaS architecture.
* **Owning module:** Organizations
* **Primary key:** `id` (UUID)
* **Tenant ownership:** Platform-level (no `organization_id`).
* **Important fields:** `name`, `status`.
* **Relationships:** Has many Users, Projects, Subscriptions.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### User
* **Purpose:** Represents an individual who can log in.
* **Owning module:** Identity & Access
* **Primary key:** `id` (UUID)
* **Tenant ownership:** Platform-level (cross-tenant identity is possible).
* **Important fields:** `email`, `password_hash`, `status`.
* **Relationships:** Has many Organization Memberships, Has many User Sessions.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### User Session
* **Purpose:** Represents an active authentication session (supports multi-device Web/Android/iOS).
* **Owning module:** Identity & Access
* **Primary key:** `id` (UUID)
* **Tenant ownership:** Platform-level (Sessions belong to Users, not specific organizations).
* **Important fields:** `user_id`, `refresh_token_hash`, `device_info`, `ip_address`, `expires_at`, `revoked_at`, `version`.
* **Relationships:** Belongs to User.
* **Creation/update timestamps:** `created_at` and `updated_at`.
* **Soft-delete:** No. Revocation is handled via `revoked_at` timestamp.
* **Audit requirement:** Yes.
* **Notes:** One user may have multiple active sessions. Each session can be independently revoked. Logout revokes the relevant session. Password change revokes all active sessions. Expired/revoked sessions cannot refresh. Raw tokens are never stored. Optimistic concurrency (`version`) guarantees single-use refresh-token rotation and provides atomic replay/race detection. If a rotation conflict is detected, the session is immediately revoked as a security measure.

### Organization Membership
* **Purpose:** Links a User to an Organization.
* **Owning module:** Organizations
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `user_id`, `organization_id`, `role_id`.
* **Relationships:** Belongs to Organization, Belongs to User, Belongs to Role.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.
* **Audit requirement:** Yes.

### Role
* **Purpose:** Defines a set of permissions for RBAC.
* **Owning module:** Identity & Access
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id` (Custom roles) or Platform-level (System roles).
* **Important fields:** `name`, `description`, `is_system`.
* **Relationships:** Has many Permissions.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.
* **Audit requirement:** Yes.

### Permission
* **Purpose:** Granular access right (e.g., `expense:approve`).
* **Owning module:** Identity & Access
* **Primary key:** `id` (UUID)
* **Tenant ownership:** Platform-level.
* **Important fields:** `action`, `resource`.
* **Relationships:** Belongs to many Roles.
* **Creation/update timestamps:** No.
* **Soft-delete:** No.
* **Audit requirement:** No.
* **Notes:** System privileges rely on a formalized `admin:all` permission attached to a system-level "Platform Admin" role.

### Subscription Plan
* **Purpose:** Defines available pricing tiers and feature sets.
* **Owning module:** Subscriptions & Entitlements
* **Primary key:** `id` (UUID)
* **Tenant ownership:** Platform-level.
* **Important fields:** `name`, `price`, `currency`, `billing_cycle`.
* **Relationships:** Has many Entitlements.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.
* **Audit requirement:** No.

### Subscription
* **Purpose:** An Organization's active subscription to a Plan.
* **Owning module:** Subscriptions & Entitlements
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `plan_id`, `status`, `current_period_end`.
* **Relationships:** Belongs to Organization, Belongs to Subscription Plan.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.
* **Audit requirement:** Yes.

### Entitlement
* **Purpose:** A specific capability or limit granted by a plan.
* **Owning module:** Subscriptions & Entitlements
* **Primary key:** `id` (UUID)
* **Tenant ownership:** Platform-level.
* **Important fields:** `feature_key`, `limit_value`.
* **Relationships:** Belongs to Subscription Plan.
* **Creation/update timestamps:** No.
* **Soft-delete:** No.
* **Audit requirement:** No.

### Audit Event
* **Purpose:** Immutable record of critical system actions.
* **Owning module:** Audit
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id` (if applicable) or Platform-level.
* **Important fields:** `action`, `entity_type`, `entity_id`, `actor_id`, `metadata` (JSONB).
* **Relationships:** Belongs to User (Actor).
* **Creation/update timestamps:** `created_at` only.
* **Soft-delete:** No (Append-only).
* **Audit requirement:** N/A.

### Notification
* **Purpose:** Alerts sent to users.
* **Owning module:** Notifications
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `user_id`, `title`, `body`, `type`, `read_at`.
* **Relationships:** Belongs to User.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** No.

## Construction Entities

### Project
* **Purpose:** Container for construction activities and financials.
* **Owning module:** Projects
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `name`, `code`, `description`, `address`, `status`, `start_date`, `expected_end_date`, `actual_end_date`, `budget_amount`, `currency`, `created_by`, `updated_by`.
* **Relationships:** Belongs to Organization.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### Project Member
* **Purpose:** Links an Organization Membership to a specific Project with optional project-level roles.
* **Owning module:** Projects
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`, `project_id`.
* **Important fields:** `project_id`, `organization_membership_id`.
* **Relationships:** Belongs to Project, Belongs to Organization Membership (avoids bypassing the organization boundary).
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.
* **Audit requirement:** Yes.

### Category
* **Purpose:** Taxonomy for expenses (e.g., Labor, Materials, Subcontractor).
* **Owning module:** Categories
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `name`, `description`, `parent_id`, `is_active`, `created_by`, `updated_by`.
* **Relationships:** Belongs to Organization, Belongs to Category (Self).
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### Expense
* **Purpose:** Financial outflow against a project, fully supporting the Construction Expense Tracker requirements.
* **Owning module:** Expenses
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`, `project_id`.
* **Important fields:** 
  * `project_id`, `category_id`, `vendor_id`
  * `item` / description
  * `quantity` (DECIMAL/NUMERIC)
  * `unit` (e.g., 'bags', 'kg')
  * `unit_price` (integer, minor units)
  * `subtotal` (integer, minor units)
  * `taxable_amount` (integer, minor units)
  * `tax_rate` (DECIMAL/NUMERIC percentage)
  * `tax_amount` (integer, minor units)
  * `total_amount` (integer, minor units)
  * `currency`
  * `vendor_reference`
  * `invoice_number`, `invoice_date`
  * `payment_status`, `payment_mode`
  * `remarks`
  * `status`, `version`
  * `client_created_at`, `client_updated_at`
  * `created_by`, `updated_by`, `approved_by`
* **Relationships:** Belongs to Project, Category, Vendor.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes (no cascade deletion).
* **Audit requirement:** Yes.

### Vendor Payment
* **Purpose:** Records payments made to a vendor, potentially spanning multiple or single expenses.
* **Owning module:** Vendors
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`, optional `project_id`.
* **Important fields:**
  * `vendor_id`, `expense_id` (optional)
  * `amount` (integer, minor units)
  * `currency`
  * `payment_date`, `payment_method`
  * `reference_number`, `status`, `remarks`, `version`
* **Relationships:** Belongs to Vendor, optionally belongs to Expense and Project.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes (no cascade deletion).
* **Audit requirement:** Yes.

### Vendor
* **Purpose:** Supplier or subcontractor.
* **Owning module:** Vendors
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `name`, `code`, `tax_id`, `status`, `address`, `notes`, `created_by`, `updated_by`.
* **Relationships:** Belongs to Organization.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### Vendor Contact
* **Purpose:** Person associated with a Vendor.
* **Owning module:** Vendors
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `vendor_id`, `name`, `designation`, `email`, `phone`, `alternate_phone`, `is_primary`, `created_by`, `updated_by`.
* **Relationships:** Belongs to Vendor.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** No.

### Budget
* **Purpose:** Financial planning for a project.
* **Owning module:** Budgets
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`, `project_id`.
* **Important fields:** `project_id`, `total_amount` (integer, minor units), `currency`, `version`.
* **Relationships:** Belongs to Project. Has many Budget Lines.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### Budget Line
* **Purpose:** Budget allocation per category.
* **Owning module:** Budgets
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`, `project_id`.
* **Important fields:** `budget_id`, `category_id`, `amount` (integer, minor units), `currency`.
* **Relationships:** Belongs to Budget, Belongs to Category.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.
* **Audit requirement:** Yes.

### Material
* **Purpose:** Physical item catalog.
* **Owning module:** Materials
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `name`, `unit_of_measure`.
* **Relationships:** Belongs to Organization.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### Material Rate
* **Purpose:** Cost configuration for a Material over time or per Vendor.
* **Owning module:** Materials
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `material_id`, `vendor_id`, `rate` (integer, minor units), `currency`, `effective_date`.
* **Relationships:** Belongs to Material, Vendor.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.
* **Audit requirement:** Yes.

### Workforce Member
* **Purpose:** Represents labor personnel on a project.
* **Owning module:** Workforce
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `name`, `trade`, `hourly_rate` (integer, minor units), `currency`.
* **Relationships:** Belongs to Organization.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### Project Workforce Assignment
* **Purpose:** Explicit assignment entity connecting workforce members to projects.
* **Owning module:** Workforce
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`, `project_id`.
* **Important fields:** `workforce_member_id`, `role` (trade), `rate` (integer, minor units), `currency`, `start_date`, `end_date`, `status`.
* **Relationships:** Belongs to Project, Belongs to Workforce Member.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.
* **Audit requirement:** Yes.

### Equipment
* **Purpose:** Machinery or tools used on site.
* **Owning module:** Equipment
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `code`, `name`, `description`, `equipment_type`, `manufacturer`, `model`, `serial_number`, `registration_number`, `status`, `notes`.
* **Relationships:** Belongs to Organization.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### Project Equipment Assignment
* **Purpose:** Assigns equipment to a specific project.
* **Owning module:** Equipment
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`, `project_id`.
* **Important fields:** `equipment_id`, `assigned_from`, `assigned_to`, `status`, `notes`.
* **Relationships:** Belongs to Project, Belongs to Equipment.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.
* **Audit requirement:** Yes.

### Progress Report
* **Purpose:** Track milestone and task completion on a project without duplicating expense or attendance data.
* **Owning module:** Progress & Daily Reports
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`, `project_id`.
* **Important fields:**
  * `project_id`
  * `report_date`
  * `summary`, `work_completed`, `issues`, `delays`, `next_day_plan`
  * `status`, `prepared_by`
  * `client_created_at`, `client_updated_at`, `version`
* **Relationships:** Belongs to Project.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### Daily Attendance
* **Purpose:** Tracks workforce presence per day on a project.
* **Owning module:** Progress & Daily Reports
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`, `project_id`.
* **Important fields:** `project_id`, `workforce_member_id`, `date`, `hours`.
* **Relationships:** Belongs to Project, Workforce Member.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.
* **Audit requirement:** Yes.

### Report
* **Purpose:** Saved configuration for data analytics.
* **Owning module:** Reports & Analytics
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `name`, `configuration` (JSONB).
* **Relationships:** Belongs to Organization.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

### GST/Tax configuration
* **Purpose:** Defines tax rates for expenses.
* **Owning module:** GST & Tax
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `name`, `rate_percentage` (DECIMAL/NUMERIC), `is_active`.
* **Relationships:** Belongs to Organization.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.
* **Audit requirement:** Yes.

## Documents and Attachments
We explicitly avoid unrestricted polymorphic foreign-key designs. Referential integrity is preserved using explicit domain attachment/link entities.

### Document
* **Purpose:** Platform-wide abstraction for physical files.
* **Owning module:** Documents
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:** `filename`, `mime_type`, `size_bytes`, `storage_key`.
* **Relationships:** Belongs to Organization.
* **Creation/update timestamps:** Yes.
* **Soft-delete:** Yes.

### Explicit Attachment Entities
* **Expense Attachment:** `id` (UUID), `organization_id`, `expense_id`, `document_id`.
* **Progress Report Attachment:** `id` (UUID), `organization_id`, `progress_report_id`, `document_id`.
* **Project Document:** `id` (UUID), `organization_id`, `project_id`, `document_id`.
* **Vendor Document:** `id` (UUID), `organization_id`, `vendor_id`, `document_id`.

## Infrastructure / Offline Synchronization

### Sync Queue Event
* **Purpose:** A separate synchronization/queue model tracking offline client operations without adding `synced_at` overhead to every business table.
* **Owning module:** Infrastructure / Jobs
* **Primary key:** `id` (UUID)
* **Tenant ownership:** `organization_id`.
* **Important fields:**
  * `device_id`, `user_id`
  * `entity_type`, `entity_id`
  * `operation` (CREATE, UPDATE, DELETE)
  * `client_timestamp`, `server_timestamp`
  * `sync_status` (PENDING, SUCCESS, CONFLICT, FAILED)
  * `retry_count`, `error_information` (JSONB)
* **Creation/update timestamps:** Yes.
* **Soft-delete:** No.

## Constraints and Indexing
* **Foreign-Key Indexes:** All foreign keys must be indexed (e.g., `user_id`, `project_id`, `document_id`).
* **Organization & Project-Scoped Indexes:** Combined indexes on `[organization_id, ...]` or `[project_id, ...]` must be applied to optimize tenant-scoped queries.
* **Date & Status Indexes:** High-volume transactional queries require indexes on fields like `[organization_id, project_id, status, date]` for `Expense`, `Vendor Payment`, and `Progress Report`.
* **Unique Constraints:** 
  * Organization Memberships: `[organization_id, user_id]` must be unique.
  * Categories: `[organization_id, name, parent_id]` must be unique.
  * Vendors: `[organization_id, tax_id]` must be unique where applicable.

## Entity Classifications
* **Platform-level entities:** User, Permission, Subscription Plan, Entitlement.
* **Organization-level entities (shared across projects):** Organization Membership, Role, Category, Vendor, Material, Equipment, Workforce Member, Document, Sync Queue Event, Explicit Attachments, GST/Tax configuration.
* **Project-level entities:** Project, Project Member, Expense, Vendor Payment, Budget, Progress Report, Daily Attendance, Project Workforce Assignment.
* **Strict boundaries:** NO entity belonging to an organization can ever reference or be referenced by an entity belonging to another organization.

## Operational Considerations
1. **Security / Tenant-Boundary Considerations:** Tenant ownership is strictly enforced on every table using `organization_id`, and further refined via `project_id`. Application and database layers will jointly enforce these constraints.
2. **Offline Considerations:** Optimistic concurrency is maintained via a `version` field. Sync conflicts are managed explicitly through the `Sync Queue Event` model, rejecting blanket last-write-wins in favor of safe reconciliation.
3. **Potentially Sensitive Data:** `User.password_hash`, `Vendor` contact details, and financial amounts across `Expense`, `Budget`, and `Vendor Payment`.
4. **High-Volume Tables:** `Audit Event` (appends on every major system action), `Sync Queue Event`, `Notification`, `Expense`, `Expense Attachment`.
5. **Audited Tables:** All configuration tables (Roles, Categories, GST, Subscriptions) and all financial tables (Budgets, Expenses, Material Rates, Vendor Payments).
6. **Circular Dependencies:** Care must be taken around Category parent-child hierarchies (self-referencing) to prevent deep nesting recursion issues.

## Final Data Model Baseline
This document is the approved logical data-model baseline for schema implementation. The next database phase may translate it into Prisma models and migrations.
