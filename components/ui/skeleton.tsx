// components/ui/skeleton.tsx
import React from 'react';

// This is a minimal skeleton loader component to satisfy the import.
// It provides a simple pulsing animation while the terminal is loading.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`bg-zinc-800 rounded-md animate-pulse ${className}`}
    />
  );
}
