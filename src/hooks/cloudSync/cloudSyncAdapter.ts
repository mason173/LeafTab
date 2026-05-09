import type { CloudShortcutsPayloadV3 } from '@/types';
import type { SyncAdapter, SyncPushMode } from '@/sync/adapter';
import { buildBackupDataV4 } from '@/utils/backupData';

export type CloudPullMeta = {
  role?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CreateCloudSyncAdapterParams = {
  API_URL: string;
  token: string;
  normalizeCloudShortcutsPayload: (raw: unknown) => CloudShortcutsPayloadV3 | null;
};

const toCloudSyncMode = (mode?: SyncPushMode) => {
  if (mode === 'prefer_local') return 'prefer_local';
  if (mode === 'prefer_remote') return 'prefer_remote';
  return 'strict';
};

export const createCloudSyncAdapter = ({
  API_URL,
  token,
  normalizeCloudShortcutsPayload,
}: CreateCloudSyncAdapterParams): SyncAdapter<CloudShortcutsPayloadV3, number | null, CloudPullMeta> => {
  return {
    pull: async () => {
      const response = await fetch(`${API_URL}/user/shortcuts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return {
          payload: null,
          version: null,
          status: response.status,
          meta: {},
        };
      }

      const data = await response.json();
      const cloudVersionRaw = Number(data?.version);
      const version = Number.isFinite(cloudVersionRaw) ? cloudVersionRaw : null;
      const payload = data?.shortcuts
        ? (() => {
            try {
              return normalizeCloudShortcutsPayload(JSON.parse(data.shortcuts));
            } catch {
              return null;
            }
          })()
        : null;

      return {
        payload,
        version,
        status: response.status,
        updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : null,
        meta: {
          role: typeof data?.role === 'string' ? data.role : undefined,
          createdAt: typeof data?.createdAt === 'string' ? data.createdAt : undefined,
          updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : undefined,
        },
      };
    },
    push: async (payload, options) => {
      const envelope = buildBackupDataV4({
        scenarioModes: payload.scenarioModes,
        selectedScenarioId: payload.selectedScenarioId,
        scenarioShortcuts: payload.scenarioShortcuts,
        customShortcutIcons: (payload as any).customShortcutIcons,
      });
      const expectedVersion = options?.expectedVersion;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      if (Number.isFinite(expectedVersion as number)) {
        headers['If-Match'] = `W/"${Number(expectedVersion)}"`;
      }
      const response = await fetch(`${API_URL}/user/shortcuts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shortcuts: envelope,
          syncMode: toCloudSyncMode(options?.mode),
        }),
      });
      let version: number | null = null;
      try {
        const data = await response.clone().json();
        const nextVersion = Number(data?.version);
        if (Number.isFinite(nextVersion)) version = nextVersion;
      } catch {}
      return {
        ok: response.ok,
        status: response.status,
        version,
        contentType: response.headers.get('content-type'),
      };
    },
  };
};
