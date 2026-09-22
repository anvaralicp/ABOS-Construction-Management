# ABOS Construction Management Platform - Architecture

## System Overview
The ABOS platform is a multi-tenant SaaS construction management platform. The initial implementation will follow a **modular monolith** architectural pattern, providing clear boundaries for future module extraction to microservices if necessary.

## Supported Clients
The platform uses an **API-first backend** that will serve:
* Web Application
* Android Application
* iOS Application

## Core Architectural Principles

### Multi-Tenancy & SaaS Architecture
* The system is designed to be multi-tenant from the beginning.
* **Tenant Isolation Rules:** Multi-tenant data isolation is mandatory. Tenant-owned records must contain an `organization_id`. Cross-tenant access must be prevented at both application and database boundaries. This is achieved using a dual-layer approach: PostgreSQL Row-Level Security (RLS) combined with application-level tenant enforcement. A single organization's data must never be exposed to another organization.

### Modular Monolith
* Development will occur within a single repository to accelerate initial velocity, but with strict logical boundaries.
* Each business module is independent and encapsulated.

### Mobile Offline Capability & Synchronization
* **Mobile Synchronization Principles:** Mobile applications will require offline capability utilizing an offline queue and synchronization engine.
* **Conflict Resolution:** We do not use blanket last-write-wins. Synchronization uses client-generated UUIDs, timestamps, and record versions with optimistic concurrency. The system will automatically resolve only safe/non-conflicting changes, while detecting conflicts for critical business records and providing an explicit conflict-resolution mechanism where required.

### Permission & Access Model
* **Role-Based Access Control (RBAC):** Access to resources is governed by organizational roles.
* **Permission Model:** Authorization must be enforced strictly on the server-side at the API boundary and service layers. Roles define granular permissions that are verified before any state change or data access.

### Subscription & Entitlement Model
* Features and usage limits are governed by subscription plans.
* **Subscription/Entitlement Model:** The system will use an entitlement-based approach where API endpoints and UI features verify the current organization's active entitlements before permitting actions (e.g., limiting the number of projects or users).

### Event & Notification Architecture
* Modules communicate asynchronously via an internal event bus for side effects (e.g., an Expense created event triggers an Audit log or Notification).
* **Event Naming Convention:** Use past-tense domain events (e.g., `ExpenseCreated`, `ProjectStatusChanged`).

### API Strategy
* **Shared API Contracts:** Web and mobile consume the same public API contracts.
* **API Style:** REST over HTTPS. Do not use GraphQL or tRPC.
* **API Contract:** OpenAPI will be used as the API contract.
* **API Versioning Strategy:** APIs will be versioned at the URI level (e.g., `/api/v1/...`) to manage backward compatibility and breaking changes without disrupting existing clients.

## Approved Architecture Baseline
Future implementation must follow these documented decisions unless an explicit architecture change is approved and documented.
