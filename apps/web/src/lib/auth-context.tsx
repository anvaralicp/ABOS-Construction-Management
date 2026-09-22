'use client';

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
