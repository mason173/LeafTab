import { memo, Suspense, useCallback, useEffect, useMemo } from 'react';
import {
  LazyHomeInteractiveSurface,
  LazyShortcutFolderCompactOverlay,
  LazyShortcutFolderNameDialog,
} from '@/lazy/components';
import { ShortcutSelectionShell, type ShortcutSelectionShellProps } from '@/components/home/ShortcutSelectionShell';
import {
  useShortcutDomainContext,
  useShortcutFeatureActionsContext,
  useShortcutMetaContext,
  useShortcutUiContext,
} from '@/features/shortcuts/app/ShortcutAppContext';
import { openCreateShortcutEditor } from '@/features/shortcuts/app/shortcutEditorState';
import { useShortcutSelection } from '@/features/shortcuts/selection/ShortcutSelectionContext';
import { RenderProfileBoundary } from '@/dev/renderProfiler';
import type { HomeInteractiveSurfaceProps } from '@/components/home/HomeInteractiveSurface';
import type { ShortcutFolderCompactOverlayProps } from '@/components/ShortcutFolderCompactOverlay';
import type { Shortcut } from '@/types';
import type {
  FolderTransitionController,
} from '@/components/folderTransition/useFolderTransitionController';
import {
  useFolderTransitionState,
} from '@/components/folderTransition/useFolderTransitionController';
import { findShortcutById } from '@/utils/shortcutFolders';

export type ShortcutExperienceRootProps = {
  selectionActions: Pick<
    ShortcutSelectionShellProps,
    | 'onEditShortcut'
    | 'onEditFolderShortcut'
    | 'onDeleteFolderShortcut'
    | 'onShortcutOpen'
    | 'onCreateFolder'
    | 'onPinSelectedShortcuts'
    | 'onMoveSelectedShortcutsToScenario'
    | 'onMoveSelectedShortcutsToFolder'
    | 'onDissolveFolder'
    | 'onSetFolderDisplayMode'
  >;
  homeInteractiveSurfaceVisible: boolean;
  homeInteractiveSurfaceBaseProps: Omit<
    HomeInteractiveSurfaceProps,
    'shortcutGridSelectionMode' | 'shortcutGridSelectedShortcutIndexes' | 'onToggleShortcutSelection'
  >;
  folderTransitionController: FolderTransitionController;
  compactFolderOverlayProps: Omit<
    ShortcutFolderCompactOverlayProps,
    'shortcut' | 'transitionPhase' | 'transitionProgress' | 'openingSourceSnapshot' | 'onOpeningLayoutReady' | 'onClosingLayoutReady'
  >;
  folderNameDialogOpen: boolean;
  onFolderNameDialogOpenChange: (open: boolean) => void;
  folderNameDialogTitle?: string;
  folderNameDialogDescription?: string;
  folderNameDialogInitialName: string;
  onFolderNameSubmit: (name: string) => void;
};

const ShortcutExperienceSurface = memo(function ShortcutExperienceSurface({
  homeInteractiveSurfaceVisible,
  homeInteractiveSurfaceBaseProps,
}: Pick<ShortcutExperienceRootProps, 'homeInteractiveSurfaceVisible' | 'homeInteractiveSurfaceBaseProps'>) {
  const {
    selectionMode,
    selectedShortcutIndexes,
    onToggleShortcutSelection,
  } = useShortcutSelection();

  if (!homeInteractiveSurfaceVisible) {
    return null;
  }

  return (
    <Suspense fallback={<div className="w-full min-h-[60vh]" aria-hidden="true" />}>
      <LazyHomeInteractiveSurface
        {...homeInteractiveSurfaceBaseProps}
        shortcutGridSelectionMode={selectionMode}
        shortcutGridSelectedShortcutIndexes={selectedShortcutIndexes}
        onToggleShortcutSelection={onToggleShortcutSelection}
      />
    </Suspense>
  );
});

const ShortcutExperienceCompactOverlay = memo(function ShortcutExperienceCompactOverlay({
  folderTransitionController,
  compactFolderOverlayProps,
}: Pick<
  ShortcutExperienceRootProps,
  | 'folderTransitionController'
  | 'compactFolderOverlayProps'
>) {
  const { state: domainState } = useShortcutDomainContext();
  const transition = useFolderTransitionState(folderTransitionController);
  const compactOverlayShortcut = useMemo(() => (
    transition.overlayFolderId ? findShortcutById(domainState.shortcuts, transition.overlayFolderId) : null
  ), [domainState.shortcuts, transition.overlayFolderId]);

  if (!compactOverlayShortcut) {
    return null;
  }

  const openingSourceSnapshot = transition.sourceSnapshot?.folderId === compactOverlayShortcut.id
    ? transition.sourceSnapshot
    : null;

  return (
    <Suspense fallback={null}>
      <LazyShortcutFolderCompactOverlay
        {...compactFolderOverlayProps}
        transitionPhase={transition.phase}
        transitionProgress={transition.progress}
        openingSourceSnapshot={openingSourceSnapshot}
        onOpeningLayoutReady={() => folderTransitionController.notifyOpeningReady(compactOverlayShortcut.id)}
        onClosingLayoutReady={() => folderTransitionController.notifyClosingReady(compactOverlayShortcut.id)}
        shortcut={compactOverlayShortcut}
      />
    </Suspense>
  );
});

const ShortcutExperienceFolderNameDialog = memo(function ShortcutExperienceFolderNameDialog({
  folderNameDialogOpen,
  onFolderNameDialogOpenChange,
  folderNameDialogTitle,
  folderNameDialogDescription,
  folderNameDialogInitialName,
  onFolderNameSubmit,
}: Pick<
  ShortcutExperienceRootProps,
  | 'folderNameDialogOpen'
  | 'onFolderNameDialogOpenChange'
  | 'folderNameDialogTitle'
  | 'folderNameDialogDescription'
  | 'folderNameDialogInitialName'
  | 'onFolderNameSubmit'
>) {
  if (!folderNameDialogOpen) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyShortcutFolderNameDialog
        open={folderNameDialogOpen}
        onOpenChange={onFolderNameDialogOpenChange}
        title={folderNameDialogTitle}
        description={folderNameDialogDescription}
        initialName={folderNameDialogInitialName}
        onSubmit={onFolderNameSubmit}
      />
    </Suspense>
  );
});

export const ShortcutExperienceRoot = memo(function ShortcutExperienceRoot({
  selectionActions,
  homeInteractiveSurfaceVisible,
  homeInteractiveSurfaceBaseProps,
  folderTransitionController,
  compactFolderOverlayProps,
  folderNameDialogOpen,
  onFolderNameDialogOpenChange,
  folderNameDialogTitle,
  folderNameDialogDescription,
  folderNameDialogInitialName,
  onFolderNameSubmit,
}: ShortcutExperienceRootProps) {
  const { state: domainState } = useShortcutDomainContext();
  const { state: uiState, actions: uiActions } = useShortcutUiContext();
  const shortcutActions = useShortcutFeatureActionsContext();
  const { contextMenuRef } = useShortcutMetaContext();

  useEffect(() => {
    if (!uiState.contextMenu || !contextMenuRef.current) return;
    const pad = 8;
    const rect = contextMenuRef.current.getBoundingClientRect();
    let newX = uiState.contextMenu.x;
    let newY = uiState.contextMenu.y;
    if (rect.right > window.innerWidth - pad) newX = Math.max(pad, window.innerWidth - pad - rect.width);
    if (rect.bottom > window.innerHeight - pad) newY = Math.max(pad, window.innerHeight - pad - rect.height);
    if (newX !== uiState.contextMenu.x || newY !== uiState.contextMenu.y) {
      uiActions.setContextMenu({ ...uiState.contextMenu, x: newX, y: newY });
    }
  }, [contextMenuRef, uiActions, uiState.contextMenu]);

  useEffect(() => {
    if (!uiState.contextMenu) return;
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        uiActions.setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenuRef, uiActions, uiState.contextMenu]);

  const handleCreateShortcut = useCallback((insertIndex: number) => {
    openCreateShortcutEditor({
      setShortcutModalMode: uiActions.setShortcutModalMode,
      setSelectedShortcut: uiActions.setSelectedShortcut,
      setEditingTitle: uiActions.setEditingTitle,
      setEditingUrl: uiActions.setEditingUrl,
      setCurrentInsertIndex: uiActions.setCurrentInsertIndex,
      setShortcutEditOpen: uiActions.setShortcutEditOpen,
    }, insertIndex);
  }, [uiActions]);

  const handleDeleteShortcut = useCallback((shortcutIndex: number, shortcut: Shortcut) => {
    uiActions.setSelectedShortcut({ index: shortcutIndex, shortcut });
    uiActions.setShortcutDeleteOpen(true);
  }, [uiActions]);

  return (
    <RenderProfileBoundary id="ShortcutExperienceRoot">
      <>
        <ShortcutSelectionShell
          contextMenu={uiState.contextMenu}
          setContextMenu={uiActions.setContextMenu}
          contextMenuRef={contextMenuRef}
          shortcuts={domainState.shortcuts}
          scenarioModes={domainState.scenarioModes}
          selectedScenarioId={domainState.selectedScenarioId}
          onCreateShortcut={handleCreateShortcut}
          onDeleteShortcut={handleDeleteShortcut}
          onDeleteSelectedShortcuts={shortcutActions.handleConfirmDeleteShortcuts}
          {...selectionActions}
        >
          <ShortcutExperienceSurface
            homeInteractiveSurfaceVisible={homeInteractiveSurfaceVisible}
            homeInteractiveSurfaceBaseProps={homeInteractiveSurfaceBaseProps}
          />
        </ShortcutSelectionShell>
        <ShortcutExperienceCompactOverlay
          folderTransitionController={folderTransitionController}
          compactFolderOverlayProps={compactFolderOverlayProps}
        />
        <ShortcutExperienceFolderNameDialog
          folderNameDialogOpen={folderNameDialogOpen}
          onFolderNameDialogOpenChange={onFolderNameDialogOpenChange}
          folderNameDialogTitle={folderNameDialogTitle}
          folderNameDialogDescription={folderNameDialogDescription}
          folderNameDialogInitialName={folderNameDialogInitialName}
          onFolderNameSubmit={onFolderNameSubmit}
        />
      </>
    </RenderProfileBoundary>
  );
});

ShortcutExperienceSurface.displayName = 'ShortcutExperienceSurface';
ShortcutExperienceCompactOverlay.displayName = 'ShortcutExperienceCompactOverlay';
ShortcutExperienceFolderNameDialog.displayName = 'ShortcutExperienceFolderNameDialog';
ShortcutExperienceRoot.displayName = 'ShortcutExperienceRoot';
