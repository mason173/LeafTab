import type { LeafTabSyncCommitFile, LeafTabSyncHeadFile, LeafTabSyncSnapshot } from './schema';
import type {
  LeafTabSyncRemoteState,
  LeafTabSyncRemoteStore,
  LeafTabSyncWriteStateParams,
  LeafTabSyncWriteStateResult,
} from './remoteStore';

export interface LeafTabSyncCloudRemoteStoreConfig {
  apiUrl: string;
  token: string;
}

type CloudLockFile = {
  deviceId: string;
  acquiredAt: string;
  expiresAt: string;
};

type CloudReadStateResponse = {
  head?: LeafTabSyncHeadFile | null;
  commit?: LeafTabSyncCommitFile | null;
  snapshot?: LeafTabSyncSnapshot | null;
};

type CloudWriteStateResponse = {
  head: LeafTabSyncHeadFile;
  commit: LeafTabSyncCommitFile;
};

export class LeafTabSyncCloudRemoteStoreError extends Error {
  status: number;
  operation: string;

  constructor(operation: string, status: number, message?: string) {
    super(message || `LeafTab cloud sync ${operation} failed: ${status}`);
    this.name = 'LeafTabSyncCloudRemoteStoreError';
    this.status = status;
    this.operation = operation;
  }
}

export class LeafTabSyncCloudRemoteStore implements LeafTabSyncRemoteStore {
  private readonly apiUrl: string;
  private readonly token: string;

  constructor(config: LeafTabSyncCloudRemoteStoreConfig) {
    this.apiUrl = config.apiUrl.replace(/\/+$/, '');
    this.token = config.token;
  }

  private async request<T>(path: string, init?: RequestInit, allowNotFound = false): Promise<T | null> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(init?.headers || {}),
      },
    });

    if (allowNotFound && response.status === 404) {
      return null;
    }

    if (!response.ok) {
      let message = '';
      try {
        const data = await response.clone().json();
        message = typeof data?.error === 'string' ? data.error : '';
      } catch {}
      throw new LeafTabSyncCloudRemoteStoreError(
        `${init?.method || 'GET'} ${path}`,
        response.status,
        message || undefined,
      );
    }

    if (response.status === 204) return null;
    return response.json() as Promise<T>;
  }

  async acquireLock(deviceId: string, ttlMs = 2 * 60 * 1000) {
    const lock = await this.request<CloudLockFile>('/user/leaftab-sync/lock', {
      method: 'POST',
      body: JSON.stringify({ deviceId, ttlMs }),
    });
    return lock;
  }

  async releaseLock() {
    await this.request('/user/leaftab-sync/lock', {
      method: 'DELETE',
    }, true);
  }

  async readState(): Promise<LeafTabSyncRemoteState> {
    const response = await this.request<CloudReadStateResponse>('/user/leaftab-sync/state', {
      method: 'GET',
    }, true);

    return {
      head: response?.head || null,
      commit: response?.commit || null,
      snapshot: response?.snapshot || null,
    };
  }

  async writeState(params: LeafTabSyncWriteStateParams): Promise<LeafTabSyncWriteStateResult> {
    const response = await this.request<CloudWriteStateResponse>('/user/leaftab-sync/state', {
      method: 'POST',
      body: JSON.stringify({
        snapshot: params.snapshot,
        deviceId: params.deviceId,
        parentCommitId: params.parentCommitId ?? null,
        createdAt: params.createdAt ?? null,
      }),
    });

    if (!response?.head || !response?.commit) {
      throw new LeafTabSyncCloudRemoteStoreError('POST /user/leaftab-sync/state', 500, 'Invalid cloud sync response');
    }

    return response;
  }
}

