'use client';
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
