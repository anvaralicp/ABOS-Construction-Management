import os

base_dir = r"apps\web"

def write_file(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# 1 & 4. API Client Updates (Access Token Closure & 204 Handling)
write_file("src/lib/api.ts", """let memoryToken: string | null = null;

export function setAccessToken(token: string | null) {
  memoryToken = token;
}

export function getAccessToken(): string | null {
  return memoryToken;
}

export function clearAccessToken() {
  memoryToken = null;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('abos_org_id') : null;
  
  const headers: HeadersInit = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (orgId) {
    headers['x-organization-id'] = orgId;
  }

  const response = await fetch(`/api/v1${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:401'));
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  } else if (contentType?.includes('text/csv') || contentType?.includes('spreadsheetml')) {
    return response.blob();
  }
  
  return response.text();
}
""")

# 2. Auth Context Updates (Single-Flight Logout)
write_file("src/lib/auth-context.tsx", """'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { setAccessToken, clearAccessToken } from './api';

export interface User { id: string; email: string; name: string; }
export interface Organization { id: string; name: string; }
export interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  permissions: string[];
  entitlements: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User, org: Organization, perms: string[], ent: string[]) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  const isLoggingOutRef = useRef(false);

  const logout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    
    clearAccessToken();
    
    localStorage.removeItem('abos_org_id');
    setUser(null);
    setOrganization(null);
    setPermissions([]);
    setEntitlements([]);
    
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors during logout
    }

    if (pathname !== '/login') {
      router.push('/login');
    }
    
    // Reset the guard in case a legitimate login happens subsequently within the same runtime
    isLoggingOutRef.current = false;
  }, [router, pathname]);

  useEffect(() => {
    const handle401 = () => logout();
    window.addEventListener('auth:401', handle401);
    return () => window.removeEventListener('auth:401', handle401);
  }, [logout]);

  useEffect(() => {
    // Attempt silent refresh/hydration here using the HttpOnly cookie
    setIsLoading(false);
  }, []);

  const login = (token: string, u: User, org: Organization, perms: string[], ent: string[]) => {
    setAccessToken(token);
    localStorage.setItem('abos_org_id', org.id);
    setUser(u);
    setOrganization(org);
    setPermissions(perms);
    setEntitlements(ent);
  };

  return (
    <AuthContext.Provider value={{ user, organization, permissions, entitlements, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
""")

print("Patched api.ts and auth-context.tsx")
