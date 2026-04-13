import { describe, expect, it } from 'vitest';
import { sampleAccentFromImageData } from '@/utils/dynamicAccentColor';

const setPixel = (
  buffer: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  hex: string,
) => {
  const value = hex.replace('#', '');
  const parsed = Number.parseInt(value, 16);
  const offset = (y * width + x) * 4;
  buffer[offset] = (parsed >> 16) & 255;
  buffer[offset + 1] = (parsed >> 8) & 255;
  buffer[offset + 2] = parsed & 255;
  buffer[offset + 3] = 255;
};

const fillRect = (
  buffer: Uint8ClampedArray,
  width: number,
  startX: number,
  startY: number,
  rectWidth: number,
  rectHeight: number,
  hex: string,
) => {
  for (let y = startY; y < startY + rectHeight; y += 1) {
    for (let x = startX; x < startX + rectWidth; x += 1) {
      setPixel(buffer, width, x, y, hex);
    }
  }
};

const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }

  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);

  let hue = 0;
  switch (max) {
    case rn:
      hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
      break;
    case gn:
      hue = (bn - rn) / delta + 2;
      break;
    default:
      hue = (rn - gn) / delta + 4;
      break;
  }

  return {
    hue: (hue / 6) * 360,
    saturation,
    lightness,
  };
};

const hexToHsl = (hex: string) => {
  const value = hex.replace('#', '');
  const parsed = Number.parseInt(value, 16);
  return rgbToHsl(
    (parsed >> 16) & 255,
    (parsed >> 8) & 255,
    parsed & 255,
  );
};

describe('sampleAccentFromImageData', () => {
  it('prefers the dominant wallpaper hue over a tiny saturated distraction', () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4);
    fillRect(pixels, width, 0, 0, width, height, '#4F7EE8');
    fillRect(pixels, width, 0, 0, 2, 2, '#FF4B4B');

    const accent = sampleAccentFromImageData(pixels, width, height);
    const { hue } = hexToHsl(accent);

    expect(hue).toBeGreaterThan(205);
    expect(hue).toBeLessThan(235);
  });

  it('boosts muted wallpapers into a clearer usable accent color', () => {
    const width = 8;
    const height = 8;
    const pixels = new Uint8ClampedArray(width * height * 4);
    fillRect(pixels, width, 0, 0, width, height, '#6E8F82');

    const accent = sampleAccentFromImageData(pixels, width, height);
    const { hue, saturation, lightness } = hexToHsl(accent);

    expect(hue).toBeGreaterThan(145);
    expect(hue).toBeLessThan(180);
    expect(saturation).toBeGreaterThan(0.4);
    expect(lightness).toBeGreaterThan(0.42);
    expect(lightness).toBeLessThan(0.62);
  });

  it('ignores grayscale regions and picks the meaningful colored area', () => {
    const width = 12;
    const height = 12;
    const pixels = new Uint8ClampedArray(width * height * 4);
    fillRect(pixels, width, 0, 0, width, height, '#D5D7DB');
    fillRect(pixels, width, 3, 2, 6, 8, '#D98C27');
    setPixel(pixels, width, 0, 0, '#FFFFFF');

    const accent = sampleAccentFromImageData(pixels, width, height);
    const { hue, saturation } = hexToHsl(accent);

    expect(hue).toBeGreaterThan(20);
    expect(hue).toBeLessThan(45);
    expect(saturation).toBeGreaterThan(0.45);
  });
});
