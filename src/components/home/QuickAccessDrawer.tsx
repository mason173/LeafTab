import { useCallback, useEffect, useRef, useState, type ComponentProps, type CSSProperties, type RefObject } from 'react';
import { ShortcutGrid } from '@/components/ShortcutGrid';
import type { DisplayModeLayoutFlags } from '@/displayMode/config';
import { SearchExperience } from '@/components/search/SearchExperience';
import {
  INITIAL_REVEAL_TIMING,
  resolveInitialRevealOpacity,
  resolveInitialRevealTransform,
} from '@/config/animationTokens';
import {
  DRAWER_CONTENT_BG_MAX_OPACITY,
  DRAWER_LAYOUT_LINKED_ANIMATION_MS,
  DRAWER_SURFACE_LINKED_ANIMATION_MS,
} from './quickAccessDrawer.constants';

type QuickAccessModeFlags = Pick<
  DisplayModeLayoutFlags,
  'showShortcuts' | 'forceWhiteSearchTheme' | 'searchUsesBlankStyle'
>;

interface QuickAccessDrawerProps {
  initialRevealReady: boolean;
  modeFlags: QuickAccessModeFlags;
  contentWidth: number;
  quickAccessOpen: boolean;
  quickAccessSnapPoint: number | string | null;
  quickAccessDefaultSnapPoint: number;
  quickAccessFullSnapPoint: number;
  isDrawerExpanded: boolean;
  drawerOverlayOpacity: number;
  drawerSurfaceOpacity: number;
  drawerLayoutProgress: number;
  drawerBottomBounceOffsetPx: number;
  drawerContentTopPaddingPx: number;
  drawerContentBackdropBlurPx: number;
  drawerPanelHeightVh: number;
  drawerShortcutBottomInset: number;
  drawerShortcutForceWhiteText: boolean;
  drawerScrollLocked: boolean;
  drawerSearchSurfaceStyle?: CSSProperties;
  subtleDarkTone?: boolean;
  drawerWheelAreaRef: RefObject<HTMLDivElement | null>;
  drawerShortcutScrollRef: RefObject<HTMLDivElement | null>;
  searchExperienceProps: ComponentProps<typeof SearchExperience>;
  shortcutGridProps: ComponentProps<typeof ShortcutGrid>;
  onDrawerOpenChange: () => void;
  onActiveSnapPointChange: (next: number | string | null) => void;
}

const SHORTCUTS_FADE_DURATION_MS = 220;

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
  drawerShortcutBottomInset,
  drawerShortcutForceWhiteText,
  drawerScrollLocked,
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
  const initialRevealOpacity = resolveInitialRevealOpacity(initialRevealReady);
  const normalizedOverlayOpacity = Math.max(0, Math.min(1, drawerOverlayOpacity));
  const drawerSurfaceLayerOpacity = Math.max(0, Math.min(1, drawerSurfaceOpacity * DRAWER_CONTENT_BG_MAX_OPACITY));
  const [renderShortcuts, setRenderShortcuts] = useState(modeFlags.showShortcuts);
  const [shortcutsVisible, setShortcutsVisible] = useState(modeFlags.showShortcuts);
  const [interactiveTransitionsEnabled, setInteractiveTransitionsEnabled] = useState(false);
  const shortcutsVisibilityInitializedRef = useRef(false);

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
          opacity: normalizedOverlayOpacity * initialRevealOpacity,
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
        <section
          className="relative mx-auto flex min-h-0 w-full max-w-full flex-col overflow-hidden border-transparent bg-transparent shadow-none pointer-events-auto"
          style={{
            backdropFilter: `blur(${drawerContentBackdropBlurPx.toFixed(1)}px)`,
            WebkitBackdropFilter: `blur(${drawerContentBackdropBlurPx.toFixed(1)}px)`,
            height: `${drawerPanelHeightVh}vh`,
            maxHeight: `${drawerPanelHeightVh}vh`,
            opacity: initialRevealOpacity,
            transform: initialRevealTransform,
            borderTopLeftRadius: `${drawerTopCornerRadius.toFixed(2)}px`,
            borderTopRightRadius: `${drawerTopCornerRadius.toFixed(2)}px`,
            transition: interactiveTransitionsEnabled
              ? [
                  `opacity ${initialRevealTransition}`,
                  `transform ${initialRevealTransition}`,
                  `height ${drawerLinkedTransition}`,
                  `max-height ${drawerLinkedTransition}`,
                  `backdrop-filter ${drawerLinkedTransition}`,
                  `-webkit-backdrop-filter ${drawerLinkedTransition}`,
                ].join(', ')
              : `opacity ${initialRevealTransition}, transform ${initialRevealTransition}`,
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
                      className="relative mt-4 min-h-0 flex-1 w-full transition-opacity ease-out"
                      style={{
                        opacity: shortcutsVisible ? 1 : 0,
                        transitionDuration: `${SHORTCUTS_FADE_DURATION_MS}ms`,
                        pointerEvents: shortcutsVisible ? 'auto' : 'none',
                      }}
                      aria-hidden={!shortcutsVisible}
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
                          <ShortcutGrid
                            {...shortcutGridProps}
                            bottomInset={drawerShortcutBottomInset}
                            forceTextWhite={drawerShortcutForceWhiteText}
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

    </>
  );
}
