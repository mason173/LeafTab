import { useCallback, useEffect, useMemo, useReducer, useRef, type SetStateAction } from 'react';
import {
  applyFolderExtractDragStart,
  type FolderExtractDragStartPayload,
} from '@leaftab/workspace-core';
import type { Shortcut } from '@/types';
import { shortcutWorkspaceReducer } from './shortcutWorkspaceReducer';
import {
  createInitialShortcutWorkspaceState,
  type PendingFolderExtractDrag,
  type PendingRootFolderMerge,
} from './types';
import type { RootShortcutExternalDragSession } from '@/features/shortcuts/components/RootShortcutGrid';

type UseShortcutWorkspaceControllerParams = {
  selectedScenarioId: string;
  shortcuts: Shortcut[];
  onCommitPendingExtractPreview?: (payload: {
    scenarioId: string;
    previewShortcuts: Shortcut[];
  }) => void;
};

export function useShortcutWorkspaceController({
  selectedScenarioId,
  shortcuts,
  onCommitPendingExtractPreview,
}: UseShortcutWorkspaceControllerParams) {
  const [state, dispatch] = useReducer(
    shortcutWorkspaceReducer,
    undefined,
    createInitialShortcutWorkspaceState,
  );
  const pendingExtractRootDragStartedRef = useRef(false);

  const setEditingFolderId = useCallback((value: SetStateAction<string | null>) => {
    dispatch({ type: 'set-editing-folder-id', value });
  }, []);

  const setPendingRootFolderMerge = useCallback((value: SetStateAction<PendingRootFolderMerge | null>) => {
    dispatch({ type: 'set-pending-root-folder-merge', value });
  }, []);

  const setFolderNameDialogOpen = useCallback((value: SetStateAction<boolean>) => {
    dispatch({ type: 'set-folder-name-dialog-open', value });
  }, []);

  const setExternalShortcutDragSession = useCallback((value: SetStateAction<RootShortcutExternalDragSession | null>) => {
    dispatch({ type: 'set-external-shortcut-drag-session', value });
  }, []);

  const setPendingExtractHiddenShortcutId = useCallback((value: SetStateAction<string | null>) => {
    dispatch({ type: 'set-pending-extract-hidden-shortcut-id', value });
  }, []);

  const setPendingFolderExtractDrag = useCallback((value: SetStateAction<PendingFolderExtractDrag | null>) => {
    dispatch({ type: 'set-pending-folder-extract-drag', value });
  }, []);

  const rootDisplayShortcuts = useMemo(() => {
    if (!state.pendingFolderExtractDrag) return shortcuts;
    if (state.pendingFolderExtractDrag.scenarioId !== selectedScenarioId) return shortcuts;
    return state.pendingFolderExtractDrag.previewShortcuts;
  }, [selectedScenarioId, shortcuts, state.pendingFolderExtractDrag]);

  const activePendingExtractDrag = useMemo(() => (
    state.pendingFolderExtractDrag?.scenarioId === selectedScenarioId
      ? state.pendingFolderExtractDrag
      : null
  ), [selectedScenarioId, state.pendingFolderExtractDrag]);

  const startFolderExtractDrag = useCallback((
    payload: FolderExtractDragStartPayload,
    options?: {
      onCloseFolderOverlay?: () => void;
    },
  ) => {
    const outcome = applyFolderExtractDragStart(shortcuts, payload);
    if (outcome.kind !== 'start-root-drag-session') {
      return false;
    }

    pendingExtractRootDragStartedRef.current = false;
    setPendingFolderExtractDrag({
      scenarioId: selectedScenarioId,
      extractedShortcutId: payload.shortcutId,
      pointerId: payload.pointerId,
      previewShortcuts: outcome.shortcuts,
      committed: false,
    });
    setPendingExtractHiddenShortcutId(payload.shortcutId);
    if (outcome.closeFolderId) {
      options?.onCloseFolderOverlay?.();
    }
    setExternalShortcutDragSession({
      token: Date.now(),
      ...outcome.session,
    });
    return true;
  }, [
    selectedScenarioId,
    setExternalShortcutDragSession,
    setPendingExtractHiddenShortcutId,
    setPendingFolderExtractDrag,
    shortcuts,
  ]);

  const markRootShortcutDragStart = useCallback(() => {
    if (!state.pendingFolderExtractDrag) return;
    pendingExtractRootDragStartedRef.current = true;
  }, [state.pendingFolderExtractDrag]);

  const markRootShortcutDragEnd = useCallback(() => {
    if (!state.pendingFolderExtractDrag) return;
    if (!pendingExtractRootDragStartedRef.current) return;
    pendingExtractRootDragStartedRef.current = false;
  }, [state.pendingFolderExtractDrag]);

  const commitPendingFolderExtractPreview = useCallback((previewShortcuts: Shortcut[]) => {
    setPendingFolderExtractDrag((current) => {
      if (!current || current.scenarioId !== selectedScenarioId) return current;
      return {
        ...current,
        previewShortcuts,
        committed: true,
      };
    });
  }, [selectedScenarioId, setPendingFolderExtractDrag]);

  const requestRootFolderMerge = useCallback((payload: PendingRootFolderMerge) => {
    const activePendingExtractDrag = state.pendingFolderExtractDrag?.scenarioId === payload.scenarioId
      ? state.pendingFolderExtractDrag
      : null;

    if (activePendingExtractDrag) {
      onCommitPendingExtractPreview?.({
        scenarioId: payload.scenarioId,
        previewShortcuts: activePendingExtractDrag.previewShortcuts,
      });
      setPendingFolderExtractDrag({
        ...activePendingExtractDrag,
        committed: true,
      });
    }

    setEditingFolderId(null);
    setPendingRootFolderMerge(payload);
    setFolderNameDialogOpen(true);
  }, [
    onCommitPendingExtractPreview,
    setEditingFolderId,
    setFolderNameDialogOpen,
    setPendingFolderExtractDrag,
    setPendingRootFolderMerge,
    state.pendingFolderExtractDrag,
  ]);

  const closeFolderNameDialog = useCallback(() => {
    setFolderNameDialogOpen(false);
    setEditingFolderId(null);
    setPendingRootFolderMerge(null);
  }, [setEditingFolderId, setFolderNameDialogOpen, setPendingRootFolderMerge]);

  const completeFolderNameFlow = useCallback(() => {
    closeFolderNameDialog();
  }, [closeFolderNameDialog]);

  const finalizePendingFolderExtractDrag = useCallback((options?: {
    commitPendingPreview?: boolean;
  }) => {
    const pendingExtractDrag = state.pendingFolderExtractDrag;
    if (!pendingExtractDrag) return;

    pendingExtractRootDragStartedRef.current = false;

    if (options?.commitPendingPreview && !pendingExtractDrag.committed) {
      onCommitPendingExtractPreview?.({
        scenarioId: pendingExtractDrag.scenarioId,
        previewShortcuts: pendingExtractDrag.previewShortcuts,
      });
    }

    setPendingFolderExtractDrag(null);
    setPendingExtractHiddenShortcutId(null);
    setExternalShortcutDragSession(null);
  }, [
    onCommitPendingExtractPreview,
    setExternalShortcutDragSession,
    setPendingExtractHiddenShortcutId,
    setPendingFolderExtractDrag,
    state.pendingFolderExtractDrag,
  ]);

  useEffect(() => {
    if (!state.pendingFolderExtractDrag) return;

    const handleWindowPointerFinish = (event: PointerEvent) => {
      if (event.pointerId !== state.pendingFolderExtractDrag?.pointerId) return;
      finalizePendingFolderExtractDrag({
        commitPendingPreview: event.type === 'pointerup',
      });
    };

    window.addEventListener('pointerup', handleWindowPointerFinish, true);
    window.addEventListener('pointercancel', handleWindowPointerFinish, true);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerFinish, true);
      window.removeEventListener('pointercancel', handleWindowPointerFinish, true);
    };
  }, [finalizePendingFolderExtractDrag, state.pendingFolderExtractDrag]);

  const consumeExternalDragSession = useCallback((token: number) => {
    setExternalShortcutDragSession((current) => (current?.token === token ? null : current));
  }, [setExternalShortcutDragSession]);

  return {
    ...state,
    activePendingExtractDrag,
    rootDisplayShortcuts,
    setEditingFolderId,
    setPendingRootFolderMerge,
    setFolderNameDialogOpen,
    setExternalShortcutDragSession,
    setPendingExtractHiddenShortcutId,
    setPendingFolderExtractDrag,
    startFolderExtractDrag,
    markRootShortcutDragStart,
    markRootShortcutDragEnd,
    commitPendingFolderExtractPreview,
    finalizePendingFolderExtractDrag,
    consumeExternalDragSession,
    requestRootFolderMerge,
    closeFolderNameDialog,
    completeFolderNameFlow,
  };
}
