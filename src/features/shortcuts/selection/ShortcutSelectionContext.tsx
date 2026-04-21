import { getStrictContext } from '@/lib/get-strict-context';

export type ShortcutSelectionContextValue = {
  selectionMode: boolean;
  selectedShortcutIndexes: ReadonlySet<number>;
  onToggleShortcutSelection: (shortcutIndex: number) => void;
};

export const [ShortcutSelectionProvider, useShortcutSelection] =
  getStrictContext<ShortcutSelectionContextValue>('ShortcutSelectionProvider');
