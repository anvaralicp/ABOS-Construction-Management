# Budgets Web Module

## Purpose
The Budgets Web Module provides the frontend interface for managing project budgets. It interacts with the backend `budgets` module to allow users to create and edit budgets, manage category-specific budget lines, and view variance/utilization against actual expenses.

## Module Boundaries
* **In Scope**: Budget list, creation, editing, status tracking, budget line addition/editing/deletion, and rendering the aggregated summary of budgeted vs actuals.
* **Out of Scope**: Editing projects or categories. Calculation of the actuals (the backend summary API handles aggregation of expense data).

## Routes
* `/budgets` - List view of all budgets the user can access.
* `/budgets/new` - Creation form.
* `/budgets/[id]` - Detail view, including budget lines and summary actuals.
* `/budgets/[id]/edit` - Edit form for budget properties (status, name, total amount).

## API Endpoints Consumed
* `GET /budgets` - Fetch budgets.
* `POST /budgets` - Create budget.
* `GET /budgets/:id` - Fetch budget details including lines.
* `PATCH /budgets/:id` - Edit budget details (requires optimistic concurrency `version`).
* `DELETE /budgets/:id` - Soft-delete budget.
* `POST /budgets/:id/lines` - Create budget line.
* `PATCH /budgets/:id/lines/:lineId` - Edit budget line.
* `DELETE /budgets/:id/lines/:lineId` - Delete budget line.
* `GET /budgets/:id/summary` - Fetch computed utilization and variance against actuals.

## UI Component Strictness
* **Badge**: Uses strictly `default`, `success`, `warning`, `danger`.
* **EmptyState**: Uses `description` prop (not `message`).
* **DialogContent**: Avoids passing `className` (uses inner `div` for layout spacing).

## Data Types and Handling
* **Money**: Monetary inputs in the UI are floats, but are immediately parsed and submitted to the API as integer minor units (e.g., cents). Presentation format utilizes `formatMoney` from `@/features/projects/utils/money`.
* **Concurrency**: `PATCH /budgets/:id` expects a `version` field. On a 409 Conflict, the UI notifies the user that the budget was modified by another user.

## Permissions
* `budgets:read`: Required to list and view budgets.
* `budgets:write`: Required to create, edit budgets, and manage lines.
* `budgets:delete`: Required to delete budgets.
* `budgets:summary`: Required to view actuals, utilization, and variance.

## Known Limitations
* Actuals are completely dependent on the backend aggregation via `GET /budgets/:id/summary`. The UI intentionally avoids computing totals to maintain the backend as the source of truth.
* Offline support is not supported.
