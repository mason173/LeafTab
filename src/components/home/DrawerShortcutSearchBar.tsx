import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { RiDashboardFill } from '@/icons/ri-compat';
import { SearchBar } from '@/components/SearchBar';
import {
  FloatingSearchDock,
  resolveFloatingSearchMotionPhase,
} from '@/components/home/FloatingSearchDock';
import type { SearchAction } from '@/utils/searchActions';

type DrawerShortcutSearchBarProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  height: number;
  maxWidthPx?: number;
  reduceMotionVisuals?: boolean;
  interactionDisabled?: boolean;
  withDock?: boolean;
};

export function DrawerShortcutSearchBar({
  inputRef,
  value,
  onValueChange,
  className,
  height,
  maxWidthPx,
  reduceMotionVisuals = false,
  interactionDisabled = false,
  withDock = true,
}: DrawerShortcutSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const deferredSyncTimerRef = useRef<number | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);
  const hasValue = value.trim().length > 0;
  const motionPhase = resolveFloatingSearchMotionPhase({
    isFocused,
    hasValue,
  });

  useEffect(() => {
    const syncFromInput = () => {
      if (deferredSyncTimerRef.current !== null) {
        window.clearTimeout(deferredSyncTimerRef.current);
        deferredSyncTimerRef.current = null;
      }

      const input = inputRef.current;
      const nextFocused = Boolean(input && document.activeElement === input);
      setIsFocused((current) => (current === nextFocused ? current : nextFocused));
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

    return () => {
      if (deferredSyncTimerRef.current !== null) {
        window.clearTimeout(deferredSyncTimerRef.current);
        deferredSyncTimerRef.current = null;
      }
      document.removeEventListener('focusin', syncFromInput, true);
      document.removeEventListener('focusout', scheduleSyncFromInput, true);
    };
  }, [inputRef]);

  const emptyActions = useMemo<SearchAction[]>(() => [], []);
  const leadingAccessory = useMemo(() => (
    <span className="relative flex size-5 shrink-0 items-center justify-center">
      <RiDashboardFill className="size-[18px]" />
    </span>
  ), []);

  const content = (
    <SearchBar
      value={value}
      onValueChange={(nextValue) => {
        onValueChange(nextValue);
      }}
      onSubmit={() => {}}
      searchEngine="system"
      dropdownOpen={false}
      onEngineOpenChange={() => {}}
      onEngineSelect={() => {}}
      searchActions={emptyActions}
      historyOpen={false}
      onHistoryOpen={() => {}}
      onSuggestionSelect={() => {}}
      onSuggestionHighlight={() => {}}
      onHistoryClear={() => {}}
      onClear={() => {
        onValueChange('');
      }}
      historyRef={historyRef}
      placeholder="搜索快捷方式"
      disablePlaceholderAnimation={true}
      inputRef={inputRef}
      searchHeight={height}
      searchSurfaceTone="default"
      interactionDisabled={interactionDisabled}
      showEngineSwitcher={false}
      leadingAccessory={leadingAccessory}
      searchHorizontalPadding={24}
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
