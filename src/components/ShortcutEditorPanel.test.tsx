import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShortcutEditorPanel } from '@/components/ShortcutEditorPanel';
import { hexToShortcutIconHsl } from '@/utils/shortcutColorHsl';

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
        ? {
            url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
            signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
            mode: 'shape-color',
            defaultColor: '#24292F',
          }
        : null
    ));
    resolveCustomIconMock.mockResolvedValue({
      url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
      signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
      mode: 'shape-color',
      defaultColor: '#24292F',
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

  it('shows the official default color on sliders before the user manually tweaks it', async () => {
    const officialColor = '#24292F';
    const officialHsl = hexToShortcutIconHsl(officialColor);
    prepareShortcutCustomIconMock.mockResolvedValue('data:image/png;base64,custom-icon');
    readShortcutCustomIconMock.mockReturnValue('');
    resolveCustomIconFromCacheMock.mockImplementation((domain: string) => (
      domain === 'github.com'
        ? {
            url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
            signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
            mode: 'shape-color',
            defaultColor: officialColor,
          }
        : null
    ));
    resolveCustomIconMock.mockResolvedValue({
      url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
      signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
      mode: 'shape-color',
      defaultColor: officialColor,
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

    expect(officialHsl).not.toBeNull();
    const sliders = screen.getAllByRole('slider');
    expect(sliders[0]).toHaveAttribute('aria-valuenow', String(officialHsl?.hue));
    expect(sliders[1]).toHaveAttribute('aria-valuenow', String(officialHsl?.saturation));
    expect(sliders[2]).toHaveAttribute('aria-valuenow', String(officialHsl?.lightness));
  });

  it('resets slider values back to the official default color', async () => {
    const officialColor = '#24292F';
    const officialHsl = hexToShortcutIconHsl(officialColor);
    prepareShortcutCustomIconMock.mockResolvedValue('data:image/png;base64,custom-icon');
    readShortcutCustomIconMock.mockReturnValue('');
    resolveCustomIconFromCacheMock.mockImplementation((domain: string) => (
      domain === 'github.com'
        ? {
            url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
            signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
            mode: 'shape-color',
            defaultColor: officialColor,
          }
        : null
    ));
    resolveCustomIconMock.mockResolvedValue({
      url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
      signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
      mode: 'shape-color',
      defaultColor: officialColor,
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

    const sliders = screen.getAllByRole('slider');
    fireEvent.keyDown(sliders[0], { key: 'ArrowRight' });
    expect(sliders[0]).not.toHaveAttribute('aria-valuenow', String(officialHsl?.hue));

    fireEvent.click(screen.getByTestId('shortcut-color-reset'));

    expect(sliders[0]).toHaveAttribute('aria-valuenow', String(officialHsl?.hue));
    expect(sliders[1]).toHaveAttribute('aria-valuenow', String(officialHsl?.saturation));
    expect(sliders[2]).toHaveAttribute('aria-valuenow', String(officialHsl?.lightness));
  });

  it('keeps network and letter colors shared while leaving official color independent', async () => {
    const officialColor = '#24292F';
    const officialHsl = hexToShortcutIconHsl(officialColor);
    prepareShortcutCustomIconMock.mockResolvedValue('data:image/png;base64,custom-icon');
    readShortcutCustomIconMock.mockReturnValue('');
    resolveCustomIconFromCacheMock.mockImplementation((domain: string) => (
      domain === 'github.com'
        ? {
            url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
            signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
            mode: 'shape-color',
            defaultColor: officialColor,
          }
        : null
    ));
    resolveCustomIconMock.mockResolvedValue({
      url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
      signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
      mode: 'shape-color',
      defaultColor: officialColor,
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

    let sliders = screen.getAllByRole('slider');
    fireEvent.keyDown(sliders[2], { key: 'ArrowLeft' });
    expect(sliders[2]).toHaveAttribute('aria-valuenow', String((officialHsl?.lightness ?? 0) - 1));

    fireEvent.click(screen.getByTestId('shortcut-icon-mode-favicon'));
    sliders = screen.getAllByRole('slider');
    expect(sliders[0]).toHaveAttribute('aria-valuenow', '0');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '0');
    expect(sliders[2]).toHaveAttribute('aria-valuenow', '100');

    fireEvent.keyDown(sliders[2], { key: 'ArrowLeft' });
    expect(sliders[2]).toHaveAttribute('aria-valuenow', '99');

    fireEvent.click(screen.getByTestId('shortcut-icon-mode-letter'));
    sliders = screen.getAllByRole('slider');
    expect(sliders[2]).toHaveAttribute('aria-valuenow', '99');

    fireEvent.click(screen.getByTestId('shortcut-icon-mode-official'));
    sliders = screen.getAllByRole('slider');
    expect(sliders[2]).toHaveAttribute('aria-valuenow', String((officialHsl?.lightness ?? 0) - 1));

    fireEvent.click(screen.getByTestId('shortcut-icon-mode-favicon'));
    sliders = screen.getAllByRole('slider');
    expect(sliders[2]).toHaveAttribute('aria-valuenow', '99');
  });

  it('lets network sliders change hue and saturation before brightness is adjusted', async () => {
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

    fireEvent.click(screen.getByTestId('shortcut-icon-mode-favicon'));

    const sliders = screen.getAllByRole('slider');
    fireEvent.keyDown(sliders[0], { key: 'ArrowRight' });
    fireEvent.keyDown(sliders[1], { key: 'ArrowRight' });

    expect(sliders[0]).toHaveAttribute('aria-valuenow', '1');
    expect(sliders[1]).toHaveAttribute('aria-valuenow', '1');
    expect(sliders[2]).toHaveAttribute('aria-valuenow', '100');
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

  it('hides the reset button and keeps sliders disabled in custom image mode', async () => {
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
      expect(screen.getByTestId('shortcut-icon-mode-custom')).toHaveAttribute('aria-checked', 'true');
    });

    expect(screen.queryByTestId('shortcut-color-reset')).not.toBeInTheDocument();
    screen.getAllByRole('slider').forEach((slider) => {
      expect(slider).toHaveAttribute('aria-disabled', 'true');
    });
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
