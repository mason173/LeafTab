import type { RefObject } from 'react';
import type { RootShortcutGridProps } from '@/features/shortcuts/components/RootShortcutGrid';
import type { ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import type { DisplayModeLayoutFlags } from '@/displayMode/config';
import type { Shortcut } from '@/types';

type QuickAccessModeFlags = Pick<
  DisplayModeLayoutFlags,
  'showShortcuts' | 'revealShortcutsOnDrawerExpand' | 'forceWhiteSearchTheme' | 'searchUsesBlankStyle'
>;

export interface DrawerShortcutSearchPresentationProps {
  normalizedShortcutSearchQuery: string;
  activeIndexLetter: string | null;
  availableLetters: string[];
  showAlphabetRail: boolean;
  showShortcutSearchEmptyState: boolean;
  filteredShortcutGridProps: RootShortcutGridProps;
  onLetterSelect: (letter: string) => void;
  onBlankAreaExitLetterFilter: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export interface QuickAccessDrawerProps {
  initialRevealReady: boolean;
  modeFlags: QuickAccessModeFlags;
  contentWidth: number;
  viewportWidth: number;
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
  searchHeight: number;
  drawerWheelAreaRef: RefObject<HTMLDivElement | null>;
  drawerShortcutScrollRef: RefObject<HTMLDivElement | null>;
  shortcutGridProps: RootShortcutGridProps;
  drawerShortcutSearchProps: DrawerShortcutSearchPresentationProps;
  onFolderChildShortcutContextMenu?: (
    event: React.MouseEvent<HTMLDivElement>,
    folderId: string,
    shortcut: Shortcut,
  ) => void;
}

export const SHORTCUTS_FADE_DURATION_MS = 220;
