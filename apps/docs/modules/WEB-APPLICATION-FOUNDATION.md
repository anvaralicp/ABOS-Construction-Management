# Web Application Foundation & Design System

## Overview
This module establishes the core frontend shell and design system for the ABOS Construction Management platform, utilizing **Next.js 14**, **React**, **TypeScript**, and **Tailwind CSS**.

## Authentication & Context
- Authentication is governed by `src/lib/auth-context.tsx`.
- **Token Security:** Bearer access tokens are held exclusively in a module-private memory closure (`setAccessToken`, `getAccessToken` via `api.ts`), preventing persistent XSS theft from `localStorage` and avoiding dangerous exposure on the global `window` object.
- **Refresh Flow:** Handled gracefully via a proxy BFF (Backend For Frontend) inside Next.js API Routes (`/api/auth/login`). The refresh credentials rest strictly within `HttpOnly, Secure, SameSite=Lax` cookies untouched by client JavaScript.
- **Expiration & Concurrency:** The API client intercepts HTTP `401 Unauthorized` responses via an event dispatch (`auth:401`). The AuthContext utilizes a strict `useRef` single-flight guard to flush memory states and route cleanly back to `/login` exactly once, preventing cascading loops caused by concurrent 401 fetches.

## Permissions & Entitlements
- **Permissions:** Handled via `src/lib/permissions.ts` (`usePermissions`). These determine rendering logic natively without usurping backend authorization checks.
- **Entitlements:** Handled via `src/lib/entitlements.ts` (`useEntitlements`) degrading gracefully where subscription limits intercept.

## UI Design System
A lightweight, bespoke design system (`src/components/ui`) exists containing foundational forms and interactions. Forms correctly implement explicit `htmlFor` associative constraints natively. The `Dialog` encapsulates strict accessibility focus traps intercepting the `Escape` key natively, and mathematically computes `<Tab>` and `<Shift+Tab>` keystrokes bounding DOM focus rigidly inside the active modal layer, preventing background interaction.

## Responsive Behavior
The `AppShell` incorporates a fluid CSS-Grid/Flex approach. The Desktop UI leverages a fixed side navigation. The Mobile UI collapses behind a hamburger menu and slides via a fixed structural overlay, avoiding horizontal overflow.

## API Boundaries
An abstract `fetchApi` handler (`src/lib/api.ts`) bridges HTTP communication cleanly.
- Empty Responses (`204 No Content`) correctly resolve as `null` bypassing parsing crashes.
- Restful Payloads (`application/json`) return parsed objects natively.
- Document Exports (`text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) bypass serialization generating Blob outputs flawlessly.

## Notifications Foundation
A structured `/notifications` page sets the foundational boundary for the notifications API. It includes isolated `EmptyState`, `LoadingState`, and `ErrorState` handling, correctly guarding against missing API integrations without mocking false data records.

## Known Limitations
* **RUNTIME NOT VERIFIED** — Due to existing environment restrictions on `npm` and `prisma` executions within this container, the Next.js runtime environment has not been executed physically. Static configurations (TypeScript, layout boundaries, component hierarchies) remain verified conceptually.
