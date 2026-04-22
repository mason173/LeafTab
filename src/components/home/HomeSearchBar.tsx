import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SearchExperience,
  type SearchExperienceProps,
  type SearchInteractionState,
} from '@/components/search/SearchExperience';

type HomeSearchBarMotionContext = 'drawer' | 'floating-bottom';

type SearchBarMotionPhase = 'idle' | 'focus' | 'active';

type HomeSearchBarProps = {
  searchExperienceProps: SearchExperienceProps;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
  searchSurfaceTone?: 'default' | 'drawer';
  searchSurfaceStyle?: React.CSSProperties;
  suggestionsPlacement?: 'bottom' | 'top';
  className?: string;
  motionContext?: HomeSearchBarMotionContext;
  interactionState?: SearchInteractionState;
  reduceMotionVisuals?: boolean;
  maxWidthPx?: number;
};

const SEARCH_BAR_MOTION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SEARCH_BAR_IDLE_COLLAPSE_DELAY_MS = 300;

function resolveMotionPhase({
  isFocused,
  hasValue,
  interactionState,
}: {
  isFocused: boolean;
  hasValue: boolean;
  interactionState?: SearchInteractionState;
}): SearchBarMotionPhase {
  if (
    hasValue
    || interactionState?.historyOpen
    || interactionState?.typingBurst
  ) {
    return 'active';
  }

  if (isFocused) return 'focus';
  return 'idle';
}

function resolveMotionMetrics(
  motionContext: HomeSearchBarMotionContext,
  phase: SearchBarMotionPhase,
): {
  widthPercent: number;
  minWidth: string;
  translateYPx: number;
} {
  if (motionContext === 'floating-bottom') {
    if (phase === 'active') {
      return { widthPercent: 100, minWidth: 'min(100%, 22rem)', translateYPx: -8 };
    }
    if (phase === 'focus') {
      return { widthPercent: 78, minWidth: 'min(100%, 20.5rem)', translateYPx: -4 };
    }
    return { widthPercent: 68, minWidth: 'min(100%, 20rem)', translateYPx: 0 };
  }

  if (phase === 'active') {
    return { widthPercent: 100, minWidth: 'min(100%, 20rem)', translateYPx: -4 };
  }
  if (phase === 'focus') {
    return { widthPercent: 82, minWidth: 'min(100%, 18.5rem)', translateYPx: -2 };
  }
  return { widthPercent: 74, minWidth: 'min(100%, 18rem)', translateYPx: 0 };
}

export function HomeSearchBar({
  searchExperienceProps,
  blankMode,
  forceWhiteTheme,
  subtleDarkTone,
  searchSurfaceTone = 'default',
  searchSurfaceStyle,
  suggestionsPlacement = 'bottom',
  className,
  motionContext = 'drawer',
  interactionState,
  reduceMotionVisuals = false,
  maxWidthPx,
}: HomeSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [motionPhase, setMotionPhase] = useState<SearchBarMotionPhase>('idle');
  const deferredSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const syncFromInput = () => {
      if (deferredSyncTimerRef.current !== null) {
        window.clearTimeout(deferredSyncTimerRef.current);
        deferredSyncTimerRef.current = null;
      }

      const input = searchExperienceProps.inputRef.current;
      const nextFocused = Boolean(input && document.activeElement === input);
      const nextHasValue = Boolean(input?.value.trim());

      setIsFocused((current) => (current === nextFocused ? current : nextFocused));
      setHasValue((current) => (current === nextHasValue ? current : nextHasValue));
    };

    const scheduleSyncFromInput = () => {
      if (deferredSyncTimerRef.current !== null) {
        window.clearTimeout(deferredSyncTimerRef.current);
      }
      deferredSyncTimerRef.current = window.setTimeout(syncFromInput, 0);
    };

    syncFromInput();
    document.addEventListener('focusin', syncFromInput, true);
    document.addEventListener('focusout', scheduleSyncFromInput, true);
    document.addEventListener('input', syncFromInput, true);
    document.addEventListener('change', syncFromInput, true);

    return () => {
      if (deferredSyncTimerRef.current !== null) {
        window.clearTimeout(deferredSyncTimerRef.current);
        deferredSyncTimerRef.current = null;
      }
      document.removeEventListener('focusin', syncFromInput, true);
      document.removeEventListener('focusout', scheduleSyncFromInput, true);
      document.removeEventListener('input', syncFromInput, true);
      document.removeEventListener('change', syncFromInput, true);
    };
  }, [searchExperienceProps.inputRef]);

  const targetMotionPhase = useMemo(() => resolveMotionPhase({
    isFocused,
    hasValue,
    interactionState,
  }), [hasValue, interactionState, isFocused]);

  useEffect(() => {
    if (reduceMotionVisuals) {
      setMotionPhase(targetMotionPhase);
      return;
    }

    if (targetMotionPhase !== 'idle') {
      setMotionPhase(targetMotionPhase);
      return;
    }

    const timerId = window.setTimeout(() => {
      setMotionPhase('idle');
    }, SEARCH_BAR_IDLE_COLLAPSE_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [reduceMotionVisuals, targetMotionPhase]);

  const motionMetrics = useMemo(
    () => resolveMotionMetrics(motionContext, motionPhase),
    [motionContext, motionPhase],
  );

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
          <SearchExperience
            {...searchExperienceProps}
            blankMode={blankMode}
            forceWhiteTheme={forceWhiteTheme}
            subtleDarkTone={subtleDarkTone}
            searchSurfaceTone={searchSurfaceTone}
            searchSurfaceStyle={searchSurfaceStyle}
            suggestionsPlacement={suggestionsPlacement}
          />
        </div>
      </div>
    </div>
  );
}
