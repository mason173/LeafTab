import type { SyncAdapter } from '@/sync/adapter';
import type { WebdavPayload } from '@/utils/backupData';
import type { WebdavConfig } from './useWebdavSync';

type CreateWebdavSyncAdapterParams = {
  config: WebdavConfig;
  fetchWebdavData: (config: WebdavConfig) => Promise<any>;
  uploadToWebdav: (config: WebdavConfig) => Promise<void>;
  uploadDataToWebdav: (config: WebdavConfig, data: any) => Promise<void>;
};

export const createWebdavSyncAdapter = ({
  config,
  fetchWebdavData,
  uploadToWebdav,
  uploadDataToWebdav,
}: CreateWebdavSyncAdapterParams): SyncAdapter<WebdavPayload, null> => {
  return {
    pull: async () => {
      const payload = await fetchWebdavData(config);
      return {
        payload: payload as WebdavPayload | null,
        version: null,
        status: payload ? 200 : 404,
      };
    },
    push: async (payload, options) => {
      if (options?.mode === 'prefer_local') {
        await uploadToWebdav(config);
      } else {
        await uploadDataToWebdav(config, payload);
      }
      return {
        ok: true,
        status: 200,
        version: null,
      };
    },
  };
};
