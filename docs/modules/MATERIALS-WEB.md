# Materials Web Module

## Purpose
The Materials Web Module manages the frontend user experience for Material master records and their associated Material Rate ledgers. It provides functionality for material creation, optimistic concurrency editing, soft-deletion (archiving), and immutable rate appending.

## Routes
- `/materials` - Master list of materials with search and pagination
- `/materials/new` - Material creation form
- `/materials/[id]` - Material detail view (master info, latest rate, rate ledger, append rate workflow)
- `/materials/[id]/edit` - Material update form with optimistic concurrency

## API Client
Client located at `apps/web/src/features/materials/api/materials.api.ts`.
- `GET /materials`
- `POST /materials`
- `GET /materials/:id`
- `PATCH /materials/:id`
- `DELETE /materials/:id`
- `GET /materials/:id/rates`
- `POST /materials/:id/rates`
- `GET /materials/:id/rates/latest`

## Permissions Matrix
| Capability | Required Permission |
| --- | --- |
| View Materials List & Detail | `materials:read` |
| Create & Edit Materials | `materials:write` |
| Archive Materials | `materials:delete` |
| View Rate Ledger & Latest Rate | `material_rates:read` |
| Append Material Rate | `material_rates:write` |

## Material Version and Optimistic Concurrency
Materials editing utilizes strict optimistic concurrency:
1. Material records include a `version` field.
2. The UI reads the `version` on load and freezes it.
3. On save, the PATCH payload includes the original `version` identically.
4. The backend checks and increments the version securely (avoiding last-write-wins).
5. If the version is stale, the backend returns a `ConflictException` which the frontend catches, allowing the user to view the warning and reload.

## MaterialRate Immutability
Historical rates are append-only. The Web module explicitly does NOT provide Edit or Delete actions for rates in the ledger.

## Money Representation
The application adheres strictly to the ABOS convention of storing money in minor units (e.g., 14.59 USD -> 1459). 
The frontend ensures exact integer parsing using `parseMoneyToMinorUnits` preventing floating-point inaccuracies. Display is handled strictly by `formatMoney`.

## Latest-Rate Authority
The frontend delegates the resolution of the "latest effective rate" entirely to the backend endpoint `GET /materials/:id/rates/latest`. The client avoids manual computation.

## Vendor Integration
The Append Rate form integrates seamlessly with the existing Vendors module using `vendorsApi.getVendors({ status: 'ACTIVE' })` to securely limit the vendor selection.

## Known Limitations
- Material rates cannot be updated or deleted from the UI (by architectural design).
- Offline support is not currently implemented for this module.
