import React from 'react';
import { type ShortcutLayoutDensity } from '@/components/shortcuts/shortcutCardVariant';
import { ShortcutIconRenderContext, type ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import {
  RootGridScene,
} from '@/features/shortcuts/components/shortcutGridSceneRenderers';
import {
  type RootShortcutExternalDragSession,
  useRootShortcutGridSceneController,
} from '@/features/shortcuts/components/shortcutGridSceneControllers';
import { resolveRootShortcutGridComponentState } from '@/features/shortcuts/components/shortcutGridComponentAdapters';
import type {
  RootShortcutGridCardRenderParams,
  RootShortcutGridDragPreviewRenderParams,
  RootShortcutGridSelectionIndicatorRenderParams,
} from '@/features/shortcuts/components/shortcutGridVisualAdapters';
import type { ResolvedPointerDragHover } from '@/features/shortcuts/drag/useResolvedPointerDragSession';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { Shortcut, ShortcutIconAppearance } from '@/types';

export type {
  RootShortcutGridCardRenderParams,
  RootShortcutGridDragPreviewRenderParams,
  RootShortcutGridSelectionIndicatorRenderParams,
} from '@/features/shortcuts/components/shortcutGridVisualAdapters';

export type { RootShortcutExternalDragSession } from '@/features/shortcuts/components/shortcutGridSceneControllers';

export interface RootShortcutGridProps {
  containerHeight: number;
  bottomInset?: number;
  shortcuts: Shortcut[];
  gridColumns: number;
  minRows: number;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (event: React.MouseEvent<HTMLDivElement>, shortcutIndex: number, shortcut: Shortcut) => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent?: (intent: RootShortcutDropIntent) => void;
  onGridContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  compactShowTitle?: boolean;
  layoutDensity?: ShortcutLayoutDensity;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  compactTitleFontSize?: number;
  forceTextWhite?: boolean;
  monochromeTone?: ShortcutMonochromeTone;
  monochromeTileBackdropBlur?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disableReorderAnimation?: boolean;
  selectionMode?: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
  externalDragSession?: RootShortcutExternalDragSession | null;
  onExternalDragSessionConsumed?: (token: number) => void;
  renderShortcutCard?: (params: RootShortcutGridCardRenderParams) => React.ReactNode;
  renderDragPreview?: (params: RootShortcutGridDragPreviewRenderParams) => React.ReactNode;
  renderSelectionIndicator?: (params: RootShortcutGridSelectionIndicatorRenderParams) => React.ReactNode;
}

export const RootShortcutGrid = React.memo(function RootShortcutGrid(props: RootShortcutGridProps) {
  const { controllerParams } = resolveRootShortcutGridComponentState(props);
  const { shortcutIconRenderContextValue, sceneProps } = useRootShortcutGridSceneController(controllerParams);

  return (
    <ShortcutIconRenderContext.Provider value={shortcutIconRenderContextValue}>
      <RootGridScene {...sceneProps} />
    </ShortcutIconRenderContext.Provider>
  );
});
