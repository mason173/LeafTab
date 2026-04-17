import React from 'react';
import type { Shortcut } from '@/types';
import type {
  FolderShortcutDragPreviewRenderer,
  RootShortcutCenterPreviewRenderer,
  RootShortcutDragPreviewRenderer,
  RootShortcutSelectionIndicatorRenderer,
} from './shortcutGridSceneSharedTypes';
import {
  buildFolderShortcutDragPreviewRenderParams,
  buildRootGridCenterPreviewRenderParams,
  buildRootShortcutDragPreviewRenderParams,
  buildRootShortcutSelectionIndicatorRenderParams,
  type FolderShortcutVisualOptions,
  type RootShortcutVisualOptions,
} from './shortcutGridVisualAdapters';
import { renderShortcutSelectionOverlay } from './shortcutGridNodeAdapters';

type RootDragPreviewItem = { shortcut: Shortcut };

type FolderDragPreviewItem = Shortcut | { shortcut: Shortcut };

function createDragPreviewRenderer<TItem, TRenderParams>(params: {
  buildRenderParams: (item: TItem) => TRenderParams;
  renderPreview: (params: TRenderParams) => React.ReactNode;
}) {
  return (item: TItem) => params.renderPreview(params.buildRenderParams(item));
}

function buildRootDragPreviewRenderParams(params: {
  item: RootDragPreviewItem;
  firefox: boolean;
  visualOptions: RootShortcutVisualOptions;
}) {
  return buildRootShortcutDragPreviewRenderParams({
    shortcut: params.item.shortcut,
    visualOptions: params.visualOptions,
    firefox: params.firefox,
  });
}

function buildFolderDragPreviewRenderParams(params: {
  item: FolderDragPreviewItem;
  visualOptions: FolderShortcutVisualOptions;
}) {
  return buildFolderShortcutDragPreviewRenderParams({
    shortcut: 'shortcut' in params.item ? params.item.shortcut : params.item,
    visualOptions: params.visualOptions,
  });
}

function renderConditionalNode<TParams>(params: {
  active: boolean;
  buildRenderParams: () => TParams;
  renderNode: (params: TParams) => React.ReactNode;
  wrapNode?: (node: React.ReactNode) => React.ReactNode;
}) {
  if (!params.active) {
    return null;
  }

  const node = params.renderNode(params.buildRenderParams());
  return params.wrapNode ? params.wrapNode(node) : node;
}

export function renderRootGridCenterPreviewNode(params: {
  active: boolean;
  shortcut: Shortcut;
  visualOptions: RootShortcutVisualOptions;
  renderCenterPreview: RootShortcutCenterPreviewRenderer;
}) {
  return renderConditionalNode({
    active: params.active,
    buildRenderParams: () => buildRootGridCenterPreviewRenderParams({
      shortcut: params.shortcut,
      visualOptions: params.visualOptions,
    }),
    renderNode: params.renderCenterPreview,
  });
}

export function renderRootSelectionOverlayNode(params: {
  visible: boolean;
  sortId: string;
  selected: boolean;
  compactPreviewSize: number;
  renderSelectionIndicator: RootShortcutSelectionIndicatorRenderer;
}) {
  return renderConditionalNode({
    active: params.visible,
    buildRenderParams: () => buildRootShortcutSelectionIndicatorRenderParams({
      sortId: params.sortId,
      selected: params.selected,
      compactPreviewSize: params.compactPreviewSize,
    }),
    renderNode: params.renderSelectionIndicator,
    wrapNode: renderShortcutSelectionOverlay,
  });
}

export function createRootDragPreviewRenderer(params: {
  firefox: boolean;
  visualOptions: RootShortcutVisualOptions;
  renderDragPreview: RootShortcutDragPreviewRenderer;
}) {
  return createDragPreviewRenderer({
    buildRenderParams: (item: RootDragPreviewItem) => buildRootDragPreviewRenderParams({
      item,
      firefox: params.firefox,
      visualOptions: params.visualOptions,
    }),
    renderPreview: params.renderDragPreview,
  });
}

export function createFolderDragPreviewRenderer(params: {
  visualOptions: FolderShortcutVisualOptions;
  renderDragPreview: FolderShortcutDragPreviewRenderer;
}) {
  return createDragPreviewRenderer({
    buildRenderParams: (item: FolderDragPreviewItem) => buildFolderDragPreviewRenderParams({
      item,
      visualOptions: params.visualOptions,
    }),
    renderPreview: params.renderDragPreview,
  });
}
