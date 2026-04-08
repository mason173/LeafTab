import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveCustomIconFromCacheMock,
  resolveCustomIconMock,
} = vi.hoisted(() => ({
  resolveCustomIconFromCacheMock: vi.fn(),
  resolveCustomIconMock: vi.fn(),
}));

vi.mock('@/utils/iconLibrary', () => ({
  resolveCustomIconFromCache: (...args: unknown[]) => resolveCustomIconFromCacheMock(...args),
  resolveCustomIcon: (...args: unknown[]) => resolveCustomIconMock(...args),
}));

vi.mock('@/platform/browserTarget', () => ({
  isFirefoxBuildTarget: () => false,
}));

describe('ShortcutIcon offline cache', () => {
  let ShortcutIcon: (typeof import('./ShortcutIcon'))['default'];

  beforeEach(async () => {
    localStorage.clear();
    resolveCustomIconFromCacheMock.mockReset();
    resolveCustomIconMock.mockReset();
    resolveCustomIconFromCacheMock.mockReturnValue({
      url: 'https://icons.example.com/example.png',
      signature: 'sig-example-v1',
    });
    resolveCustomIconMock.mockResolvedValue({
      url: 'https://icons.example.com/example.png',
      signature: 'sig-example-v1',
    });

    ShortcutIcon = (await vi.importActual<typeof import('./ShortcutIcon')>('./ShortcutIcon')).default;
  });

  it('keeps showing an already loaded official icon after offline fallback by using local cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['icon-binary'], { type: 'image/png' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = render(
      <ShortcutIcon
        icon=""
        url="https://example.com/path"
        useOfficialIcon
        autoUseOfficialIcon
        officialIconAvailableAtSave
      />,
    );

    const firstImg = first.container.querySelector('img');
    expect(firstImg).not.toBeNull();
    fireEvent.load(firstImg as HTMLImageElement);

    await waitFor(() => {
      const cached = localStorage.getItem('official_icon_cache_v1:example.com');
      expect(cached).toMatch(/^data:image\//);
    });

    first.unmount();

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const second = render(
      <ShortcutIcon
        icon=""
        url="https://example.com/path"
        useOfficialIcon
        autoUseOfficialIcon
        officialIconAvailableAtSave
      />,
    );

    const secondImg = second.container.querySelector('img');
    expect(secondImg).not.toBeNull();
    expect(secondImg?.getAttribute('src') || '').toMatch(/^data:image\//);
  });
});
