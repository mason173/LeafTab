import type { ReactNode } from 'react';
import type { SearchInteractionState } from '@/components/search/SearchExperience';

export type FloatingSearchMotionPhase = 'idle' | 'focus' | 'active';

type FloatingSearchDockProps = {
  phase: FloatingSearchMotionPhase;
  className?: string;
  reduceMotionVisuals?: boolean;
  maxWidthPx?: number;
  children: ReactNode;
};

const SEARCH_BAR_MOTION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function resolveFloatingSearchMotionPhase({
  isFocused,
  interactionState,
}: {
  isFocused: boolean;
  hasValue: boolean;
  interactionState?: SearchInteractionState;
}): FloatingSearchMotionPhase {
  if (
    isFocused
    || interactionState?.historyOpen
    || interactionState?.typingBurst
  ) return 'focus';
  return 'idle';
}

function resolveFloatingSearchMotionMetrics(phase: FloatingSearchMotionPhase): {
  widthPercent: number;
  minWidth: string;
  translateYPx: number;
} {
  if (phase === 'active') {
    return { widthPercent: 78, minWidth: 'min(100%, 18rem)', translateYPx: -8 };
  }
  if (phase === 'focus') {
    return { widthPercent: 68, minWidth: 'min(100%, 17rem)', translateYPx: -4 };
  }
  return { widthPercent: 58, minWidth: 'min(100%, 16rem)', translateYPx: 0 };
}

export function resolveFloatingSearchOffsetPx(searchHeight: number) {
  return Math.max(12, Math.round(searchHeight * 0.24));
}

export function resolveFloatingSearchReservePx(searchHeight: number) {
  return searchHeight + resolveFloatingSearchOffsetPx(searchHeight) + 28;
}

export function FloatingSearchDock({
  phase,
  className,
  reduceMotionVisuals = false,
  maxWidthPx,
  children,
}: FloatingSearchDockProps) {
  const motionMetrics = resolveFloatingSearchMotionMetrics(phase);

  return (
    <div className={className}>
      <div className="flex w-full justify-center">
        <div
          className="w-full max-w-full"
          style={{
            width: `${motionMetrics.widthPercent}%`,
            minWidth: motionMetrics.minWidth,
            maxWidth: maxWidthPx ? `${maxWidthPx}px` : undefined,
            transform: reduceMotionVisuals
              ? undefined
              : `translate3d(0, ${motionMetrics.translateYPx}px, 0)`,
            transition: reduceMotionVisuals
              ? 'none'
              : [
                  `width 260ms ${SEARCH_BAR_MOTION_EASING}`,
                  `transform 260ms ${SEARCH_BAR_MOTION_EASING}`,
                ].join(', '),
            willChange: reduceMotionVisuals ? undefined : 'width, transform',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
