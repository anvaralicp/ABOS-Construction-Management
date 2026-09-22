import os

base_dir = r"apps\web"

def write_file(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# src/lib/api.ts
write_file("src/lib/api.ts", """export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('abos_token') : null;
  const orgId = typeof window !== 'undefined' ? localStorage.getItem('abos_org_id') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

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

  if (!response.ok) {
    // Basic error boundary serialization without leaking raw internal stacks
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  return response.json();
}
""")

# src/lib/auth-context.tsx
write_file("src/lib/auth-context.tsx", """'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Organization {
  id: string;
  name: string;
}

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

  useEffect(() => {
    // In a real implementation, we would validate the session token here with /api/v1/auth/me
    const token = localStorage.getItem('abos_token');
    if (token) {
      // Mock hydration for the shell architecture
      setUser({ id: 'u-1', email: 'admin@abos.com', name: 'Admin User' });
      setOrganization({ id: 'org-1', name: 'Acme Construction' });
      setPermissions(['reports:read', 'projects:read', 'expenses:read']);
      setEntitlements(['feature:advanced_reports']);
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, u: User, org: Organization, perms: string[], ent: string[]) => {
    localStorage.setItem('abos_token', token);
    localStorage.setItem('abos_org_id', org.id);
    setUser(u);
    setOrganization(org);
    setPermissions(perms);
    setEntitlements(ent);
  };

  const logout = () => {
    localStorage.removeItem('abos_token');
    localStorage.removeItem('abos_org_id');
    setUser(null);
    setOrganization(null);
    setPermissions([]);
    setEntitlements([]);
  };

  return (
    <AuthContext.Provider value={{ user, organization, permissions, entitlements, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
""")

# src/lib/permissions.ts
write_file("src/lib/permissions.ts", """import { useAuth } from './auth-context';

export function usePermissions() {
  const { permissions } = useAuth();
  
  const hasPermission = (permission: string) => {
    // The backend remains the authoritative boundary.
    // This frontend helper only governs UI visibility (e.g. hiding a button).
    return permissions.includes(permission) || permissions.includes('*');
  };

  return { hasPermission };
}
""")

# src/lib/entitlements.ts
write_file("src/lib/entitlements.ts", """import { useAuth } from './auth-context';

export function useEntitlements() {
  const { entitlements } = useAuth();
  
  const hasFeature = (feature: string) => {
    // UI-level entitlement check. The backend enforces subscription billing restrictions.
    return entitlements.includes(feature);
  };

  return { hasFeature };
}
""")

print("Created auth and lib files.")
