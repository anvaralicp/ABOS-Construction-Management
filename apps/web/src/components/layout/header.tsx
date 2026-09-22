import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, User, Menu } from 'lucide-react';
import Link from 'next/link';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, organization, logout } = useAuth();

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-surface-200 bg-white px-4 md:px-6">
      <div className="flex items-center">
        <button onClick={onMenuClick} className="mr-4 md:hidden p-2 text-surface-500 hover:bg-surface-100 rounded-md" aria-label="Open menu">
          <Menu className="h-6 w-6" />
        </button>
        {organization && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-surface-900">{organization.name}</span>
            <span className="hidden sm:block text-xs text-surface-500">Active Workspace</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        <Link href="/notifications" className="relative p-2 text-surface-400 hover:text-surface-500 rounded-full hover:bg-surface-100" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-danger ring-2 ring-white" />
        </Link>

        <div className="flex items-center space-x-3 border-l border-surface-200 pl-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-medium text-surface-900">{user?.name}</span>
            <button onClick={logout} className="text-xs text-brand-600 hover:text-brand-700 text-right">Sign out</button>
          </div>
          <button onClick={logout} className="sm:hidden h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700" aria-label="Sign out">
            <User className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
