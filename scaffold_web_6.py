import os

base_dir = r"apps\web"

def write_file(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# src/__tests__/permissions.test.ts
write_file("src/__tests__/permissions.test.ts", """import { renderHook } from '@testing-library/react';
import { usePermissions } from '../lib/permissions';

jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ permissions: ['projects:read', 'expenses:write'] })
}));

describe('usePermissions', () => {
  it('should return true for granted permissions', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('projects:read')).toBe(true);
  });

  it('should return false for missing permissions', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('reports:read')).toBe(false);
  });
});
""")

# src/__tests__/entitlements.test.ts
write_file("src/__tests__/entitlements.test.ts", """import { renderHook } from '@testing-library/react';
import { useEntitlements } from '../lib/entitlements';

jest.mock('../lib/auth-context', () => ({
  useAuth: () => ({ entitlements: ['feature:advanced_reports'] })
}));

describe('useEntitlements', () => {
  it('should return true if feature is enabled', () => {
    const { result } = renderHook(() => useEntitlements());
    expect(result.current.hasFeature('feature:advanced_reports')).toBe(true);
  });

  it('should return false if feature is missing', () => {
    const { result } = renderHook(() => useEntitlements());
    expect(result.current.hasFeature('feature:custom_domain')).toBe(false);
  });
});
""")

# docs/modules/WEB-APPLICATION-FOUNDATION.md
write_file("../docs/modules/WEB-APPLICATION-FOUNDATION.md", """# Web Application Foundation & Design System

## Overview
This module establishes the core frontend shell and design system for the ABOS Construction Management platform, utilizing **Next.js 14**, **React**, **TypeScript**, and **Tailwind CSS**. It is exclusively a structural foundation designed for downstream business modules to inject into safely and uniformly.

## Application Shell
The foundation utilizes an App Shell model consisting of:
- A responsive `Sidebar` providing unified system navigation.
- A central `Header` containing the explicit Organization tenant context and current User profile entry.
- A centralized authentication guard boundary surrounding the `(dashboard)` route group.

## Authentication & Context
- Authentication is governed by `src/lib/auth-context.tsx`.
- The UI handles the rendering states (`isAuthenticated`, `isLoading`) natively without replicating backend cryptographic checks.
- Session tokens are stored securely in memory/localStorage strictly for API client injection.

## Permissions & Entitlements
- **Permissions:** Handled via `src/lib/permissions.ts` (`usePermissions`). These determine rendering logic (e.g. hiding nav links or disabled buttons) but are explicitly identified as non-authoritative. The backend API handles true RBAC.
- **Entitlements:** Handled via `src/lib/entitlements.ts` (`useEntitlements`). Used strictly to gracefully degrade the UX for missing subscription capabilities (e.g., locking routes or rendering upgrade prompts) without reinventing billing.

## UI Design System
A lightweight, bespoke design system (`src/components/ui`) exists containing foundational forms and interactions:
- `Button`
- `Input`
- `Card`
- `Table` (including Header, Body, Row, Head, Cell structural components)
- `Badge`

These map directly to explicit design tokens stored inside `tailwind.config.ts`, minimizing arbitrary utility classes and ensuring predictable borders, radii, and color palettes (`brand`, `surface`, `danger`).

## API Boundaries
An abstract `fetchApi` handler inside `src/lib/api.ts` uniformly injects:
- `Authorization: Bearer <token>`
- `x-organization-id: <org-id>`
This prevents frontend modules from scattering header configurations arbitrarily across business components.

## Known Limitations
* **RUNTIME NOT VERIFIED** — Due to existing environment restrictions on `npm` and `prisma` executions within this container, the Next.js runtime environment has not been executed physically. Static configurations (TypeScript, layout boundaries, component hierarchies) remain verified conceptually.
* Empty placeholders (`PlaceholderPage`) intentionally stand in for future business modules.
""")

print("Created tests and documentation.")
