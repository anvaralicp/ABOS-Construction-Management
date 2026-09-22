import os

base_dir = r"apps\web"

def write_file(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# 4. Mobile Navigation
write_file("src/components/layout/sidebar.tsx", """import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/permissions';
import { 
  LayoutDashboard, FolderKanban, Receipt, PieChart, Users, HardHat, FileText, Settings, Shield, X
} from 'lucide-react';

const NAVIGATION = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: '*' },
  { name: 'Projects', href: '/projects', icon: FolderKanban, permission: 'projects:read' },
  { name: 'Expenses', href: '/expenses', icon: Receipt, permission: 'expenses:read' },
  { name: 'Reports', href: '/reports', icon: PieChart, permission: 'reports:read' },
  { name: 'Workforce', href: '/workforce', icon: Users, permission: 'workforce:read' },
  { name: 'Equipment', href: '/equipment', icon: HardHat, permission: 'equipment:read' },
  { name: 'Documents', href: '/documents', icon: FileText, permission: 'documents:read' },
  { name: 'Settings', href: '/settings', icon: Settings, permission: 'organization:read' },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();

  // Close sidebar on escape key for mobile
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const SidebarContent = (
    <div className="flex h-full w-64 flex-col border-r border-surface-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6 border-b border-surface-200">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-brand-600 mr-2" />
          <span className="text-lg font-bold text-surface-900">ABOS</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-2 text-surface-500 hover:bg-surface-100 rounded-md" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {NAVIGATION.map((item) => {
            if (!hasPermission(item.permission)) return null;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => onClose?.()}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  isActive 
                    ? "bg-brand-50 text-brand-700" 
                    : "text-surface-700 hover:bg-surface-100 hover:text-surface-900"
                )}
              >
                <item.icon 
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5",
                    isActive ? "text-brand-600" : "text-surface-400 group-hover:text-surface-500"
                  )} 
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0 h-full z-10">
        {SidebarContent}
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-surface-900/80 transition-opacity" onClick={onClose} aria-hidden="true" />
          <div className="relative flex w-64 max-w-xs flex-1 transform transition ease-in-out duration-300 translate-x-0 bg-white">
            {SidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
""")

write_file("src/components/layout/header.tsx", """import React from 'react';
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
""")

write_file("src/components/layout/app-shell.tsx", """import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 focus:outline-none" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
""")

# 5. Dialog Accessibility
write_file("src/components/ui/dialog.tsx", """import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export function Dialog({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the dialog container
      dialogRef.current?.focus();
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-surface-900/80 transition-opacity" aria-hidden="true" onClick={onClose} />
      <div 
        ref={dialogRef}
        tabIndex={-1}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden outline-none focus:ring-2 focus:ring-brand-500" 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div id="dialog-title" className="px-6 py-4 border-b border-surface-200">{children}</div>;
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-4 bg-surface-50 flex justify-end space-x-2">{children}</div>;
}
""")

# 6. Form Label Association
write_file("src/components/ui/form.tsx", """import React from 'react';
import { cn } from '@/lib/utils';

export function FormField({ 
  label, 
  error, 
  htmlFor,
  children, 
  className 
}: { 
  label: string, 
  error?: string, 
  htmlFor: string,
  children: React.ReactNode, 
  className?: string 
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-surface-700">
        {label}
      </label>
      {children}
      {error && <p id={`${htmlFor}-error`} className="text-xs text-danger">{error}</p>}
    </div>
  );
}
""")

print("Patched Layout, Dialog, and Form components.")
