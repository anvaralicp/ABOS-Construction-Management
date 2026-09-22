import os

base_dir = r"apps\web"

def write_file(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# Select
write_file("src/components/ui/select.tsx", """import React from 'react';
import { cn } from '@/lib/utils';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => {
  return (
    <select ref={ref} className={cn("flex h-10 w-full items-center justify-between rounded-md border border-surface-300 bg-white px-3 py-2 text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
  );
});
Select.displayName = 'Select';
""")

# Textarea
write_file("src/components/ui/textarea.tsx", """import React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => {
  return (
    <textarea ref={ref} className={cn("flex min-h-[80px] w-full rounded-md border border-surface-300 bg-white px-3 py-2 text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
  );
});
Textarea.displayName = 'Textarea';
""")

# Checkbox
write_file("src/components/ui/checkbox.tsx", """import React from 'react';
import { cn } from '@/lib/utils';

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return (
    <input type="checkbox" ref={ref} className={cn("peer h-4 w-4 shrink-0 rounded-sm border border-brand-500 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />
  );
});
Checkbox.displayName = 'Checkbox';
""")

# Switch
write_file("src/components/ui/switch.tsx", """import React from 'react';
import { cn } from '@/lib/utils';

export const Switch = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
  return (
    <input type="checkbox" role="switch" ref={ref} className={cn("peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-surface-200 checked:bg-brand-600 before:inline-block before:h-5 before:w-5 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5", className)} {...props} />
  );
});
Switch.displayName = 'Switch';
""")

# Modal/Dialog
write_file("src/components/ui/dialog.tsx", """import React from 'react';
import { cn } from '@/lib/utils';

export function Dialog({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-4 border-b border-surface-200">{children}</div>;
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-4 bg-surface-50 flex justify-end space-x-2">{children}</div>;
}
""")

print("Created more UI components 1.")
