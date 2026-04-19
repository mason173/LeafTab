import type { ProjectionOffset } from '@leaftab/workspace-core';
import type { CSSProperties, HTMLAttributes, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

export const GRID_DRAG_SETTLE_TRANSITION =
  'transform 320ms ease-in-out';

export type GridDragItemFrameProps = {
  isDragging: boolean;
  children: ReactNode;
  centerPreviewActive?: boolean;
  projectionOffset?: ProjectionOffset | null;
  disableReorderAnimation?: boolean;
  hideDragPlaceholder?: boolean;
  firefox?: boolean;
  dimmed?: boolean;
  dragDisabled?: boolean;
  registerElement?: (element: HTMLDivElement | null) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  placeholder?: ReactNode;
  centerPreview?: ReactNode;
  selectionOverlay?: ReactNode;
  frameProps?: Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'ref' | 'onPointerDown' | 'onDragStart'> & {
    [key: `data-${string}`]: string | number | boolean | undefined;
  };
};

function buildTransform(params: {
  isDragging: boolean;
  centerPreviewActive: boolean;
  projectionOffset?: ProjectionOffset | null;
}) {
  const { isDragging, centerPreviewActive, projectionOffset } = params;
  if (isDragging) {
    return 'scale(0.98)';
  }

  return [
    projectionOffset ? `translate(${projectionOffset.x}px, ${projectionOffset.y}px)` : null,
    centerPreviewActive ? 'scale(1.02)' : null,
  ].filter(Boolean).join(' ') || undefined;
}

export function GridDragItemFrame({
  isDragging,
  children,
  centerPreviewActive = false,
  projectionOffset,
  disableReorderAnimation = false,
  hideDragPlaceholder = false,
  firefox = false,
  dimmed = false,
  dragDisabled = false,
  registerElement,
  onPointerDown,
  placeholder,
  centerPreview,
  selectionOverlay,
  frameProps,
}: GridDragItemFrameProps) {
  const transform = buildTransform({
    isDragging,
    centerPreviewActive,
    projectionOffset,
  });
  const className = frameProps?.className ?? '';
  const style: CSSProperties = {
    ...frameProps?.style,
    opacity: isDragging ? 0.32 : undefined,
    transform,
    transition: disableReorderAnimation ? undefined : GRID_DRAG_SETTLE_TRANSITION,
    willChange: !firefox && (isDragging || centerPreviewActive || Boolean(projectionOffset))
      ? 'transform, opacity'
      : undefined,
    touchAction: dragDisabled ? 'auto' : 'none',
  };

  return (
    <div className="relative">
      <div
        ref={registerElement}
        {...frameProps}
        className={`relative isolate ${dimmed ? 'opacity-75' : ''} ${dragDisabled ? '' : 'cursor-grab active:cursor-grabbing'} ${className}`.trim()}
        style={style}
        onPointerDown={dragDisabled ? undefined : onPointerDown}
        onDragStart={(event) => {
          event.preventDefault();
        }}
      >
        {centerPreviewActive ? centerPreview : null}
        {isDragging && !hideDragPlaceholder ? placeholder : null}
        {isDragging && hideDragPlaceholder ? null : children}
        {selectionOverlay}
      </div>
    </div>
  );
}
