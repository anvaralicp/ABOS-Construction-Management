import os

base_dir = r"apps\web"

def write_file(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# src/components/layout/sidebar.tsx
write_file("src/components/layout/sidebar.tsx", """import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/permissions';
import { 
  LayoutDashboard, FolderKanban, Receipt, PieChart, Users, HardHat, FileText, Settings, Bell, Shield
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

export function Sidebar() {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();

  return (
    <div className="flex h-full w-64 flex-col border-r border-surface-200 bg-white">
      <div className="flex h-16 items-center px-6 border-b border-surface-200">
        <Shield className="h-6 w-6 text-brand-600 mr-2" />
        <span className="text-lg font-bold text-surface-900">ABOS</span>
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
}
""")

# src/components/layout/header.tsx
write_file("src/components/layout/header.tsx", """import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const { user, organization, logout } = useAuth();

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-surface-200 bg-white px-6">
      <div className="flex items-center">
        {organization && (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-surface-900">{organization.name}</span>
            <span className="text-xs text-surface-500">Active Workspace</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-surface-400 hover:text-surface-500">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-danger ring-2 ring-white" />
        </button>

        <div className="flex items-center space-x-3 border-l border-surface-200 pl-4">
          <div className="flex flex-col text-right">
            <span className="text-sm font-medium text-surface-900">{user?.name}</span>
            <button onClick={logout} className="text-xs text-brand-600 hover:text-brand-700 text-right">Sign out</button>
          </div>
          <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700">
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>
    </header>
  );
}
""")

# src/components/layout/app-shell.tsx
write_file("src/components/layout/app-shell.tsx", """import React from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
""")

print("Created Layout components.")
