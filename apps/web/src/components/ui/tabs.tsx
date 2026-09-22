import React from 'react';
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
