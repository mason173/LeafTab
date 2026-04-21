import { Suspense } from 'react';
import {
  LazyHomeInteractiveSurface,
  LazyShortcutFolderCompactOverlay,
  LazyShortcutFolderNameDialog,
} from '@/lazy/components';
import { ShortcutSelectionShell, type ShortcutSelectionShellProps } from '@/components/home/ShortcutSelectionShell';
import { useShortcutAppContext } from '@/features/shortcuts/app/ShortcutAppContext';
import { useShortcutSelection } from '@/features/shortcuts/selection/ShortcutSelectionContext';
import type { HomeInteractiveSurfaceProps } from '@/components/home/HomeInteractiveSurface';
import type { ShortcutFolderCompactOverlayProps } from '@/components/ShortcutFolderCompactOverlay';
import type { Shortcut } from '@/types';
import type {
  FolderTransitionPhase,
  ShortcutFolderOpeningSourceSnapshot,
} from '@/components/folderTransition/useFolderTransitionController';

export type ShortcutExperienceRootProps = {
  selectionActions: Pick<
    ShortcutSelectionShellProps,
    | 'onCreateShortcut'
    | 'onEditShortcut'
    | 'onEditFolderShortcut'
    | 'onDeleteShortcut'
    | 'onDeleteFolderShortcut'
    | 'onShortcutOpen'
    | 'onCreateFolder'
    | 'onPinSelectedShortcuts'
    | 'onMoveSelectedShortcutsToScenario'
    | 'onMoveSelectedShortcutsToFolder'
    | 'onDissolveFolder'
    | 'onSetFolderDisplayMode'
  >;
  homeInteractiveSurfaceBaseProps: Omit<
    HomeInteractiveSurfaceProps,
    'shortcutGridSelectionMode' | 'shortcutGridSelectedShortcutIndexes' | 'onToggleShortcutSelection'
  >;
  compactOverlayShortcut: Shortcut | null;
  compactFolderOverlayProps: Omit<
    ShortcutFolderCompactOverlayProps,
    'shortcut' | 'transitionPhase' | 'transitionProgress' | 'openingSourceSnapshot' | 'onOpeningLayoutReady' | 'onClosingLayoutReady'
  >;
  folderTransitionPhase: FolderTransitionPhase;
  folderTransitionProgress: number;
  openingSourceSnapshot: ShortcutFolderOpeningSourceSnapshot | null;
  onOpeningLayoutReady: (folderId: string) => void;
  onClosingLayoutReady: (folderId: string) => void;
  folderNameDialogOpen: boolean;
  onFolderNameDialogOpenChange: (open: boolean) => void;
  folderNameDialogTitle?: string;
  folderNameDialogDescription?: string;
  folderNameDialogInitialName: string;
  onFolderNameSubmit: (name: string) => void;
};

function ShortcutExperienceSurface({
  homeInteractiveSurfaceBaseProps,
}: Pick<ShortcutExperienceRootProps, 'homeInteractiveSurfaceBaseProps'>) {
  const {
    selectionMode,
    selectedShortcutIndexes,
    onToggleShortcutSelection,
  } = useShortcutSelection();

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
}

function ShortcutExperienceCompactOverlay({
  compactOverlayShortcut,
  compactFolderOverlayProps,
  folderTransitionPhase,
  folderTransitionProgress,
  openingSourceSnapshot,
  onOpeningLayoutReady,
  onClosingLayoutReady,
}: Pick<
  ShortcutExperienceRootProps,
  | 'compactOverlayShortcut'
  | 'compactFolderOverlayProps'
  | 'folderTransitionPhase'
  | 'folderTransitionProgress'
  | 'openingSourceSnapshot'
  | 'onOpeningLayoutReady'
  | 'onClosingLayoutReady'
>) {
  if (!compactOverlayShortcut) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyShortcutFolderCompactOverlay
        {...compactFolderOverlayProps}
        transitionPhase={folderTransitionPhase}
        transitionProgress={folderTransitionProgress}
        openingSourceSnapshot={openingSourceSnapshot}
        onOpeningLayoutReady={() => onOpeningLayoutReady(compactOverlayShortcut.id)}
        onClosingLayoutReady={() => onClosingLayoutReady(compactOverlayShortcut.id)}
        shortcut={compactOverlayShortcut}
      />
    </Suspense>
  );
}

function ShortcutExperienceFolderNameDialog({
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
}

export function ShortcutExperienceRoot({
  selectionActions,
  homeInteractiveSurfaceBaseProps,
  compactOverlayShortcut,
  compactFolderOverlayProps,
  folderTransitionPhase,
  folderTransitionProgress,
  openingSourceSnapshot,
  onOpeningLayoutReady,
  onClosingLayoutReady,
  folderNameDialogOpen,
  onFolderNameDialogOpenChange,
  folderNameDialogTitle,
  folderNameDialogDescription,
  folderNameDialogInitialName,
  onFolderNameSubmit,
}: ShortcutExperienceRootProps) {
  const shortcutApp = useShortcutAppContext();

  return (
    <>
      <ShortcutSelectionShell
        contextMenu={shortcutApp.state.ui.contextMenu}
        setContextMenu={shortcutApp.actions.ui.setContextMenu}
        contextMenuRef={shortcutApp.meta.contextMenuRef}
        shortcuts={shortcutApp.state.domain.shortcuts}
        scenarioModes={shortcutApp.state.domain.scenarioModes}
        selectedScenarioId={shortcutApp.state.domain.selectedScenarioId}
        onDeleteSelectedShortcuts={shortcutApp.actions.shortcuts.handleConfirmDeleteShortcuts}
        {...selectionActions}
      >
        <ShortcutExperienceSurface
          homeInteractiveSurfaceBaseProps={homeInteractiveSurfaceBaseProps}
        />
      </ShortcutSelectionShell>
      <ShortcutExperienceCompactOverlay
        compactOverlayShortcut={compactOverlayShortcut}
        compactFolderOverlayProps={compactFolderOverlayProps}
        folderTransitionPhase={folderTransitionPhase}
        folderTransitionProgress={folderTransitionProgress}
        openingSourceSnapshot={openingSourceSnapshot}
        onOpeningLayoutReady={onOpeningLayoutReady}
        onClosingLayoutReady={onClosingLayoutReady}
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
  );
}
