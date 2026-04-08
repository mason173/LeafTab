import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeafTabDangerousSyncDialog } from '@/components/sync/LeafTabDangerousSyncDialog';

function renderDialog(overrides?: Partial<React.ComponentProps<typeof LeafTabDangerousSyncDialog>>) {
  const props: React.ComponentProps<typeof LeafTabDangerousSyncDialog> = {
    open: true,
    onOpenChange: vi.fn(),
    provider: 'cloud',
    localBookmarkCount: 200,
    remoteBookmarkCount: 1,
    detectedFromCount: 200,
    detectedToCount: 1,
    busyAction: null,
    onContinueWithoutBookmarks: vi.fn(),
    onDefer: vi.fn(),
    onUseRemote: vi.fn(),
    onUseLocal: vi.fn(),
    ...overrides,
  };

  render(<LeafTabDangerousSyncDialog {...props} />);
  return props;
}

describe('LeafTabDangerousSyncDialog', () => {
  it('renders the intercepted sync summary and actions', () => {
    renderDialog();

    expect(screen.getByText('已拦截危险同步')).toBeInTheDocument();
    expect(screen.getByText('本地书签')).toBeInTheDocument();
    expect(screen.getByText('云端书签')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '继续同步快捷方式和设置' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '稍后处理书签' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '高级设置' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '保留云端书签（本地将被替换）' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '保留本地书签（云端将被替换）' })).not.toBeInTheDocument();
  });

  it('routes safe actions through the provided callbacks', () => {
    const props = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: '继续同步快捷方式和设置' }));
    fireEvent.click(screen.getByRole('button', { name: '稍后处理书签' }));

    expect(props.onContinueWithoutBookmarks).toHaveBeenCalledTimes(1);
    expect(props.onDefer).toHaveBeenCalledTimes(1);
  });

  it('routes advanced overwrite actions through the provided callbacks', () => {
    const props = renderDialog();

    fireEvent.pointerDown(screen.getByRole('button', { name: '高级设置' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '保留云端书签（本地将被替换）' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: '高级设置' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '保留本地书签（云端将被替换）' }));

    expect(props.onUseRemote).toHaveBeenCalledTimes(1);
    expect(props.onUseLocal).toHaveBeenCalledTimes(1);
  });
});
