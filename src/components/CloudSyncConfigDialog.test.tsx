import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloudSyncConfigDialog } from '@/components/CloudSyncConfigDialog';

const {
  readCloudSyncConfigFromStorageMock,
  writeCloudSyncConfigToStorageMock,
  emitCloudSyncConfigChangedMock,
  ensureExtensionPermissionMock,
  toastInfoMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  readCloudSyncConfigFromStorageMock: vi.fn(),
  writeCloudSyncConfigToStorageMock: vi.fn(),
  emitCloudSyncConfigChangedMock: vi.fn(),
  ensureExtensionPermissionMock: vi.fn(),
  toastInfoMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/utils/cloudSyncConfig', () => ({
  readCloudSyncConfigFromStorage: (...args: unknown[]) => readCloudSyncConfigFromStorageMock(...args),
  writeCloudSyncConfigToStorage: (...args: unknown[]) => writeCloudSyncConfigToStorageMock(...args),
  emitCloudSyncConfigChanged: (...args: unknown[]) => emitCloudSyncConfigChangedMock(...args),
}));

vi.mock('@/utils/extensionPermissions', () => ({
  ensureExtensionPermission: (...args: unknown[]) => ensureExtensionPermissionMock(...args),
}));

vi.mock('@/components/ui/sonner', () => ({
  toast: {
    info: (...args: unknown[]) => toastInfoMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

function getBookmarkSyncSwitch() {
  const label = screen.getByText('同步书签');
  const row = label.closest('div')?.parentElement;
  if (!row) {
    throw new Error('bookmark sync toggle row not found');
  }
  return within(row).getByRole('switch');
}

describe('CloudSyncConfigDialog', () => {
  beforeEach(() => {
    readCloudSyncConfigFromStorageMock.mockReset();
    writeCloudSyncConfigToStorageMock.mockReset();
    emitCloudSyncConfigChangedMock.mockReset();
    ensureExtensionPermissionMock.mockReset();
    toastInfoMock.mockReset();
    toastSuccessMock.mockReset();

    readCloudSyncConfigFromStorageMock.mockReturnValue({
      enabled: true,
      syncBookmarksEnabled: false,
      autoSyncToastEnabled: true,
      intervalMinutes: 10,
    });
    ensureExtensionPermissionMock.mockResolvedValue(true);
  });

  it('shows a safety reminder before enabling bookmark sync and requests permission only after confirmation', async () => {
    render(
      <CloudSyncConfigDialog
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

  it('keeps bookmark sync off when user cancels the safety reminder', async () => {
    render(
      <CloudSyncConfigDialog
        open
        onOpenChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(ensureExtensionPermissionMock).toHaveBeenCalledWith('bookmarks', { requestIfNeeded: false });
    });

    const toggle = getBookmarkSyncSwitch();
    fireEvent.click(toggle);
    expect(screen.getByText('开启前提醒')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '我先备份' }));

    await waitFor(() => {
      expect(screen.queryByText('开启前提醒')).not.toBeInTheDocument();
    });
    expect(toggle).toHaveAttribute('data-state', 'unchecked');
    expect(
      ensureExtensionPermissionMock.mock.calls.some((call) => call[1]?.requestIfNeeded === true),
    ).toBe(false);
  });
});
