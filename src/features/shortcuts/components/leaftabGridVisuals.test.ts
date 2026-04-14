import { describe, expect, it } from 'vitest';
import { resolveLeaftabFolderItemLayout, resolveLeaftabRootItemLayout } from '@/features/shortcuts/components/leaftabGridVisuals';
import type { Shortcut } from '@/types';

const createLink = (id: string): Shortcut => ({
  id,
  title: id,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

const createFolder = (id: string, folderDisplayMode: 'small' | 'large'): Shortcut => ({
  id,
  title: id,
  url: '',
  icon: '',
  kind: 'folder',
  folderDisplayMode,
  children: [createLink(`${id}-child`)],
});

describe('leaftabGridVisuals layout previews', () => {
  it('pins compact root preview regions to the top of the card', () => {
    const layout = resolveLeaftabRootItemLayout({
      shortcut: createLink('alpha'),
      compactIconSize: 72,
      largeFolderEnabled: true,
      largeFolderPreviewSize: 156,
      iconCornerRadius: 22,
    });

    expect(layout.height).toBe(96);
    expect(layout.previewRect).toEqual({
      left: 0,
      top: 0,
      width: 72,
      height: 72,
      borderRadius: '22%',
    });
  });

  it('pins compact root large-folder preview regions to the top of the card', () => {
    const layout = resolveLeaftabRootItemLayout({
      shortcut: createFolder('folder', 'large'),
      compactIconSize: 72,
      largeFolderEnabled: true,
      largeFolderPreviewSize: 156,
      iconCornerRadius: 22,
    });

    expect(layout.height).toBe(180);
    expect(layout.previewRect?.left).toBe(0);
    expect(layout.previewRect?.top).toBe(0);
    expect(layout.previewRect?.width).toBe(156);
    expect(layout.previewRect?.height).toBe(156);
  });

  it('pins folder-surface preview regions to the top of the card', () => {
    const layout = resolveLeaftabFolderItemLayout({
      shortcut: createFolder('folder', 'small'),
      compactIconSize: 72,
      iconCornerRadius: 22,
    });

    expect(layout.height).toBe(96);
    expect(layout.previewRect?.left).toBe(0);
    expect(layout.previewRect?.top).toBe(0);
    expect(layout.previewRect?.width).toBe(72);
    expect(layout.previewRect?.height).toBe(72);
  });
});
