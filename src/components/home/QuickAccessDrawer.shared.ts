import type { ComponentProps, CSSProperties, RefObject } from 'react';
import type { RootShortcutGrid } from '@/features/shortcuts/components/RootShortcutGrid';
import type { ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import type { SearchExperience } from '@/components/search/SearchExperience';
import type { DisplayModeLayoutFlags } from '@/displayMode/config';

type QuickAccessModeFlags = Pick<
  DisplayModeLayoutFlags,
  'showShortcuts' | 'forceWhiteSearchTheme' | 'searchUsesBlankStyle'
>;

export interface QuickAccessDrawerProps {
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
  drawerPanelTranslateYPx: number;
  drawerShortcutBottomInset: number;
  drawerShortcutForceWhiteText: boolean;
  drawerShortcutMonochromeTone: ShortcutMonochromeTone;
  drawerShortcutMonochromeTileBackdropBlur: boolean;
  drawerScrollLocked: boolean;
  reduceMotionVisuals?: boolean;
  drawerSearchSurfaceStyle?: CSSProperties;
  subtleDarkTone?: boolean;
  drawerWheelAreaRef: RefObject<HTMLDivElement | null>;
  drawerShortcutScrollRef: RefObject<HTMLDivElement | null>;
  searchExperienceProps: ComponentProps<typeof SearchExperience>;
  shortcutGridProps: ComponentProps<typeof RootShortcutGrid>;
  onDrawerOpenChange: () => void;
  onActiveSnapPointChange: (next: number | string | null) => void;
}

export const SHORTCUTS_FADE_DURATION_MS = 220;
