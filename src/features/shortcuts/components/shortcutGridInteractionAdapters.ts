import type React from 'react';
import {
  createPendingDragSessionFromElement,
  registerDragElement,
} from '@/features/shortcuts/drag/dragDomAdapters';
import type { PendingDragSession } from '@/features/shortcuts/drag/dragSessionRuntime';
import type { Shortcut } from '@/types';
import type {
  FolderShortcutContextMenuHandler,
  FolderShortcutPendingDragSession,
  RootShortcutContextMenuHandler,
  RootShortcutPendingDragSession,
  ShortcutActionRenderParams,
  ShortcutGridFrameBindings,
  ShortcutGridFrameProps,
  ShortcutOpenHandler,
} from './shortcutGridSceneSharedTypes';

function createShortcutActionHandler(params: {
  ignoreClickRef: React.MutableRefObject<boolean>;
  action: () => void;
}) {
  return () => {
    if (consumeIgnoredClick(params.ignoreClickRef)) {
      return;
    }

    params.action();
  };
}

function createShortcutContextMenuHandler<TArgs extends unknown[]>(params: {
  ignoreClickRef?: React.MutableRefObject<boolean>;
  args: TArgs;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>, ...args: TArgs) => void;
}) {
  return (event: React.MouseEvent<HTMLDivElement>) => {
    if (params.ignoreClickRef && consumeIgnoredClick(params.ignoreClickRef)) {
      return;
    }

    params.onContextMenu?.(event, ...params.args);
  };
}

function buildGridFrameProps(params: {
  shortcutId: string;
  shortcutIdAttribute: string;
  className?: string;
  dragItem?: boolean;
  fillSize?: boolean;
}): ShortcutGridFrameProps {
  return {
    ...(params.className ? { className: params.className } : {}),
    ...(params.dragItem ? { 'data-shortcut-drag-item': true } : {}),
    [params.shortcutIdAttribute]: params.shortcutId,
    ...(params.fillSize ? {
      style: {
        width: '100%',
        height: '100%',
      },
    } : {}),
  };
}

function consumeIgnoredClick(ignoreClickRef: React.MutableRefObject<boolean>) {
  if (!ignoreClickRef.current) {
    return false;
  }

  ignoreClickRef.current = false;
  return true;
}

export function createGridDragElementRegistrar(
  registry: Map<string, HTMLDivElement>,
  itemId: string,
) {
  return (element: HTMLDivElement | null) => {
    registerDragElement(registry, itemId, element);
  };
}

export function buildRootGridFrameProps(shortcutId: string): ShortcutGridFrameProps {
  return buildGridFrameProps({
    shortcutId,
    shortcutIdAttribute: 'data-shortcut-id',
    className: 'z-10',
    dragItem: true,
    fillSize: true,
  });
}

export function buildFolderGridFrameProps(shortcutId: string): ShortcutGridFrameProps {
  return buildGridFrameProps({
    shortcutId,
    shortcutIdAttribute: 'data-folder-shortcut-id',
  });
}

function buildSharedGridDragFrameBindings(params: {
  disableReorderAnimation: boolean;
  firefox: boolean;
  itemElements: Map<string, HTMLDivElement>;
  registerId: string;
  onPointerDown: React.PointerEventHandler<HTMLDivElement>;
  frameProps: ShortcutGridFrameProps;
}): ShortcutGridFrameBindings {
  return {
    disableReorderAnimation: params.disableReorderAnimation,
    firefox: params.firefox,
    registerElement: createGridDragElementRegistrar(params.itemElements, params.registerId),
    onPointerDown: params.onPointerDown,
    frameProps: params.frameProps,
  };
}

function createPointerDownHandler<TMeta>(params: {
  pendingDragRef: React.MutableRefObject<PendingDragSession<string, TMeta> | null>;
  activeId: string;
  canStart?: (event: React.PointerEvent<HTMLDivElement>) => boolean;
  buildMeta?: () => TMeta;
}): React.PointerEventHandler<HTMLDivElement> {
  return (event) => {
    if (params.canStart && !params.canStart(event)) {
      return;
    }

    params.pendingDragRef.current = createPendingDragSessionFromElement({
      element: event.currentTarget,
      activeId: params.activeId,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      pointer: { x: event.clientX, y: event.clientY },
      ...(params.buildMeta ? { meta: params.buildMeta() } : {}),
    });
  };
}

export function createRootGridPointerDownHandler(params: {
  pendingDragRef: React.MutableRefObject<RootShortcutPendingDragSession>;
  activeId: string;
}): React.PointerEventHandler<HTMLDivElement> {
  return createPointerDownHandler({
    pendingDragRef: params.pendingDragRef,
    activeId: params.activeId,
    canStart: (event) => event.button === 0,
  });
}

export function createFolderGridPointerDownHandler(params: {
  pendingDragRef: React.MutableRefObject<FolderShortcutPendingDragSession>;
  activeId: string;
  activeShortcutIndex: number;
}): React.PointerEventHandler<HTMLDivElement> {
  return createPointerDownHandler({
    pendingDragRef: params.pendingDragRef,
    activeId: params.activeId,
    canStart: (event) => event.button === 0 && event.isPrimary,
    buildMeta: () => ({
      activeShortcutIndex: params.activeShortcutIndex,
    }),
  });
}

export function buildRootGridDragFrameBindings(params: {
  disableReorderAnimation: boolean;
  firefox: boolean;
  itemElements: Map<string, HTMLDivElement>;
  pendingDragRef: React.MutableRefObject<RootShortcutPendingDragSession>;
  registerId: string;
  activeId: string;
  shortcutId: string;
}): ShortcutGridFrameBindings {
  return buildSharedGridDragFrameBindings({
    disableReorderAnimation: params.disableReorderAnimation,
    firefox: params.firefox,
    itemElements: params.itemElements,
    registerId: params.registerId,
    onPointerDown: createRootGridPointerDownHandler({
      pendingDragRef: params.pendingDragRef,
      activeId: params.activeId,
    }),
    frameProps: buildRootGridFrameProps(params.shortcutId),
  });
}

export function buildFolderGridDragFrameBindings(params: {
  disableReorderAnimation: boolean;
  firefox: boolean;
  itemElements: Map<string, HTMLDivElement>;
  pendingDragRef: React.MutableRefObject<FolderShortcutPendingDragSession>;
  registerId: string;
  activeId: string;
  activeShortcutIndex: number;
  shortcutId: string;
}): ShortcutGridFrameBindings {
  return buildSharedGridDragFrameBindings({
    disableReorderAnimation: params.disableReorderAnimation,
    firefox: params.firefox,
    itemElements: params.itemElements,
    registerId: params.registerId,
    onPointerDown: createFolderGridPointerDownHandler({
      pendingDragRef: params.pendingDragRef,
      activeId: params.activeId,
      activeShortcutIndex: params.activeShortcutIndex,
    }),
    frameProps: buildFolderGridFrameProps(params.shortcutId),
  });
}

export function createRootShortcutOpenHandler(params: {
  ignoreClickRef: React.MutableRefObject<boolean>;
  selectionMode: boolean;
  shortcut: Shortcut;
  shortcutIndex: number;
  onShortcutOpen: ShortcutOpenHandler;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
}) {
  return createShortcutActionHandler({
    ignoreClickRef: params.ignoreClickRef,
    action: () => {
      if (params.selectionMode) {
        if (params.shortcut.kind === 'folder') {
          return;
        }
        params.onToggleShortcutSelection?.(params.shortcutIndex);
        return;
      }

      params.onShortcutOpen(params.shortcut);
    },
  });
}

export function createRootShortcutContextMenuHandler(params: {
  shortcut: Shortcut;
  shortcutIndex: number;
  onShortcutContextMenu: RootShortcutContextMenuHandler;
}) {
  return createShortcutContextMenuHandler({
    args: [params.shortcutIndex, params.shortcut] as const,
    onContextMenu: params.onShortcutContextMenu,
  });
}

export function createFolderShortcutOpenHandler(params: {
  ignoreClickRef: React.MutableRefObject<boolean>;
  shortcut: Shortcut;
  onShortcutOpen: ShortcutOpenHandler;
}) {
  return createShortcutActionHandler({
    ignoreClickRef: params.ignoreClickRef,
    action: () => {
      params.onShortcutOpen(params.shortcut);
    },
  });
}

export function createFolderShortcutContextMenuHandler(params: {
  ignoreClickRef: React.MutableRefObject<boolean>;
  shortcut: Shortcut;
  onShortcutContextMenu?: FolderShortcutContextMenuHandler;
}) {
  return createShortcutContextMenuHandler({
    ignoreClickRef: params.ignoreClickRef,
    args: [params.shortcut] as const,
    onContextMenu: params.onShortcutContextMenu,
  });
}

export function buildRootShortcutCardActionRenderParams(params: {
  ignoreClickRef: React.MutableRefObject<boolean>;
  selectionMode: boolean;
  shortcut: Shortcut;
  shortcutIndex: number;
  onShortcutOpen: ShortcutOpenHandler;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
  onShortcutContextMenu: RootShortcutContextMenuHandler;
}): ShortcutActionRenderParams {
  const onContextMenu = createRootShortcutContextMenuHandler({
    shortcut: params.shortcut,
    shortcutIndex: params.shortcutIndex,
    onShortcutContextMenu: params.onShortcutContextMenu,
  });

  return {
    onOpen: createRootShortcutOpenHandler({
      ignoreClickRef: params.ignoreClickRef,
      selectionMode: params.selectionMode,
      shortcut: params.shortcut,
      shortcutIndex: params.shortcutIndex,
      onShortcutOpen: params.onShortcutOpen,
      onToggleShortcutSelection: params.onToggleShortcutSelection,
    }),
    onContextMenu,
  };
}

export function buildFolderShortcutCardActionRenderParams(params: {
  ignoreClickRef: React.MutableRefObject<boolean>;
  shortcut: Shortcut;
  onShortcutOpen: ShortcutOpenHandler;
  onShortcutContextMenu?: FolderShortcutContextMenuHandler;
}): ShortcutActionRenderParams {
  return {
    onOpen: createFolderShortcutOpenHandler({
      ignoreClickRef: params.ignoreClickRef,
      shortcut: params.shortcut,
      onShortcutOpen: params.onShortcutOpen,
    }),
    onContextMenu: createFolderShortcutContextMenuHandler({
      ignoreClickRef: params.ignoreClickRef,
      shortcut: params.shortcut,
      onShortcutContextMenu: params.onShortcutContextMenu,
    }),
  };
}
