import type { MouseEvent as ReactMouseEvent } from 'react';
import type { FolderShortcutDropIntent } from '@leaftab/workspace-core';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import type {
  RootShortcutExternalDragSession,
  RootShortcutGridProps,
} from '@/features/shortcuts/components/RootShortcutGrid';
import type { FolderExtractDragStartPayload } from '@/features/shortcuts/components/FolderShortcutSurface';
import {
  gridEngineItemsToShortcuts,
  shortcutsToGridEngineItems,
  type LeaftabGridEngineIconItem,
  type LeaftabGridEngineItem,
} from './leaftabGridEngineBridge';

export type LeaftabGridEngineRootSurfaceProps = Pick<
  RootShortcutGridProps,
  | 'containerHeight'
  | 'bottomInset'
  | 'shortcuts'
  | 'gridColumns'
  | 'minRows'
  | 'layoutDensity'
  | 'compactIconSize'
  | 'compactTitleFontSize'
  | 'compactShowTitle'
  | 'iconCornerRadius'
  | 'iconAppearance'
  | 'disableReorderAnimation'
  | 'onShortcutOpen'
  | 'onShortcutContextMenu'
  | 'onShortcutReorder'
  | 'onShortcutDropIntent'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onGridContextMenu'
  | 'externalDragSession'
  | 'onExternalDragSessionConsumed'
>;

export type LeaftabGridEngineFolderSurfaceProps = {
  open: boolean;
  shortcut: Shortcut | null;
  rootGridColumns?: number;
  compactIconSize?: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  onOpenChange: (open: boolean) => void;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
};

export type LeaftabGridEngineCompactFolderSurfaceProps =
  LeaftabGridEngineFolderSurfaceProps & {
    onRenameFolder: (folderId: string, name: string) => void;
    onShortcutContextMenu: (
      event: ReactMouseEvent<HTMLDivElement>,
      folderId: string,
      shortcut: Shortcut,
    ) => void;
  };

export type LeaftabGridEngineHostAdapter = {
  scenarioId: string;
  shortcuts: Shortcut[];
  rootItems: LeaftabGridEngineItem[];
  commitRootItems: (items: readonly LeaftabGridEngineItem[]) => void;
  commitFolderChildren: (
    folderId: string,
    children: readonly LeaftabGridEngineIconItem[],
  ) => void;
  rootGridProps: LeaftabGridEngineRootSurfaceProps;
  folderDialogProps: LeaftabGridEngineFolderSurfaceProps;
  compactFolderOverlayProps: LeaftabGridEngineCompactFolderSurfaceProps;
};

type CreateLeaftabGridEngineHostAdapterParams = {
  scenarioId: string;
  shortcuts: Shortcut[];
  containerHeight: number;
  bottomInset?: number;
  gridColumns: number;
  minRows: number;
  layoutDensity: RootShortcutGridProps['layoutDensity'];
  compactIconSize: number;
  compactTitleFontSize: number;
  compactShowTitle: boolean;
  iconCornerRadius: number;
  iconAppearance: ShortcutIconAppearance;
  disableReorderAnimation: boolean;
  onRootShortcutOpen: (shortcut: Shortcut) => void;
  onFolderShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: (
    event: ReactMouseEvent<HTMLDivElement>,
    shortcutIndex: number,
    shortcut: Shortcut,
  ) => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent: NonNullable<RootShortcutGridProps['onShortcutDropIntent']>;
  onRootDragStart?: RootShortcutGridProps['onDragStart'];
  onRootDragEnd?: RootShortcutGridProps['onDragEnd'];
  onGridContextMenu: (event: ReactMouseEvent<HTMLDivElement>) => void;
  externalDragSession: RootShortcutExternalDragSession | null;
  onExternalDragSessionConsumed: (token: number) => void;
  openFolderShortcut: Shortcut | null;
  onFolderOpenChange: (open: boolean) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onFolderShortcutContextMenu: (
    event: ReactMouseEvent<HTMLDivElement>,
    folderId: string,
    shortcut: Shortcut,
  ) => void;
  onFolderShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onFolderExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onFolderChildrenCommit: (
    folderId: string,
    children: Shortcut[],
  ) => void;
};

export function createLeaftabGridEngineHostAdapter(
  params: CreateLeaftabGridEngineHostAdapterParams,
): LeaftabGridEngineHostAdapter {
  const rootItems = shortcutsToGridEngineItems(params.shortcuts);

  return {
    scenarioId: params.scenarioId,
    shortcuts: params.shortcuts,
    rootItems,
    commitRootItems(items) {
      params.onShortcutReorder(gridEngineItemsToShortcuts([...items]));
    },
    commitFolderChildren(folderId, children) {
      params.onFolderChildrenCommit(
        folderId,
        gridEngineItemsToShortcuts([...children]),
      );
    },
    rootGridProps: {
      containerHeight: params.containerHeight,
      bottomInset: params.bottomInset,
      shortcuts: params.shortcuts,
      gridColumns: params.gridColumns,
      minRows: params.minRows,
      layoutDensity: params.layoutDensity,
      compactIconSize: params.compactIconSize,
      compactTitleFontSize: params.compactTitleFontSize,
      compactShowTitle: params.compactShowTitle,
      iconCornerRadius: params.iconCornerRadius,
      iconAppearance: params.iconAppearance,
      disableReorderAnimation: params.disableReorderAnimation,
      onShortcutOpen: params.onRootShortcutOpen,
      onShortcutContextMenu: params.onShortcutContextMenu,
      onShortcutReorder: params.onShortcutReorder,
      onShortcutDropIntent: params.onShortcutDropIntent,
      onDragStart: params.onRootDragStart,
      onDragEnd: params.onRootDragEnd,
      onGridContextMenu: params.onGridContextMenu,
      externalDragSession: params.externalDragSession,
      onExternalDragSessionConsumed: params.onExternalDragSessionConsumed,
    },
    folderDialogProps: {
      open: Boolean(params.openFolderShortcut),
      shortcut: params.openFolderShortcut,
      rootGridColumns: params.gridColumns,
      compactIconSize: params.compactIconSize,
      iconCornerRadius: params.iconCornerRadius,
      iconAppearance: params.iconAppearance,
      onOpenChange: params.onFolderOpenChange,
      onShortcutOpen: params.onFolderShortcutOpen,
      onShortcutDropIntent: params.onFolderShortcutDropIntent,
      onExtractDragStart: params.onFolderExtractDragStart,
    },
    compactFolderOverlayProps: {
      open: Boolean(params.openFolderShortcut),
      shortcut: params.openFolderShortcut,
      rootGridColumns: params.gridColumns,
      compactIconSize: params.compactIconSize,
      iconCornerRadius: params.iconCornerRadius,
      iconAppearance: params.iconAppearance,
      onOpenChange: params.onFolderOpenChange,
      onRenameFolder: params.onRenameFolder,
      onShortcutOpen: params.onFolderShortcutOpen,
      onShortcutContextMenu: params.onFolderShortcutContextMenu,
      onShortcutDropIntent: params.onFolderShortcutDropIntent,
      onExtractDragStart: params.onFolderExtractDragStart,
    },
  };
}
