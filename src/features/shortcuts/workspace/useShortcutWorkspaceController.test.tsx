import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useShortcutWorkspaceController } from './useShortcutWorkspaceController';

describe('useShortcutWorkspaceController', () => {
  it('uses pending extract preview shortcuts only for the active scenario', () => {
    const shortcuts = [
      { id: 'root-1', title: 'Root', url: 'https://root.example', icon: '' },
    ];
    const previewShortcuts = [
      { id: 'preview-1', title: 'Preview', url: 'https://preview.example', icon: '' },
    ];

    const { result, rerender } = renderHook(
      ({ selectedScenarioId }) => useShortcutWorkspaceController({
        selectedScenarioId,
        shortcuts,
      }),
      {
        initialProps: {
          selectedScenarioId: 'life-mode-001',
        },
      },
    );

    act(() => {
      result.current.setPendingFolderExtractDrag({
        scenarioId: 'life-mode-001',
        extractedShortcutId: 'preview-1',
        pointerId: 1,
        previewShortcuts,
        committed: false,
      });
    });

    expect(result.current.rootDisplayShortcuts).toEqual(previewShortcuts);

    rerender({
      selectedScenarioId: 'work-mode',
    });

    expect(result.current.rootDisplayShortcuts).toEqual(shortcuts);
  });

  it('tracks folder merge and dialog state through the controller reducer', () => {
    const { result } = renderHook(() => useShortcutWorkspaceController({
      selectedScenarioId: 'life-mode-001',
      shortcuts: [],
    }));

    act(() => {
      result.current.setPendingRootFolderMerge({
        scenarioId: 'life-mode-001',
        activeShortcutId: 'a',
        targetShortcutId: 'b',
      });
      result.current.setFolderNameDialogOpen(true);
      result.current.setEditingFolderId('folder-1');
    });

    expect(result.current.pendingRootFolderMerge).toEqual({
      scenarioId: 'life-mode-001',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });
    expect(result.current.folderNameDialogOpen).toBe(true);
    expect(result.current.editingFolderId).toBe('folder-1');
  });

  it('starts a folder extract drag session and clears the external session after consumption', () => {
    const shortcuts = [
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder' as const,
        children: [
          { id: 'child-1', title: 'Child', url: 'https://child.example', icon: '' },
        ],
      },
    ];
    const onCommitPendingExtractPreview = vi.fn();
    const onCloseFolderOverlay = vi.fn();
    const { result } = renderHook(() => useShortcutWorkspaceController({
      selectedScenarioId: 'life-mode-001',
      shortcuts,
      onCommitPendingExtractPreview,
    }));

    act(() => {
      result.current.startFolderExtractDrag({
        folderId: 'folder-1',
        shortcutId: 'child-1',
        pointerId: 7,
        pointerType: 'mouse',
        pointer: { x: 10, y: 20 },
        anchor: { xRatio: 0.5, yRatio: 0.5 },
      }, {
        onCloseFolderOverlay,
      });
    });

    expect(result.current.activePendingExtractDrag?.extractedShortcutId).toBe('child-1');
    expect(result.current.pendingExtractHiddenShortcutId).toBe('child-1');
    expect(result.current.externalShortcutDragSession?.shortcutId).toBe('child-1');
    expect(onCloseFolderOverlay).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.consumeExternalDragSession(result.current.externalShortcutDragSession!.token);
    });

    expect(result.current.externalShortcutDragSession).toBeNull();
    expect(onCommitPendingExtractPreview).not.toHaveBeenCalled();
  });

  it('requests a root folder merge and closes the naming dialog through controller-owned state', () => {
    const onCommitPendingExtractPreview = vi.fn();
    const { result } = renderHook(() => useShortcutWorkspaceController({
      selectedScenarioId: 'life-mode-001',
      shortcuts: [],
      onCommitPendingExtractPreview,
    }));

    act(() => {
      result.current.requestRootFolderMerge({
        scenarioId: 'life-mode-001',
        activeShortcutId: 'a',
        targetShortcutId: 'b',
      });
    });

    expect(result.current.pendingRootFolderMerge).toEqual({
      scenarioId: 'life-mode-001',
      activeShortcutId: 'a',
      targetShortcutId: 'b',
    });
    expect(result.current.folderNameDialogOpen).toBe(true);

    act(() => {
      result.current.closeFolderNameDialog();
    });

    expect(result.current.pendingRootFolderMerge).toBeNull();
    expect(result.current.folderNameDialogOpen).toBe(false);
    expect(result.current.editingFolderId).toBeNull();
    expect(onCommitPendingExtractPreview).not.toHaveBeenCalled();
  });

  it('commits extract preview before opening a merge dialog when merge follows folder extraction', () => {
    const shortcuts = [
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder' as const,
        children: [
          { id: 'child-1', title: 'Child', url: 'https://child.example', icon: '' },
        ],
      },
    ];
    const onCommitPendingExtractPreview = vi.fn();
    const { result } = renderHook(() => useShortcutWorkspaceController({
      selectedScenarioId: 'life-mode-001',
      shortcuts,
      onCommitPendingExtractPreview,
    }));

    act(() => {
      result.current.startFolderExtractDrag({
        folderId: 'folder-1',
        shortcutId: 'child-1',
        pointerId: 7,
        pointerType: 'mouse',
        pointer: { x: 10, y: 20 },
        anchor: { xRatio: 0.5, yRatio: 0.5 },
      });
    });

    act(() => {
      result.current.requestRootFolderMerge({
        scenarioId: 'life-mode-001',
        activeShortcutId: 'child-1',
        targetShortcutId: 'folder-1',
      });
    });

    expect(onCommitPendingExtractPreview).toHaveBeenCalledTimes(1);
    expect(result.current.pendingFolderExtractDrag?.committed).toBe(true);
    expect(result.current.pendingRootFolderMerge?.activeShortcutId).toBe('child-1');
    expect(result.current.folderNameDialogOpen).toBe(true);
  });

  it('commits preview and clears drag state on pointerup for the active extract session', () => {
    const shortcuts = [
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder' as const,
        children: [
          { id: 'child-1', title: 'Child', url: 'https://child.example', icon: '' },
        ],
      },
    ];
    const onCommitPendingExtractPreview = vi.fn();
    const { result } = renderHook(() => useShortcutWorkspaceController({
      selectedScenarioId: 'life-mode-001',
      shortcuts,
      onCommitPendingExtractPreview,
    }));

    act(() => {
      result.current.startFolderExtractDrag({
        folderId: 'folder-1',
        shortcutId: 'child-1',
        pointerId: 42,
        pointerType: 'mouse',
        pointer: { x: 10, y: 20 },
        anchor: { xRatio: 0.5, yRatio: 0.5 },
      });
    });

    const pointerUpEvent = new Event('pointerup');
    Object.defineProperty(pointerUpEvent, 'pointerId', { value: 42 });

    act(() => {
      window.dispatchEvent(pointerUpEvent);
    });

    expect(onCommitPendingExtractPreview).toHaveBeenCalledTimes(1);
    expect(result.current.pendingFolderExtractDrag).toBeNull();
    expect(result.current.pendingExtractHiddenShortcutId).toBeNull();
    expect(result.current.externalShortcutDragSession).toBeNull();
  });

  it('clears drag state without committing preview on pointercancel', () => {
    const shortcuts = [
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder' as const,
        children: [
          { id: 'child-1', title: 'Child', url: 'https://child.example', icon: '' },
        ],
      },
    ];
    const onCommitPendingExtractPreview = vi.fn();
    const { result } = renderHook(() => useShortcutWorkspaceController({
      selectedScenarioId: 'life-mode-001',
      shortcuts,
      onCommitPendingExtractPreview,
    }));

    act(() => {
      result.current.startFolderExtractDrag({
        folderId: 'folder-1',
        shortcutId: 'child-1',
        pointerId: 43,
        pointerType: 'mouse',
        pointer: { x: 10, y: 20 },
        anchor: { xRatio: 0.5, yRatio: 0.5 },
      });
    });

    const pointerCancelEvent = new Event('pointercancel');
    Object.defineProperty(pointerCancelEvent, 'pointerId', { value: 43 });

    act(() => {
      window.dispatchEvent(pointerCancelEvent);
    });

    expect(onCommitPendingExtractPreview).not.toHaveBeenCalled();
    expect(result.current.pendingFolderExtractDrag).toBeNull();
    expect(result.current.pendingExtractHiddenShortcutId).toBeNull();
    expect(result.current.externalShortcutDragSession).toBeNull();
  });
});
