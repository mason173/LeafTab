import React from 'react';
import { createPortal } from 'react-dom';

export function DragOverlayPortal({
  children,
  transform,
  zIndex,
  transition,
  className = 'isolate',
}: {
  children: React.ReactNode;
  transform: string;
  zIndex: number;
  transition?: string;
  className?: string;
}) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={`pointer-events-none fixed left-0 top-0 ${className}`.trim()}
      style={{
        zIndex,
        transform,
        transition,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
