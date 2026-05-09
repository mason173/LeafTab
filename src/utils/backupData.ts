import { defaultScenarioModes } from '@/scenario/scenario';
import { getShortcutIdentityKey } from './shortcutIdentity';

export type ScenarioShortcuts = Record<string, any[]>;

export type WebdavPayload = {
  scenarioModes: Array<any>;
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
  customShortcutIcons?: Record<string, string>;
};

export type LeafTabBackupEnvelope = {
  type: 'leaftab_backup';
  version: number;
  timestamp?: string;
  data: any;
  meta?: Record<string, any>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const THIRD_PARTY_IMPORT_SCENARIO_ID = 'imported-shortcuts';

type ImportedShortcutCandidate = {
  id?: string;
  title: string;
  url?: string;
  icon?: string;
  kind?: 'link' | 'folder';
  children?: ImportedShortcutCandidate[];
};

export const mergeShortcutsLocalFirst = (localShortcuts: any[], remoteShortcuts: any[]) => {
  const keySet = new Set<string>();
  const merged: any[] = [];
  localShortcuts.forEach((shortcut, index) => {
    const key = getShortcutIdentityKey(shortcut, index);
    if (keySet.has(key)) return;
    keySet.add(key);
    merged.push(shortcut);
  });
  remoteShortcuts.forEach((shortcut, index) => {
    const key = getShortcutIdentityKey(shortcut, index);
    if (keySet.has(key)) return;
    keySet.add(key);
    merged.push(shortcut);
  });
  return merged;
};

const dedupeShortcutList = (list: any[]) => mergeShortcutsLocalFirst(list, []);

const dedupeScenarioShortcutsMap = (raw: unknown): ScenarioShortcuts => {
  if (!isRecord(raw)) return {};
  const next: ScenarioShortcuts = {};
  Object.entries(raw as Record<string, unknown>).forEach(([modeId, value]) => {
    if (Array.isArray(value)) {
      next[modeId] = dedupeShortcutList(value);
      return;
    }
    if (isRecord(value) && Object.keys(value as object).length === 0) {
      next[modeId] = [];
      return;
    }
    if (isRecord(value)) {
      const entries = Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, entry]) => entry);
      next[modeId] = dedupeShortcutList(entries);
    }
  });
  return next;
};

export const toScenarioShortcuts = (data: any): ScenarioShortcuts | null => {
  if (data?.scenarioShortcuts) return data.scenarioShortcuts;
  if (data?.scenarioGroups) return data.scenarioGroups;
  return null;
};

const readTrimmedString = (value: unknown) => {
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeCustomShortcutIcons = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([shortcutId, dataUrl]) => [readTrimmedString(shortcutId), readTrimmedString(dataUrl)] as const)
      .filter(([shortcutId, dataUrl]) => shortcutId && dataUrl.startsWith('data:image/') && dataUrl.length <= 1_200_000),
  );
};

const isWebUrl = (value: string) => /^https?:\/\//i.test(value);

const isLikelyShortcutUrl = (value: string) => {
  if (!value) return false;
  if (isWebUrl(value)) return true;
  return /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/:?#]|$)/i.test(value);
};

const normalizeImportedShortcutTree = (items: ImportedShortcutCandidate[]): ImportedShortcutCandidate[] => {
  const normalized: ImportedShortcutCandidate[] = [];
  items.forEach((item) => {
    const title = item.title.trim();
    const icon = readTrimmedString(item.icon);
    const id = readTrimmedString(item.id);
    const children = Array.isArray(item.children) ? normalizeImportedShortcutTree(item.children) : [];
    const isFolder = item.kind === 'folder' || children.length > 0;

    if (isFolder) {
      if (!children.length) return;
      normalized.push({
        id,
        title: title || 'Folder',
        icon: '',
        kind: 'folder',
        children,
      });
      return;
    }

    const url = readTrimmedString(item.url);
    if (!title || !isLikelyShortcutUrl(url)) return;
    normalized.push({
      id,
      title,
      url,
      icon,
      kind: 'link',
    });
  });
  return normalized;
};

const buildThirdPartyPayload = (shortcuts: ImportedShortcutCandidate[]): WebdavPayload | null => {
  const normalizedShortcuts = normalizeImportedShortcutTree(shortcuts);
  if (!normalizedShortcuts.length) return null;
  return {
    scenarioModes: [{
      ...defaultScenarioModes[0],
      id: THIRD_PARTY_IMPORT_SCENARIO_ID,
      name: '导入的快捷方式',
    }],
    selectedScenarioId: THIRD_PARTY_IMPORT_SCENARIO_ID,
    scenarioShortcuts: {
      [THIRD_PARTY_IMPORT_SCENARIO_ID]: dedupeShortcutList(normalizedShortcuts),
    },
  };
};

const parseInfinityShortcutItem = (value: unknown): ImportedShortcutCandidate | null => {
  if (!isRecord(value)) return null;
  const title = readTrimmedString(value.name);
  const url = readTrimmedString(value.target);
  const icon = readTrimmedString(value.bgImage);
  const id = readTrimmedString(value.id) || readTrimmedString(value.uuid);
  const children = Array.isArray(value.children)
    ? value.children
        .map((child) => parseInfinityShortcutItem(child))
        .filter((child): child is ImportedShortcutCandidate => Boolean(child))
    : [];

  if (children.length > 0) {
    return {
      id,
      title: title || '文件夹',
      kind: 'folder',
      children,
    };
  }

  if (value.type !== 'web' && !isWebUrl(url)) return null;
  if (!title || !isLikelyShortcutUrl(url)) return null;
  return {
    id,
    title,
    url,
    icon,
    kind: 'link',
  };
};

const parseInfinityBackup = (raw: Record<string, unknown>): WebdavPayload | null => {
  const sites = (raw.data as Record<string, unknown> | undefined)?.site;
  const rows = isRecord(sites) ? (sites as Record<string, unknown>).sites : null;
  if (!Array.isArray(rows)) return null;
  const shortcuts = rows.flatMap((row) => {
    if (!Array.isArray(row)) return [];
    return row
      .map((item) => parseInfinityShortcutItem(item))
      .filter((item): item is ImportedShortcutCandidate => Boolean(item));
  });
  return buildThirdPartyPayload(shortcuts);
};

const parseItabNavChild = (value: unknown): ImportedShortcutCandidate | null => {
  if (!isRecord(value)) return null;
  const title = readTrimmedString(value.name);
  const url = readTrimmedString(value.url);
  const icon = readTrimmedString(value.src);
  const id = readTrimmedString(value.id);
  if (value.type !== 'icon') return null;
  if (!title || !isLikelyShortcutUrl(url)) return null;
  return {
    id,
    title,
    url,
    icon,
    kind: 'link',
  };
};

const parseItabBackup = (raw: Record<string, unknown>): WebdavPayload | null => {
  const navConfig = raw.navConfig;
  if (!Array.isArray(navConfig)) return null;
  const shortcuts = navConfig.flatMap((group) => {
    if (!isRecord(group)) return [];
    const children = Array.isArray(group.children)
      ? group.children
          .map((child) => parseItabNavChild(child))
          .filter((child): child is ImportedShortcutCandidate => Boolean(child))
      : [];
    if (!children.length) return [];
    return [{
      id: readTrimmedString(group.id),
      title: readTrimmedString(group.name) || '分组',
      kind: 'folder' as const,
      children,
    }];
  });
  return buildThirdPartyPayload(shortcuts);
};

const parseWetabShortcutItem = (value: unknown): ImportedShortcutCandidate | null => {
  if (!isRecord(value)) return null;
  const title = readTrimmedString(value.name);
  const id = readTrimmedString(value.id);
  const children = Array.isArray(value.children)
    ? value.children
        .map((child) => parseWetabShortcutItem(child))
        .filter((child): child is ImportedShortcutCandidate => Boolean(child))
    : [];

  if (value.type === 'folder-icon' || children.length > 0) {
    if (!children.length) return null;
    return {
      id,
      title: title || '文件夹',
      kind: 'folder',
      children,
    };
  }

  const url = readTrimmedString(value.target);
  const icon = readTrimmedString(value.bgImage) || readTrimmedString(value.icon);
  if (value.type !== 'site') return null;
  if (!title || !isLikelyShortcutUrl(url)) return null;
  return {
    id,
    title,
    url,
    icon,
    kind: 'link',
  };
};

const parseWetabBackup = (raw: Record<string, unknown>): WebdavPayload | null => {
  const data = isRecord(raw.data) ? raw.data : null;
  const storeIcon = data && isRecord(data['store-icon']) ? data['store-icon'] : null;
  const icons = storeIcon && Array.isArray(storeIcon.icons) ? storeIcon.icons : null;
  if (!icons) return null;
  const shortcuts = icons.flatMap((category) => {
    if (!isRecord(category)) return [];
    const categoryId = readTrimmedString(category.id);
    const categoryTitle = readTrimmedString(category.name) || '分组';
    const rawChildren = Array.isArray(category.children) ? category.children : [];
    const directChildren: ImportedShortcutCandidate[] = [];
    const liftedFolders: ImportedShortcutCandidate[] = [];

    rawChildren.forEach((child) => {
      if (!isRecord(child)) return;
      if (child.type === 'folder-icon') {
        const folder = parseWetabShortcutItem(child);
        if (folder?.kind === 'folder' && Array.isArray(folder.children) && folder.children.length > 0) {
          liftedFolders.push({
            ...folder,
            title: `${categoryTitle} / ${folder.title}`,
          });
        }
        return;
      }

      const parsed = parseWetabShortcutItem(child);
      if (parsed) directChildren.push(parsed);
    });

    const grouped: ImportedShortcutCandidate[] = [];
    if (directChildren.length > 0) {
      grouped.push({
        id: categoryId,
        title: categoryTitle,
        kind: 'folder',
        children: directChildren,
      });
    }

    return [...grouped, ...liftedFolders];
  });
  return buildThirdPartyPayload(shortcuts);
};

const getOrCreateDeviceId = () => {
  try {
    const key = 'leaftab_device_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const uuid = (globalThis.crypto as any)?.randomUUID ? (globalThis.crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, uuid);
    return uuid;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
};

const getRuntimeAppVersion = () => {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
      return chrome.runtime.getManifest().version || '';
    }
  } catch {}
  return '';
};

const getRuntimePlatform = () => {
  try {
    const protocol = typeof window !== 'undefined' ? window.location?.protocol : '';
    if (protocol === 'chrome-extension:') return 'chrome-extension';
    if (protocol === 'moz-extension:') return 'moz-extension';
    if (protocol === 'edge-extension:') return 'edge-extension';
  } catch {}
  return 'web';
};

const normalizeToPayload = (raw: any): WebdavPayload | null => {
  if (!isRecord(raw)) return null;
  const scenarioModes = Array.isArray((raw as any).scenarioModes) ? (raw as any).scenarioModes : [];
  const selectedScenarioId = typeof (raw as any).selectedScenarioId === 'string' ? (raw as any).selectedScenarioId : '';
  const scenarioShortcutsSource = isRecord((raw as any).scenarioShortcuts)
    ? (raw as any).scenarioShortcuts
    : isRecord((raw as any).scenarioGroups)
      ? (raw as any).scenarioGroups
      : null;
  if (scenarioShortcutsSource) {
    const scenarioShortcuts = dedupeScenarioShortcutsMap(scenarioShortcutsSource);
    const customShortcutIcons = normalizeCustomShortcutIcons((raw as any).customShortcutIcons);
    return {
      scenarioModes,
      selectedScenarioId: selectedScenarioId || (scenarioModes[0] as any)?.id || '',
      scenarioShortcuts,
      customShortcutIcons,
    };
  }
  return null;
};

export const unwrapLeafTabBackupData = (raw: unknown): Record<string, unknown> | null => {
  if (!isRecord(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (obj.type === 'leaftab_backup') {
    if (!isRecord(obj.data)) return null;
    return obj.data as Record<string, unknown>;
  }
  return obj;
};

export const parseLeafTabBackup = (raw: any): WebdavPayload | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, any>;
  if (obj.type === 'leaftab_backup' && obj.data) {
    const unwrapped = unwrapLeafTabBackupData(raw);
    return normalizeToPayload(unwrapped);
  }
  return parseInfinityBackup(obj) || parseItabBackup(obj) || parseWetabBackup(obj);
};

export const buildBackupDataV3 = (params: {
  scenarioModes: Array<any>;
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
  customShortcutIcons?: Record<string, string>;
}) => {
  const { scenarioModes, selectedScenarioId, scenarioShortcuts, customShortcutIcons } = params;
  return {
    type: 'leaftab_backup',
    version: 3,
    timestamp: new Date().toISOString(),
    data: { scenarioModes, selectedScenarioId, scenarioShortcuts, customShortcutIcons: customShortcutIcons || {} },
  };
};

export const buildBackupDataV4 = (params: {
  scenarioModes: Array<any>;
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
  customShortcutIcons?: Record<string, string>;
}) => {
  const { scenarioModes, selectedScenarioId, scenarioShortcuts, customShortcutIcons } = params;
  const timestamp = new Date().toISOString();
  const deviceId = getOrCreateDeviceId();
  const appVersion = getRuntimeAppVersion();
  const platform = getRuntimePlatform();
  const meta: Record<string, any> = { platform, deviceId };
  if (appVersion) meta.appVersion = appVersion;
  return {
    type: 'leaftab_backup',
    version: 4,
    timestamp,
    meta,
    data: { scenarioModes, selectedScenarioId, scenarioShortcuts, customShortcutIcons: customShortcutIcons || {} },
  } satisfies LeafTabBackupEnvelope;
};

export const mergeWebdavPayload = (localPayload: WebdavPayload, remotePayload: WebdavPayload): WebdavPayload => {
  const localModes = Array.isArray(localPayload.scenarioModes) ? localPayload.scenarioModes : [];
  const remoteModes = Array.isArray(remotePayload.scenarioModes) ? remotePayload.scenarioModes : [];
  const modeMap = new Map<string, any>();
  remoteModes.forEach((mode) => {
    if (mode?.id) modeMap.set(mode.id, mode);
  });
  localModes.forEach((mode) => {
    if (!mode?.id) return;
    const existing = modeMap.get(mode.id) || {};
    modeMap.set(mode.id, { ...existing, ...mode });
  });
  const mergedModes = Array.from(modeMap.values());
  const mergedShortcuts: ScenarioShortcuts = {};
  const mergedCustomShortcutIcons: Record<string, string> = {
    ...(remotePayload.customShortcutIcons || {}),
    ...(localPayload.customShortcutIcons || {}),
  };
  const localShortcuts = localPayload.scenarioShortcuts || {};
  const remoteShortcuts = remotePayload.scenarioShortcuts || {};
  const modeIds = new Set<string>([
    ...Object.keys(remoteShortcuts),
    ...Object.keys(localShortcuts),
  ]);
  modeIds.forEach((modeId) => {
    const localItems = Array.isArray(localShortcuts[modeId]) ? localShortcuts[modeId] : [];
    const remoteItems = Array.isArray(remoteShortcuts[modeId]) ? remoteShortcuts[modeId] : [];
    mergedShortcuts[modeId] = mergeShortcutsLocalFirst(localItems, remoteItems);
  });
  const preferredId = localPayload.selectedScenarioId && modeMap.has(localPayload.selectedScenarioId)
    ? localPayload.selectedScenarioId
    : remotePayload.selectedScenarioId && modeMap.has(remotePayload.selectedScenarioId)
      ? remotePayload.selectedScenarioId
      : mergedModes[0]?.id;
  return {
    scenarioModes: mergedModes,
    selectedScenarioId: preferredId,
    scenarioShortcuts: mergedShortcuts,
    customShortcutIcons: mergedCustomShortcutIcons,
  };
};
