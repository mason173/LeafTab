import { useCallback, useRef } from 'react';

type FolderPreviewSlotEntry = {
  childId: string;
  index: number;
  element: HTMLElement;
};

const folderPreviewRoots = new Map<string, HTMLElement>();
const folderPreviewSlots = new Map<string, Map<string, FolderPreviewSlotEntry>>();

function buildSlotKey(childId: string, index: number) {
  return `${index}:${childId}`;
}

function getSortedFolderPreviewSlots(folderId: string): FolderPreviewSlotEntry[] {
  const slots = folderPreviewSlots.get(folderId);
  if (!slots) {
    return [];
  }

  return [...slots.values()].sort((left, right) => {
    if (left.index !== right.index) {
      return left.index - right.index;
    }
    return left.childId.localeCompare(right.childId);
  });
}

export function useFolderPreviewRootRef(folderId: string) {
  const currentNodeRef = useRef<HTMLElement | null>(null);

  return useCallback((node: HTMLElement | null) => {
    const currentNode = currentNodeRef.current;
    if (currentNode && folderPreviewRoots.get(folderId) === currentNode) {
      folderPreviewRoots.delete(folderId);
    }

    currentNodeRef.current = node;
    if (node) {
      folderPreviewRoots.set(folderId, node);
    }
  }, [folderId]);
}

export function useFolderPreviewSlotRef(
  folderId: string,
  childId: string,
  index: number,
) {
  const slotKey = buildSlotKey(childId, index);
  const currentNodeRef = useRef<HTMLElement | null>(null);

  return useCallback((node: HTMLElement | null) => {
    const slots = folderPreviewSlots.get(folderId);
    const currentNode = currentNodeRef.current;
    if (currentNode && slots?.get(slotKey)?.element === currentNode) {
      slots.delete(slotKey);
      if (slots.size === 0) {
        folderPreviewSlots.delete(folderId);
      }
    }

    currentNodeRef.current = node;
    if (!node) {
      return;
    }

    const nextSlots = folderPreviewSlots.get(folderId) ?? new Map<string, FolderPreviewSlotEntry>();
    nextSlots.set(slotKey, {
      childId,
      index,
      element: node,
    });
    folderPreviewSlots.set(folderId, nextSlots);
  }, [childId, folderId, index, slotKey]);
}

export function getFolderPreviewRoot(folderId: string): HTMLElement | null {
  return folderPreviewRoots.get(folderId) ?? null;
}

export function getFolderPreviewSlotEntries(folderId: string): FolderPreviewSlotEntry[] {
  return getSortedFolderPreviewSlots(folderId);
}

export function getFolderPreviewSlotByChildId(
  folderId: string,
  childId: string,
): HTMLElement | null {
  const entry = getSortedFolderPreviewSlots(folderId).find((slot) => slot.childId === childId);
  return entry?.element ?? null;
}

export function getFolderPreviewSlotElements(folderId: string): HTMLElement[] {
  return getSortedFolderPreviewSlots(folderId).map((slot) => slot.element);
}
