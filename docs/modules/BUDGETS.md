# Budgets Module

## Purpose
The Budgets module establishes financial planning and control for projects. It allows organizations to allocate expected expenditure limits at the project level and explicitly break them down by taxonomy (Categories) using Budget Lines. This module then cross-references real-time transactions from the **Expenses** module to calculate actuals, remaining balances, utilization percentages, and variance.

## Financial Precision
All monetary values are persisted as integers representing minor units (e.g., `125050` instead of `1250.50`). The fields include:
*   `Budget.total_amount`
*   `BudgetLine.amount`

Calculations involving variance and totals strictly use integer arithmetic. Utilization percentages are calculated dynamically upon request and safely handle edge cases like zero-budgets.

## Budget vs Actual Analysis
The `GET /api/v1/budgets/:id/summary` endpoint provides a comprehensive financial snapshot:
*   **Total Budgeted**: The `total_amount` allocated to the project.
*   **Total Actual**: Aggregated sum of `total_amount` from all non-deleted `Expense` records associated with the project.
*   **Remaining**: `Budgeted - Actual`.
*   **Variance**: `Budgeted - Actual`. A positive variance indicates the project is *under* budget. A negative variance indicates an *overspend*.
*   **Utilization %**: `(Actual / Budgeted) * 100`.

### Category Breakdown
The summary endpoint breaks down the budget by category using `BudgetLine`:
*   Expenses belonging to a category with a designated budget line are mapped explicitly.
*   Expenses belonging to a category *without* a corresponding budget line are appended to the breakdown and flagged as `is_unbudgeted: true`, ensuring no hidden expenses evade analysis.

### Equality Enforcement
While `Budget` defines a `total_amount`, the sum of `BudgetLine` amounts is not strictly forced to equal the total budget at the API level. This permits organizations to leave an "unallocated buffer" at the project level.

## Optimistic Concurrency
To prevent race conditions during budget adjustments, `Budget` uses an explicit `version` integer.
Updates enforce Compare-And-Swap (CAS):
`updateMany({ where: { id, version: expectedVersion }, data: { version: { increment: 1 } } })`
If the expected version does not match the database, a `ConflictException` is thrown.

## Tenant Isolation & Relationships
Cross-tenant contamination is structurally impossible. Before a budget or budget line is saved, the API verifies that the `project_id` and all `category_id`s belong exactly to the authenticated user's active tenant (`organization_id`).

## Performance Considerations
The `getSummary` endpoint uses Prisma's native database aggregation (`groupBy` and `_sum`) to aggregate expense totals by category at the database layer. This prevents unbounded loading of thousands of individual expense records into Node.js memory.

## Soft Deletion
Budgets use `deleted_at` for deletion. 
Deleted budgets are omitted from normal listings. Deleting a budget does NOT cascade-delete Expenses, Categories, or Projects. Historical financial relationships remain perfectly intact.

## Permissions
Access relies on the standard RBAC framework via `PermissionsGuard`. The following formal permissions have been seeded into the database and attached to the `Organization Admin` role:
*   `budgets:read`
*   `budgets:write`
*   `budgets:delete`
*   `budgets:summary`

## API Endpoints
All endpoints are located at `/api/v1/budgets`:
*   `POST /` - Create a budget with optional lines
*   `GET /` - List budgets
*   `GET /:id` - Get budget details and lines
*   `PATCH /:id` - Update budget (requires correct `version`)
*   `DELETE /:id` - Archive/soft-delete a budget
*   `POST /:id/lines` - Add a budget line for a specific category
*   `PATCH /:id/lines/:lineId` - Update a budget line amount
*   `DELETE /:id/lines/:lineId` - Remove a budget line
*   `GET /:id/summary` - Generate the real-time budget vs actual analysis

## Known Runtime Verification Limitations
Because the Windows host environment blocks standard NPM script executions (resulting in infinite hangs for dependency installation and Prisma client generation), runtime validation such as NestJS application startup, OpenAPI generation, and automated test execution is **NOT VERIFIED**. The logic strictly adheres to NestJS paradigms but remains logically inferred rather than physically run.
