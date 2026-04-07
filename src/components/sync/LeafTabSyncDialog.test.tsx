import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeafTabSyncDialog } from '@/components/sync/LeafTabSyncDialog';

function renderDialog(overrides?: Partial<React.ComponentProps<typeof LeafTabSyncDialog>>) {
  const props: React.ComponentProps<typeof LeafTabSyncDialog> = {
    open: true,
    onOpenChange: vi.fn(),
    cloudAnalysis: null,
    webdavAnalysis: null,
    syncState: {
      status: 'idle',
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: '',
    },
    cloudSyncState: {
      status: 'idle',
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: '',
    },
    ready: true,
    hasConfig: true,
    busy: false,
    onSyncNow: vi.fn(),
    onOpenSetupConfig: vi.fn(),
    onOpenConfig: vi.fn(),
    ...overrides,
  };

  render(<LeafTabSyncDialog {...props} />);
  return props;
}

describe('LeafTabSyncDialog', () => {
  it('shows configure as the primary WebDAV action when sync is disabled', () => {
    const props = renderDialog({
      webdavConfigured: true,
      webdavEnabled: false,
    });

    expect(screen.getByRole('button', { name: '去配置' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '启用同步' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '去配置' }));

    expect(props.onOpenSetupConfig).toHaveBeenCalledTimes(1);
    expect(props.onSyncNow).not.toHaveBeenCalled();
  });

  it('keeps the settings icon routed to sync settings when WebDAV is configured but disabled', () => {
    const props = renderDialog({
      webdavConfigured: true,
      webdavEnabled: false,
    });

    fireEvent.click(screen.getByLabelText('配置 WebDAV'));

    expect(props.onOpenConfig).toHaveBeenCalledTimes(1);
    expect(props.onOpenSetupConfig).not.toHaveBeenCalled();
  });

  it('keeps immediate sync as the primary WebDAV action when sync is enabled', () => {
    const props = renderDialog({
      webdavConfigured: true,
      webdavEnabled: true,
    });

    fireEvent.click(screen.getByRole('button', { name: '立即同步' }));

    expect(props.onSyncNow).toHaveBeenCalledTimes(1);
  });

  it('shows shortcuts-only scope when WebDAV bookmark sync is disabled', () => {
    renderDialog({
      webdavConfigured: true,
      webdavEnabled: true,
      webdavSyncBookmarksEnabled: false,
    });

    expect(screen.getByText('仅快捷方式和设置')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });
});
