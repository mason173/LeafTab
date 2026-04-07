import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LeafTabSyncWebdavStore } from './webdavStore';

const { ensureOriginPermissionMock } = vi.hoisted(() => ({
  ensureOriginPermissionMock: vi.fn(),
}));

vi.mock('@/utils/extensionPermissions', () => ({
  ensureOriginPermission: (...args: unknown[]) => ensureOriginPermissionMock(...args),
}));

describe('LeafTabSyncWebdavStore', () => {
  beforeEach(() => {
    ensureOriginPermissionMock.mockReset();
    ensureOriginPermissionMock.mockResolvedValue(true);
  });

  it('treats 409 on first read as an empty remote state', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 409,
      ok: false,
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const store = new LeafTabSyncWebdavStore({
      url: 'https://dav.jianguoyun.com/dav/',
      requestPermission: true,
    });

    await expect(store.readJsonFile('leaftab/v1/head.json')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalled();
  });
});
