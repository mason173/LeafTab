import { getShortcutIdentityKey } from './shortcutIdentity';

export type ScenarioShortcuts = Record<string, any[]>;

export type WebdavPayload = {
  scenarioModes: Array<any>;
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
};

export type LeafTabBackupEnvelope = {
  type: 'leaftab_backup';
  version: number;
  timestamp?: string;
  data: any;
  meta?: Record<string, any>;
};

export const clampShortcutsRowsPerColumn = (value: number) => {
  if (!Number.isFinite(value)) return 4;
  return Math.min(11, Math.max(1, Math.floor(value)));
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
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const next: ScenarioShortcuts = {};
  Object.entries(raw as Record<string, unknown>).forEach(([modeId, value]) => {
    if (Array.isArray(value)) {
      next[modeId] = dedupeShortcutList(value);
      return;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) {
      next[modeId] = [];
    }
  });
  return next;
};

export const toScenarioShortcuts = (data: any): ScenarioShortcuts | null => {
  if (data?.scenarioShortcuts) return data.scenarioShortcuts;
  return null;
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
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const scenarioModes = Array.isArray((raw as any).scenarioModes) ? (raw as any).scenarioModes : [];
  const selectedScenarioId = typeof (raw as any).selectedScenarioId === 'string' ? (raw as any).selectedScenarioId : '';
  if ((raw as any).scenarioShortcuts && typeof (raw as any).scenarioShortcuts === 'object') {
    const scenarioShortcuts = dedupeScenarioShortcutsMap((raw as any).scenarioShortcuts);
    return {
      scenarioModes,
      selectedScenarioId: selectedScenarioId || (scenarioModes[0] as any)?.id || '',
      scenarioShortcuts,
    };
  }
  return null;
};

export const unwrapLeafTabBackupData = (raw: unknown): Record<string, unknown> | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (obj.type === 'leaftab_backup') {
    if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return null;
    return obj.data as Record<string, unknown>;
  }
  return obj;
};

export const parseLeafTabBackup = (raw: any): WebdavPayload | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, any>;
  if (obj.type !== 'leaftab_backup' || !obj.data) return null;
  const unwrapped = unwrapLeafTabBackupData(raw);
  return normalizeToPayload(unwrapped);
};

export const buildBackupDataV3 = (params: {
  scenarioModes: Array<any>;
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
}) => {
  const { scenarioModes, selectedScenarioId, scenarioShortcuts } = params;
  return {
    type: 'leaftab_backup',
    version: 3,
    timestamp: new Date().toISOString(),
    data: { scenarioModes, selectedScenarioId, scenarioShortcuts },
  };
};

export const buildBackupDataV4 = (params: {
  scenarioModes: Array<any>;
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
}) => {
  const { scenarioModes, selectedScenarioId, scenarioShortcuts } = params;
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
    data: { scenarioModes, selectedScenarioId, scenarioShortcuts },
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
  };
};
