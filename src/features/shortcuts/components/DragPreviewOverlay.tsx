import React from 'react';
import { DragOverlayPortal } from '@/features/shortcuts/components/DragOverlayPortal';
import {
  buildPointerDragOverlayTransform,
  buildSettlingDragOverlayTransform,
} from '@/features/shortcuts/drag/dragPreviewRenderState';
import type { DragSettlePreview } from '@/features/shortcuts/drag/useDragMotionState';
import type { DragPoint } from '@/features/shortcuts/drag/types';

export function DragPreviewOverlay<T>({
  item,
  pointer,
  previewOffset,
  zIndex,
  renderPreview,
  threeDimensional = false,
  className = '',
}: {
  item: T | null;
  pointer: DragPoint | null;
  previewOffset: DragPoint | null;
  zIndex: number;
  renderPreview: (item: T) => React.ReactNode;
  threeDimensional?: boolean;
  className?: string;
}) {
  if (!item || !pointer || !previewOffset) {
    return null;
  }

  return (
    <DragOverlayPortal
      zIndex={zIndex}
      transform={buildPointerDragOverlayTransform({
        pointer,
        previewOffset,
        threeDimensional,
      })}
      className={className}
    >
      {renderPreview(item)}
    </DragOverlayPortal>
  );
}

export function SettlingDragPreviewOverlay<T>({
  preview,
  zIndex,
  transition,
  renderPreview,
}: {
  preview: DragSettlePreview<T> | null;
  zIndex: number;
  transition?: string;
  renderPreview: (item: T) => React.ReactNode;
}) {
  if (!preview) {
    return null;
  }

  return (
    <DragOverlayPortal
      zIndex={zIndex}
      transform={buildSettlingDragOverlayTransform(preview)}
      transition={transition}
    >
      {renderPreview(preview.item)}
    </DragOverlayPortal>
  );
}
