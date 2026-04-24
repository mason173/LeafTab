import { createElement } from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  FROSTED_SURFACE_PRESET_ORDER,
  getDefaultFrostedSurfaceMaterialTokens,
  getDefaultFrostedSurfacePreset,
  getFrostedSurfaceMaterialTokens,
  getFrostedSurfacePreset,
  getFrostedSurfaceMaterialTokenOverrides,
  resetFrostedSurfaceMaterialTokenOverrides,
  updateFrostedSurfaceMaterialTokenOverride,
  useFrostedSurfaceMaterialTokens,
  useFrostedSurfacePreset,
} from '@/components/frosted/frostedSurfacePresets';

function FrostedPresetProbe() {
  const preset = useFrostedSurfacePreset('dialog-panel');

  return createElement('output', {
    'data-testid': 'dialog-panel-material',
    children: JSON.stringify(preset.material),
  });
}

function FrostedMaterialDialogProbe() {
  const material = useFrostedSurfaceMaterialTokens();

  return createElement(
    Dialog,
    { open: true },
    createElement(
      DialogContent,
      null,
      createElement('output', {
        'data-testid': 'dialog-material-sample-blur',
        children: material.sampleBlurPx,
      }),
    ),
  );
}

describe('frostedSurfacePresets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exposes a stable semantic preset order', () => {
    expect(FROSTED_SURFACE_PRESET_ORDER).toEqual([
      'search-pill',
      'search-panel',
      'dropdown-panel',
      'popover-panel',
      'floating-toolbar',
      'dialog-panel',
    ]);
  });

  it('persists overrides and merges them into resolved preset material tokens', () => {
    updateFrostedSurfaceMaterialTokenOverride('sampleBlurPx', 12);
    updateFrostedSurfaceMaterialTokenOverride('sampleScale', 1.075);
    updateFrostedSurfaceMaterialTokenOverride('lightSurfaceOverlayOpacity', 0.42);
    updateFrostedSurfaceMaterialTokenOverride('darkSurfaceOverlayOpacity', 0.58);

    const resolved = getFrostedSurfacePreset('dialog-panel');
    expect(resolved.material.sampleBlurPx).toBe(12);
    expect(resolved.material.sampleScale).toBe(1.075);
    expect(resolved.material.lightSurfaceOverlayOpacity).toBe(0.42);
    expect(resolved.material.darkSurfaceOverlayOpacity).toBe(0.58);

    const searchResolved = getFrostedSurfacePreset('search-panel');
    expect(searchResolved.material.sampleBlurPx).toBe(12);
    expect(searchResolved.material.darkSurfaceOverlayOpacity).toBe(0.58);

    const defaultMaterialTokens = getDefaultFrostedSurfaceMaterialTokens();
    expect(defaultMaterialTokens.darkSurfaceOverlayOpacity).toBe(0.61);

    const defaults = getDefaultFrostedSurfacePreset('dialog-panel');
    expect(defaults.material.sampleBlurPx).toBe(0);
    expect(defaults.material.sampleScale).toBe(1);
    expect(defaults.material.lightSurfaceOverlayOpacity).toBe(0.83);
    expect(defaults.material.darkSurfaceOverlayOpacity).toBe(0.61);
  });

  it('normalizes out-of-range overrides', () => {
    updateFrostedSurfaceMaterialTokenOverride('lightSurfaceOverlayOpacity', 2);
    updateFrostedSurfaceMaterialTokenOverride('darkSurfaceOverlayOpacity', -1);
    updateFrostedSurfaceMaterialTokenOverride('sampleScale', 999);
    updateFrostedSurfaceMaterialTokenOverride('sampleOverscanPx', -15);

    const resolved = getFrostedSurfacePreset('search-panel');
    expect(resolved.material.lightSurfaceOverlayOpacity).toBe(1);
    expect(resolved.material.darkSurfaceOverlayOpacity).toBe(0);
    expect(resolved.material.sampleScale).toBe(1.12);
    expect(resolved.material.sampleOverscanPx).toBe(0);
  });

  it('drops overrides when values match defaults', () => {
    const changeListener = vi.fn();
    window.addEventListener('leaftab-frosted-surface-overrides-changed', changeListener as EventListener);

    const defaultScale = getDefaultFrostedSurfaceMaterialTokens().sampleScale;
    updateFrostedSurfaceMaterialTokenOverride('sampleScale', 1.08);
    updateFrostedSurfaceMaterialTokenOverride('sampleScale', defaultScale);

    expect(getFrostedSurfaceMaterialTokenOverrides().sampleScale).toBeUndefined();
    expect(changeListener).toHaveBeenCalledTimes(2);

    window.removeEventListener('leaftab-frosted-surface-overrides-changed', changeListener as EventListener);
  });

  it('can reset all global material overrides at once', () => {
    updateFrostedSurfaceMaterialTokenOverride('sampleBlurPx', 8);
    updateFrostedSurfaceMaterialTokenOverride('lightSurfaceOverlayOpacity', 0.8);

    resetFrostedSurfaceMaterialTokenOverrides();
    expect(getFrostedSurfaceMaterialTokenOverrides()).toEqual({});
  });

  it('returns a referentially stable material snapshot until overrides change', () => {
    const initialSnapshot = getFrostedSurfaceMaterialTokens();
    const repeatedSnapshot = getFrostedSurfaceMaterialTokens();

    expect(repeatedSnapshot).toBe(initialSnapshot);

    updateFrostedSurfaceMaterialTokenOverride('sampleBlurPx', 6);

    const updatedSnapshot = getFrostedSurfaceMaterialTokens();
    expect(updatedSnapshot).not.toBe(initialSnapshot);
    expect(updatedSnapshot.sampleBlurPx).toBe(6);

    const repeatedUpdatedSnapshot = getFrostedSurfaceMaterialTokens();
    expect(repeatedUpdatedSnapshot).toBe(updatedSnapshot);
  });

  it('pushes live updates through useFrostedSurfacePreset without a reload', () => {
    render(createElement(FrostedPresetProbe));

    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"lightSurfaceOverlayOpacity":0.83');
    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"darkSurfaceOverlayOpacity":0.61');
    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"borderVisible":false');

    act(() => {
      updateFrostedSurfaceMaterialTokenOverride('lightSurfaceOverlayOpacity', 0.24);
      updateFrostedSurfaceMaterialTokenOverride('darkSurfaceOverlayOpacity', 0.54);
      updateFrostedSurfaceMaterialTokenOverride('borderVisible', true);
    });

    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"lightSurfaceOverlayOpacity":0.24');
    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"darkSurfaceOverlayOpacity":0.54');
    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"borderVisible":true');

    act(() => {
      resetFrostedSurfaceMaterialTokenOverrides();
    });

    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"lightSurfaceOverlayOpacity":0.83');
    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"darkSurfaceOverlayOpacity":0.61');
    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"borderVisible":false');
  });

  it('renders frosted dialog subscribers without snapshot cache warnings', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(createElement(FrostedMaterialDialogProbe));

    expect(screen.getByTestId('dialog-material-sample-blur')).toHaveTextContent('0');
    expect(consoleErrorSpy.mock.calls).not.toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          expect.stringContaining('getSnapshot should be cached'),
        ]),
      ]),
    );

    consoleErrorSpy.mockRestore();
  });

  it('maps legacy shared overlay opacity into both theme-specific overlay tokens', () => {
    render(createElement(FrostedPresetProbe));

    act(() => {
      localStorage.setItem('leaftab_frosted_surface_overrides_v1', JSON.stringify({
        'dialog-panel': {
          surfaceOverlayOpacity: 0.37,
        },
      }));
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'leaftab_frosted_surface_overrides_v1',
      }));
    });

    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"lightSurfaceOverlayOpacity":0.37');
    expect(screen.getByTestId('dialog-panel-material')).toHaveTextContent('"darkSurfaceOverlayOpacity":0.37');
  });
});
