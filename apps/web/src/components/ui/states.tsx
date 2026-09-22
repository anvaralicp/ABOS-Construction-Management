import React from 'react';

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
