import React from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import type { ShortcutLayoutDensity } from '@/components/shortcuts/shortcutCardVariant';
import type { ShortcutMonochromeTone } from '@/components/ShortcutIconRenderContext';
import type {
  RootShortcutDropIntent,
  ShortcutExternalDragSessionSeed,
} from '@/features/shortcuts/drag/types';
import {
  useShortcutGridFirefoxBuildTarget,
  useShortcutGridSceneRefs,
  useObservedRootGridWidth,
  useShortcutIconRenderContextValue,
} from './shortcutGridControllerAdapters';
import { useRootShortcutGridResolvedSceneProps } from './shortcutGridSceneControllerOrchestrationAdapters';
import type {
  RootShortcutGridCardRenderParams,
  RootShortcutGridDragPreviewRenderParams,
  RootShortcutGridSelectionIndicatorRenderParams,
} from './shortcutGridVisualAdapters';

export type RootShortcutExternalDragSession = ShortcutExternalDragSessionSeed & {
  token: number;
};

export type RootShortcutGridSceneControllerParams = {
  containerHeight: number;
  bottomInset: number;
  shortcuts: Shortcut[];
  gridColumns: number;
  minRows: number;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (event: React.MouseEvent<HTMLDivElement>, shortcutIndex: number, shortcut: Shortcut) => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent?: (intent: RootShortcutDropIntent) => void;
  onGridContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  compactShowTitle: boolean;
  layoutDensity: ShortcutLayoutDensity;
  compactIconSize: number;
  iconCornerRadius: number;
  iconAppearance: ShortcutIconAppearance;
  compactTitleFontSize: number;
  forceTextWhite: boolean;
  monochromeTone: ShortcutMonochromeTone;
  monochromeTileBackdropBlur: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disableReorderAnimation: boolean;
  selectionMode: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
  externalDragSession?: RootShortcutExternalDragSession | null;
  onExternalDragSessionConsumed?: (token: number) => void;
  renderShortcutCard: (params: RootShortcutGridCardRenderParams) => React.ReactNode;
  renderDragPreview: (params: RootShortcutGridDragPreviewRenderParams) => React.ReactNode;
  renderSelectionIndicator: (params: RootShortcutGridSelectionIndicatorRenderParams) => React.ReactNode;
};

export function useRootShortcutGridSceneController(params: RootShortcutGridSceneControllerParams) {
  const firefox = useShortcutGridFirefoxBuildTarget();
  const { wrapperRef, rootRef } = useShortcutGridSceneRefs();
  const gridWidthPx = useObservedRootGridWidth(wrapperRef);

  const shortcutIconRenderContextValue = useShortcutIconRenderContextValue({
    monochromeTone: params.monochromeTone,
    monochromeTileBackdropBlur: params.monochromeTileBackdropBlur,
  });

  const sceneProps = useRootShortcutGridResolvedSceneProps({
    refs: { wrapperRef, rootRef },
    controllerParams: params,
    firefox,
    gridWidthPx,
  });

  return {
    shortcutIconRenderContextValue,
    sceneProps,
  };
}
