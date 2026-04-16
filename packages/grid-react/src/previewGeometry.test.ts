import { describe, expect, it } from 'vitest';
import { normalizePreviewGeometry } from './previewGeometry';

describe('normalizePreviewGeometry', () => {
  it('preserves an explicit previewRect without re-centering it', () => {
    const geometry = normalizePreviewGeometry({
      width: 72,
      height: 96,
      previewRect: {
        left: 0,
        top: 0,
        width: 72,
        height: 72,
        borderRadius: '20px',
      },
    });

    expect(geometry.previewOffsetX).toBe(0);
    expect(geometry.previewOffsetY).toBe(0);
    expect(geometry.previewWidth).toBe(72);
    expect(geometry.previewHeight).toBe(72);
    expect(geometry.previewRect).toEqual({
      left: 0,
      top: 0,
      width: 72,
      height: 72,
      borderRadius: '20px',
    });
  });

  it('falls back to the legacy centered preview geometry when no previewRect is provided', () => {
    const geometry = normalizePreviewGeometry({
      width: 72,
      height: 96,
      previewWidth: 72,
      previewHeight: 72,
      previewBorderRadius: '18px',
    });

    expect(geometry.previewOffsetX).toBe(0);
    expect(geometry.previewOffsetY).toBe(12);
    expect(geometry.previewRect).toEqual({
      left: 0,
      top: 12,
      width: 72,
      height: 72,
      borderRadius: '18px',
    });
  });
});
