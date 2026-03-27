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
    onCancel: vi.fn(),
    onRecheck: vi.fn(),
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
    expect(screen.getByRole('button', { name: '重新检查云端' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '云端覆盖本地' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '本地覆盖云端' })).toBeInTheDocument();
  });

  it('routes actions through the provided callbacks', () => {
    const props = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: '重新检查云端' }));
    fireEvent.click(screen.getByRole('button', { name: '云端覆盖本地' }));
    fireEvent.click(screen.getByRole('button', { name: '本地覆盖云端' }));
    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(props.onRecheck).toHaveBeenCalledTimes(1);
    expect(props.onUseRemote).toHaveBeenCalledTimes(1);
    expect(props.onUseLocal).toHaveBeenCalledTimes(1);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });
});
