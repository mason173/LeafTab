import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef, useState } from 'react';
import { defaultScenarioModes } from '@/scenario/scenario';
import type { ContextMenuState, ScenarioMode, ScenarioShortcuts, ShortcutDraft } from '@/types';
import type { SelectedShortcutState } from '@/features/shortcuts/model/types';
import { useShortcutActions } from './useShortcutActions';

const toastSuccessSpy = vi.fn();
const toastErrorSpy = vi.fn();
const persistShortcutCustomIconSpy = vi.fn();
const removeShortcutCustomIconSpy = vi.fn();
const removeShortcutCustomIconsSpy = vi.fn();

vi.mock('../components/ui/sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessSpy(...args),
    error: (...args: unknown[]) => toastErrorSpy(...args),
  },
}));

vi.mock('@/utils/shortcutCustomIcons', () => ({
  persistShortcutCustomIcon: (...args: unknown[]) => persistShortcutCustomIconSpy(...args),
  removeShortcutCustomIcon: (...args: unknown[]) => removeShortcutCustomIconSpy(...args),
  removeShortcutCustomIcons: (...args: unknown[]) => removeShortcutCustomIconsSpy(...args),
}));

function createDraft(title: string, url: string): ShortcutDraft {
  return {
    title,
    url,
    icon: '',
    useOfficialIcon: true,
    autoUseOfficialIcon: true,
  };
}

function renderActionsHarness() {
  const reportDomain = vi.fn();

  const hook = renderHook(() => {
    const localDirtyRef = useRef(false);
    const [scenarioModes, setScenarioModes] = useState<ScenarioMode[]>(defaultScenarioModes);
    const [selectedScenarioId, setSelectedScenarioId] = useState(defaultScenarioModes[0].id);
    const [scenarioShortcuts, setScenarioShortcuts] = useState<ScenarioShortcuts>({
      [defaultScenarioModes[0].id]: [],
    });
    const [scenarioEditOpen, setScenarioEditOpen] = useState(false);
    const [currentEditScenarioId, setCurrentEditScenarioId] = useState('');
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [shortcutEditOpen, setShortcutEditOpen] = useState(true);
    const [selectedShortcut, setSelectedShortcut] = useState<SelectedShortcutState>(null);
    const [currentInsertIndex, setCurrentInsertIndex] = useState<number | null>(0);
    const [shortcutDeleteOpen, setShortcutDeleteOpen] = useState(true);
    const [shortcutModalMode, setShortcutModalMode] = useState<'add' | 'edit'>('add');

    const actions = useShortcutActions({
      user: null,
      openInNewTab: true,
      translate: (key) => key,
      reportDomain,
      shortcutModalMode,
      currentInsertIndex,
      currentEditScenarioId,
      selectedShortcut,
      updateScenarioShortcuts: (updater) => {
        setScenarioShortcuts((prev) => ({
          ...prev,
          [selectedScenarioId]: updater(prev[selectedScenarioId] ?? []),
        }));
      },
      localDirtyRef,
      setScenarioModes,
      setScenarioShortcuts,
      setSelectedScenarioId,
      setScenarioEditOpen,
      setCurrentEditScenarioId,
      setContextMenu,
      setShortcutEditOpen,
      setSelectedShortcut,
      setCurrentInsertIndex,
      setShortcutDeleteOpen,
    });

    return {
      actions,
      localDirtyRef,
      scenarioModes,
      selectedScenarioId,
      scenarioShortcuts,
      scenarioEditOpen,
      currentEditScenarioId,
      contextMenu,
      shortcutEditOpen,
      selectedShortcut,
      currentInsertIndex,
      shortcutDeleteOpen,
      setScenarioShortcuts,
      setShortcutModalMode,
      setSelectedShortcut,
      setCurrentInsertIndex,
      setCurrentEditScenarioId,
    };
  });

  return {
    ...hook,
    reportDomain,
  };
}

describe('useShortcutActions', () => {
  beforeEach(() => {
    toastSuccessSpy.mockReset();
    toastErrorSpy.mockReset();
    persistShortcutCustomIconSpy.mockReset();
    removeShortcutCustomIconSpy.mockReset();
    removeShortcutCustomIconsSpy.mockReset();
    localStorage.clear();
  });

  it('creates and deletes scenarios while keeping selection consistent', () => {
    const { result } = renderActionsHarness();

    act(() => {
      result.current.actions.handleCreateScenarioMode({
        name: 'Work',
        color: '#335577',
        icon: 'briefcase',
      });
    });

    const createdMode = result.current.scenarioModes.find((mode) => mode.name === 'Work');
    expect(createdMode).toBeTruthy();
    expect(result.current.selectedScenarioId).toBe(createdMode?.id);
    expect(result.current.scenarioShortcuts[createdMode!.id]).toEqual([]);
    expect(result.current.localDirtyRef.current).toBe(true);

    act(() => {
      result.current.actions.handleDeleteScenarioMode(createdMode!.id);
    });

    expect(result.current.scenarioModes).toEqual(defaultScenarioModes);
    expect(result.current.selectedScenarioId).toBe(defaultScenarioModes[0].id);
  });

  it('creates, edits, and deletes shortcuts through the current scenario updater', () => {
    const { result, reportDomain } = renderActionsHarness();

    act(() => {
      result.current.actions.handleSaveShortcutEdit(createDraft('GitHub', 'github.com'));
    });

    const createdShortcut = result.current.scenarioShortcuts[defaultScenarioModes[0].id][0];
    expect(createdShortcut.title).toBe('GitHub');
    expect(createdShortcut.url).toBe('github.com');
    expect(reportDomain).toHaveBeenCalledWith('github.com');
    expect(result.current.shortcutEditOpen).toBe(false);
    expect(result.current.currentInsertIndex).toBeNull();

    act(() => {
      result.current.setShortcutModalMode('edit');
      result.current.setSelectedShortcut({
        index: 0,
        shortcut: createdShortcut,
      });
    });

    act(() => {
      result.current.actions.handleSaveShortcutEdit(createDraft('GitHub Home', 'https://github.com'));
    });

    const updatedShortcut = result.current.scenarioShortcuts[defaultScenarioModes[0].id][0];
    expect(updatedShortcut.title).toBe('GitHub Home');
    expect(updatedShortcut.url).toBe('https://github.com');

    act(() => {
      result.current.setSelectedShortcut({
        index: 0,
        shortcut: updatedShortcut,
      });
      result.current.actions.handleConfirmDeleteShortcut();
    });

    expect(result.current.scenarioShortcuts[defaultScenarioModes[0].id]).toEqual([]);
    expect(result.current.shortcutDeleteOpen).toBe(false);
    expect(removeShortcutCustomIconsSpy).toHaveBeenCalled();
  });

  it('removes a folder when its last child shortcut is deleted', () => {
    const { result } = renderActionsHarness();

    act(() => {
      result.current.setCurrentInsertIndex(0);
      result.current.actions.handleSaveShortcutEdit(createDraft('GitHub', 'github.com'));
    });

    const childShortcut = result.current.scenarioShortcuts[defaultScenarioModes[0].id][0];

    act(() => {
      result.current.setScenarioShortcuts((prev) => ({
        ...prev,
        [defaultScenarioModes[0].id]: [
          {
            id: 'folder-1',
            title: 'Folder',
            url: '',
            icon: '',
            kind: 'folder',
            children: [childShortcut],
          },
        ],
      }));
      result.current.setSelectedShortcut({
        index: 0,
        parentFolderId: 'folder-1',
        shortcut: childShortcut,
      });
    });

    act(() => {
      result.current.actions.handleConfirmDeleteShortcut();
    });

    expect(result.current.scenarioShortcuts[defaultScenarioModes[0].id]).toEqual([]);
  });
});
