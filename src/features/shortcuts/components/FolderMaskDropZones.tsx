import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DRAG_MOTION_ANIMATIONS_ENABLED } from '@/features/shortcuts/drag/dragAnimationConfig';

export function FolderMaskDropZones({
  active,
  hovered,
  boundaryRef,
}: {
  active: boolean;
  hovered: boolean;
  boundaryRef: React.RefObject<HTMLElement | null>;
}) {
  const [boundaryRect, setBoundaryRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) {
      setBoundaryRect(null);
      return;
    }

    const updateRect = () => {
      const node = boundaryRef.current;
      setBoundaryRect(node ? node.getBoundingClientRect() : null);
    };

    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, boundaryRef]);

  if (!active || !boundaryRect || typeof document === 'undefined') return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const zoneClassName = hovered ? 'bg-black/10' : 'bg-black/5';
  const transitionClassName = DRAG_MOTION_ANIMATIONS_ENABLED ? 'transition-colors' : '';

  return createPortal(
    <>
      <div className={`pointer-events-none fixed left-0 top-0 z-[51] ${transitionClassName} ${zoneClassName}`.trim()} style={{ width: viewportWidth, height: Math.max(0, boundaryRect.top) }} />
      <div className={`pointer-events-none fixed z-[51] ${transitionClassName} ${zoneClassName}`.trim()} style={{ left: Math.max(0, boundaryRect.right), top: Math.max(0, boundaryRect.top), width: Math.max(0, viewportWidth - boundaryRect.right), height: Math.max(0, boundaryRect.height) }} />
      <div className={`pointer-events-none fixed left-0 z-[51] ${transitionClassName} ${zoneClassName}`.trim()} style={{ top: Math.max(0, boundaryRect.bottom), width: viewportWidth, height: Math.max(0, viewportHeight - boundaryRect.bottom) }} />
      <div className={`pointer-events-none fixed z-[51] ${transitionClassName} ${zoneClassName}`.trim()} style={{ left: 0, top: Math.max(0, boundaryRect.top), width: Math.max(0, boundaryRect.left), height: Math.max(0, boundaryRect.height) }} />
    </>,
    document.body,
  );
}
