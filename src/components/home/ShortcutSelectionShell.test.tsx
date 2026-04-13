import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShortcutSelectionShell } from '@/components/home/ShortcutSelectionShell';
import type { ContextMenuState, ScenarioMode, Shortcut } from '@/types';

const createLink = (id: string, title: string): Shortcut => ({
  id,
  title,
  url: `https://example.com/${id}`,
  icon: '',
  kind: 'link',
});

const shortcuts: Shortcut[] = [
  createLink('a', 'Alpha'),
  createLink('b', 'Beta'),
  createLink('c', 'Gamma'),
  createLink('d', 'Delta'),
];

const scenarioModes: ScenarioMode[] = [
  { id: 'default', name: 'Default', color: '#55C26A', icon: 'leaf' },
  { id: 'work', name: 'Work', color: '#35B7FF', icon: 'briefcase' },
];

function renderShell(contextMenu: ContextMenuState | null, onPinSelectedShortcuts: (selectedIndexes: number[], position: 'top' | 'bottom') => number[] | void) {
  return render(
    <ShortcutSelectionShell
      contextMenu={contextMenu}
      setContextMenu={vi.fn()}
      contextMenuRef={{ current: null }}
      shortcuts={shortcuts}
      scenarioModes={scenarioModes}
      selectedScenarioId="default"
      onCreateShortcut={vi.fn()}
      onEditShortcut={vi.fn()}
      onEditFolderShortcut={vi.fn()}
      onDeleteShortcut={vi.fn()}
      onDeleteFolderShortcut={vi.fn()}
      onShortcutOpen={vi.fn()}
      onDeleteSelectedShortcuts={vi.fn()}
      onCreateFolder={vi.fn()}
      onPinSelectedShortcuts={onPinSelectedShortcuts}
      onMoveSelectedShortcutsToScenario={vi.fn()}
      onMoveSelectedShortcutsToFolder={vi.fn()}
      onDissolveFolder={vi.fn()}
    >
      {({ selectionMode, selectedShortcutIndexes, onToggleShortcutSelection }) => (
        <div>
          <div data-testid="selection-mode">{selectionMode ? 'on' : 'off'}</div>
          <div data-testid="selected-indexes">{Array.from(selectedShortcutIndexes).sort((a, b) => a - b).join(',')}</div>
          <button data-testid="toggle-shortcut-0" onClick={() => onToggleShortcutSelection(0)}>toggle-0</button>
        </div>
      )}
    </ShortcutSelectionShell>,
  );
}

describe('ShortcutSelectionShell', () => {
  it('updates selected indexes after pinning selected shortcuts', () => {
    renderShell(
      { x: 20, y: 20, kind: 'shortcut', shortcutIndex: 2, shortcut: shortcuts[2] },
      vi.fn(() => [0, 1]),
    );

    fireEvent.click(screen.getByTestId('shortcut-context-multi-select'));
    expect(screen.getByTestId('selection-mode')).toHaveTextContent('on');
    expect(screen.getByTestId('selected-indexes')).toHaveTextContent('2');

    fireEvent.click(screen.getByTestId('toggle-shortcut-0'));
    expect(screen.getByTestId('selected-indexes')).toHaveTextContent('0,2');

    fireEvent.click(screen.getByTestId('shortcut-multi-select-pin-top'));
    expect(screen.getByTestId('selected-indexes')).toHaveTextContent('0,1');
  });

  it('disables pin-top when selected shortcuts are already at the top', () => {
    renderShell(
      { x: 20, y: 20, kind: 'shortcut', shortcutIndex: 0, shortcut: shortcuts[0] },
      vi.fn(),
    );

    fireEvent.click(screen.getByTestId('shortcut-context-multi-select'));
    expect(screen.getByTestId('selected-indexes')).toHaveTextContent('0');

    const pinTopButton = screen.getByTestId('shortcut-multi-select-pin-top');
    expect(pinTopButton).toBeDisabled();
    expect(pinTopButton).toHaveClass('disabled:cursor-not-allowed');
  });

  it('disables pin-bottom when selected shortcuts are already at the bottom', () => {
    renderShell(
      { x: 20, y: 20, kind: 'shortcut', shortcutIndex: 3, shortcut: shortcuts[3] },
      vi.fn(),
    );

    fireEvent.click(screen.getByTestId('shortcut-context-multi-select'));
    expect(screen.getByTestId('selected-indexes')).toHaveTextContent('3');

    const pinBottomButton = screen.getByTestId('shortcut-multi-select-pin-bottom');
    expect(pinBottomButton).toBeDisabled();
    expect(pinBottomButton).toHaveClass('disabled:cursor-not-allowed');
  });

  it('moves a root shortcut to another scenario from the context submenu', () => {
    const onMoveSelectedShortcutsToScenario = vi.fn();

    render(
      <ShortcutSelectionShell
        contextMenu={{ x: 20, y: 20, kind: 'shortcut', shortcutIndex: 2, shortcut: shortcuts[2] }}
        setContextMenu={vi.fn()}
        contextMenuRef={{ current: null }}
        shortcuts={shortcuts}
        scenarioModes={scenarioModes}
        selectedScenarioId="default"
        onCreateShortcut={vi.fn()}
        onEditShortcut={vi.fn()}
        onEditFolderShortcut={vi.fn()}
        onDeleteShortcut={vi.fn()}
        onDeleteFolderShortcut={vi.fn()}
        onShortcutOpen={vi.fn()}
        onDeleteSelectedShortcuts={vi.fn()}
        onCreateFolder={vi.fn()}
        onPinSelectedShortcuts={vi.fn()}
        onMoveSelectedShortcutsToScenario={onMoveSelectedShortcutsToScenario}
        onMoveSelectedShortcutsToFolder={vi.fn()}
        onDissolveFolder={vi.fn()}
      >
        {() => <div />}
      </ShortcutSelectionShell>,
    );

    fireEvent.mouseEnter(screen.getByTestId('shortcut-context-move-to-scenario'));
    fireEvent.click(screen.getByTestId('shortcut-context-move-target-work'));

    expect(onMoveSelectedShortcutsToScenario).toHaveBeenCalledWith([2], 'work');
  });

  it('moves a folder to another scenario from the context submenu', () => {
    const onMoveSelectedShortcutsToScenario = vi.fn();
    const folderShortcut: Shortcut = {
      id: 'folder-1',
      title: 'Folder',
      url: '',
      icon: '',
      kind: 'folder',
      folderDisplayMode: 'small',
      children: [createLink('folder-child', 'Folder Child')],
    };

    render(
      <ShortcutSelectionShell
        contextMenu={{ x: 20, y: 20, kind: 'shortcut', shortcutIndex: 1, shortcut: folderShortcut }}
        setContextMenu={vi.fn()}
        contextMenuRef={{ current: null }}
        shortcuts={[shortcuts[0], folderShortcut, shortcuts[2], shortcuts[3]]}
        scenarioModes={scenarioModes}
        selectedScenarioId="default"
        onCreateShortcut={vi.fn()}
        onEditShortcut={vi.fn()}
        onEditFolderShortcut={vi.fn()}
        onDeleteShortcut={vi.fn()}
        onDeleteFolderShortcut={vi.fn()}
        onShortcutOpen={vi.fn()}
        onDeleteSelectedShortcuts={vi.fn()}
        onCreateFolder={vi.fn()}
        onPinSelectedShortcuts={vi.fn()}
        onMoveSelectedShortcutsToScenario={onMoveSelectedShortcutsToScenario}
        onMoveSelectedShortcutsToFolder={vi.fn()}
        onDissolveFolder={vi.fn()}
      >
        {() => <div />}
      </ShortcutSelectionShell>,
    );

    fireEvent.mouseEnter(screen.getByTestId('shortcut-context-move-to-scenario-folder'));
    fireEvent.click(screen.getByTestId('shortcut-context-move-folder-target-work'));

    expect(onMoveSelectedShortcutsToScenario).toHaveBeenCalledWith([1], 'work');
  });
});
