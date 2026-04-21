import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  FOLDER_CLOSE_DURATION_MS,
  FOLDER_OPEN_DURATION_MS,
  clamp01,
  resolveBackdropAnimationProgress,
  resolveFolderMotionProgress,
} from '@/components/shortcutFolderCompactAnimation';

export type ShortcutFolderOverlayRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ShortcutFolderOpeningSourceSnapshot = {
  folderId: string;
  sourceRect: ShortcutFolderOverlayRect;
  sourceBorderRadius?: number | null;
  sourceTitleRect?: ShortcutFolderOverlayRect | null;
  sourceChildRects: Array<{
    childId: string;
    rect: ShortcutFolderOverlayRect;
  }>;
  sourceChildSlotRects: ShortcutFolderOverlayRect[];
};

export type FolderTransitionPhase =
  | 'idle'
  | 'opening-measure'
  | 'opening-animate'
  | 'open'
  | 'closing-measure'
  | 'closing-animate';

export type FolderTransitionState = {
  activeFolderId: string | null;
  overlayFolderId: string | null;
  phase: FolderTransitionPhase;
  progress: number;
  sourceSnapshot: ShortcutFolderOpeningSourceSnapshot | null;
};

export type FolderTransitionController = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => FolderTransitionState;
  getBackgroundProgress: () => number;
  openFolder: (folderId: string, sourceSnapshot: ShortcutFolderOpeningSourceSnapshot | null) => void;
  requestClose: (folderId?: string | null) => void;
  runAfterClose: (folderId: string, action: () => void) => void;
  notifyOpeningReady: (folderId: string) => void;
  notifyClosingReady: (folderId: string) => void;
  clearImmediately: () => void;
  dispose: () => void;
};

const IDLE_STATE: FolderTransitionState = {
  activeFolderId: null,
  overlayFolderId: null,
  phase: 'idle',
  progress: 0,
  sourceSnapshot: null,
};

function resolveAnimationDurationMs(
  fromProgress: number,
  toProgress: number,
  activePhase: 'opening-animate' | 'closing-animate',
) {
  const distance = Math.abs(clamp01(toProgress) - clamp01(fromProgress));
  if (distance <= 0.0001) return 0;
  const baseDuration = activePhase === 'closing-animate'
    ? FOLDER_CLOSE_DURATION_MS
    : FOLDER_OPEN_DURATION_MS;
  return Math.max(1, Math.round(baseDuration * distance));
}

function resolveBackgroundProgress(state: FolderTransitionState) {
  if (state.phase === 'idle' || state.phase === 'opening-measure') {
    return 0;
  }
  if (state.phase === 'closing-measure' || state.phase === 'closing-animate') {
    return resolveBackdropAnimationProgress(state.progress, 'closing');
  }
  return resolveBackdropAnimationProgress(state.progress, 'opening');
}

function createFolderTransitionController(): FolderTransitionController {
  let state = IDLE_STATE;
  const listeners = new Set<() => void>();
  let animationFrameId: number | null = null;
  let animationRunId = 0;
  let afterCloseQueue: Array<() => void> = [];

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const commitState = (nextState: FolderTransitionState) => {
    state = nextState;
    emit();
  };

  const cancelAnimation = () => {
    animationRunId += 1;
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const finalizeClosedState = () => {
    cancelAnimation();
    commitState(IDLE_STATE);
    const queuedActions = afterCloseQueue;
    afterCloseQueue = [];
    queuedActions.forEach((action) => action());
  };

  const animateTo = (
    targetProgress: number,
    activePhase: 'opening-animate' | 'closing-animate',
  ) => {
    const fromProgress = clamp01(state.progress);
    const toProgress = clamp01(targetProgress);
    const durationMs = resolveAnimationDurationMs(fromProgress, toProgress, activePhase);
    const motionPhase = activePhase === 'closing-animate' ? 'closing' : 'opening';

    cancelAnimation();

    if (durationMs <= 0) {
      if (toProgress <= 0.0001) {
        finalizeClosedState();
        return;
      }
      commitState({
        ...state,
        phase: 'open',
        progress: 1,
      });
      return;
    }

    const runId = animationRunId;
    const startTime = window.performance.now();

    commitState({
      ...state,
      phase: activePhase,
    });

    const tick = (timestamp: number) => {
      if (animationRunId !== runId) return;
      const elapsed = timestamp - startTime;
      const timeProgress = clamp01(elapsed / durationMs);
      const easedProgress = resolveFolderMotionProgress(timeProgress, motionPhase);
      const nextProgress = fromProgress + ((toProgress - fromProgress) * easedProgress);

      commitState({
        ...state,
        phase: activePhase,
        progress: nextProgress,
      });

      if (timeProgress >= 1) {
        animationFrameId = null;
        if (toProgress <= 0.0001) {
          finalizeClosedState();
          return;
        }
        commitState({
          ...state,
          phase: 'open',
          progress: 1,
        });
        return;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    getBackgroundProgress: () => resolveBackgroundProgress(state),
    openFolder: (folderId, sourceSnapshot) => {
      if (!folderId) return;
      afterCloseQueue = [];
      cancelAnimation();
      commitState({
        activeFolderId: folderId,
        overlayFolderId: folderId,
        phase: 'opening-measure',
        progress: 0,
        sourceSnapshot,
      });
    },
    requestClose: (folderId) => {
      if (state.phase === 'idle') return;
      if (folderId && state.overlayFolderId !== folderId && state.activeFolderId !== folderId) {
        return;
      }
      if (state.phase === 'closing-measure' || state.phase === 'closing-animate') {
        return;
      }
      cancelAnimation();
      commitState({
        ...state,
        phase: 'closing-measure',
        progress: 1,
      });
    },
    runAfterClose: (folderId, action) => {
      if (state.phase === 'idle' || state.overlayFolderId !== folderId) {
        action();
        return;
      }
      afterCloseQueue.push(action);
      if (state.phase !== 'closing-measure' && state.phase !== 'closing-animate') {
        cancelAnimation();
        commitState({
          ...state,
          phase: 'closing-measure',
          progress: 1,
        });
      }
    },
    notifyOpeningReady: (folderId) => {
      if (state.phase !== 'opening-measure' || state.overlayFolderId !== folderId) {
        return;
      }
      animateTo(1, 'opening-animate');
    },
    notifyClosingReady: (folderId) => {
      if (state.phase !== 'closing-measure' || state.overlayFolderId !== folderId) {
        return;
      }
      animateTo(0, 'closing-animate');
    },
    clearImmediately: () => {
      afterCloseQueue = [];
      cancelAnimation();
      commitState(IDLE_STATE);
    },
    dispose: () => {
      afterCloseQueue = [];
      cancelAnimation();
      listeners.clear();
      state = IDLE_STATE;
    },
  };
}

export function useFolderTransitionController() {
  const controllerRef = useRef<FolderTransitionController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createFolderTransitionController();
  }

  useEffect(() => () => {
    controllerRef.current?.dispose();
  }, []);

  return controllerRef.current;
}

export function useFolderTransitionState(controller: FolderTransitionController) {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
}

export function useFolderTransitionActiveFolderId(controller: FolderTransitionController) {
  return useSyncExternalStore(
    controller.subscribe,
    () => controller.getSnapshot().activeFolderId,
    () => null,
  );
}

export function useFolderTransitionOverlayFolderId(controller: FolderTransitionController) {
  return useSyncExternalStore(
    controller.subscribe,
    () => controller.getSnapshot().overlayFolderId,
    () => null,
  );
}

export function useFolderTransitionBackgroundProgress(controller: FolderTransitionController) {
  return useSyncExternalStore(
    controller.subscribe,
    controller.getBackgroundProgress,
    () => 0,
  );
}
