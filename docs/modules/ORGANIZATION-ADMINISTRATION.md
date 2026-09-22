# Organization Administration & System Configuration

## Overview
This module extends the core Identity & Access system to provide controlled organization-level configuration for ABOS Construction Management. It establishes a clean tenant-scoped foundation for organization profiles and operational settings.

## Separation of Concerns
1. **Organization Profile:** Found directly on the `Organization` model. Captures business identity (`legal_name`, `address`, `tax_id`).
2. **Organization Settings:** Found on the `OrganizationSettings` model. Captures operational defaults (`timezone`, `currency`). Enforced mathematically as a strictly one-to-one mapped row.

## Configuration Defaults
When an organization is created, it securely defaults to:
- **timezone:** `UTC` (Requires IANA identifier)
- **locale:** `en-IN` (BCP 47 structure)
- **currency:** `INR` (ISO 4217)
- **date_format:** `DD/MM/YYYY`
- **number_format:** `IN`
- **week_start:** `MONDAY`

> [!NOTE]
> Defensive runtime fallback mechanisms exist in `OrganizationSettingsService` for heavily legacy environments that bypassed migration logic, but the database state remains deterministic.

## Validation Enforcements
- Timezones MUST be canonical IANA identifiers (e.g., `America/New_York`, `Asia/Kolkata`). Abbreviations (`IST`, `EST`) are rejected.
- Currencies MUST be 3-letter ISO 4217 codes (`INR`, `USD`). Currency symbols are rejected.
- Date/Number formatting logic affects ONLY presentation layers. All core financial structures and database fields remain decoupled.

## Optimistic Concurrency
Settings updates utilize a `version` compare-and-set integer lock to aggressively prevent concurrent administrators from overwriting configurations silently.

## Tenant Isolation
Profile and configuration interactions operate strictly inside `@CurrentTenant()` boundaries. Request payload tampering involving unauthorized `organization_id`s will inherently fail.

## Audit Logging
Targeted profile (`ORG_PROFILE_UPDATE`) and settings (`ORG_SETTINGS_UPDATE`) modifications emit exhaustive `AuditService` trails including affected fields. Read requests are intentionally not audited to prevent storage spam.
