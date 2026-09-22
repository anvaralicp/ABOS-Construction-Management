# Subscriptions, Plans & Entitlements

## Overview
This module governs the commercial tier boundaries and capability gating for ABOS Construction Management. It definitively separates authorization (RBAC: *Can this user read projects?*) from entitlements (*Does this organization's plan allow more projects?*).

## Architecture

### 1. Subscription Plans (`SubscriptionPlan`)
Global configurations representing commercial offerings.
- **code**: Stable identifier (e.g., `FREE`, `BASIC`, `PRO`, `ENTERPRISE`).
- **entitlements**: The feature flags and limits associated with the plan.

### 2. Entitlements (`Entitlement`)
Configurations mapping limits/features to plans.
- **feature_key**: Stable key (e.g., `projects.max`, `reports.enabled`).
- **type**: `BOOLEAN` or `INTEGER`.
- **value_int** / **value_bool**: The resolved value.

### 3. Subscriptions (`Subscription`)
The connection tying an `Organization` to a `SubscriptionPlan`.

#### Active Subscription Uniqueness
PostgreSQL enforces a strict partial unique index ensuring no organization possesses more than one concurrently active-equivalent subscription (`TRIAL`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`).

#### Lifecycle Transitions
Controlled transitions exist (e.g. `EXPIRED` cannot revert to `ACTIVE`).

## Entitlement Evaluation
`EntitlementService` acts as the source of truth for numeric and boolean checks.

### Default Plan Fallback
If an organization possesses no valid active subscription (or if their trial expired), the system defaults securely to the `FREE` plan limits, provided a `FREE` plan is configured in the database.

### Evaluation Safety
The `EntitlementService` acts in a purely read-only manner during enforcement. It does not automatically prune expired subscriptions during a limit check.

## Administration
Platform administrators (granted `subscription_plans:*` permissions) manage plans. Organization administrators (granted `subscriptions:read`) may view their entitlements but cannot redefine them.

## Audit Logging
Structural permutations (creating subscriptions, mutating plans) generate complete AuditService trails. Frequent read operations (`getEffectiveEntitlements`) are deliberately excluded from audit spam.
