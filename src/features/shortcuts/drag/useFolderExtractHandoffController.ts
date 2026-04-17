import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Shortcut } from '@/types';
import { buildDragAnchor } from './pointerDragSession';
import type { ActiveDragSession } from './dragSessionRuntime';
import type { MeasuredDragItem } from './gridDragEngine';
import type { FolderDragSessionMeta, FolderExtractDragStartPayload } from './types';

const EXTRACT_HANDOFF_DELAY_MS = 520;

export function useFolderExtractHandoffController<TItem extends { shortcut: Shortcut }>(params: {
  folderId: string;
  activeDragRef: MutableRefObject<ActiveDragSession<string, FolderDragSessionMeta> | null>;
  getDragLayoutSnapshot: <TResult>(measure: () => TResult) => TResult;
  measureCurrentItems: () => Array<MeasuredDragItem<TItem>>;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
}) {
  const extractHandoffTimerRef = useRef<number | null>(null);
  const latestPointerRef = useRef<{ x: number; y: number } | null>(null);
  const clearDragStateRef = useRef<() => void>(() => undefined);

  const performExtractHandoff = useCallback((pointer: { x: number; y: number }) => {
    const session = params.activeDragRef.current;
    if (!session) return;

    const activeItem = params.getDragLayoutSnapshot(params.measureCurrentItems)
      .find((item) => item.shortcut.id === session.activeId);
    if (!activeItem) return;

    const anchor = buildDragAnchor({
      rect: activeItem.rect,
      previewOffset: session.previewOffset,
    });
    clearDragStateRef.current();
    params.onExtractDragStart?.({
      folderId: params.folderId,
      shortcutId: activeItem.shortcut.id,
      pointerId: session.pointerId,
      pointerType: session.pointerType as 'mouse' | 'pen' | 'touch',
      pointer,
      anchor,
    });
  }, [
    params.activeDragRef,
    params.folderId,
    params.getDragLayoutSnapshot,
    params.measureCurrentItems,
    params.onExtractDragStart,
  ]);

  const clearExtractHandoffTimer = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) {
      window.clearTimeout(extractHandoffTimerRef.current);
      extractHandoffTimerRef.current = null;
    }
  }, []);

  const ensureExtractHandoffTimer = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) return;

    extractHandoffTimerRef.current = window.setTimeout(() => {
      extractHandoffTimerRef.current = null;
      const pointer = latestPointerRef.current;
      if (pointer) {
        performExtractHandoff(pointer);
      }
    }, EXTRACT_HANDOFF_DELAY_MS);
  }, [performExtractHandoff]);

  const publishLatestPointer = useCallback((pointer: { x: number; y: number } | null) => {
    latestPointerRef.current = pointer;
  }, []);

  const bindClearDragState = useCallback((clearDragState: () => void) => {
    clearDragStateRef.current = clearDragState;
  }, []);

  return {
    clearExtractHandoffTimer,
    ensureExtractHandoffTimer,
    publishLatestPointer,
    bindClearDragState,
  };
}
