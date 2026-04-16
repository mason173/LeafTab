import { describe, expect, it } from 'vitest';
import {
  buildLeaftabCompactTargetCellRect,
  computeLeaftabLargeFolderPreviewSize,
  createLeaftabRootDropResolvers,
  getLeaftabLargeFolderBorderRadius,
  getLeaftabShortcutIconBorderRadius,
  getLeaftabSmallFolderBorderRadius,
  inflateLeaftabRect,
  resolveLeaftabCompactTargetRegions,
  resolveLeaftabDropTargetRects,
  resolveLeaftabFolderItemLayout,
  resolveLeaftabRootItemLayout,
} from './layout';
import type { Shortcut } from '@leaftab/workspace-core';

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

const smallFolderShortcut: Shortcut = {
  id: 'folder-build',
  title: 'Build Lab',
  url: '',
  icon: 'BL',
  kind: 'folder',
  folderDisplayMode: 'small',
  children: [linkShortcut],
};

const rootRect = {
  left: 100,
  top: 40,
} as DOMRect;

function makeResolveParams(
  overrides: Partial<Parameters<typeof resolveLeaftabCompactTargetRegions>[0]> = {},
): Parameters<typeof resolveLeaftabCompactTargetRegions>[0] {
  return {
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
    ...overrides,
  };
}

function makeResolverConfig(
  overrides: Partial<Parameters<typeof resolveLeaftabCompactTargetRegions>[1]> = {},
): Parameters<typeof resolveLeaftabCompactTargetRegions>[1] {
  return {
    getRootRect: () => rootRect,
    gridWidthPx: 324,
    gridColumns: 4,
    rowHeight: 96,
    rowGap: 20,
    columnGap: 12,
    compactIconSize: 72,
    largeFolderHitSlop: 8,
    ...overrides,
  };
}

describe('resolveLeaftabRootItemLayout', () => {
  it('returns a compact 1x1 layout for regular shortcuts', () => {
    const layout = resolveLeaftabRootItemLayout({ shortcut: linkShortcut });

    expect(layout.width).toBe(72);
    expect(layout.height).toBe(96);
    expect(layout.columnSpan).toBeUndefined();
    expect(layout.previewRect?.width).toBe(72);
    expect(layout.previewRect?.borderRadius).toBe('22%');
  });

  it('returns a preserved 2x2 layout for large folders', () => {
    const layout = resolveLeaftabRootItemLayout({
      shortcut: largeFolderShortcut,
      largeFolderPreviewSize: 188,
    });

    expect(layout.width).toBe(188);
    expect(layout.height).toBe(212);
    expect(layout.columnSpan).toBe(2);
    expect(layout.rowSpan).toBe(2);
    expect(layout.previewRect?.borderRadius).toBe('16px');
  });

  it('returns a small-folder border radius for 1x1 folders', () => {
    const layout = resolveLeaftabRootItemLayout({
      shortcut: smallFolderShortcut,
    });

    expect(layout.previewRect?.borderRadius).toBe('16px');
  });
});

describe('computeLeaftabLargeFolderPreviewSize', () => {
  it('returns undefined when large folders are disabled', () => {
    expect(computeLeaftabLargeFolderPreviewSize({
      gridWidthPx: 880,
      gridColumns: 1,
      largeFolderEnabled: false,
    })).toBeUndefined();
  });

  it('returns a bounded preview size when enough grid width is available', () => {
    expect(computeLeaftabLargeFolderPreviewSize({
      gridWidthPx: 960,
      gridColumns: 6,
    })).toBe(188);
  });
});

describe('compact target region helpers', () => {
  it('builds a compact target cell rect from grid coordinates', () => {
    expect(buildLeaftabCompactTargetCellRect({
      columnStart: 2,
      rowStart: 2,
      columnSpan: 2,
      rowSpan: 2,
      rootRect,
      gridColumnWidth: 72,
      columnGap: 12,
      rowHeight: 96,
      rowGap: 20,
    })).toEqual({
      left: 184,
      top: 156,
      width: 156,
      height: 212,
      right: 340,
      bottom: 368,
    });
  });

  it('inflates a rect symmetrically for large-folder hit slop', () => {
    expect(inflateLeaftabRect({
      left: 184,
      top: 40,
      width: 156,
      height: 156,
      right: 340,
      bottom: 196,
    }, 8)).toEqual({
      left: 176,
      top: 32,
      width: 172,
      height: 172,
      right: 348,
      bottom: 204,
    });
  });

  it('resolves compact link targets to a centered icon region within the cell', () => {
    const regions = resolveLeaftabCompactTargetRegions(
      makeResolveParams(),
      makeResolverConfig(),
    );

    expect(regions.targetCellRegion).toEqual({
      left: 184,
      top: 156,
      width: 72,
      height: 96,
      right: 256,
      bottom: 252,
    });
    expect(regions.targetIconRegion).toEqual({
      left: 184,
      top: 156,
      width: 72,
      height: 72,
      right: 256,
      bottom: 228,
    });
    expect(regions.targetIconHitRegion).toEqual(regions.targetIconRegion);
  });

  it('resolves large-folder targets with expanded icon hit regions', () => {
    const regions = resolveLeaftabCompactTargetRegions(
      makeResolveParams({
        shortcut: largeFolderShortcut,
        columnStart: 2,
        rowStart: 1,
        columnSpan: 2,
        rowSpan: 2,
      }),
      makeResolverConfig({
        largeFolderEnabled: true,
        largeFolderPreviewSize: 156,
      }),
    );

    expect(regions.targetCellRegion).toEqual({
      left: 184,
      top: 40,
      width: 156,
      height: 212,
      right: 340,
      bottom: 252,
    });
    expect(regions.targetIconRegion).toEqual({
      left: 184,
      top: 40,
      width: 156,
      height: 156,
      right: 340,
      bottom: 196,
    });
    expect(regions.targetIconHitRegion).toEqual({
      left: 176,
      top: 32,
      width: 172,
      height: 172,
      right: 348,
      bottom: 204,
    });
  });

  it('maps compact target regions into drop target rects', () => {
    const rects = resolveLeaftabDropTargetRects(
      makeResolveParams(),
      makeResolverConfig(),
    );

    expect(rects.overRect).toEqual({
      left: 184,
      top: 156,
      width: 72,
      height: 96,
      right: 256,
      bottom: 252,
    });
    expect(rects.overCenterRect).toEqual({
      left: 184,
      top: 156,
      width: 72,
      height: 72,
      right: 256,
      bottom: 228,
    });
  });

  it('creates drop resolvers that delegate to the shared helper set', () => {
    const resolvers = createLeaftabRootDropResolvers(makeResolverConfig());
    const params = makeResolveParams();

    expect(resolvers.resolveCompactTargetRegions(params)).toEqual(
      resolveLeaftabCompactTargetRegions(params, makeResolverConfig()),
    );
    expect(resolvers.resolveDropTargetRects(params)).toEqual(
      resolveLeaftabDropTargetRects(params, makeResolverConfig()),
    );
  });
});

describe('folder and icon border radius helpers', () => {
  it('matches the shortcut icon border radius shape used by LeafTab', () => {
    expect(getLeaftabShortcutIconBorderRadius(22)).toBe('22%');
  });

  it('computes small-folder and large-folder radii with size-aware caps', () => {
    expect(getLeaftabSmallFolderBorderRadius(72, 22)).toBe('16px');
    expect(getLeaftabLargeFolderBorderRadius(188, 22)).toBe('16px');
  });

  it('resolves folder item preview geometry with the correct radius', () => {
    const folderLayout = resolveLeaftabFolderItemLayout({ shortcut: smallFolderShortcut });

    expect(folderLayout.previewRect?.borderRadius).toBe('16px');
  });
});
