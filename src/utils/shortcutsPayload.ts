import type { CloudShortcutsPayloadV3, ScenarioMode, ScenarioShortcuts, Shortcut } from '../types';
import { defaultScenarioModes, makeScenarioId, type ScenarioIconKey } from '@/scenario/scenario';
import { normalizeShortcutIconColor, normalizeShortcutVisualMode } from '@/utils/shortcutIconPreferences';

const shortHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const createFallbackShortcutId = (
  scenarioId: string,
  title: string,
  url: string,
  occurrence: number,
) => {
  return `sht_${shortHash(`${scenarioId}|${title}|${url}|${occurrence}`)}`;
};

export const normalizeScenarioModesList = (raw: unknown, unnamedLabel: string): ScenarioMode[] => {
  if (!Array.isArray(raw)) return defaultScenarioModes;
  const normalized = raw
    .filter((v): v is ScenarioMode => Boolean(v) && typeof v === 'object')
    .map((v: any) => ({
      id: typeof v.id === 'string' ? v.id : makeScenarioId(),
      name: typeof v.name === 'string' ? v.name.slice(0, 12) : unnamedLabel,
      color: typeof v.color === 'string' ? v.color : defaultScenarioModes[0].color,
      icon: (typeof v.icon === 'string' ? v.icon : defaultScenarioModes[0].icon) as ScenarioIconKey,
    }))
    .filter((v) => v.id && v.name && v.color && v.icon);
  return normalized.length ? normalized : defaultScenarioModes;
};

export const normalizeScenarioShortcuts = (raw: unknown): ScenarioShortcuts => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const next: ScenarioShortcuts = {};
  const usedShortcutIds = new Set<string>();
  Object.entries(obj).forEach(([scenarioId, value]) => {
    if (Array.isArray(value)) {
      const nextShortcuts: Shortcut[] = [];
      const localIdentityCounts = new Map<string, number>();

      value.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;
        const candidate = item as Partial<Shortcut>;
        const title = typeof candidate.title === 'string' ? candidate.title : '';
        const url = typeof candidate.url === 'string' ? candidate.url : '';
        const icon = typeof candidate.icon === 'string' ? candidate.icon : '';
        const seed = `${title}|${url}`;
        const occurrence = (localIdentityCounts.get(seed) || 0) + 1;
        localIdentityCounts.set(seed, occurrence);

        const requestedId = typeof candidate.id === 'string' ? candidate.id.trim() : '';
        let nextId = requestedId;
        if (!nextId || usedShortcutIds.has(nextId)) {
          nextId = createFallbackShortcutId(scenarioId, title, url, occurrence);
          while (usedShortcutIds.has(nextId)) {
            nextId = createFallbackShortcutId(scenarioId, title, url, occurrence + index + 1);
          }
        }

        usedShortcutIds.add(nextId);
        nextShortcuts.push({
          id: nextId,
          title,
          url,
          icon,
          useOfficialIcon: candidate.useOfficialIcon !== false,
          autoUseOfficialIcon: candidate.autoUseOfficialIcon !== false,
          officialIconAvailableAtSave: candidate.officialIconAvailableAtSave === true,
          iconRendering: normalizeShortcutVisualMode(candidate.iconRendering),
          iconColor: normalizeShortcutIconColor(candidate.iconColor),
        });
      });

      next[scenarioId] = nextShortcuts;
    } else if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
      next[scenarioId] = [];
    }
  });
  return next;
};

type BuildCloudShortcutsPayloadArgs = {
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
  nextScenarioModes?: ScenarioMode[];
  nextSelectedScenarioId?: string;
  nextScenarioShortcuts?: ScenarioShortcuts;
};

export const buildCloudShortcutsPayload = ({
  scenarioModes,
  selectedScenarioId,
  scenarioShortcuts,
  nextScenarioModes,
  nextSelectedScenarioId,
  nextScenarioShortcuts,
}: BuildCloudShortcutsPayloadArgs): CloudShortcutsPayloadV3 => {
  const modes = nextScenarioModes ?? scenarioModes;
  const selectedId = nextSelectedScenarioId ?? selectedScenarioId;
  const shortcutsValue = nextScenarioShortcuts ?? scenarioShortcuts;
  const finalSelectedId = modes.some((m) => m.id === selectedId) ? selectedId : modes[0]?.id ?? defaultScenarioModes[0].id;
  return {
    version: 3,
    scenarioModes: modes,
    selectedScenarioId: finalSelectedId,
    scenarioShortcuts: shortcutsValue,
  };
};

export const normalizeCloudShortcutsPayload = (raw: unknown, unnamedLabel: string): CloudShortcutsPayloadV3 | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const candidate = (obj.type === 'leaftab_backup' && obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data))
    ? ({ version: 3, ...(obj.data as any) } as Record<string, unknown>)
    : obj;
  if (candidate.version !== 3) return null;
  const modes = normalizeScenarioModesList(candidate.scenarioModes, unnamedLabel);
  const shortcutsValue = normalizeScenarioShortcuts(candidate.scenarioShortcuts);
  const selectedIdCandidate = typeof candidate.selectedScenarioId === 'string' ? candidate.selectedScenarioId : modes[0]?.id ?? defaultScenarioModes[0].id;
  const finalSelectedId = modes.some((m) => m.id === selectedIdCandidate) ? selectedIdCandidate : modes[0]?.id ?? defaultScenarioModes[0].id;
  return {
    version: 3,
    scenarioModes: modes,
    selectedScenarioId: finalSelectedId,
    scenarioShortcuts: shortcutsValue,
  };
};
