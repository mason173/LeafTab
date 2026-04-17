import React from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import type {
  FolderExtractDragStartPayload,
  FolderShortcutDropIntent,
} from '@/features/shortcuts/drag/types';
import {
  useShortcutGridFirefoxBuildTarget,
  useShortcutGridSceneRefs,
  useObservedFolderGridColumns,
  useShortcutIconRenderContextValue,
} from './shortcutGridControllerAdapters';
import { useFolderShortcutSurfaceResolvedSceneProps } from './shortcutGridSceneControllerOrchestrationAdapters';
import type {
  FolderShortcutDragPreviewRenderParams,
  FolderShortcutItemRenderParams,
} from './shortcutGridVisualAdapters';

export type FolderShortcutSurfaceSceneControllerParams = {
  folderId: string;
  shortcuts: Shortcut[];
  compactIconSize: number;
  iconCornerRadius: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite: boolean;
  showShortcutTitles: boolean;
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (event: React.MouseEvent<HTMLDivElement>, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onDragActiveChange?: (active: boolean) => void;
  renderShortcutCard: (params: FolderShortcutItemRenderParams) => React.ReactNode;
  renderDragPreview: (params: FolderShortcutDragPreviewRenderParams) => React.ReactNode;
};

export function useFolderShortcutSurfaceSceneController(params: FolderShortcutSurfaceSceneControllerParams) {
  const firefox = useShortcutGridFirefoxBuildTarget();
  const { wrapperRef, rootRef } = useShortcutGridSceneRefs();
  const columns = useObservedFolderGridColumns(wrapperRef);

  const shortcutIconRenderContextValue = useShortcutIconRenderContextValue({
    monochromeTone: 'theme-adaptive',
    monochromeTileBackdropBlur: false,
  });

  const sceneProps = useFolderShortcutSurfaceResolvedSceneProps({
    refs: { wrapperRef, rootRef },
    controllerParams: params,
    firefox,
    columns,
  });

  return {
    shortcutIconRenderContextValue,
    sceneProps,
  };
}
