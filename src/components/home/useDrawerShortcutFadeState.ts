import { useEffect, useRef, useState, type RefObject } from 'react';
import { resolveFloatingSearchOffsetPx } from '@/components/home/FloatingSearchDock';

type UseDrawerShortcutFadeStateArgs = {
  isDrawerExpanded: boolean;
  renderShortcuts: boolean;
  shortcutsPaintVisible: boolean;
  shortcutCount: number;
  showShortcutSearchEmptyState: boolean;
  searchHeight: number;
  drawerShortcutScrollRef: RefObject<HTMLDivElement | null>;
};

function hasVisibleShortcutContent(args: {
  renderShortcuts: boolean;
  shortcutsPaintVisible: boolean;
  shortcutCount: number;
  showShortcutSearchEmptyState: boolean;
}) {
  return args.renderShortcuts
    && args.shortcutsPaintVisible
    && args.shortcutCount > 0
    && !args.showShortcutSearchEmptyState;
}

export function useDrawerShortcutFadeState({
  isDrawerExpanded,
  renderShortcuts,
  shortcutsPaintVisible,
  shortcutCount,
  showShortcutSearchEmptyState,
  searchHeight,
  drawerShortcutScrollRef,
}: UseDrawerShortcutFadeStateArgs) {
  const shortcutContentRef = useRef<HTMLDivElement | null>(null);
  const [showShortcutOverflowFade, setShowShortcutOverflowFade] = useState(false);
  const [showCollapsedSearchOverlapFade, setShowCollapsedSearchOverlapFade] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const scrollEl = drawerShortcutScrollRef.current;
    const contentEl = shortcutContentRef.current;

    if (!hasVisibleShortcutContent({
      renderShortcuts,
      shortcutsPaintVisible,
      shortcutCount,
      showShortcutSearchEmptyState,
    })) {
      setShowShortcutOverflowFade(false);
      setShowCollapsedSearchOverlapFade(false);
      return undefined;
    }

    let frameId = 0;
    const scheduleMeasurement = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;

        if (!hasVisibleShortcutContent({
          renderShortcuts,
          shortcutsPaintVisible,
          shortcutCount,
          showShortcutSearchEmptyState,
        })) {
          setShowShortcutOverflowFade(false);
          setShowCollapsedSearchOverlapFade(false);
          return;
        }

        if (isDrawerExpanded) {
          const maxScrollTop = scrollEl ? Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight) : 0;
          const hasHiddenContentBelow = scrollEl !== null && maxScrollTop > 1 && scrollEl.scrollTop < maxScrollTop - 1;
          setShowShortcutOverflowFade(hasHiddenContentBelow);
          setShowCollapsedSearchOverlapFade(false);
          return;
        }

        const contentRect = contentEl?.getBoundingClientRect();
        const searchTop = window.innerHeight - resolveFloatingSearchOffsetPx(searchHeight) - searchHeight;
        const overlapsFloatingSearch = contentRect !== undefined && contentRect.bottom > searchTop + 1;

        setShowShortcutOverflowFade(false);
        setShowCollapsedSearchOverlapFade(overlapsFloatingSearch);
      });
    };

    scheduleMeasurement();

    const resizeObserver = typeof ResizeObserver !== 'undefined' && contentEl
      ? new ResizeObserver(() => {
          scheduleMeasurement();
        })
      : null;
    if (resizeObserver && contentEl) {
      resizeObserver.observe(contentEl);
    }
    if (resizeObserver && scrollEl && scrollEl !== contentEl) {
      resizeObserver.observe(scrollEl);
    }

    scrollEl?.addEventListener('scroll', scheduleMeasurement, { passive: true });
    window.addEventListener('resize', scheduleMeasurement, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      resizeObserver?.disconnect();
      scrollEl?.removeEventListener('scroll', scheduleMeasurement);
      window.removeEventListener('resize', scheduleMeasurement);
    };
  }, [
    drawerShortcutScrollRef,
    isDrawerExpanded,
    renderShortcuts,
    searchHeight,
    shortcutCount,
    shortcutsPaintVisible,
    showShortcutSearchEmptyState,
  ]);

  return {
    shortcutContentRef,
    showShortcutOverflowFade,
    showCollapsedSearchOverlapFade,
  };
}
