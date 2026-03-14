import type { ComponentProps, CSSProperties, RefObject } from 'react';
import { SearchBar } from '@/components/SearchBar';
import { ShortcutGrid } from '@/components/ShortcutGrid';
import { GradualBlur } from '@/components/react-bits';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { DisplayModeLayoutFlags } from '@/displayMode/config';
import {
  DRAWER_CONTENT_BG_MAX_OPACITY,
  QUICK_ACCESS_DEFAULT_SNAP_POINT,
  QUICK_ACCESS_FULL_SNAP_POINT,
} from './quickAccessDrawer.constants';

type QuickAccessModeFlags = Pick<
  DisplayModeLayoutFlags,
  'showShortcuts' | 'forceWhiteSearchTheme' | 'searchUsesBlankStyle'
>;

interface QuickAccessDrawerProps {
  modeFlags: QuickAccessModeFlags;
  contentWidth: number;
  quickAccessOpen: boolean;
  quickAccessSnapPoint: number | string | null;
  isDrawerExpanded: boolean;
  drawerOverlayOpacity: number;
  drawerSurfaceOpacity: number;
  drawerBottomBounceOffsetPx: number;
  drawerContentTopPaddingPx: number;
  drawerContentBackdropBlurPx: number;
  drawerPanelHeightVh: number;
  drawerShortcutFadeHeight: number;
  drawerShortcutBottomInset: number;
  drawerShortcutForceWhiteText: boolean;
  drawerScrollLocked: boolean;
  drawerSearchSurfaceStyle?: CSSProperties;
  subtleDarkTone?: boolean;
  drawerWheelAreaRef: RefObject<HTMLDivElement | null>;
  drawerShortcutScrollRef: RefObject<HTMLDivElement | null>;
  searchBarProps: ComponentProps<typeof SearchBar>;
  shortcutGridProps: ComponentProps<typeof ShortcutGrid>;
  onDrawerOpenChange: () => void;
  onActiveSnapPointChange: (next: number | string | null) => void;
}

export function QuickAccessDrawer({
  modeFlags,
  contentWidth,
  quickAccessOpen,
  quickAccessSnapPoint,
  isDrawerExpanded,
  drawerOverlayOpacity,
  drawerSurfaceOpacity,
  drawerBottomBounceOffsetPx,
  drawerContentTopPaddingPx,
  drawerContentBackdropBlurPx,
  drawerPanelHeightVh,
  drawerShortcutFadeHeight,
  drawerShortcutBottomInset,
  drawerShortcutForceWhiteText,
  drawerScrollLocked,
  drawerSearchSurfaceStyle,
  subtleDarkTone,
  drawerWheelAreaRef,
  drawerShortcutScrollRef,
  searchBarProps,
  shortcutGridProps,
  onDrawerOpenChange,
  onActiveSnapPointChange,
}: QuickAccessDrawerProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-[14000]"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${drawerOverlayOpacity.toFixed(3)})`,
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

      <Drawer
        open={quickAccessOpen}
        onOpenChange={onDrawerOpenChange}
        shouldScaleBackground={false}
        modal={false}
        dismissible={false}
        handleOnly
        snapPoints={[QUICK_ACCESS_DEFAULT_SNAP_POINT, QUICK_ACCESS_FULL_SNAP_POINT]}
        activeSnapPoint={quickAccessSnapPoint}
        setActiveSnapPoint={onActiveSnapPointChange}
      >
        <DrawerContent
          className="z-[14010] bg-transparent border-transparent shadow-none data-[vaul-drawer-direction=bottom]:rounded-t-[32px]"
          overlayClassName="bg-transparent"
          overlayStyle={{
            opacity: 1,
            backgroundColor: 'transparent',
            pointerEvents: 'none',
          }}
          style={{
            backgroundColor: `color-mix(in srgb, var(--background) ${Math.round(drawerSurfaceOpacity * DRAWER_CONTENT_BG_MAX_OPACITY * 100)}%, transparent)`,
            backdropFilter: `blur(${drawerContentBackdropBlurPx.toFixed(1)}px)`,
            WebkitBackdropFilter: `blur(${drawerContentBackdropBlurPx.toFixed(1)}px)`,
            height: `${drawerPanelHeightVh}vh`,
            maxHeight: `${drawerPanelHeightVh}vh`,
          }}
          showHandle={false}
        >
          <DrawerTitle className="sr-only">Quick Access Drawer</DrawerTitle>
          <DrawerDescription className="sr-only">Search and shortcut list panel.</DrawerDescription>
          {quickAccessOpen && (
            <div
              ref={drawerWheelAreaRef}
              className="flex min-h-0 flex-1 px-4"
              style={{
                paddingTop: `${drawerContentTopPaddingPx}px`,
              }}
              onWheelCapture={(event) => {
                if (!drawerScrollLocked) return;
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
                  <SearchBar
                    {...searchBarProps}
                    blankMode={modeFlags.searchUsesBlankStyle}
                    forceWhiteTheme={modeFlags.forceWhiteSearchTheme}
                    subtleDarkTone={subtleDarkTone}
                    onSubmit={searchBarProps.onSubmit}
                    onSuggestionSelect={searchBarProps.onSuggestionSelect}
                    searchSurfaceStyle={drawerSearchSurfaceStyle}
                  />
                </div>
                {modeFlags.showShortcuts && (
                  <div className="relative mt-4 min-h-0 flex-1 w-full">
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
        </DrawerContent>
      </Drawer>

      {quickAccessOpen && modeFlags.showShortcuts && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[14015]"
          style={{ height: drawerShortcutFadeHeight }}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/0 to-black/10" />
          <GradualBlur
            direction="bottom"
            layers={5}
            blurStrength={2}
            exponential
            curve="bezier"
            className="absolute inset-0"
          />
        </div>
      )}
    </>
  );
}
