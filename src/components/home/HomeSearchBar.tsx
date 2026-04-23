import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SearchExperience,
  type SearchExperienceProps,
  type SearchInteractionState,
} from '@/components/search/SearchExperience';
import {
  FloatingSearchDock,
  resolveFloatingSearchMotionPhase,
} from '@/components/home/FloatingSearchDock';

type HomeSearchBarProps = {
  searchExperienceProps: SearchExperienceProps;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
  searchSurfaceTone?: 'default' | 'drawer';
  searchSurfaceStyle?: React.CSSProperties;
  suggestionsPlacement?: 'bottom' | 'top';
  className?: string;
  interactionState?: SearchInteractionState;
  reduceMotionVisuals?: boolean;
  maxWidthPx?: number;
  withDock?: boolean;
};

const SEARCH_BAR_IDLE_COLLAPSE_DELAY_MS = 300;

export function HomeSearchBar({
  searchExperienceProps,
  blankMode,
  forceWhiteTheme,
  subtleDarkTone,
  searchSurfaceTone = 'default',
  searchSurfaceStyle,
  suggestionsPlacement = 'bottom',
  className,
  interactionState,
  reduceMotionVisuals = false,
  maxWidthPx,
  withDock = true,
}: HomeSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [motionPhase, setMotionPhase] = useState<'idle' | 'focus' | 'active'>('idle');
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
    document.addEventListener('input', scheduleSyncFromInput, true);
    document.addEventListener('change', scheduleSyncFromInput, true);

    return () => {
      if (deferredSyncTimerRef.current !== null) {
        window.clearTimeout(deferredSyncTimerRef.current);
        deferredSyncTimerRef.current = null;
      }
      document.removeEventListener('focusin', syncFromInput, true);
      document.removeEventListener('focusout', scheduleSyncFromInput, true);
      document.removeEventListener('input', scheduleSyncFromInput, true);
      document.removeEventListener('change', scheduleSyncFromInput, true);
    };
  }, [searchExperienceProps.inputRef]);

  const targetMotionPhase = useMemo(() => resolveFloatingSearchMotionPhase({
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

  const content = (
    <SearchExperience
      {...searchExperienceProps}
      blankMode={blankMode}
      forceWhiteTheme={forceWhiteTheme}
      subtleDarkTone={subtleDarkTone}
      searchSurfaceTone={searchSurfaceTone}
      searchSurfaceStyle={searchSurfaceStyle}
      suggestionsPlacement={suggestionsPlacement}
    />
  );

  if (!withDock) {
    return <div className={className}>{content}</div>;
  }

  return (
    <FloatingSearchDock
      className={className}
      phase={motionPhase}
      reduceMotionVisuals={reduceMotionVisuals}
      maxWidthPx={maxWidthPx}
    >
      {content}
    </FloatingSearchDock>
  );
}
