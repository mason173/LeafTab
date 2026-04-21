import { Suspense } from 'react';
import {
  LazyHomeInteractiveSurface,
  LazyShortcutFolderCompactOverlay,
  LazyShortcutFolderNameDialog,
} from '@/lazy/components';
import { ShortcutSelectionShell, type ShortcutSelectionShellProps } from '@/components/home/ShortcutSelectionShell';
import type { HomeInteractiveSurfaceProps } from '@/components/home/HomeInteractiveSurface';
import type { ShortcutFolderCompactOverlayProps } from '@/components/ShortcutFolderCompactOverlay';
import type { Shortcut } from '@/types';
import type {
  FolderTransitionPhase,
  ShortcutFolderOpeningSourceSnapshot,
} from '@/components/folderTransition/useFolderTransitionController';

type ShortcutExperienceLayerProps = {
  selectionShellProps: Omit<ShortcutSelectionShellProps, 'children'>;
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

export function ShortcutExperienceLayer({
  selectionShellProps,
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
}: ShortcutExperienceLayerProps) {
  return (
    <>
      <ShortcutSelectionShell {...selectionShellProps}>
        {({ selectionMode, selectedShortcutIndexes, onToggleShortcutSelection }) => (
          <Suspense fallback={<div className="w-full min-h-[60vh]" aria-hidden="true" />}>
            <LazyHomeInteractiveSurface
              {...homeInteractiveSurfaceBaseProps}
              shortcutGridSelectionMode={selectionMode}
              shortcutGridSelectedShortcutIndexes={selectedShortcutIndexes}
              onToggleShortcutSelection={onToggleShortcutSelection}
            />
          </Suspense>
        )}
      </ShortcutSelectionShell>
      {compactOverlayShortcut ? (
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
      ) : null}
      {folderNameDialogOpen ? (
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
      ) : null}
    </>
  );
}
