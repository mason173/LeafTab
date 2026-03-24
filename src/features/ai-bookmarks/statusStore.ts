import type { BookmarkSemanticSearchStatus } from '@/features/ai-bookmarks/types';

const statusListeners = new Set<(status: BookmarkSemanticSearchStatus) => void>();

const initialStatus: BookmarkSemanticSearchStatus = {
  activity: 'idle',
  modelState: 'idle',
  indexState: 'idle',
  available: false,
  indexedCount: 0,
  builtAt: null,
  lastError: null,
  progress: null,
  progressLabel: null,
};

let status: BookmarkSemanticSearchStatus = initialStatus;

export function setSemanticBookmarkSearchStatus(
  partial: Partial<BookmarkSemanticSearchStatus>,
): void {
  status = {
    ...status,
    ...partial,
  };
  for (const listener of statusListeners) {
    listener(status);
  }
}

export function resetSemanticBookmarkSearchStatus(
  partial?: Partial<BookmarkSemanticSearchStatus>,
): void {
  status = {
    ...initialStatus,
    ...partial,
  };
  for (const listener of statusListeners) {
    listener(status);
  }
}

export function getSemanticBookmarkSearchStatus(): BookmarkSemanticSearchStatus {
  return status;
}

export function subscribeSemanticBookmarkSearchStatus(
  listener: (status: BookmarkSemanticSearchStatus) => void,
): () => void {
  statusListeners.add(listener);
  listener(status);
  return () => {
    statusListeners.delete(listener);
  };
}
