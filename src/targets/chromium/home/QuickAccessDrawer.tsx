import { useCallback, useEffect, useRef, useState } from 'react';
import { RootShortcutGrid } from '@/features/shortcuts/components/RootShortcutGrid';
import { SearchExperience } from '@/components/search/SearchExperience';
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
  quickAccessSnapPoint: _quickAccessSnapPoint,
  quickAccessDefaultSnapPoint: _quickAccessDefaultSnapPoint,
  quickAccessFullSnapPoint: _quickAccessFullSnapPoint,
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
  drawerWheelAreaRef,
  drawerShortcutScrollRef,
  searchExperienceProps,
  shortcutGridProps,
  onDrawerOpenChange: _onDrawerOpenChange,
  onActiveSnapPointChange: _onActiveSnapPointChange,
}: QuickAccessDrawerProps) {
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

  const drawerTopCornerRadius = 32;
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

      <div className="fixed inset-x-0 bottom-0 z-[14010] pointer-events-none">
        <div
          className="mx-auto max-w-full"
          style={{
            ...initialRevealStyle,
          }}
        >
          <section
            className="relative mx-auto flex min-h-0 w-full max-w-full flex-col overflow-hidden border-transparent bg-transparent shadow-none pointer-events-auto"
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
            <div
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundColor: 'var(--background)',
                opacity: drawerSurfaceLayerOpacity,
                transition: interactiveTransitionsEnabled ? `opacity ${drawerBackgroundFadeTransition}` : 'none',
              }}
              aria-hidden="true"
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
                    <div className="relative z-20 w-full">
                      <SearchExperience
                        {...searchExperienceProps}
                        blankMode={modeFlags.searchUsesBlankStyle}
                        forceWhiteTheme={modeFlags.forceWhiteSearchTheme}
                        subtleDarkTone={subtleDarkTone}
                        searchSurfaceStyle={drawerSearchSurfaceStyle}
                      />
                    </div>
                    {drawerExpandHint}
                    {renderShortcuts && (
                      <div
                        className="relative mt-4 min-h-0 flex-1 w-full transition-[opacity,transform] ease-out"
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
                        <div
                          ref={drawerShortcutScrollRef}
                          className={`no-scrollbar h-full pr-1 ${(isDrawerExpanded && !drawerScrollLocked) ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
                        >
                          <div
                            style={{
                              transform: drawerBottomBounceOffsetPx > 0.01
                                ? `translate3d(0, ${(-drawerBottomBounceOffsetPx).toFixed(3)}px, 0)`
                                : undefined,
                              willChange: drawerBottomBounceOffsetPx > 0.01 ? 'transform' : undefined,
                            }}
                          >
                            <RootShortcutGrid
                              {...shortcutGridProps}
                              bottomInset={drawerShortcutBottomInset}
                              forceTextWhite={drawerShortcutForceWhiteText}
                              monochromeTone={drawerShortcutMonochromeTone}
                              monochromeTileBackdropBlur={drawerShortcutMonochromeTileBackdropBlur}
                              onShortcutOpen={shortcutGridProps.onShortcutOpen}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
