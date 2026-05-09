import { useCallback, useMemo } from 'react';
import type { ScenarioMode, ScenarioShortcuts } from '@/types';
import { buildCloudShortcutsPayload, normalizeCloudShortcutsPayload } from '@/utils/shortcutsPayload';
import type { WebdavPayload } from '@/utils/backupData';
import type { UseLeafTabSyncEngineOptions } from '@/hooks/useLeafTabSyncEngine';
import { flattenScenarioShortcutsForLegacyMirror } from '@/utils/legacyShortcutMirror';
import { exportShortcutCustomIcons } from '@/utils/shortcutCustomIcons';
import { collectShortcutIds } from '@/utils/shortcutFolders';

const ENABLE_LEGACY_SYNC_MIGRATION = true;

type UseLeafTabLegacyCompatOptions = {
  apiUrl: string;
  token: string;
  user: string | null;
  webdavFilePath?: string | null;
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
  unnamedScenarioLabel: string;
};

const toLegacyPayload = (params: {
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
}): WebdavPayload => {
  const payload = buildCloudShortcutsPayload(params);
  const shortcutIds = Object.values(payload.scenarioShortcuts || {}).flatMap((shortcuts) => (
    Array.isArray(shortcuts) ? collectShortcutIds(shortcuts) : []
  ));
  return {
    scenarioModes: payload.scenarioModes,
    selectedScenarioId: payload.selectedScenarioId,
    scenarioShortcuts: flattenScenarioShortcutsForLegacyMirror(payload.scenarioShortcuts),
    customShortcutIcons: exportShortcutCustomIcons(shortcutIds),
  };
};

export function useLeafTabLegacyCompat({
  apiUrl,
  token,
  user,
  webdavFilePath,
  scenarioModes,
  selectedScenarioId,
  scenarioShortcuts,
  unnamedScenarioLabel,
}: UseLeafTabLegacyCompatOptions) {
  const buildLegacyPayload = useCallback(() => {
    return toLegacyPayload({
      scenarioModes,
      selectedScenarioId,
      scenarioShortcuts,
    });
  }, [scenarioModes, scenarioShortcuts, selectedScenarioId]);

  const normalizeLegacyCloudPayload = useCallback((raw: unknown) => {
    return normalizeCloudShortcutsPayload(raw, unnamedScenarioLabel);
  }, [unnamedScenarioLabel]);

  const webdavLegacyCompat = useMemo<UseLeafTabSyncEngineOptions['legacyCompat']>(() => {
    if (!ENABLE_LEGACY_SYNC_MIGRATION || !webdavFilePath) return null;
    return {
      type: 'webdav',
      filePath: webdavFilePath,
      bridgeEnabled: true,
      buildLegacyPayload,
    };
  }, [buildLegacyPayload, webdavFilePath]);

  const cloudLegacyCompat = useMemo<UseLeafTabSyncEngineOptions['legacyCompat']>(() => {
    if (!ENABLE_LEGACY_SYNC_MIGRATION || !user || !token) return null;
    return {
      type: 'cloud',
      apiUrl,
      token,
      storageScopeKey: user,
      bridgeEnabled: true,
      buildLegacyPayload,
      normalizeCloudShortcutsPayload: normalizeLegacyCloudPayload,
    };
  }, [apiUrl, buildLegacyPayload, normalizeLegacyCloudPayload, token, user]);

  return {
    webdavLegacyCompat,
    cloudLegacyCompat,
  };
}
