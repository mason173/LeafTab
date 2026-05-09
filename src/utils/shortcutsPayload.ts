import type { CloudShortcutsPayloadV3, ScenarioMode, ScenarioShortcuts, Shortcut } from '../types';
import { defaultScenarioModes, makeScenarioId, type ScenarioIconKey } from '@/scenario/scenario';
import { getShortcutUrlIdentity } from '@/utils/shortcutIdentity';
import { normalizeShortcutIconColor, normalizeShortcutVisualMode } from '@/utils/shortcutIconPreferences';
import { pruneEmptyShortcutFolders } from '@/utils/shortcutFolders';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

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
  kind: 'link' | 'folder',
  title: string,
  url: string,
  occurrence: number,
) => {
  const prefix = kind === 'folder' ? 'fld' : 'sht';
  return `${prefix}_${shortHash(`${scenarioId}|${kind}|${title}|${url}|${occurrence}`)}`;
};

const readStringField = (candidate: Partial<Shortcut> & Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = candidate[key];
    if (typeof value === 'string') return value;
  }
  return '';
};

const normalizeCustomShortcutIcons = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([shortcutId, dataUrl]) => [
        typeof shortcutId === 'string' ? shortcutId.trim() : '',
        typeof dataUrl === 'string' ? dataUrl.trim() : '',
      ] as const)
      .filter(([shortcutId, dataUrl]) => shortcutId && dataUrl.startsWith('data:image/') && dataUrl.length <= 1_200_000),
  );
};

const readShortcutChildren = (candidate: Partial<Shortcut> & Record<string, unknown>): unknown[] => {
  const childCollections = [candidate.children, candidate.shortcuts, candidate.items];
  for (const value of childCollections) {
    if (Array.isArray(value)) return value;
  }
  return [];
};

const normalizeShortcutList = (
  value: unknown[],
  scenarioId: string,
  usedShortcutIds: Set<string>,
  seenUrlIdentities: Set<string>,
): Shortcut[] => {
  const nextShortcuts: Shortcut[] = [];
  const localIdentityCounts = new Map<string, number>();

  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    const candidate = item as Partial<Shortcut> & Record<string, unknown>;
    const children = readShortcutChildren(candidate);
    const isFolder = candidate.kind === 'folder' || children.length > 0;
    const title = readStringField(candidate, ['title', 'name']);
    const url = isFolder ? '' : readStringField(candidate, ['url', 'link', 'href', 'address', 'website']);
    const icon = readStringField(candidate, ['icon', 'iconUrl', 'favicon', 'faviconUrl']);
    const normalizedUrlIdentity = isFolder ? '' : getShortcutUrlIdentity(url);
    if (normalizedUrlIdentity && seenUrlIdentities.has(normalizedUrlIdentity)) {
      return;
    }
    const seed = `${isFolder ? 'folder' : 'link'}|${title}|${url}`;
    const occurrence = (localIdentityCounts.get(seed) || 0) + 1;
    localIdentityCounts.set(seed, occurrence);

    const requestedId = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    let nextId = requestedId;
    if (!nextId || usedShortcutIds.has(nextId)) {
      nextId = createFallbackShortcutId(scenarioId, isFolder ? 'folder' : 'link', title, url, occurrence);
      while (usedShortcutIds.has(nextId)) {
        nextId = createFallbackShortcutId(scenarioId, isFolder ? 'folder' : 'link', title, url, occurrence + index + 1);
      }
    }

    usedShortcutIds.add(nextId);
    if (isFolder) {
      nextShortcuts.push({
        id: nextId,
        title,
        url: '',
        icon: '',
        kind: 'folder',
        folderDisplayMode: (
          candidate.folderDisplayMode === 'large'
          || candidate.displayMode === 'large'
        ) ? 'large' : 'small',
        children: normalizeShortcutList(
          children,
          `${scenarioId}/${nextId}`,
          usedShortcutIds,
          seenUrlIdentities,
        ).filter((child) => child.kind !== 'folder'),
      });
      return;
    }

    if (normalizedUrlIdentity) {
      seenUrlIdentities.add(normalizedUrlIdentity);
    }
    nextShortcuts.push({
      id: nextId,
      title,
      url,
      icon,
      kind: 'link',
      useOfficialIcon: candidate.useOfficialIcon !== false,
      autoUseOfficialIcon: candidate.autoUseOfficialIcon !== false,
      officialIconAvailableAtSave: candidate.officialIconAvailableAtSave === true,
      officialIconColorOverride: candidate.officialIconColorOverride === true,
      iconRendering: normalizeShortcutVisualMode(candidate.iconRendering),
      iconColor: normalizeShortcutIconColor(candidate.iconColor),
    });
  });

  return nextShortcuts;
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
  if (!isRecord(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const next: ScenarioShortcuts = {};
  const usedShortcutIds = new Set<string>();
  Object.entries(obj).forEach(([scenarioId, value]) => {
    const seenUrlIdentities = new Set<string>();
    if (Array.isArray(value)) {
      next[scenarioId] = pruneEmptyShortcutFolders(
        normalizeShortcutList(value, scenarioId, usedShortcutIds, seenUrlIdentities),
      );
    } else if (isRecord(value) && Object.keys(value).length === 0) {
      next[scenarioId] = [];
    } else if (isRecord(value)) {
      const mappedEntries = Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, entry]) => entry);
      next[scenarioId] = pruneEmptyShortcutFolders(
        normalizeShortcutList(mappedEntries, scenarioId, usedShortcutIds, seenUrlIdentities),
      );
    }
  });
  return next;
};

type BuildCloudShortcutsPayloadArgs = {
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
  customShortcutIcons?: Record<string, string>;
  nextScenarioModes?: ScenarioMode[];
  nextSelectedScenarioId?: string;
  nextScenarioShortcuts?: ScenarioShortcuts;
};

export const buildCloudShortcutsPayload = ({
  scenarioModes,
  selectedScenarioId,
  scenarioShortcuts,
  customShortcutIcons,
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
    customShortcutIcons: customShortcutIcons || {},
  };
};

export const normalizeCloudShortcutsPayload = (raw: unknown, unnamedLabel: string): CloudShortcutsPayloadV3 | null => {
  if (!isRecord(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const hasScenarioPayloadShape = isRecord(obj.scenarioShortcuts) || isRecord(obj.scenarioGroups);
  const candidate = (obj.type === 'leaftab_backup' && isRecord(obj.data))
    ? ({ version: 3, ...(obj.data as Record<string, unknown>) } as Record<string, unknown>)
    : hasScenarioPayloadShape
      ? ({ version: 3, ...obj } as Record<string, unknown>)
      : obj;
  if (candidate.version !== 3) return null;
  const modes = normalizeScenarioModesList(candidate.scenarioModes, unnamedLabel);
  const shortcutsValue = normalizeScenarioShortcuts(candidate.scenarioShortcuts ?? candidate.scenarioGroups);
  const selectedIdCandidate = typeof candidate.selectedScenarioId === 'string' ? candidate.selectedScenarioId : modes[0]?.id ?? defaultScenarioModes[0].id;
  const finalSelectedId = modes.some((m) => m.id === selectedIdCandidate) ? selectedIdCandidate : modes[0]?.id ?? defaultScenarioModes[0].id;
  return {
    version: 3,
    scenarioModes: modes,
    selectedScenarioId: finalSelectedId,
    scenarioShortcuts: shortcutsValue,
    customShortcutIcons: normalizeCustomShortcutIcons(candidate.customShortcutIcons),
  };
};
