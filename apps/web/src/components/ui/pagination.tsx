import React from 'react';
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
