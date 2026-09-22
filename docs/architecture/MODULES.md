# ABOS Modules & Boundaries

## Module Rules
* **Repository/Module Boundaries:** Each business module lives in its own designated directory (e.g., `modules/expenses`), completely encapsulating its logic, data models, and API endpoints.
* **Dependency Rules:** Modules can only interact with other modules via explicitly defined public interfaces/APIs or asynchronous events. Hidden coupling or direct internal state manipulation of another module is strictly prohibited.
* **Database Ownership Rules:** Each module owns its specific database tables. A module must not directly query or mutate another module's tables. It must call the owning module's interface to retrieve or update data.

## Platform Modules

### Identity & Access
* **Purpose:** Manages user authentication and authorization.
* **Responsibilities:** Login/logout, password management, role assignment, token generation.
* **Main Entities:** User, Role, Session.
* **Dependencies:** None.
* **APIs/Events Exposed:** `UserRegistered`, `UserLoggedIn`, auth middleware.
* **APIs/Events Consumed:** None.
* **Must NOT Own:** Organization structure, subscriptions, or domain data.

### Organizations
* **Purpose:** Represents the tenant boundary.
* **Responsibilities:** Managing organizational profiles, tenant settings, member invites.
* **Main Entities:** Organization, OrganizationMember.
* **Dependencies:** Identity & Access.
* **APIs/Events Exposed:** `OrganizationCreated`, `MemberAdded`.
* **APIs/Events Consumed:** `UserRegistered`.
* **Must NOT Own:** Billing, subscriptions, or project data.

### Subscriptions & Entitlements
* **Purpose:** Handles SaaS billing and feature gating.
* **Responsibilities:** Tracking active plans, limits, and entitlements.
* **Main Entities:** Subscription, Entitlement, Plan.
* **Dependencies:** Organizations.
* **APIs/Events Exposed:** `SubscriptionUpdated`, entitlement check API.
* **APIs/Events Consumed:** `OrganizationCreated`.
* **Must NOT Own:** Payment gateway logic (abstracted), business domain entities.

### Notifications
* **Purpose:** Alerting users of important events.
* **Responsibilities:** Email, push, and in-app notifications.
* **Main Entities:** Notification, Preference.
* **Dependencies:** Identity & Access.
* **APIs/Events Exposed:** None (consumers of platform events).
* **APIs/Events Consumed:** Any domain event requiring an alert.
* **Must NOT Own:** Business logic triggering the alert.

### Audit
* **Purpose:** Compliance and traceability.
* **Responsibilities:** Immutable logging of critical actions.
* **Main Entities:** AuditLog.
* **Dependencies:** Identity & Access.
* **APIs/Events Exposed:** Audit query API.
* **APIs/Events Consumed:** `*` (All state-changing domain events).
* **Must NOT Own:** Application state.

### Documents
* **Purpose:** Managing files related to the platform.
* **Responsibilities:** File metadata, associations to entities (e.g., Expense receipts), URL generation.
* **Main Entities:** Document.
* **Dependencies:** Organizations.
* **APIs/Events Exposed:** Upload/Download APIs, `DocumentUploaded`.
* **APIs/Events Consumed:** None.
* **Must NOT Own:** The physical storage layer (this is abstracted).

## Construction Domain Modules

### Projects
* **Purpose:** Core container for construction activities.
* **Responsibilities:** Project lifecycle, status tracking, metadata.
* **Main Entities:** Project.
* **Dependencies:** Organizations.
* **APIs/Events Exposed:** `ProjectCreated`, `ProjectCompleted`.
* **APIs/Events Consumed:** None.
* **Must NOT Own:** Expenses, reports, or materials directly.

### Categories
* **Purpose:** Taxonomy for expenses and items.
* **Responsibilities:** Managing standard and custom categorizations.
* **Main Entities:** Category, Subcategory.
* **Dependencies:** Organizations.
* **APIs/Events Exposed:** Category lookup API.
* **APIs/Events Consumed:** None.
* **Must NOT Own:** Expense records.

### Expenses
* **Purpose:** Tracking financial outflow for projects.
* **Responsibilities:** Expense entry, approval workflows, receipt linking.
* **Main Entities:** Expense, ExpenseLineItem.
* **Dependencies:** Projects, Categories, Vendors.
* **APIs/Events Exposed:** `ExpenseLogged`, `ExpenseApproved`.
* **APIs/Events Consumed:** `ProjectStatusChanged`.
* **Must NOT Own:** Budget calculation logic, raw file storage.

### Vendors
* **Purpose:** Managing external suppliers and contractors.
* **Responsibilities:** Vendor registry, contact details.
* **Main Entities:** Vendor.
* **Dependencies:** Organizations.
* **APIs/Events Exposed:** Vendor lookup API.
* **APIs/Events Consumed:** None.
* **Must NOT Own:** Expense or invoice records.

### Budgets
* **Purpose:** Financial planning and tracking vs actuals.
* **Responsibilities:** Budget allocation per project/category, variance calculation.
* **Main Entities:** Budget, BudgetLine.
* **Dependencies:** Projects, Categories, Expenses (via events/interfaces).
* **APIs/Events Exposed:** `BudgetExceeded` alert.
* **APIs/Events Consumed:** `ExpenseApproved`.
* **Must NOT Own:** Expense processing logic.

### Materials
* **Purpose:** Tracking physical items used on-site.
* **Responsibilities:** Material catalog, site deliveries, usage logging (proposed/future).
* **Main Entities:** Material, Delivery.
* **Dependencies:** Projects, Vendors.
* **APIs/Events Exposed:** `MaterialDelivered`.
* **APIs/Events Consumed:** None.
* **Must NOT Own:** Financial accounting of the materials.

### Workforce
* **Purpose:** Managing labor and personnel on projects.
* **Responsibilities:** Timesheets, crew assignment, labor tracking (proposed/future).
* **Main Entities:** Worker, Timesheet, Crew.
* **Dependencies:** Projects, Organizations.
* **APIs/Events Exposed:** `TimesheetSubmitted`.
* **APIs/Events Consumed:** None.
* **Must NOT Own:** Payroll processing.

### Equipment
* **Purpose:** Tracking machinery and tools.
* **Responsibilities:** Equipment inventory, allocation to projects, maintenance logs (proposed/future).
* **Main Entities:** Equipment, Allocation.
* **Dependencies:** Projects.
* **APIs/Events Exposed:** `EquipmentAllocated`.
* **APIs/Events Consumed:** None.
* **Must NOT Own:** Depreciation accounting.

### Progress & Daily Reports
* **Purpose:** Tracking site activity and milestones.
* **Responsibilities:** Daily logs, weather capture, task completion.
* **Main Entities:** DailyReport, Task.
* **Dependencies:** Projects, Workforce, Equipment.
* **APIs/Events Exposed:** `ReportSubmitted`.
* **APIs/Events Consumed:** None.
* **Must NOT Own:** Financial actuals.

### Reports & Analytics
* **Purpose:** Aggregating data for insights.
* **Responsibilities:** Dashboard data generation, exportable reports.
* **Main Entities:** ReportTemplate, DashboardWidget.
* **Dependencies:** All modules (read-only interfaces or via event aggregation).
* **APIs/Events Exposed:** Report execution APIs.
* **APIs/Events Consumed:** Domain events for materialized views.
* **Must NOT Own:** Source of truth for transactional data.

### GST & Tax
* **Purpose:** Handling tax calculations and compliance.
* **Responsibilities:** Tax rates, GST calculations for expenses.
* **Main Entities:** TaxRate.
* **Dependencies:** Organizations.
* **APIs/Events Exposed:** Tax calculation service.
* **APIs/Events Consumed:** None.
* **Must NOT Own:** The expense amounts themselves.

## Approved Architecture Baseline
Future implementation must follow these documented decisions unless an explicit architecture change is approved and documented.
