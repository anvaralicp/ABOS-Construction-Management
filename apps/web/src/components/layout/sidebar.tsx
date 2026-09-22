import React, { useEffect } from 'react';
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
