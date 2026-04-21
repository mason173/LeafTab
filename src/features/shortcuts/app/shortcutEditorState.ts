import type { SelectedShortcutState } from '@/features/shortcuts/model/types';

type ShortcutModalMode = 'add' | 'edit';
type ValueSetter<T> = (value: T) => void;

type ShortcutEditorStateSetters = {
  setShortcutModalMode: ValueSetter<ShortcutModalMode>;
  setSelectedShortcut: ValueSetter<SelectedShortcutState>;
  setEditingTitle: ValueSetter<string>;
  setEditingUrl: ValueSetter<string>;
  setCurrentInsertIndex: ValueSetter<number | null>;
};

type ShortcutEditorOpenSetters = ShortcutEditorStateSetters & {
  setShortcutEditOpen: ValueSetter<boolean>;
};

export function resetShortcutEditorState({
  setShortcutModalMode,
  setSelectedShortcut,
  setEditingTitle,
  setEditingUrl,
  setCurrentInsertIndex,
}: ShortcutEditorStateSetters) {
  setShortcutModalMode('add');
  setSelectedShortcut(null);
  setEditingTitle('');
  setEditingUrl('');
  setCurrentInsertIndex(null);
}

export function openCreateShortcutEditor(
  {
    setShortcutEditOpen,
    ...stateSetters
  }: ShortcutEditorOpenSetters,
  insertIndex: number,
) {
  resetShortcutEditorState(stateSetters);
  stateSetters.setCurrentInsertIndex(insertIndex);
  setShortcutEditOpen(true);
}
