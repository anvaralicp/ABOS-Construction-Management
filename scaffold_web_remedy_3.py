import os

base_dir = r"apps\web"

def write_file(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# Tests
write_file("src/__tests__/api.test.ts", """import { fetchApi, setAccessToken, getAccessToken, clearAccessToken } from '../lib/api';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('fetchApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
    clearAccessToken();
  });

  it('should manage access token in module memory without exposing to window', () => {
    setAccessToken('mock-mem-token');
    expect(getAccessToken()).toBe('mock-mem-token');
    expect((window as any).__ABOS_ACCESS_TOKEN__).toBeUndefined();
    
    clearAccessToken();
    expect(getAccessToken()).toBeNull();
  });

  it('should handle 204 No Content without crashing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: jest.fn().mockRejectedValue(new Error('SyntaxError: Unexpected end of JSON input'))
    });
    const result = await fetchApi('/test-204');
    expect(result).toBeNull();
  });

  it('should dispatch auth:401 and throw on 401 Unauthorized', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers()
    });
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');
    
    await expect(fetchApi('/secret')).rejects.toThrow('Unauthorized');
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    expect((dispatchEventSpy.mock.calls[0][0] as CustomEvent).type).toBe('auth:401');
    
    dispatchEventSpy.mockRestore();
  });
  
  it('should parse application/json successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true })
    });
    const result = await fetchApi('/test-json');
    expect(result).toEqual({ success: true });
  });
});
""")

write_file("src/__tests__/auth-context.test.tsx", """import React from 'react';
import { render, act } from '@testing-library/react';
import { AuthProvider } from '../lib/auth-context';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard'
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AuthContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute logout/redirect only once for concurrent 401 events', async () => {
    mockFetch.mockResolvedValue({ ok: true });
    
    render(<AuthProvider><div>Test</div></AuthProvider>);
    
    act(() => {
      window.dispatchEvent(new CustomEvent('auth:401'));
      window.dispatchEvent(new CustomEvent('auth:401'));
      window.dispatchEvent(new CustomEvent('auth:401'));
    });
    
    // fetch is called to /api/auth/logout once
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    
    // router.push is called to /login once
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
""")

write_file("src/__tests__/dialog.test.tsx", """import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, DialogContent, DialogFooter } from '../components/ui/dialog';

describe('Dialog', () => {
  it('should trap focus looping Tab and Shift+Tab', () => {
    const handleClose = jest.fn();
    render(
      <Dialog open={true} onClose={handleClose}>
        <DialogContent>
          <input data-testid="input-1" />
          <button data-testid="button-1">Save</button>
        </DialogContent>
        <DialogFooter>
          <button data-testid="button-2">Cancel</button>
        </DialogFooter>
      </Dialog>
    );
    
    const input1 = screen.getByTestId('input-1');
    const button2 = screen.getByTestId('button-2');
    
    // Simulate focusing the last element
    button2.focus();
    expect(document.activeElement).toBe(button2);
    
    // Simulate Tab key on the last element to wrap to first
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    expect(document.activeElement).toBe(input1);
    
    // Simulate Shift+Tab on the first element to wrap to last
    fireEvent.keyDown(document, { key: 'Tab', code: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(button2);
  });

  it('should close on Escape', () => {
    const handleClose = jest.fn();
    render(
      <Dialog open={true} onClose={handleClose}>
        <DialogContent><button>Focusable</button></DialogContent>
      </Dialog>
    );
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });
});
""")

write_file("../docs/modules/WEB-APPLICATION-FOUNDATION.md", """# Web Application Foundation & Design System

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
""")

print("Patched Tests and Docs")
