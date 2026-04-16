import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@leaftab/workspace-core';
import { resolveLeaftabFolderItemLayout } from './layout';
import { createLeaftabFolderSurfacePreset } from './folderSurfacePreset';

const linkShortcut: Shortcut = {
  id: 'github',
  title: 'GitHub',
  url: 'https://github.com',
  icon: 'GH',
  iconRendering: 'letter',
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

describe('createLeaftabFolderSurfacePreset', () => {
  it('delegates folder item layout resolution to the shared layout helper', () => {
    const preset = createLeaftabFolderSurfacePreset({
      compactIconSize: 72,
      titleBlockHeight: 24,
      iconCornerRadius: 22,
    });

    expect(preset.resolveItemLayout(smallFolderShortcut)).toEqual(
      resolveLeaftabFolderItemLayout({
        shortcut: smallFolderShortcut,
        compactIconSize: 72,
        titleBlockHeight: 24,
        iconCornerRadius: 22,
      }),
    );
  });

  it('wires folder drop preview styling through the shared drop preview renderer', () => {
    const preset = createLeaftabFolderSurfacePreset({
      dropPreviewBorderRadius: '28px',
    });
    const preview = preset.renderDropPreview({
      left: 12,
      top: 24,
      width: 72,
      height: 96,
      borderRadius: '12px',
    }) as { props: { style: { borderRadius: string } } };

    expect(preview.props.style.borderRadius).toBe('28px');
  });
});
