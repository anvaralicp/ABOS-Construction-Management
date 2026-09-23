# Vendors Management - Web Application

## Overview
This module administers the hierarchical construction vendors integration natively implementing into the ABOS Web Application Foundation constraints.

## Routes
- `/vendors` - Flat Vendor Directory Dashboard.
- `/vendors/new` - Native Creation schema.
- `/vendors/[id]` - Detailed Dashboard combining core metadata and Contact Management.
- `/vendors/[id]/edit` - Mutation schema enforcing exact PATCH payload null boundaries.

## API Integration
Encapsulated safely within `vendorsApi`:
- `GET /vendors`
- `POST /vendors` 
- `GET /vendors/:id`
- `PATCH /vendors/:id`
- `DELETE /vendors/:id`
- `GET /vendors/:id/contacts`
- `POST /vendors/:id/contacts`
- `PATCH /vendors/:id/contacts/:contactId`
- `DELETE /vendors/:id/contacts/:contactId`

## Data Model & Hierarchy Safety
Vendors natively map standard descriptors (`name`, `code`, `tax_id`, `status`).
Contacts reside in an independent Array mapped explicitly to a `vendor_id`. The UI correctly manages Contacts via a contextual Dialog mapping to the dedicated Contact API lifecycle inside the Detail page natively, bypassing unnecessary secondary routes.

### Nullable Payload Design
Following structural conventions: `undefined` keys natively bypass `PATCH` JSON parsing omitting untouched strings on Create, whereas intentionally erased nodes (`""`) exclusively remap directly into exact explicit `null` flags triggering accurate Prisma column deletion natively (e.g., clearing `code` or `address` on Edit).

## Permissions
Routinely isolated behind the specific controllers mapping:
- `vendors:read`, `vendors:write`, `vendors:delete`
- `vendor_contacts:read`, `vendor_contacts:write`, `vendor_contacts:delete`

## Deletion Lifecycle
Deletions route universally into soft-delete arrays natively terminating via HTTP 400 rejection safely if active dependencies prevent removal dynamically.

## Testing
Comprehensive Jest/RTL permutations execute validating Empty boundaries, loading states, explicit `null` payload maps, contact creation states, and string mutations natively.
`Runtime verification NOT VERIFIED because the local environment prevented reliable npm/Jest execution.`
