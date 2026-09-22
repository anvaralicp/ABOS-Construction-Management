import React from 'react';
import { cn } from '@/lib/utils';

export const Switch = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return (
    <input type="checkbox" role="switch" ref={ref} className={cn("peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-surface-200 checked:bg-brand-600 before:inline-block before:h-5 before:w-5 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5", className)} {...props} />
  );
});
Switch.displayName = 'Switch';
