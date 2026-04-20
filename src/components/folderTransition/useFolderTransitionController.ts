import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type FolderTransitionState = {
  activeFolderId: string | null;
  overlayFolderId: string | null;
  phase: FolderTransitionPhase;
  progress: number;
  sourceSnapshot: ShortcutFolderOpeningSourceSnapshot | null;
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

export function useFolderTransitionController() {
  const [state, setState] = useState<FolderTransitionState>(IDLE_STATE);
  const animationFrameRef = useRef<number | null>(null);
  const animationRunIdRef = useRef(0);
  const stateRef = useRef<FolderTransitionState>(IDLE_STATE);
  const afterCloseQueueRef = useRef<Array<() => void>>([]);

  const cancelAnimation = useCallback(() => {
    animationRunIdRef.current += 1;
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const finalizeClosedState = useCallback(() => {
    cancelAnimation();
    stateRef.current = IDLE_STATE;
    setState(IDLE_STATE);
    const queuedActions = afterCloseQueueRef.current;
    afterCloseQueueRef.current = [];
    queuedActions.forEach((action) => action());
  }, [cancelAnimation]);

  const animateTo = useCallback((targetProgress: number, activePhase: 'opening-animate' | 'closing-animate') => {
    const currentState = stateRef.current;
    const fromProgress = clamp01(currentState.progress);
    const toProgress = clamp01(targetProgress);
    const durationMs = resolveAnimationDurationMs(fromProgress, toProgress, activePhase);
    const motionPhase = activePhase === 'closing-animate' ? 'closing' : 'opening';

    cancelAnimation();

    if (durationMs <= 0) {
      if (toProgress <= 0.0001) {
        finalizeClosedState();
        return;
      }
      const settledState: FolderTransitionState = {
        ...currentState,
        phase: 'open',
        progress: 1,
      };
      stateRef.current = settledState;
      setState(settledState);
      return;
    }

    const runId = animationRunIdRef.current;
    const startTime = window.performance.now();
    const tick = (timestamp: number) => {
      if (animationRunIdRef.current !== runId) return;
      const elapsed = timestamp - startTime;
      const timeProgress = clamp01(elapsed / durationMs);
      const easedProgress = resolveFolderMotionProgress(timeProgress, motionPhase);
      const nextProgress = fromProgress + ((toProgress - fromProgress) * easedProgress);
      const nextState: FolderTransitionState = {
        ...stateRef.current,
        phase: activePhase,
        progress: nextProgress,
      };
      stateRef.current = nextState;
      setState(nextState);

      if (timeProgress >= 1) {
        animationFrameRef.current = null;
        if (toProgress <= 0.0001) {
          finalizeClosedState();
          return;
        }
        const settledState: FolderTransitionState = {
          ...stateRef.current,
          phase: 'open',
          progress: 1,
        };
        stateRef.current = settledState;
        setState(settledState);
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    const nextState: FolderTransitionState = {
      ...currentState,
      phase: activePhase,
    };
    stateRef.current = nextState;
    setState(nextState);
    animationFrameRef.current = window.requestAnimationFrame(tick);
  }, [cancelAnimation, finalizeClosedState]);

  const openFolder = useCallback((folderId: string, sourceSnapshot: ShortcutFolderOpeningSourceSnapshot | null) => {
    if (!folderId) return;
    afterCloseQueueRef.current = [];
    cancelAnimation();
    const nextState: FolderTransitionState = {
      activeFolderId: folderId,
      overlayFolderId: folderId,
      phase: 'opening-measure',
      progress: 0,
      sourceSnapshot,
    };
    stateRef.current = nextState;
    setState(nextState);
  }, [cancelAnimation]);

  const requestClose = useCallback((folderId?: string | null) => {
    const currentState = stateRef.current;
    if (currentState.phase === 'idle') return;
    if (folderId && currentState.overlayFolderId !== folderId && currentState.activeFolderId !== folderId) {
      return;
    }
    if (currentState.phase === 'closing-measure' || currentState.phase === 'closing-animate') {
      return;
    }
    cancelAnimation();
    const nextState: FolderTransitionState = {
      ...currentState,
      phase: 'closing-measure',
      progress: 1,
    };
    stateRef.current = nextState;
    setState(nextState);
  }, [cancelAnimation]);

  const runAfterClose = useCallback((folderId: string, action: () => void) => {
    const currentState = stateRef.current;
    if (currentState.phase === 'idle' || currentState.overlayFolderId !== folderId) {
      action();
      return;
    }
    afterCloseQueueRef.current.push(action);
    requestClose(folderId);
  }, [requestClose]);

  const notifyOpeningReady = useCallback((folderId: string) => {
    const currentState = stateRef.current;
    if (currentState.phase !== 'opening-measure' || currentState.overlayFolderId !== folderId) {
      return;
    }
    animateTo(1, 'opening-animate');
  }, [animateTo]);

  const notifyClosingReady = useCallback((folderId: string) => {
    const currentState = stateRef.current;
    if (currentState.phase !== 'closing-measure' || currentState.overlayFolderId !== folderId) {
      return;
    }
    animateTo(0, 'closing-animate');
  }, [animateTo]);

  const clearImmediately = useCallback(() => {
    afterCloseQueueRef.current = [];
    cancelAnimation();
    stateRef.current = IDLE_STATE;
    setState(IDLE_STATE);
  }, [cancelAnimation]);

  useEffect(() => () => {
    cancelAnimation();
  }, [cancelAnimation]);

  const backgroundProgress = useMemo(() => {
    if (state.phase === 'idle' || state.phase === 'opening-measure') {
      return 0;
    }
    if (state.phase === 'closing-measure' || state.phase === 'closing-animate') {
      return resolveBackdropAnimationProgress(state.progress, 'closing');
    }
    return resolveBackdropAnimationProgress(state.progress, 'opening');
  }, [state.phase, state.progress]);

  return {
    transition: state,
    activeFolderId: state.activeFolderId,
    overlayFolderId: state.overlayFolderId,
    backgroundProgress,
    openFolder,
    requestClose,
    runAfterClose,
    notifyOpeningReady,
    notifyClosingReady,
    clearImmediately,
  };
}
