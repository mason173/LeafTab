import { useEffect, useLayoutEffect } from 'react';
import type { FolderTransitionController } from '@/components/folderTransition/useFolderTransitionController';
import {
  useFolderTransitionBackgroundProgress,
  useFolderTransitionState,
} from '@/components/folderTransition/useFolderTransitionController';

export function FolderTransitionDocumentEffects({
  controller,
}: {
  controller: FolderTransitionController;
}) {
  const transition = useFolderTransitionState(controller);
  const backgroundProgress = useFolderTransitionBackgroundProgress(controller);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const { body } = document;

    if (transition.overlayFolderId && transition.phase !== 'idle') {
      body.dataset.activeFolderTransitionId = transition.overlayFolderId;
      body.dataset.activeFolderTransitionPhase = transition.phase;
    } else {
      delete body.dataset.activeFolderTransitionId;
      delete body.dataset.activeFolderTransitionPhase;
    }

    return () => {
      delete body.dataset.activeFolderTransitionId;
      delete body.dataset.activeFolderTransitionPhase;
    };
  }, [transition.overlayFolderId, transition.phase]);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const progress = Math.max(0, Math.min(1, backgroundProgress));
    const inverseOpacity = 1 - progress;
    const blurPx = 18 * progress;
    const scale = 1 + (0.05 * progress);

    root.style.setProperty('--leaftab-folder-immersive-progress', progress.toFixed(4));
    root.style.setProperty('--leaftab-folder-immersive-inverse-opacity', inverseOpacity.toFixed(4));
    root.style.setProperty('--leaftab-folder-immersive-blur', `${blurPx.toFixed(2)}px`);
    root.style.setProperty('--leaftab-folder-immersive-scale', scale.toFixed(4));
  }, [backgroundProgress]);

  useEffect(() => () => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.removeProperty('--leaftab-folder-immersive-progress');
    root.style.removeProperty('--leaftab-folder-immersive-inverse-opacity');
    root.style.removeProperty('--leaftab-folder-immersive-blur');
    root.style.removeProperty('--leaftab-folder-immersive-scale');
  }, []);

  return null;
}
