import type React from 'react';
import type { PendingDragSession } from '@/features/shortcuts/drag/dragSessionRuntime';
import type { Shortcut } from '@/types';
import type { FolderDragSessionMeta, RootDragSessionMeta } from '@/features/shortcuts/drag/types';
import type {
  FolderShortcutItemRenderParams,
  FolderShortcutDragPreviewRenderParams,
  FolderShortcutVisualOptions,
  RootGridCenterPreviewRenderParams,
  RootShortcutGridCardRenderParams,
  RootShortcutGridDragPreviewRenderParams,
  RootShortcutGridSelectionIndicatorRenderParams,
  RootShortcutVisualOptions,
} from './shortcutGridVisualAdapters';

export type RootShortcutPendingDragSession = PendingDragSession<string, RootDragSessionMeta> | null;

export type FolderShortcutPendingDragSession = PendingDragSession<string, FolderDragSessionMeta> | null;

export type RootShortcutContextMenuHandler =
  (event: React.MouseEvent<HTMLDivElement>, shortcutIndex: number, shortcut: Shortcut) => void;

export type FolderShortcutContextMenuHandler =
  ((event: React.MouseEvent<HTMLDivElement>, shortcut: Shortcut) => void) | undefined;

export type RootShortcutDragPreviewRenderer =
  (params: RootShortcutGridDragPreviewRenderParams) => React.ReactNode;

export type FolderShortcutDragPreviewRenderer =
  (params: FolderShortcutDragPreviewRenderParams) => React.ReactNode;

export type RootShortcutCenterPreviewRenderer =
  (params: RootGridCenterPreviewRenderParams) => React.ReactNode;

export type RootShortcutSelectionIndicatorRenderer =
  (params: RootShortcutGridSelectionIndicatorRenderParams) => React.ReactNode;

export type ShortcutOpenHandler = (shortcut: Shortcut) => void;

export type RootShortcutCardRenderer =
  (params: RootShortcutGridCardRenderParams) => React.ReactNode;

export type FolderShortcutCardRenderer =
  (params: FolderShortcutItemRenderParams) => React.ReactNode;

export type ShortcutActionRenderParams = {
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export type ShortcutGridFrameProps = React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;

export type ShortcutGridFrameBindings = {
  disableReorderAnimation: boolean;
  firefox: boolean;
  registerElement: (element: HTMLDivElement | null) => void;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  frameProps: ShortcutGridFrameProps;
};

export type ShortcutInteractionBindings<TPendingDragRef, TOnShortcutContextMenu> = {
  disableLayoutShiftTransition: boolean;
  firefox: boolean;
  pendingDragRef: React.MutableRefObject<TPendingDragRef>;
  itemElements: Map<string, HTMLDivElement>;
  ignoreClickRef: React.MutableRefObject<boolean>;
  onShortcutOpen: ShortcutOpenHandler;
  onShortcutContextMenu: TOnShortcutContextMenu;
};

export type ShortcutSceneInteractionParams<TPendingDragRef, TOnShortcutContextMenu> =
  ShortcutInteractionBindings<TPendingDragRef, TOnShortcutContextMenu>
  & {
    activeDragId: string | null;
  };

export type RootShortcutRenderBindings = {
  rootVisualOptions: RootShortcutVisualOptions;
  renderCenterPreview: RootShortcutCenterPreviewRenderer;
  renderSelectionIndicator: RootShortcutSelectionIndicatorRenderer;
  renderShortcutCard: RootShortcutCardRenderer;
};

export type FolderShortcutRenderBindings = {
  folderVisualOptions: FolderShortcutVisualOptions;
  renderShortcutCard: FolderShortcutCardRenderer;
};
