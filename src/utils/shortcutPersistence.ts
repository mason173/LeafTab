import defaultProfile from '@/assets/profiles/default-profile.json';
import { defaultScenarioModes } from '@/scenario/scenario';
import type { LocalProfileSnapshot } from '@/utils/localProfileStorage';
import {
  clearLocalNeedsCloudReconcile,
  markLocalNeedsCloudReconcile,
  persistLocalProfileSnapshot,
  readLocalProfileSnapshot,
} from '@/utils/localProfileStorage';
import { emitLocalProfileUpdated } from '@/utils/localProfileSync';
import { normalizeScenarioModesList, normalizeScenarioShortcuts } from '@/utils/shortcutsPayload';
import { hasShortcutUrlConflict } from '@/utils/shortcutIdentity';
import { normalizeShortcutIconColor } from '@/utils/shortcutIconPreferences';
import type { Shortcut, ShortcutDraft } from '@/types';

type SaveShortcutOptions = {
  scenarioId?: string | null;
  insertIndex?: number | null;
};

type SaveShortcutSuccess = {
  ok: true;
  savedShortcut: Shortcut;
  snapshot: LocalProfileSnapshot;
};

type SaveShortcutFailure = {
  ok: false;
  reason: 'duplicate';
};

export type SaveShortcutResult = SaveShortcutSuccess | SaveShortcutFailure;

const DEFAULT_UNNAMED_SCENARIO = defaultScenarioModes[0]?.name || 'Shortcut';

function createShortcutId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `sht_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function buildFallbackSnapshot(): LocalProfileSnapshot {
  const profileData = defaultProfile?.data || {};
  const scenarioModes = normalizeScenarioModesList(profileData.scenarioModes, DEFAULT_UNNAMED_SCENARIO);
  const scenarioShortcuts = normalizeScenarioShortcuts(profileData.scenarioShortcuts);
  const selectedScenarioIdCandidate = typeof profileData.selectedScenarioId === 'string'
    ? profileData.selectedScenarioId
    : scenarioModes[0]?.id;
  const selectedScenarioId = scenarioModes.some((mode) => mode.id === selectedScenarioIdCandidate)
    ? selectedScenarioIdCandidate
    : scenarioModes[0]?.id || defaultScenarioModes[0].id;

  return {
    scenarioModes,
    selectedScenarioId,
    scenarioShortcuts,
  };
}

function normalizeSnapshot(snapshot: LocalProfileSnapshot | null): LocalProfileSnapshot {
  const fallback = buildFallbackSnapshot();
  const source = snapshot || fallback;
  const scenarioModes = Array.isArray(source.scenarioModes) && source.scenarioModes.length
    ? source.scenarioModes
    : fallback.scenarioModes;
  const scenarioShortcuts = normalizeScenarioShortcuts(source.scenarioShortcuts);
  const selectedScenarioId = scenarioModes.some((mode) => mode.id === source.selectedScenarioId)
    ? source.selectedScenarioId
    : fallback.selectedScenarioId;

  return {
    ...source,
    scenarioModes,
    selectedScenarioId,
    scenarioShortcuts,
  };
}

export function readShortcutScenarioContext() {
  const snapshot = normalizeSnapshot(readLocalProfileSnapshot());
  const selectedScenario = snapshot.scenarioModes.find((mode) => mode.id === snapshot.selectedScenarioId) || snapshot.scenarioModes[0];
  return {
    snapshot,
    selectedScenario,
  };
}

export function saveShortcutToLocalProfile(
  draft: ShortcutDraft,
  options?: SaveShortcutOptions,
): SaveShortcutResult {
  const current = normalizeSnapshot(readLocalProfileSnapshot());
  const targetScenarioId = options?.scenarioId && current.scenarioModes.some((mode) => mode.id === options.scenarioId)
    ? options.scenarioId
    : current.selectedScenarioId;
  const currentScenarioShortcuts = current.scenarioShortcuts[targetScenarioId] ?? [];

  if (hasShortcutUrlConflict(currentScenarioShortcuts, draft.url)) {
    return { ok: false, reason: 'duplicate' };
  }

  const savedShortcut: Shortcut = {
    id: createShortcutId(),
    title: draft.title.trim(),
    url: draft.url.trim(),
    icon: draft.icon || '',
    useOfficialIcon: draft.useOfficialIcon !== false,
    autoUseOfficialIcon: draft.autoUseOfficialIcon !== false,
    officialIconAvailableAtSave: draft.officialIconAvailableAtSave === true,
    officialIconColorOverride: draft.officialIconColorOverride === true,
    iconRendering: draft.iconRendering,
    iconColor: normalizeShortcutIconColor(draft.iconColor),
  };

  const insertIndex = typeof options?.insertIndex === 'number'
    ? Math.min(Math.max(options.insertIndex, 0), currentScenarioShortcuts.length)
    : currentScenarioShortcuts.length;
  const nextScenarioShortcuts = {
    ...current.scenarioShortcuts,
    [targetScenarioId]: [
      ...currentScenarioShortcuts.slice(0, insertIndex),
      savedShortcut,
      ...currentScenarioShortcuts.slice(insertIndex),
    ],
  };

  const nextSnapshot: LocalProfileSnapshot = {
    ...current,
    selectedScenarioId: targetScenarioId,
    scenarioShortcuts: nextScenarioShortcuts,
  };
  persistLocalProfileSnapshot(nextSnapshot);

  const payload = {
    version: 3 as const,
    scenarioModes: nextSnapshot.scenarioModes,
    selectedScenarioId: nextSnapshot.selectedScenarioId,
    scenarioShortcuts: nextSnapshot.scenarioShortcuts,
  };
  const hasStoredCloudSession = Boolean(localStorage.getItem('token') && localStorage.getItem('username'));
  if (hasStoredCloudSession) {
    localStorage.setItem('leaf_tab_shortcuts_cache', JSON.stringify(payload));
    localStorage.setItem('leaf_tab_sync_pending', 'true');
    clearLocalNeedsCloudReconcile();
  } else {
    markLocalNeedsCloudReconcile('signed_out_edit');
  }

  emitLocalProfileUpdated();

  return {
    ok: true,
    savedShortcut,
    snapshot: nextSnapshot,
  };
}
