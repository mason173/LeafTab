import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShortcutEditorPanel } from '@/components/ShortcutEditorPanel';

const {
  prepareShortcutCustomIconMock,
  readShortcutCustomIconMock,
  resolveCustomIconMock,
  resolveCustomIconFromCacheMock,
  toastErrorMock,
  toastInfoMock,
} = vi.hoisted(() => ({
  prepareShortcutCustomIconMock: vi.fn(),
  readShortcutCustomIconMock: vi.fn(),
  resolveCustomIconMock: vi.fn(),
  resolveCustomIconFromCacheMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastInfoMock: vi.fn(),
}));

vi.mock('@/utils/shortcutCustomIcons', () => ({
  prepareShortcutCustomIcon: (...args: unknown[]) => prepareShortcutCustomIconMock(...args),
  readShortcutCustomIcon: (...args: unknown[]) => readShortcutCustomIconMock(...args),
}));

vi.mock('@/utils/iconLibrary', () => ({
  resolveCustomIcon: (...args: unknown[]) => resolveCustomIconMock(...args),
  resolveCustomIconFromCache: (...args: unknown[]) => resolveCustomIconFromCacheMock(...args),
}));

vi.mock('@/components/ui/sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    info: (...args: unknown[]) => toastInfoMock(...args),
  },
}));

describe('ShortcutEditorPanel', () => {
  it('switches source selection to official when official icon is auto-resolved', async () => {
    prepareShortcutCustomIconMock.mockResolvedValue('data:image/png;base64,custom-icon');
    readShortcutCustomIconMock.mockReturnValue('');
    resolveCustomIconFromCacheMock.mockImplementation((domain: string) => (
      domain === 'github.com'
        ? { url: 'https://local.test/leaftab-icons/svgs/github.com.svg', signature: 'path:github.com' }
        : null
    ));
    resolveCustomIconMock.mockResolvedValue({
      url: 'https://local.test/leaftab-icons/svgs/github.com.svg',
      signature: 'path:github.com',
    });

    render(
      <ShortcutEditorPanel
        mode="add"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId('shortcut-modal-url'), {
      target: { value: 'https://github.com' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('shortcut-icon-mode-official')).toHaveAttribute('aria-checked', 'true');
    });
    expect(screen.getByTestId('shortcut-icon-mode-favicon')).toHaveAttribute('aria-checked', 'false');
  });

  it('uses the preview as the replace trigger after a custom icon has been uploaded', async () => {
    prepareShortcutCustomIconMock.mockResolvedValue('data:image/png;base64,custom-icon');
    readShortcutCustomIconMock.mockReturnValue('');
    resolveCustomIconMock.mockResolvedValue(null);
    resolveCustomIconFromCacheMock.mockReturnValue(null);

    render(
      <ShortcutEditorPanel
        mode="add"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (!fileInput) {
      throw new Error('custom icon file input not found');
    }

    fireEvent.change(fileInput, {
      target: {
        files: [new File(['icon'], 'icon.png', { type: 'image/png' })],
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId('shortcut-custom-preview-trigger')).toBeInTheDocument();
    });

    expect(screen.getByTestId('shortcut-icon-mode-custom')).toHaveAttribute('aria-checked', 'true');

    const clickSpy = vi.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByTestId('shortcut-custom-preview-trigger'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('replaces the preset palette with three custom sliders and defaults to white before manual tuning', () => {
    prepareShortcutCustomIconMock.mockResolvedValue('data:image/png;base64,custom-icon');
    readShortcutCustomIconMock.mockReturnValue('');
    resolveCustomIconMock.mockResolvedValue(null);
    resolveCustomIconFromCacheMock.mockReturnValue(null);
    const onSave = vi.fn();

    render(
      <ShortcutEditorPanel
        mode="add"
        initialShortcut={{ icon: 'https://github.com/favicon.ico' }}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('shortcut-color-#F4E300')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('shortcut-modal-title'), {
      target: { value: 'GitHub' },
    });
    fireEvent.change(screen.getByTestId('shortcut-modal-url'), {
      target: { value: 'https://github.com' },
    });

    const sliders = screen.getAllByRole('slider');
    fireEvent.keyDown(sliders[0], { key: 'ArrowRight' });
    fireEvent.keyDown(sliders[1], { key: 'ArrowLeft' });
    fireEvent.keyDown(sliders[2], { key: 'ArrowRight' });
    fireEvent.click(screen.getByTestId('shortcut-modal-save'));

    expect(screen.getByTestId('shortcut-color-slider-brightness')).toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        iconColor: '#FFFFFF',
      }),
      expect.objectContaining({
        useCustomIcon: false,
      }),
    );
  });
});
