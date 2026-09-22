# ABOS Technology & Engineering Decisions

## Core Technology Stack
* **Web:** Next.js + React + TypeScript
* **Mobile:** React Native + Expo + TypeScript
* **Backend:** NestJS + TypeScript
* **Database:** PostgreSQL
* **ORM:** Prisma
* **Redis:** Optional infrastructure component, introduced when required

## APIs & Data Processing
* **API:** REST + OpenAPI
* **Validation:** Centralized schema validation compatible with the API contract. Input validation occurs strictly at the API boundary before hitting business logic.
* **Background Processing:** Queue/worker architecture will be utilized for asynchronous tasks.

## Security & Reliability
* **Authentication:** Managed by the Identity module using an access/refresh token architecture.
* **Authorization:** Role-Based Access Control (RBAC) + subscription entitlements.
* **Security & Tenant Isolation:** Security is enforced at the API boundary. Secrets are never hardcoded and must be provided via environment variables. Tenant isolation is enforced through a combination of PostgreSQL Row-Level Security (RLS) and application-level tenant enforcement.
* **Audit Logging:** An append-only audit log will track all critical state changes across the platform for compliance and debugging.
* **Backup & Recovery Strategy:** Automated daily snapshots of the PostgreSQL database, continuous WAL (Write-Ahead Logging) archiving for point-in-time recovery, and geo-redundant storage for file assets.

## Quality & Maintainability
* **File Storage:** S3-compatible abstraction. The platform will not rely on a specific vendor's SDK in the business logic layer, allowing for plug-and-play storage solutions.
* **Centralized Error Handling:** A centralized error handler will map domain exceptions to standard HTTP status codes and uniform error responses.
* **Automated Testing Strategy:** Comprehensive testing including unit, integration, API, and end-to-end testing.
* **Observability/Logging:** Structured JSON logging for all services. Implementation of distributed tracing to track requests across module boundaries, with distinct tenant IDs attached to logs for easier debugging.

## Deployment
* **Deployment Approach:** Docker-based and cloud-neutral architecture.

## Approved Architecture Baseline
Future implementation must follow these documented decisions unless an explicit architecture change is approved and documented.
