import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { persistShortcutCustomIcon } from '@/utils/shortcutCustomIcons';
import { ShortcutIconRenderContext } from './ShortcutIconRenderContext';

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
    vi.unstubAllGlobals();
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

  it('refreshes immediately when a stored custom icon is replaced', async () => {
    resolveCustomIconFromCacheMock.mockReturnValue(null);
    resolveCustomIconMock.mockResolvedValue(null);

    const view = render(
      <ShortcutIcon
        icon=""
        url="https://example.com/path"
        shortcutId="shortcut-1"
        frame="never"
        fallbackStyle="emptyicon"
        fallbackLabel="Example"
        iconRendering="letter"
      />,
    );

    expect(view.container.querySelector('img')).toBeNull();

    persistShortcutCustomIcon('shortcut-1', 'data:image/png;base64,updated-custom-icon');

    await waitFor(() => {
      const customImage = view.container.querySelector('img');
      expect(customImage).not.toBeNull();
      expect(customImage?.getAttribute('src')).toBe('data:image/png;base64,updated-custom-icon');
    });
  });

  it('applies an adaptive foreground color to letter fallbacks in empty icon mode', () => {
    const view = render(
      <ShortcutIcon
        icon=""
        url="https://example.com/path"
        frame="never"
        fallbackStyle="emptyicon"
        fallbackLabel="Example"
        iconRendering="letter"
        iconColor="#FFF2A8"
      />,
    );

    const letter = view.getByText('E') as HTMLSpanElement;
    expect(letter.style.color).not.toBe('');
  });

  it('keeps colorful appearance on a real image element', () => {
    const view = render(
      <ShortcutIcon
        icon="https://icons.example.com/colorful.png"
        url="https://example.com/path"
        frame="never"
        exact
        iconAppearance="colorful"
      />,
    );

    const colorfulLayer = view.container.querySelector('[data-shortcut-icon-appearance="colorful"]');
    expect(colorfulLayer).not.toBeNull();
    expect(colorfulLayer?.tagName).toBe('IMG');
  });

  it('renders monochrome appearance as a tinted icon layer', () => {
    const view = render(
      <ShortcutIcon
        icon="https://icons.example.com/mono.png"
        url="https://example.com/path"
        frame="never"
        exact
        iconAppearance="monochrome"
      />,
    );

    const monochromeLayer = view.container.querySelector('[data-shortcut-icon-appearance="monochrome"]');
    expect(monochromeLayer).not.toBeNull();
    expect(monochromeLayer?.tagName).toBe('IMG');
    expect(monochromeLayer?.getAttribute('style') || '').toContain('filter: url(#leaftab-shortcut-icon-filter-monochrome)');
  });

  it('uses a fixed white monochrome filter without applying per-icon backdrop blur', () => {
    const view = render(
      <ShortcutIconRenderContext.Provider
        value={{
          monochromeTone: 'fixed-white',
          monochromeTileBackdropBlur: true,
        }}
      >
        <ShortcutIcon
          icon="https://icons.example.com/mono.png"
          url="https://example.com/path"
          frame="never"
          exact
          fallbackStyle="emptyicon"
          fallbackLabel="Example"
          iconAppearance="monochrome"
        />
      </ShortcutIconRenderContext.Provider>,
    );

    const monochromeLayer = view.container.querySelector('[data-shortcut-icon-appearance="monochrome"]');
    expect(monochromeLayer).not.toBeNull();
    expect(monochromeLayer?.getAttribute('style') || '').toContain('filter: url(#leaftab-shortcut-icon-filter-monochrome-fixed-white)');

    const blurredSurface = view.container.querySelector('[data-shortcut-icon-surface="blurred"]');
    expect(blurredSurface).toBeNull();
  });

  it('applies accent appearance to empty icon tiles and glyphs', () => {
    const view = render(
      <ShortcutIcon
        icon="https://icons.example.com/accent.png"
        url="https://example.com/path"
        frame="never"
        fallbackStyle="emptyicon"
        fallbackLabel="Example"
        iconAppearance="accent"
      />,
    );

    const accentLayer = view.container.querySelector('[data-shortcut-icon-appearance="accent"]');
    expect(accentLayer).not.toBeNull();
    expect(accentLayer?.getAttribute('style') || '').toContain('filter: url(#leaftab-shortcut-icon-filter-accent)');

    const accentTile = view.container.querySelector('div[style*="color-mix(in srgb, var(--primary) 14%, var(--background) 86%)"]');
    expect(accentTile).not.toBeNull();
  });

  it('renders official svg icons with accent-colored masking while keeping the accent surface styling', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<svg xmlns="http://www.w3.org/2000/svg"><path d="M1 1h22v22H1z" fill="white" /></svg>',
    }));
    resolveCustomIconFromCacheMock.mockReturnValue({
      url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
      signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
      mode: 'shape-color',
      defaultColor: '#24292F',
    });
    resolveCustomIconMock.mockResolvedValue({
      url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
      signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
      mode: 'shape-color',
      defaultColor: '#24292F',
    });

    const view = render(
      <ShortcutIcon
        icon=""
        url="https://github.com"
        useOfficialIcon
        autoUseOfficialIcon
        officialIconAvailableAtSave
        iconAppearance="accent"
      />,
    );

    await waitFor(() => {
      const officialMaskLayer = view.container.querySelector('[data-shortcut-icon-appearance="accent"]');
      expect(officialMaskLayer).not.toBeNull();
      expect(officialMaskLayer?.tagName).toBe('DIV');
      expect(officialMaskLayer?.getAttribute('style') || '').toContain('background-color: var(--primary)');
      expect(officialMaskLayer?.getAttribute('style') || '').toMatch(/mask-image: url\(/);
    });

    const preloadImage = view.container.querySelector('img[data-shortcut-icon-preload="true"]');
    expect(preloadImage).not.toBeNull();
    expect(preloadImage?.getAttribute('style') || '').not.toContain('leaftab-shortcut-icon-filter-accent');

    const accentTile = view.container.querySelector('div[style*="color-mix(in srgb, var(--primary) 14%, var(--background) 86%)"]');
    expect(accentTile).not.toBeNull();
  });

  it('adds a subtle default gradient texture on colorful pure-color official icon tiles', async () => {
    resolveCustomIconFromCacheMock.mockReturnValue({
      url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
      signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
      mode: 'shape-color',
      defaultColor: '#24292F',
    });
    resolveCustomIconMock.mockResolvedValue({
      url: 'https://local.test/leaftab-icons/shapes/github.com.svg',
      signature: 'shape:github.com:shapes/github.com.svg|color:#24292F',
      mode: 'shape-color',
      defaultColor: '#24292F',
    });

    const view = render(
      <ShortcutIcon
        icon=""
        url="https://github.com"
        useOfficialIcon
        autoUseOfficialIcon
        officialIconAvailableAtSave
        iconAppearance="colorful"
      />,
    );

    await waitFor(() => {
      const texturedTile = view.container.querySelector('div[style*="background-image: linear-gradient("]');
      expect(texturedTile).not.toBeNull();
    });
  });

  it('renders a subtle border overlay for icon tile containers', () => {
    const view = render(
      <ShortcutIcon
        icon=""
        url="https://example.com/path"
        frame="never"
        fallbackStyle="emptyicon"
        fallbackLabel="Example"
        iconAppearance="colorful"
      />,
    );

    const borderOverlay = view.container.querySelector('div[style*="border: 1px solid color-mix("]');
    expect(borderOverlay).not.toBeNull();
    expect(borderOverlay?.getAttribute('style') || '').toContain('color-mix(in srgb, var(--foreground) 12%, transparent)');
  });

  it('keeps legacy official svg files out of the shape-mask tint path', async () => {
    resolveCustomIconFromCacheMock.mockReturnValue({
      url: 'https://local.test/leaftab-icons/legacy/github-embed.svg',
      signature: 'path:github.com:legacy/github-embed.svg',
      mode: 'legacy-image',
    });
    resolveCustomIconMock.mockResolvedValue({
      url: 'https://local.test/leaftab-icons/legacy/github-embed.svg',
      signature: 'path:github.com:legacy/github-embed.svg',
      mode: 'legacy-image',
    });

    const view = render(
      <ShortcutIcon
        icon=""
        url="https://github.com"
        useOfficialIcon
        autoUseOfficialIcon
        officialIconAvailableAtSave
        iconAppearance="accent"
      />,
    );

    const officialImage = view.container.querySelector('img[data-shortcut-icon-appearance="colorful"]');
    expect(officialImage).not.toBeNull();

    const officialMaskLayer = view.container.querySelector('div[data-shortcut-icon-appearance="accent"]');
    expect(officialMaskLayer).toBeNull();

    const preloadImage = view.container.querySelector('img[data-shortcut-icon-preload="true"]');
    expect(preloadImage).toBeNull();
  });

  it('falls back to image tinting for shape-color svg files that embed raster artwork', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => `
        <svg xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pattern0" patternContentUnits="objectBoundingBox" width="1" height="1">
              <use href="#image0" transform="scale(0.001)" />
            </pattern>
          </defs>
          <rect width="24" height="24" fill="url(#pattern0)" />
          <image id="image0" width="512" height="512" href="data:image/png;base64,AAAA" />
        </svg>
      `,
    }));
    resolveCustomIconFromCacheMock.mockReturnValue({
      url: 'https://local.test/leaftab-icons/shapes/doubao.com.svg',
      signature: 'shape:doubao.com:shapes/doubao.com.svg|color:#FFFFFF',
      mode: 'shape-color',
      defaultColor: '#FFFFFF',
    });
    resolveCustomIconMock.mockResolvedValue({
      url: 'https://local.test/leaftab-icons/shapes/doubao.com.svg',
      signature: 'shape:doubao.com:shapes/doubao.com.svg|color:#FFFFFF',
      mode: 'shape-color',
      defaultColor: '#FFFFFF',
    });

    const view = render(
      <ShortcutIcon
        icon=""
        url="https://doubao.com"
        useOfficialIcon
        autoUseOfficialIcon
        officialIconAvailableAtSave
        iconAppearance="accent"
      />,
    );

    await waitFor(() => {
      const officialTintedImage = view.container.querySelector('img[data-shortcut-icon-appearance="accent"]');
      expect(officialTintedImage).not.toBeNull();
      expect(officialTintedImage?.getAttribute('style') || '').toContain('filter: url(#leaftab-shortcut-icon-filter-accent)');
    });

    const officialMaskLayer = view.container.querySelector('div[data-shortcut-icon-appearance="accent"]');
    expect(officialMaskLayer).toBeNull();

    const preloadImage = view.container.querySelector('img[data-shortcut-icon-preload="true"]');
    expect(preloadImage).toBeNull();
  });
});
