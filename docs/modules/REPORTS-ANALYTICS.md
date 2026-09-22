# Reports & Analytics Module

## Overview

The Reports & Analytics module provides a read-only projection/aggregation layer over the authoritative transactional data across the ABOS Construction Management platform.

**IMPORTANT**: This module is purely a projection layer. It does **not** store separate financial totals, outstanding vendor balances, or completion percentages. All values are calculated dynamically using database aggregations (`GROUP BY`, `SUM`, `COUNT`) from the primary tables (e.g. `Expense`, `VendorPayment`, `BudgetLine`, `DailyAttendance`).

## Design Principles

1.  **Read-Only**: Reports do not modify business records. There is no `reports:write` permission.
2.  **No Data Duplication**: Outstanding balances and variances are calculated mathematically at request time.
3.  **Monetary Precision**: All monetary values are processed and returned in integer minor units to eliminate floating-point discrepancies.
4.  **Database Native**: Aggregations are pushed to the PostgreSQL database layer (via Prisma) rather than relying on in-memory JavaScript map/reduce operations over large datasets.

## Available Endpoints

*   `GET /reports/project-summary`: Consolidated project snapshot including financial, workforce, equipment, and progress overview.
*   `GET /reports/financial`: High-level financial position (Budget vs. Actual vs. Paid vs. Outstanding).
*   `GET /reports/expenses`: Detailed expense breakdown grouped by category and vendor.
*   `GET /reports/budget`: Detailed budget utilization breakdown per category. Includes unbudgeted expense categories.
*   `GET /reports/vendors`: Vendor financial position, totaling expenses and payments to dynamically derive outstanding balances.
*   `GET /reports/workforce`: Workforce attendance statistics and trends.
*   `GET /reports/equipment`: Equipment assignment and availability statuses.
*   `GET /reports/progress`: Chronological summary of site progress reports.

## Permissions

Each report category is guarded by specific explicit read permissions to allow granular access control:

*   `reports:read`
*   `reports:project-summary`
*   `reports:financial`
*   `reports:expenses`
*   `reports:budget`
*   `reports:workforce`
*   `reports:vendors`
*   `reports:equipment`
*   `reports:progress`

## Financial Calculation Rules

*   **Budget Total**: Sum of amounts in `BudgetLine` for `ACTIVE` budgets.
*   **Actual Expense Total**: Sum of `total_amount` in `Expense` excluding `DRAFT` and `REJECTED` status and where `deleted_at IS NULL`.
*   **Paid to Vendors**: Sum of `amount` in `VendorPayment` where status is not `CANCELED` or `FAILED` and `deleted_at IS NULL`.
*   **Outstanding Vendor Amount**: `Max(0, Actual Expense Total - Paid to Vendors)`.
*   **Variance**: `Budget Total - Actual Expense Total`.
*   **Utilization %**: `(Actual Amount / Budget Amount) * 100`. (If Budget Amount is 0, this returns `null` to prevent infinity).

## Date Filtering and Timezones

Most list and timeline endpoints accept `date_from` and `date_to` queries. 

*   **Expense Reporting**: Expense financial and reporting date filters strictly use the `invoice_date` field (not `created_at`) as the canonical business transaction date.
*   **Timezone Limitation**: Dates are currently treated universally according to UTC without explicit localized tenant configuration unless otherwise bound by the frontend client's ISO transmission.

## Tenant Isolation

All endpoints mandate strict multitenancy constraints. Queries inject `organization_id = current organization` at the base Prisma `where` clause. Requesting data for a `project_id` belonging to a foreign tenant will result in an empty dataset or an explicit 404/403.

## Pagination

Detailed transactional arrays are paginated using standard `page` and `limit` boundaries to prevent memory exhaustion. Pure grouped statistical sets are unpaginated up to safe limits due to the inherent grouping caps (e.g., maximum active categories).

## Known Limitations

1.  **Progress Percentage**: The current canonical schema does not contain an explicitly tracked "progress percentage" field for `ProgressReport`. The report outputs `null` for this attribute rather than inventing heuristics.
2.  **No Materialized Views**: Calculations execute in real-time. Extremely large historic projects may experience slower aggregation times compared to pre-computed cubes, which can be introduced in the future if performance degrades.
