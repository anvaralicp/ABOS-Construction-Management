# GST & Tax Management Module

## Overview

The GST & Tax Management module governs the tax configuration and aggregated tax reporting for the ABOS Construction Management platform. The module respects the historical integrity of business transactions, meaning the `Expense` table remains authoritative for specific calculation totals. The tax module provides the analytical metadata necessary to generate CGST, SGST, IGST, and CESS breakdowns.

## Configuration & Rates

*   **Configurations**: `GstTaxConfig` provides named structures defining effective tax percentages.
*   **Effective Tracking**: Append-only configuration sets using `effective_from` and `effective_to` are recommended, although in-place updates are supported for minor metadata correction. 
*   **Decimals**: Tax rates are represented using strict `Decimal` types. Floating-point types are prohibited for storage to prevent data degradation.

## Tax Applicability

The current design utilizes explicit tax classifications via the `tax_config_id` stored statically against each `Expense`. 

**Known Limitation**: The canonical database schema lacks sufficiently granular and structured place-of-supply location verification (e.g., origin/destination states mapped to GST laws) to definitively compute whether an interaction is Intra-State or Inter-State autonomously. Therefore, we do not silently guess IGST vs CGST/SGST applicability based on incomplete location fields. Clients are expected to configure explicit Tax Config structures (e.g., "GST 18% Inter-State" with 18% IGST) and assign them explicitly to Expenses.

## Calculation Rules

The `Expense` record stores `subtotal`, `tax_amount`, and `total_amount` in integer minor-units natively. The tax reports utilize Prisma's native `groupBy` and `sum` across `tax_config_id` to aggregate totals rapidly without JavaScript mapping exhaustion. Once grouped, the underlying rates attached to the configuration are utilized dynamically to mathematically proportion the `CGST`, `SGST`, `IGST`, and `CESS` distributions.

## GSTIN Handling

*   **Vendor**: `Vendor` maps their GST registration directly using the pre-existing `tax_id` field.
*   **Organization**: We mapped the Organization's root registration against `tax_id` as well.
*   **Validation**: Real-time Indian GSTIN structural validation is evaluated utilizing canonical regex matrices (`/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i`). *Note that external authority verification is not performed via this regex pass.*

## Reporting

Provides dynamic projection dashboards analyzing `invoice_date` (never `created_at`):

1.  **Summary Report**: Aggregates taxable values split across standard tax dimensions.
2.  **Vendor Report**: Outlines transactions filtered specifically by vendor, showcasing GSTIN assignments.
3.  **Project Report**: Demonstrates isolated tax footprints confined exclusively to individual physical construction limits.

## Permissions

All API access is mediated via rigorous RBAC validation:
*   `tax:create`
*   `tax:read`
*   `tax:update`
*   `tax:delete`
*   `tax:report`

## Tenant Isolation

Security mandates strict enforcement. The `organization_id` injected via the context boundary overrides user inputs, isolating all lookup, edit, or report mechanisms purely into the bounds of the requesting Tenant.

## Soft Deletion

Historical transactions continue rendering successfully because deleted Tax Configurations transition state using `is_active: false` and `deleted_at: DateTime` natively, ensuring active financial calculations aren't orphaned destructively.
