# Projects Management - Web Application

## Overview
This module provides the authenticated web interface for project management, built on top of the established Web Application Foundation and corresponding backend REST APIs.

## Routes
- `/projects` - Project List View
- `/projects/new` - Project Creation Form
- `/projects/[id]` - Project Detail Dashboard
- `/projects/[id]/edit` - Project Modification Form

## API Integration
The frontend interfaces with the backend exclusively via `fetchApi` using types mirroring the established NestJS DTOs:
- `GET /projects` (Lists all active/valid projects)
- `GET /projects/:id` (Detail specific project)
- `POST /projects` (Create project)
- `PATCH /projects/:id` (Update project properties)
- `PATCH /projects/:id/status` (Trigger lifecycle transitions)
- `DELETE /projects/:id` (Soft delete)
- `GET /projects/:id/members` (List assigned members)

### Nullable & Full PATCH Payload Semantics
When editing a project, the frontend utilizes the backend `PATCH` endpoint structurally. However, rather than dynamically compiling fragmented delta property maps (which necessitates invasive and brittle state tracking), the frontend intentionally resolves partial updates by re-transmitting the *complete editable representation* of the form. 
- **Untouched Values:** Retain their existing string mapping explicitly re-committed into the PATCH map.
- **Intentional Clearances:** Explicitly evaluated via string validation. If an optional property (e.g. description, date, budget) resolves structurally empty, the frontend actively mutates the key to an exact explicit `null`, signaling the Prisma engine natively to delete the node natively bypassing JSON-stripping architectures.

## Project Data Model
Projects retain core identification (`name`, `code`), financial (`budget_amount`, `currency`), temporal (`start_date`, `expected_end_date`), and lifecycle (`status`) attributes. 

### Deterministic Minor-Unit Conversion
Financial values (`budget_amount`) are explicitly converted seamlessly between backend minor integer units (e.g. `150050`) and frontend floating point locales (e.g. `$1,500.50`) preventing financial distortion. 
The core utility actively categorizes conversions avoiding implicit mutations:
- **Valid:** Resolved structurally splitting exact fractional layouts preventing floating point shifts (e.g. `1.005` correctly bounds to `101` integer cents rather than decaying).
- **Empty:** Distinguishes intentionally blank form nodes signaling standard downstream `null` deletion behaviors.
- **Invalid/Overflow:** Isolates structurally malformed layouts (`abc`) or integers breaching strict `MAX_SAFE_INTEGER` boundaries preventing API transmission and throwing native validation restrictions natively onto the frontend preventing corrupt mapping attempts.

## Permissions & Entitlements
Permissions securely wrap sensitive DOM rendering constraints utilizing `hasPermission` evaluating against native backend strings:
- `projects:read`
- `projects:write`
- `projects:delete`
- `project_members:read`
- `project_members:write`

Entitlements dynamically govern structural capacities gracefully; however, as the backend currently enforces no organizational entitlement locks specifically throttling physical Project allocations natively, the UI does not mount arbitrary capability gates here.

## Lifecycle Handling
Available status transitions logically surface contextual command buttons exclusively for valid transformations corresponding precisely to the backend `ProjectStatus` state machine.
- `DRAFT -> ACTIVE`, `CANCELLED`
- `ACTIVE -> ON_HOLD`, `COMPLETED`, `CANCELLED`
- `ON_HOLD -> ACTIVE`, `CANCELLED`

Action mutations resolve natively to explicit backend API patch events bypassing fabricated client-side rule evaluations.

## Responsive Behavior
Data tables collapse cleanly preventing horizontal viewport overflow. Dashboard layouts transition modular constraints between CSS flex rows and stacked responsive columns (`md:grid-cols-3`) resolving structural mobile stability natively.

## Testing & Verification
Unit testing utilizes React Testing Library and robust Mocking validating:
- Empty, Loading, and Network failure states.
- Exact nullable payloads transmitted via `PATCH` events mimicking native JSON payload maps (including native nullification mapping).
- Explicit string-level mapping against decimal bounds for exact minor-unit financial translations distinguishing overflow blocking validations dynamically.
- Lifecycle commands correctly mount and proxy confirmation bounds natively mapping CANCELLED states securely.

### Known Limitations
- `RUNTIME NOT VERIFIED` — Standard container `npm test` virtualization limitations inhibit physical runtime executions of the React codebase; verified solely through strict static TS transpilation architectures.
