import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { RootShortcutGrid } from '@/features/shortcuts/components/RootShortcutGrid';
import { DrawerShortcutAlphabetRail } from '@/components/home/DrawerShortcutAlphabetRail';
import {
  DrawerShortcutOverflowFadeOverlay,
  resolveDrawerShortcutOverflowFadeHeight,
  resolveDrawerShortcutOverflowFadeInset,
} from '@/components/home/DrawerShortcutOverflowFadeOverlay';
import { FakeBlurDrawerSurface } from '@/components/home/FakeBlurDrawerSurface';
import { DrawerShortcutSearchBar } from '@/components/home/DrawerShortcutSearchBar';
import { focusInputWithRetry } from '@/components/home/focusInputWithRetry';
import { HomeSearchBar } from '@/components/home/HomeSearchBar';
import { useDrawerShortcutAlphabetIndex } from '@/components/home/useDrawerShortcutAlphabetIndex';
import { filterShortcutsByIndexLetter } from '@/components/home/drawerShortcutAlphabetIndex';
import { isShortcutFolder } from '@/utils/shortcutFolders';
import {
  resolveInitialRevealOpacityTransition,
  resolveInitialRevealStyle,
} from '@/config/animationTokens';
import {
  DRAWER_CONTENT_BG_MAX_OPACITY,
  DRAWER_LAYOUT_LINKED_ANIMATION_MS,
  DRAWER_SURFACE_LINKED_ANIMATION_MS,
} from '@/components/home/quickAccessDrawer.constants';
import {
  SHORTCUTS_FADE_DURATION_MS,
  type QuickAccessDrawerProps,
} from '@/components/home/QuickAccessDrawer.shared';

export function QuickAccessDrawer({
  initialRevealReady,
  modeFlags,
  contentWidth,
  quickAccessOpen,
  isDrawerExpanded,
  drawerOverlayOpacity,
  drawerSurfaceOpacity,
  drawerLayoutProgress: _drawerLayoutProgress,
  drawerBottomBounceOffsetPx,
  drawerContentTopPaddingPx,
  drawerContentBackdropBlurPx,
  drawerPanelHeightVh,
  drawerPanelTranslateYPx,
  drawerShortcutBottomInset,
  drawerShortcutForceWhiteText,
  drawerShortcutMonochromeTone,
  drawerShortcutMonochromeTileBackdropBlur,
  drawerScrollLocked,
  reduceMotionVisuals = false,
  drawerExpandHintVisible = false,
  drawerSearchSurfaceStyle,
  subtleDarkTone,
  searchBarPosition,
  searchHeight,
  drawerWheelAreaRef,
  drawerShortcutScrollRef,
  searchExperienceProps,
  interactionState,
  shortcutGridProps,
}: QuickAccessDrawerProps) {
  const shortcutSearchInputRef = useRef<HTMLInputElement>(null);
  const [shortcutSearchValue, setShortcutSearchValue] = useState('');
  const drawerExpandHint = drawerExpandHintVisible ? (
    <div
      className="pointer-events-none mt-3 flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="flex min-w-[188px] flex-col items-center gap-2 rounded-2xl border border-border bg-popover px-4 py-3 text-center text-popover-foreground shadow-[0_12px_32px_rgba(0,0,0,0.14)]">
        <div className="relative flex h-9 w-7 items-start justify-center rounded-full border border-foreground/20">
          <div className="mt-1.5 h-2 w-1 rounded-full bg-foreground/65 motion-safe:animate-bounce" />
        </div>
        <div className="relative flex h-7 items-end justify-center">
          <span className="absolute text-lg leading-none text-foreground/70 motion-safe:animate-bounce" style={{ animationDelay: '0ms' }}>
            ↑
          </span>
          <span className="absolute -translate-y-2 text-sm leading-none text-foreground/45 motion-safe:animate-bounce" style={{ animationDelay: '140ms' }}>
            ↑
          </span>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          向上滚动滚轮，展开快捷面板
        </p>
      </div>
    </div>
  ) : null;

  const drawerTopCornerRadius = 0;
  const drawerLinkedTransition = `${DRAWER_LAYOUT_LINKED_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  const drawerBackgroundFadeTransition = `${DRAWER_SURFACE_LINKED_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  const initialRevealStyle = resolveInitialRevealStyle(initialRevealReady, {
    disablePointerEventsUntilReady: true,
  });
  const initialRevealOpacityTransition = resolveInitialRevealOpacityTransition();
  const normalizedOverlayOpacity = Math.max(0, Math.min(1, drawerOverlayOpacity));
  const drawerSurfaceLayerOpacity = Math.max(
    0,
    Math.min(
      1,
      drawerSurfaceOpacity
      * DRAWER_CONTENT_BG_MAX_OPACITY,
    ),
  );
  const shouldShowDrawerShortcuts = modeFlags.showShortcuts || (modeFlags.revealShortcutsOnDrawerExpand && isDrawerExpanded);
  const [renderShortcuts, setRenderShortcuts] = useState(shouldShowDrawerShortcuts);
  const [shortcutsVisible, setShortcutsVisible] = useState(shouldShowDrawerShortcuts);
  const [interactiveTransitionsEnabled, setInteractiveTransitionsEnabled] = useState(false);
  const shortcutsVisibilityInitializedRef = useRef(false);
  const shortcutsPaintVisible = shortcutsVisible;
  const showDrawerSearch = searchBarPosition !== 'bottom' && !isDrawerExpanded;
  const deferredShortcutSearchValue = useDeferredValue(shortcutSearchValue);
  const normalizedShortcutSearchQuery = deferredShortcutSearchValue.trim().toLocaleLowerCase();
  const searchingShortcuts = normalizedShortcutSearchQuery.length > 0;

  const searchedShortcuts = useMemo(() => {
    if (!searchingShortcuts) return shortcutGridProps.shortcuts;

    return shortcutGridProps.shortcuts.filter((shortcut) => {
      const title = (shortcut.title || '').trim().toLocaleLowerCase();
      const url = (shortcut.url || '').trim().toLocaleLowerCase();
      const kind = (shortcut.kind || '').trim().toLocaleLowerCase();
      const folderKeywords = isShortcutFolder(shortcut) ? ' folder 文件夹' : '';
      const haystack = `${title}\n${url}\n${kind}${folderKeywords}`;
      return haystack.includes(normalizedShortcutSearchQuery);
    });
  }, [normalizedShortcutSearchQuery, searchingShortcuts, shortcutGridProps.shortcuts]);
  const {
    activeLetter: activeIndexLetter,
    availableLetters,
    showAlphabetRail,
    onLetterSelect,
  } = useDrawerShortcutAlphabetIndex({
    enabled: isDrawerExpanded && renderShortcuts,
    shortcuts: searchedShortcuts,
  });
  const filteringByLetter = activeIndexLetter !== '#';
  const filteredShortcuts = useMemo(
    () => filterShortcutsByIndexLetter(searchedShortcuts, activeIndexLetter),
    [activeIndexLetter, searchedShortcuts],
  );
  const showShortcutSearchEmptyState = (searchingShortcuts || filteringByLetter) && filteredShortcuts.length === 0;
  const shortcutOverflowFadeHeightPx = resolveDrawerShortcutOverflowFadeHeight(searchHeight);
  const shortcutOverflowFadeInsetPx = resolveDrawerShortcutOverflowFadeInset(searchHeight);
  const showShortcutOverflowFade = isDrawerExpanded && filteredShortcuts.length > 0;

  const filteredShortcutGridProps = useMemo(() => (
    (searchingShortcuts || filteringByLetter)
      ? {
          ...shortcutGridProps,
          shortcuts: filteredShortcuts,
          disableReorderAnimation: true,
          selectionMode: false,
          selectedShortcutIndexes: undefined,
          onToggleShortcutSelection: undefined,
        }
      : shortcutGridProps
  ), [filteredShortcuts, filteringByLetter, searchingShortcuts, shortcutGridProps]);

  const enableInteractiveTransitions = useCallback(() => {
    setInteractiveTransitionsEnabled(true);
  }, []);

  useEffect(() => {
    if (!shortcutsVisibilityInitializedRef.current) {
      shortcutsVisibilityInitializedRef.current = true;
      setRenderShortcuts(shouldShowDrawerShortcuts);
      setShortcutsVisible(shouldShowDrawerShortcuts);
      return;
    }

    let firstFrameId = 0;
    let secondFrameId = 0;
    let timerId = 0;

    if (shouldShowDrawerShortcuts) {
      setShortcutsVisible(false);
      setRenderShortcuts(true);
      firstFrameId = window.requestAnimationFrame(() => {
        secondFrameId = window.requestAnimationFrame(() => {
          setShortcutsVisible(true);
        });
      });
      return () => {
        if (firstFrameId) window.cancelAnimationFrame(firstFrameId);
        if (secondFrameId) window.cancelAnimationFrame(secondFrameId);
      };
    }

    setShortcutsVisible(false);
    timerId = window.setTimeout(() => {
      setRenderShortcuts(false);
    }, SHORTCUTS_FADE_DURATION_MS);

    return () => {
      if (timerId) window.clearTimeout(timerId);
    };
  }, [shouldShowDrawerShortcuts]);

  useEffect(() => {
    if (!isDrawerExpanded) {
      setShortcutSearchValue('');
      return;
    }

    if (!quickAccessOpen) return;
    return focusInputWithRetry(shortcutSearchInputRef, { forceStealFocus: true });
  }, [isDrawerExpanded, quickAccessOpen]);

  useEffect(() => {
    if (!isDrawerExpanded || !renderShortcuts) return;
    if (normalizedShortcutSearchQuery.length === 0 && activeIndexLetter === '#') return;

    const scrollContainer = drawerShortcutScrollRef.current;
    if (!scrollContainer) return;

    scrollContainer.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }, [
    activeIndexLetter,
    drawerShortcutScrollRef,
    isDrawerExpanded,
    normalizedShortcutSearchQuery,
    renderShortcuts,
  ]);

  const searchBlock = (
    <HomeSearchBar
      className="relative z-20 w-full"
      searchExperienceProps={searchExperienceProps}
      interactionState={interactionState}
      maxWidthPx={contentWidth}
      blankMode={modeFlags.searchUsesBlankStyle}
      forceWhiteTheme={modeFlags.forceWhiteSearchTheme}
      subtleDarkTone={subtleDarkTone}
      searchSurfaceTone={isDrawerExpanded ? 'drawer' : 'default'}
      searchSurfaceStyle={drawerSearchSurfaceStyle}
      motionContext="drawer"
      reduceMotionVisuals={reduceMotionVisuals}
    />
  );

  const shortcutSearchBlock = isDrawerExpanded ? (
    <DrawerShortcutSearchBar
      className="relative z-20 mb-6 mt-1 w-full"
      inputRef={shortcutSearchInputRef}
      value={shortcutSearchValue}
      onValueChange={setShortcutSearchValue}
      widthPercent={70}
      height={searchHeight}
    />
  ) : null;

  const shortcutsBlock = renderShortcuts ? (
    <div
      className={`relative min-h-0 flex-1 w-full transition-[opacity,transform] ease-out ${showDrawerSearch ? 'mt-4' : ''}`}
      style={{
        opacity: shortcutsPaintVisible ? 1 : 0,
        transform: shortcutsPaintVisible ? 'translate3d(0, 0, 0)' : 'translate3d(0, 8px, 0)',
        transitionDuration: `${SHORTCUTS_FADE_DURATION_MS}ms`,
        pointerEvents: shortcutsPaintVisible ? 'auto' : 'none',
        visibility: shortcutsPaintVisible ? 'visible' : 'hidden',
        contain: 'layout style',
      }}
      aria-hidden={!shortcutsPaintVisible}
    >
      <div className="relative h-full">
        {showAlphabetRail ? (
          <DrawerShortcutAlphabetRail
            className="pointer-events-auto absolute inset-y-0 right-0 z-20 flex items-center"
            letters={availableLetters}
            activeLetter={activeIndexLetter}
            onLetterSelect={onLetterSelect}
          />
        ) : null}

        <div
          ref={drawerShortcutScrollRef}
          data-allow-drawer-locked-scroll="true"
          className={`no-scrollbar h-full ${(isDrawerExpanded && !drawerScrollLocked) ? 'overflow-y-auto' : 'overflow-y-hidden'} ${showAlphabetRail ? 'pr-14' : 'pr-1'}`}
        >
          <div
            style={{
              transform: drawerBottomBounceOffsetPx > 0.01
                ? `translate3d(0, ${(-drawerBottomBounceOffsetPx).toFixed(3)}px, 0)`
                : undefined,
              willChange: drawerBottomBounceOffsetPx > 0.01 ? 'transform' : undefined,
              paddingBottom: showShortcutOverflowFade ? `${shortcutOverflowFadeInsetPx}px` : undefined,
            }}
          >
            {showShortcutSearchEmptyState ? (
              <div className="flex min-h-[40vh] w-full items-center justify-center">
                <div className="text-center text-base text-white/70">
                  没有搜索结果
                </div>
              </div>
            ) : (
              <RootShortcutGrid
                key={filteredShortcutGridProps.surfaceInstanceKey ?? 'root-shortcut-grid'}
                {...filteredShortcutGridProps}
                folderPreviewTone={isDrawerExpanded ? 'drawer' : 'default'}
                bottomInset={drawerShortcutBottomInset}
                forceTextWhite={drawerShortcutForceWhiteText}
                monochromeTone={drawerShortcutMonochromeTone}
                monochromeTileBackdropBlur={drawerShortcutMonochromeTileBackdropBlur}
                onShortcutOpen={filteredShortcutGridProps.onShortcutOpen}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const shortcutOverflowFadeLayer = showShortcutOverflowFade ? (
    <DrawerShortcutOverflowFadeOverlay
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[12]"
      heightPx={shortcutOverflowFadeHeightPx}
    />
  ) : null;

  return (
    <>
      <div
        className="fixed inset-0 z-[14000]"
        style={{
          backgroundColor: '#000000',
          opacity: normalizedOverlayOpacity,
          transition: interactiveTransitionsEnabled
            ? `opacity ${drawerBackgroundFadeTransition}`
            : initialRevealOpacityTransition,
          willChange: 'opacity',
          backfaceVisibility: 'hidden',
          pointerEvents: isDrawerExpanded ? 'auto' : 'none',
        }}
        onPointerDown={(event) => {
          if (!isDrawerExpanded) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onWheel={(event) => {
          if (!isDrawerExpanded) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onTouchMove={(event) => {
          if (!isDrawerExpanded) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-[14010] pointer-events-none">
        <div
          className="mx-auto h-full max-w-full"
          style={{
            ...initialRevealStyle,
          }}
        >
          <section
            className="relative mx-auto flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden border-transparent bg-transparent shadow-none pointer-events-auto"
            style={{
              opacity: 'var(--leaftab-folder-immersive-inverse-opacity, 1)',
              backdropFilter: !reduceMotionVisuals && drawerContentBackdropBlurPx > 0 ? `blur(${drawerContentBackdropBlurPx.toFixed(1)}px)` : undefined,
              WebkitBackdropFilter: !reduceMotionVisuals && drawerContentBackdropBlurPx > 0 ? `blur(${drawerContentBackdropBlurPx.toFixed(1)}px)` : undefined,
              height: `${drawerPanelHeightVh}vh`,
              maxHeight: `${drawerPanelHeightVh}vh`,
              transform: drawerPanelTranslateYPx > 0.01 ? `translate3d(0, ${drawerPanelTranslateYPx.toFixed(3)}px, 0)` : 'translate3d(0, 0, 0)',
              borderTopLeftRadius: `${drawerTopCornerRadius.toFixed(2)}px`,
              borderTopRightRadius: `${drawerTopCornerRadius.toFixed(2)}px`,
              transition: interactiveTransitionsEnabled
                ? (reduceMotionVisuals
                    ? `transform ${drawerLinkedTransition}`
                    : [
                        `opacity ${drawerLinkedTransition}`,
                        `transform ${drawerLinkedTransition}`,
                        `backdrop-filter ${drawerLinkedTransition}`,
                        `-webkit-backdrop-filter ${drawerLinkedTransition}`,
                      ].join(', '))
                : 'opacity 180ms ease-out',
              willChange: 'opacity, transform',
            }}
            aria-label="Quick Access Drawer"
          >
            <FakeBlurDrawerSurface
              opacity={drawerSurfaceLayerOpacity}
              transition={interactiveTransitionsEnabled ? `opacity ${drawerBackgroundFadeTransition}` : 'none'}
              panelHeightVh={drawerPanelHeightVh}
              panelTranslateYPx={drawerPanelTranslateYPx}
            />

            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <h2 className="sr-only">Quick Access Drawer</h2>
              <p className="sr-only">Search and shortcut list panel.</p>

              {quickAccessOpen && (
                <div
                  ref={drawerWheelAreaRef}
                  className="flex min-h-0 flex-1 px-4"
                  style={{
                    paddingTop: `${drawerContentTopPaddingPx}px`,
                  }}
                  onPointerDownCapture={enableInteractiveTransitions}
                  onTouchStartCapture={enableInteractiveTransitions}
                  onWheelCapture={(event) => {
                    enableInteractiveTransitions();
                    if (!drawerScrollLocked) return;
                    const target = event.target;
                    if (target instanceof Element && target.closest('[data-allow-drawer-locked-scroll="true"]')) {
                      return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onTouchMoveCapture={(event) => {
                    if (!drawerScrollLocked) return;
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <div
                    className="mx-auto flex min-h-0 max-w-full flex-col items-stretch"
                    style={{ width: contentWidth }}
                  >
                    {shortcutSearchBlock}
                    {showDrawerSearch ? searchBlock : null}
                    {drawerExpandHint}
                    {shortcutsBlock}
                  </div>
                </div>
              )}
            </div>
            {shortcutOverflowFadeLayer}
          </section>
        </div>
      </div>
    </>
  );
}
