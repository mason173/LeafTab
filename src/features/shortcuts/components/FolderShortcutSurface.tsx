import React from 'react';
import { ShortcutIconRenderContext } from '@/components/ShortcutIconRenderContext';
import {
  FolderGridScene,
} from '@/features/shortcuts/components/shortcutGridSceneRenderers';
import {
  useFolderShortcutSurfaceSceneController,
} from '@/features/shortcuts/components/shortcutGridSceneControllers';
import { resolveFolderShortcutSurfaceComponentState } from '@/features/shortcuts/components/shortcutGridComponentAdapters';
import type {
  FolderShortcutDragPreviewRenderParams,
  FolderShortcutItemRenderParams,
} from '@/features/shortcuts/components/shortcutGridVisualAdapters';
import type { ResolvedPointerDragHover } from '@/features/shortcuts/drag/useResolvedPointerDragSession';
import type {
  FolderExtractDragStartPayload,
  FolderShortcutDropIntent,
} from '@/features/shortcuts/drag/types';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import { renderLeaftabFolderEmptyState } from './leaftabGridVisuals';

export type { FolderExtractDragStartPayload } from '@/features/shortcuts/drag/types';

export type FolderShortcutSurfaceProps = {
  folderId: string;
  shortcuts: Shortcut[];
  emptyText: string;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite?: boolean;
  showShortcutTitles?: boolean;
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (event: React.MouseEvent<HTMLDivElement>, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onDragActiveChange?: (active: boolean) => void;
  renderShortcutCard?: (params: FolderShortcutItemRenderParams) => React.ReactNode;
  renderDragPreview?: (params: FolderShortcutDragPreviewRenderParams) => React.ReactNode;
};

export function FolderShortcutSurface(props: FolderShortcutSurfaceProps) {
  const {
    controllerParams,
    emptyText,
    hasShortcuts,
  } = resolveFolderShortcutSurfaceComponentState(props);
  const { shortcutIconRenderContextValue, sceneProps } = useFolderShortcutSurfaceSceneController(controllerParams);

  if (!hasShortcuts) {
    return renderLeaftabFolderEmptyState(emptyText);
  }

  return (
    <ShortcutIconRenderContext.Provider value={shortcutIconRenderContextValue}>
      <FolderGridScene {...sceneProps} />
    </ShortcutIconRenderContext.Provider>
  );
}
