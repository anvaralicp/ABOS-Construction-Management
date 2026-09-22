import os

base_dir = r"apps\web"

def write_file(path, content):
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# 3. Dialog Genuine Focus Trapping
write_file("src/components/ui/dialog.tsx", """import React, { useEffect, useRef } from 'react';

export function Dialog({ open, onClose, children }: { open: boolean, onClose: () => void, children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      const focusableElementsString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        if (e.key === 'Tab' && dialogRef.current) {
          const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(focusableElementsString);
          const elementsArray = Array.from(focusableElements).filter(el => 
            !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true' && el.tabIndex !== -1
          );
          
          if (elementsArray.length === 0) {
            e.preventDefault();
            return;
          }

          const firstElement = elementsArray[0];
          const lastElement = elementsArray[elementsArray.length - 1];

          if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement || document.activeElement === dialogRef.current) {
              e.preventDefault();
              lastElement.focus();
            }
          } else { // Tab
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };
      
      dialogRef.current?.focus();
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
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

print("Patched Dialog component")
