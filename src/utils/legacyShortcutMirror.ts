import type { ScenarioShortcuts, Shortcut } from '@/types';

const isLegacyFolder = (shortcut: Shortcut | null | undefined) => {
  return Boolean(
    shortcut && (
      shortcut.kind === 'folder'
      || (
        typeof shortcut.kind === 'undefined'
        && Array.isArray(shortcut.children)
        && shortcut.children.length > 0
      )
    ),
  );
};

const toLegacyLinkShortcut = (shortcut: Shortcut): Shortcut => ({
  id: shortcut.id,
  title: shortcut.title || '',
  url: shortcut.url || '',
  icon: shortcut.icon || '',
  kind: 'link',
  useOfficialIcon: shortcut.useOfficialIcon !== false,
  autoUseOfficialIcon: shortcut.autoUseOfficialIcon !== false,
  officialIconAvailableAtSave: shortcut.officialIconAvailableAtSave === true,
  iconRendering: shortcut.iconRendering,
  iconColor: shortcut.iconColor || '',
});

export const flattenShortcutsForLegacyMirror = (shortcuts: readonly Shortcut[]): Shortcut[] => {
  const flattened: Shortcut[] = [];

  shortcuts.forEach((shortcut) => {
    if (!shortcut) return;
    if (isLegacyFolder(shortcut)) {
      flattened.push(
        ...flattenShortcutsForLegacyMirror(Array.isArray(shortcut.children) ? shortcut.children : []),
      );
      return;
    }
    flattened.push(toLegacyLinkShortcut(shortcut));
  });

  return flattened;
};

export const flattenScenarioShortcutsForLegacyMirror = (
  scenarioShortcuts: ScenarioShortcuts,
): ScenarioShortcuts => {
  return Object.fromEntries(
    Object.entries(scenarioShortcuts || {}).map(([scenarioId, shortcuts]) => [
      scenarioId,
      flattenShortcutsForLegacyMirror(Array.isArray(shortcuts) ? shortcuts : []),
    ]),
  );
};
