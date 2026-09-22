import os

base_dir = r"apps\web"

def write_file(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# Tabs
write_file("src/components/ui/tabs.tsx", """import React from 'react';
import { cn } from '@/lib/utils';

export function Tabs({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("flex space-x-4 border-b border-surface-200", className)}>{children}</div>;
}

export function Tab({ active, children, onClick }: { active?: boolean, children: React.ReactNode, onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", active ? "border-brand-600 text-brand-600" : "border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300")}
    >
      {children}
    </button>
  );
}
""")

# Pagination
write_file("src/components/ui/pagination.tsx", """import React from 'react';
import { Button } from './button';

export function Pagination({ current, total, onPageChange }: { current: number, total: number, onPageChange?: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-6">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <p className="text-sm text-surface-700">Showing page <span className="font-medium">{current}</span> of <span className="font-medium">{total}</span></p>
        <div className="space-x-2">
          <Button variant="outline" size="sm" disabled={current <= 1} onClick={() => onPageChange?.(current - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={current >= total} onClick={() => onPageChange?.(current + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
""")

# Form Presentation
write_file("src/components/ui/form.tsx", """import React from 'react';
import { cn } from '@/lib/utils';

export function FormField({ label, error, children, className }: { label: string, error?: string, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="block text-sm font-medium text-surface-700">{label}</label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
""")

# States (Empty, Loading, Error)
write_file("src/components/ui/states.tsx", """import React from 'react';

export function EmptyState({ title, description, action }: { title: string, description: string, action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border-2 border-dashed border-surface-300">
      <h3 className="text-lg font-semibold text-surface-900">{title}</h3>
      <p className="mt-2 text-sm text-surface-500 mb-6">{description}</p>
      {action}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-200 border-t-brand-600"></div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-red-50 p-4">
      <div className="flex">
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700"><p>{message}</p></div>
        </div>
      </div>
    </div>
  );
}
""")

# Dropdown Menu, Confirmation, Toast placeholder wrappers
write_file("src/components/ui/toast.tsx", """import React from 'react';
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
""")

print("Created more UI components 2.")
