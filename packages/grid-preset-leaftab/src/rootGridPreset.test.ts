import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@leaftab/workspace-core';
import {
  createLeaftabRootDropResolvers,
  resolveLeaftabRootItemLayout,
} from './layout';
import { createLeaftabRootGridPreset } from './rootGridPreset';

const linkShortcut: Shortcut = {
  id: 'github',
  title: 'GitHub',
  url: 'https://github.com',
  icon: 'GH',
  iconRendering: 'letter',
};

const largeFolderShortcut: Shortcut = {
  id: 'folder-launch',
  title: 'Launch Pad',
  url: '',
  icon: 'LP',
  kind: 'folder',
  folderDisplayMode: 'large',
  children: [linkShortcut],
};

const rootRect = {
  left: 100,
  top: 40,
} as DOMRect;

function makePreset() {
  return createLeaftabRootGridPreset({
    getRootRect: () => rootRect,
    gridWidthPx: 324,
    gridColumns: 4,
    rowHeight: 96,
    rowGap: 20,
    columnGap: 12,
    largeFolderPreviewSize: 188,
    dropPreviewBorderRadius: '28px',
  });
}

describe('createLeaftabRootGridPreset', () => {
  it('delegates root item layout resolution to the LeafTab layout helper', () => {
    const preset = makePreset();

    expect(preset.resolveItemLayout(largeFolderShortcut)).toEqual(
      resolveLeaftabRootItemLayout({
        shortcut: largeFolderShortcut,
        columnGap: 12,
        largeFolderPreviewSize: 188,
        largeFolderEnabled: true,
      }),
    );
  });

  it('delegates compact target-region helpers through the shared drop resolvers', () => {
    const preset = makePreset();
    const directResolvers = createLeaftabRootDropResolvers({
      getRootRect: () => rootRect,
      gridWidthPx: 324,
      gridColumns: 4,
      rowHeight: 96,
      rowGap: 20,
      columnGap: 12,
      largeFolderPreviewSize: 188,
    });
    const params = {
      shortcut: linkShortcut,
      shortcutIndex: 0,
      sortId: '0:github',
      rect: {
        left: 0,
        top: 0,
        right: 72,
        bottom: 96,
        width: 72,
        height: 96,
      } as DOMRect,
      layout: {
        width: 72,
        height: 96,
        previewWidth: 72,
        previewHeight: 72,
        previewOffsetX: 0,
        previewOffsetY: 0,
        previewBorderRadius: '22%',
        previewRect: {
          left: 0,
          top: 0,
          width: 72,
          height: 72,
          borderRadius: '22%',
        },
        columnSpan: 1,
        rowSpan: 1,
        preserveSlot: false,
      },
      columnStart: 2,
      rowStart: 2,
      columnSpan: 1,
      rowSpan: 1,
    };

    expect(preset.resolveCompactTargetRegions(params)).toEqual(
      directResolvers.resolveCompactTargetRegions(params),
    );
    expect(preset.resolveDropTargetRects(params)).toEqual(
      directResolvers.resolveDropTargetRects(params),
    );
  });

  it('wires drop preview styling through the shared renderer entrypoint', () => {
    const preset = makePreset();
    const preview = preset.renderDropPreview({
      left: 10,
      top: 20,
      width: 72,
      height: 96,
      borderRadius: '12px',
    }) as { props: { style: { borderRadius: string } } };

    expect(preview.props.style.borderRadius).toBe('28px');
  });
});
