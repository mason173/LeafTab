import { useCallback, useEffect, useRef, useState } from 'react';
import { RootShortcutGridRuntime as RootShortcutGrid } from '@/features/shortcuts/components/RootShortcutGridRuntime';
import { SearchExperience } from '@/components/search/SearchExperience';
import {
  INITIAL_REVEAL_TIMING,
  resolveInitialRevealTransform,
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
  drawerSearchSurfaceStyle,
  subtleDarkTone,
  drawerWheelAreaRef,
  drawerShortcutScrollRef,
  searchExperienceProps,
  shortcutGridProps,
  onDrawerOpenChange: _onDrawerOpenChange,
  onActiveSnapPointChange: _onActiveSnapPointChange,
}: QuickAccessDrawerProps) {
  const drawerTopCornerRadius = 32;
  const drawerLinkedTransition = `${DRAWER_LAYOUT_LINKED_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  const drawerBackgroundFadeTransition = `${DRAWER_SURFACE_LINKED_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  const initialRevealTransition = INITIAL_REVEAL_TIMING;
  const initialRevealTransform = resolveInitialRevealTransform(initialRevealReady);
  const normalizedOverlayOpacity = Math.max(0, Math.min(1, drawerOverlayOpacity));
  const drawerSurfaceLayerOpacity = Math.max(0, Math.min(1, drawerSurfaceOpacity * DRAWER_CONTENT_BG_MAX_OPACITY));
  const [renderShortcuts, setRenderShortcuts] = useState(modeFlags.showShortcuts);
  const [shortcutsVisible, setShortcutsVisible] = useState(modeFlags.showShortcuts);
  const [interactiveTransitionsEnabled, setInteractiveTransitionsEnabled] = useState(false);
  const shortcutsVisibilityInitializedRef = useRef(false);
  const shortcutsPaintVisible = shortcutsVisible;

  const enableInteractiveTransitions = useCallback(() => {
    setInteractiveTransitionsEnabled(true);
  }, []);

  useEffect(() => {
    if (!shortcutsVisibilityInitializedRef.current) {
      shortcutsVisibilityInitializedRef.current = true;
      setRenderShortcuts(modeFlags.showShortcuts);
      setShortcutsVisible(modeFlags.showShortcuts);
      return;
    }

    let firstFrameId = 0;
    let secondFrameId = 0;
    let timerId = 0;

    if (modeFlags.showShortcuts) {
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
  }, [modeFlags.showShortcuts]);

  return (
    <>
      <div
        className="fixed inset-0 z-[14000]"
        style={{
          backgroundColor: '#000000',
          opacity: normalizedOverlayOpacity,
          transition: interactiveTransitionsEnabled
            ? `opacity ${drawerBackgroundFadeTransition}`
            : `opacity ${initialRevealTransition}`,
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
            transform: initialRevealTransform,
            transition: `transform ${initialRevealTransition}`,
          }}
        >
          <section
            className="relative mx-auto flex min-h-0 w-full max-w-full flex-col overflow-hidden border-transparent bg-transparent shadow-none pointer-events-auto"
            style={{
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
                        `transform ${drawerLinkedTransition}`,
                        `backdrop-filter ${drawerLinkedTransition}`,
                        `-webkit-backdrop-filter ${drawerLinkedTransition}`,
                      ].join(', '))
                : 'none',
              willChange: 'transform',
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
                    {renderShortcuts && (
                      <div
                        className="relative mt-4 min-h-0 flex-1 w-full transition-[opacity,transform] ease-out"
                        style={{
                          opacity: shortcutsPaintVisible ? 1 : 0,
                          transform: shortcutsPaintVisible ? 'translate3d(0, 0, 0)' : 'translate3d(0, 8px, 0)',
                          transitionDuration: `${SHORTCUTS_FADE_DURATION_MS}ms`,
                          pointerEvents: shortcutsPaintVisible ? 'auto' : 'none',
                          visibility: shortcutsPaintVisible ? 'visible' : 'hidden',
                          contain: 'layout paint style',
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
                              engine="v2"
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
