# Categories Management - Web Application

## Overview
This module administers the hierarchical construction expense categories architecture natively integrating into the ABOS Web Application Foundation constraints.

## Routes
- `/categories` - Root Tree Dashboard traversing Parent/Child relational matrices natively.
- `/categories/new` - Native Creation schema.
- `/categories/[id]` - Read-Only Detail extracting relational hierarchy dependencies.
- `/categories/[id]/edit` - Mutation schema enforcing exact PATCH payload boundaries.

## API Integration
Encapsulated safely within `categoriesApi`:
- `GET /categories` (Flat array mapping)
- `GET /categories/tree` (Authoritative backend-resolved Parent/Child JSON hierarchy)
- `GET /categories/:id`
- `POST /categories` 
- `PATCH /categories/:id`
- `DELETE /categories/:id`

## Data Model & Hierarchy Safety
Categories natively map standard descriptors (`name`, `description`, `is_active`) against strict `parent_id` UUID bounds.
The Edit DOM inherently prevents cyclical selections locally utilizing `getDescendantIds` blocking recursion loops visually before the authoritative backend enforces structural API rejection natively.

### Nullable Payload Design
Following Projects Web conventions: `undefined` keys natively bypass `PATCH` JSON parsing omitting untouched strings whereas intentionally erased nodes (`""`) exclusively remap directly into exact explicit `null` flags triggering accurate Prisma column deletion natively.

## Permissions & Entitlements
Routinely isolated behind:
- `categories:read`
- `categories:write`
- `categories:delete`

As Categories natively lack unique organizational constraint quotas within the core architecture, Entitlements synthetically bypass explicit threshold checks reserving boundaries entirely to explicit permissions.

## Deletion Lifecycle
Deletions route universally into soft-delete arrays natively terminating via HTTP 400 rejection safely if active descendants still bind into the relational ID mapping.

## Testing
Comprehensive Jest/RTL permutations execute validating Empty boundaries, loading states, explicit `null` payload maps, hierarchical cyclic avoidance mapping, and structural layout boundaries natively.
`Runtime verification NOT VERIFIED because the local environment prevented reliable npm/Jest execution.`
