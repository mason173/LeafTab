import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Shortcut } from '@/types';
import { ShortcutCardCompact } from '@/components/shortcuts/ShortcutCardCompact';

vi.mock('@/components/shortcuts/ShortcutVisualRenderer', () => ({
  ShortcutVisualRenderer: ({ shortcut }: { shortcut: Shortcut }) => (
    <span data-testid={`shortcut-visual-${shortcut.id}`}>{shortcut.title}</span>
  ),
}));

function createLinkShortcut(id: string): Shortcut {
  return {
    id,
    title: id,
    url: `https://${id}.example`,
    icon: '',
  };
}

function createFolderShortcut(id: string, folderDisplayMode: 'small' | 'large' = 'small'): Shortcut {
  return {
    id,
    title: id,
    url: '',
    icon: '',
    kind: 'folder',
    folderDisplayMode,
    children: [],
  };
}

describe('ShortcutCardCompact', () => {
  it('adds icon hover motion classes for link shortcuts', () => {
    render(
      <ShortcutCardCompact
        shortcut={createLinkShortcut('alpha')}
        showTitle
        rootProps={{ 'data-testid': 'shortcut-card' }}
        iconWrapperProps={{ 'data-testid': 'shortcut-icon-wrapper' }}
        onOpen={() => {}}
        onContextMenu={() => {}}
      />,
    );

    expect(screen.getByTestId('shortcut-icon-wrapper')).toHaveClass('transform-gpu');
    expect(screen.getByTestId('shortcut-icon-wrapper')).toHaveClass('group-hover/shortcut:scale-[1.05]');
  });

  it('disables icon hover motion classes for disabled large folders', () => {
    render(
      <ShortcutCardCompact
        shortcut={createFolderShortcut('folder-large', 'large')}
        showTitle
        selectionDisabled
        rootProps={{ 'data-testid': 'shortcut-card' }}
        iconWrapperProps={{ 'data-testid': 'shortcut-icon-wrapper' }}
        onOpen={() => {}}
        onContextMenu={() => {}}
      />,
    );

    expect(screen.getByTestId('shortcut-card')).toHaveClass('cursor-not-allowed');
    expect(screen.getByTestId('shortcut-icon-wrapper')).not.toHaveClass('transform-gpu');
  });
});
