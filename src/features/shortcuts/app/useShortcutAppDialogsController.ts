import type { AppDialogsProps } from '@/components/AppDialogs';
import { useShortcutAppContext } from '@/features/shortcuts/app/ShortcutAppContext';

type ShortcutModalProps = AppDialogsProps['shortcutModalProps'];
type ScenarioEditDialogProps = AppDialogsProps['scenarioEditDialogProps'];

type ShortcutDialogVisualConfig = {
  shortcutIconCornerRadius: ShortcutModalProps['iconCornerRadius'];
  shortcutIconScale: ShortcutModalProps['iconScale'];
  shortcutIconAppearance: ShortcutModalProps['iconAppearance'];
};

export function useShortcutAppDialogsController({
  shortcutIconCornerRadius,
  shortcutIconScale,
  shortcutIconAppearance,
}: ShortcutDialogVisualConfig) {
  const shortcutApp = useShortcutAppContext();
  const scenarioEditMode = shortcutApp.state.domain.scenarioModes.find(
    (mode) => mode.id === shortcutApp.state.ui.currentEditScenarioId,
  ) ?? null;

  return {
    shortcutDialogs: {
      shortcutEditOpen: shortcutApp.state.ui.shortcutEditOpen,
      setShortcutEditOpen: shortcutApp.actions.ui.setShortcutEditOpen,
      shortcutModalMode: shortcutApp.state.ui.shortcutModalMode,
      setShortcutModalMode: shortcutApp.actions.ui.setShortcutModalMode,
      selectedShortcut: shortcutApp.state.ui.selectedShortcut,
      setSelectedShortcut: shortcutApp.actions.ui.setSelectedShortcut,
      editingTitle: shortcutApp.state.ui.editingTitle,
      setEditingTitle: shortcutApp.actions.ui.setEditingTitle,
      editingUrl: shortcutApp.state.ui.editingUrl,
      setEditingUrl: shortcutApp.actions.ui.setEditingUrl,
      setCurrentInsertIndex: shortcutApp.actions.ui.setCurrentInsertIndex,
      shortcutIconCornerRadius,
      shortcutIconScale,
      shortcutIconAppearance,
      onSaveShortcutEdit: shortcutApp.actions.shortcuts.handleSaveShortcutEdit,
      shortcutDeleteOpen: shortcutApp.state.ui.shortcutDeleteOpen,
      setShortcutDeleteOpen: shortcutApp.actions.ui.setShortcutDeleteOpen,
      onConfirmDeleteShortcut: shortcutApp.actions.shortcuts.handleConfirmDeleteShortcut,
    },
    scenarioDialogs: {
      scenarioCreateOpen: shortcutApp.state.ui.scenarioCreateOpen,
      setScenarioCreateOpen: shortcutApp.actions.ui.setScenarioCreateOpen,
      onCreateScenarioMode: shortcutApp.actions.shortcuts.handleCreateScenarioMode,
      scenarioEditOpen: shortcutApp.state.ui.scenarioEditOpen,
      setScenarioEditOpen: shortcutApp.actions.ui.setScenarioEditOpen,
      onUpdateScenarioMode: shortcutApp.actions.shortcuts.handleUpdateScenarioMode,
      scenarioEditMode: scenarioEditMode as ScenarioEditDialogProps['mode'],
    },
  };
}
