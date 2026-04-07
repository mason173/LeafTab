import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebdavConfigDialog, getWebdavProviderChangeState } from '@/components/WebdavConfigDialog';

const {
  ensureExtensionPermissionMock,
  ensureOriginPermissionMock,
  readWebdavStorageStateFromStorageMock,
  writeWebdavStorageStateToStorageMock,
  isWebdavSyncEnabledFromStorageMock,
  toastErrorMock,
  toastInfoMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  ensureExtensionPermissionMock: vi.fn(),
  ensureOriginPermissionMock: vi.fn(),
  readWebdavStorageStateFromStorageMock: vi.fn(),
  writeWebdavStorageStateToStorageMock: vi.fn(),
  isWebdavSyncEnabledFromStorageMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastInfoMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/utils/extensionPermissions', () => ({
  ensureExtensionPermission: (...args: unknown[]) => ensureExtensionPermissionMock(...args),
  ensureOriginPermission: (...args: unknown[]) => ensureOriginPermissionMock(...args),
}));

vi.mock('@/utils/webdavConfig', async () => {
  const actual = await vi.importActual<typeof import('@/utils/webdavConfig')>('@/utils/webdavConfig');
  return {
    ...actual,
    readWebdavStorageStateFromStorage: (...args: unknown[]) => readWebdavStorageStateFromStorageMock(...args),
    writeWebdavStorageStateToStorage: (...args: unknown[]) => writeWebdavStorageStateToStorageMock(...args),
    isWebdavSyncEnabledFromStorage: (...args: unknown[]) => isWebdavSyncEnabledFromStorageMock(...args),
  };
});

vi.mock('@/components/ui/sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

describe('WebdavConfigDialog', () => {
  const getBookmarkSyncSwitch = () => {
    const label = screen.getByText('同步书签');
    const row = label.closest('div')?.parentElement;
    if (!row) {
      throw new Error('bookmark sync toggle row not found');
    }
    return within(row).getByRole('switch');
  };

  beforeEach(() => {
    ensureExtensionPermissionMock.mockReset();
    ensureOriginPermissionMock.mockReset();
    readWebdavStorageStateFromStorageMock.mockReset();
    writeWebdavStorageStateToStorageMock.mockReset();
    isWebdavSyncEnabledFromStorageMock.mockReset();
    toastErrorMock.mockReset();
    toastInfoMock.mockReset();
    toastSuccessMock.mockReset();

    ensureExtensionPermissionMock.mockResolvedValue(true);
    ensureOriginPermissionMock.mockResolvedValue(true);
    isWebdavSyncEnabledFromStorageMock.mockReturnValue(false);
    readWebdavStorageStateFromStorageMock.mockReturnValue({
      profileName: '默认配置',
      url: 'https://dav.jianguoyun.com/dav/',
      username: 'demo',
      password: 'secret',
      filePath: 'leaftab_sync.leaftab',
      syncEnabled: false,
      syncBookmarksEnabled: false,
      syncBySchedule: true,
      autoSyncToastEnabled: true,
      syncIntervalMinutes: 10,
      syncConflictPolicy: 'merge',
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
    }
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = vi.fn();
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = vi.fn();
    }
  });

  it('requests origin permission before enabling WebDAV sync', async () => {
    const onEnableAfterSave = vi.fn();
    render(
      <WebdavConfigDialog
        open
        onOpenChange={vi.fn()}
        showConnectionFields
        enableAfterSave
        onEnableAfterSave={onEnableAfterSave}
      />,
    );

    expect(screen.queryByText('同步书签')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'settings.backup.webdav.enableSyncAction' }));

    await waitFor(() => {
      expect(ensureExtensionPermissionMock).toHaveBeenCalledWith('bookmarks', { requestIfNeeded: false });
      expect(ensureOriginPermissionMock).toHaveBeenCalledWith('https://dav.jianguoyun.com/dav/', { requestIfNeeded: true });
    });
    await waitFor(() => {
      expect(onEnableAfterSave).toHaveBeenCalledTimes(1);
    });
  });

  it('clears username and password when switching WebDAV provider', () => {
    expect(getWebdavProviderChangeState({
      currentUrl: 'https://dav.jianguoyun.com/dav/',
      providers: [
        { id: 'custom', label: 'Custom' },
        { id: 'jianguoyun', label: '坚果云', url: 'https://dav.jianguoyun.com/dav/' },
        { id: 'pcloud-us', label: 'pCloud (US)', url: 'https://webdav.pcloud.com' },
      ],
      value: 'pcloud-us',
    })).toEqual({
      password: '',
      provider: 'pcloud-us',
      url: 'https://webdav.pcloud.com',
      username: '',
    });
  });

  it('keeps the dialog flow in place when origin permission is denied', async () => {
    ensureOriginPermissionMock.mockResolvedValue(false);
    const onEnableAfterSave = vi.fn();

    render(
      <WebdavConfigDialog
        open
        onOpenChange={vi.fn()}
        showConnectionFields
        enableAfterSave
        onEnableAfterSave={onEnableAfterSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'settings.backup.webdav.enableSyncAction' }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalled();
    });
    expect(writeWebdavStorageStateToStorageMock).not.toHaveBeenCalled();
    expect(onEnableAfterSave).not.toHaveBeenCalled();
  });

  it('shows a safety reminder before enabling bookmark sync and requests bookmark permission only after confirmation', async () => {
    render(
      <WebdavConfigDialog
        open
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(ensureExtensionPermissionMock).toHaveBeenCalledWith('bookmarks', { requestIfNeeded: false });
    });

    fireEvent.click(getBookmarkSyncSwitch());

    expect(screen.getByText('开启前提醒')).toBeInTheDocument();
    expect(
      ensureExtensionPermissionMock.mock.calls.some((call) => call[1]?.requestIfNeeded === true),
    ).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: '继续开启' }));

    await waitFor(() => {
      expect(
        ensureExtensionPermissionMock.mock.calls.some((call) => call[1]?.requestIfNeeded === true),
      ).toBe(true);
    });
  });

  it('persists bookmark sync preference when saving settings', async () => {
    readWebdavStorageStateFromStorageMock.mockReturnValue({
      profileName: '默认配置',
      url: 'https://dav.jianguoyun.com/dav/',
      username: 'demo',
      password: 'secret',
      filePath: 'leaftab_sync.leaftab',
      syncEnabled: false,
      syncBookmarksEnabled: false,
      syncBySchedule: true,
      autoSyncToastEnabled: true,
      syncIntervalMinutes: 10,
      syncConflictPolicy: 'merge',
    });

    render(
      <WebdavConfigDialog
        open
        onOpenChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => {
      expect(writeWebdavStorageStateToStorageMock).toHaveBeenCalledWith(
        expect.objectContaining({
          syncBookmarksEnabled: false,
        }),
        'settings.backup.webdav.defaultProfileName',
      );
    });
  });
});
