import React from 'react';
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
