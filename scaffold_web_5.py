import os

base_dir = r"apps\web"

def write_file(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# src/app/layout.tsx
write_file("src/app/layout.tsx", """import React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

export const metadata: Metadata = {
  title: 'ABOS Construction Management',
  description: 'Enterprise construction management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
""")

# src/app/(dashboard)/layout.tsx
write_file("src/app/(dashboard)/layout.tsx", """'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return <AppShell>{children}</AppShell>;
}
""")

# src/app/(dashboard)/dashboard/page.tsx
write_file("src/app/(dashboard)/dashboard/page.tsx", """'use client';
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-surface-900">Welcome back, {user?.name}</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">12</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Pending Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">5</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
""")

# src/app/login/page.tsx
write_file("src/app/login/page.tsx", """'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock authentication
    setTimeout(() => {
      login(
        'mock-jwt-token',
        { id: 'u-1', email: 'admin@abos.com', name: 'Admin User' },
        { id: 'org-1', name: 'Acme Construction' },
        ['*'],
        []
      );
      router.push('/dashboard');
    }, 500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in to ABOS</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-700">Email</label>
              <Input type="email" required placeholder="name@company.com" defaultValue="admin@abos.com" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-surface-700">Password</label>
              <Input type="password" required defaultValue="password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
""")

# src/app/page.tsx
write_file("src/app/page.tsx", """import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
""")

placeholder = """import React from 'react';
export default function PlaceholderPage() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-surface-300 p-12 text-center">
      <div>
        <h3 className="mt-2 text-sm font-semibold text-surface-900">Module Under Construction</h3>
        <p className="mt-1 text-sm text-surface-500">This module is planned for a future release.</p>
      </div>
    </div>
  );
}"""

for route in ['projects', 'expenses', 'reports', 'settings', 'documents', 'workforce', 'equipment']:
    write_file(f"src/app/(dashboard)/{route}/page.tsx", placeholder)

print("Created application routes.")
