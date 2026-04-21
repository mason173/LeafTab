import type { CSSProperties, RefObject } from 'react';
import type { RootShortcutGridProps } from '@/features/shortcuts/components/RootShortcutGrid';
import type { ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import type { SearchExperienceProps } from '@/components/search/SearchExperience';
import type { DisplayModeLayoutFlags } from '@/displayMode/config';

type QuickAccessModeFlags = Pick<
  DisplayModeLayoutFlags,
  'showShortcuts' | 'revealShortcutsOnDrawerExpand' | 'forceWhiteSearchTheme' | 'searchUsesBlankStyle'
>;

export interface QuickAccessDrawerProps {
  initialRevealReady: boolean;
  modeFlags: QuickAccessModeFlags;
  contentWidth: number;
  quickAccessOpen: boolean;
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
  drawerExpandHintVisible?: boolean;
  drawerSearchSurfaceStyle?: CSSProperties;
  subtleDarkTone?: boolean;
  drawerWheelAreaRef: RefObject<HTMLDivElement | null>;
  drawerShortcutScrollRef: RefObject<HTMLDivElement | null>;
  searchExperienceProps: SearchExperienceProps;
  shortcutGridProps: RootShortcutGridProps;
}

export const SHORTCUTS_FADE_DURATION_MS = 220;
