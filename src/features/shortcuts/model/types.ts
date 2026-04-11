import type { Shortcut } from '@/types';

export type ShortcutContainerPath =
  | { type: 'root' }
  | { type: 'folder'; folderId: string };

export type ShortcutFolder = Shortcut & {
  kind: 'folder';
  children: Shortcut[];
};

export type CreateShortcutFolder = (children: Shortcut[]) => Shortcut;
