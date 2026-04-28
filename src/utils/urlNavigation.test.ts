import { describe, expect, it } from 'vitest';
import { isLikelyLocalUrlHost, toNavigableUrl } from '@/utils/urlNavigation';

describe('urlNavigation', () => {
  it('defaults private network targets to http', () => {
    expect(toNavigableUrl('192.168.1.1')).toBe('http://192.168.1.1');
    expect(toNavigableUrl('10.0.0.5:8080/admin')).toBe('http://10.0.0.5:8080/admin');
    expect(toNavigableUrl('localhost:3000')).toBe('http://localhost:3000');
    expect(toNavigableUrl('nas.local/login')).toBe('http://nas.local/login');
  });

  it('keeps public addresses on https by default', () => {
    expect(toNavigableUrl('github.com')).toBe('https://github.com');
    expect(toNavigableUrl('docs.example.com/path')).toBe('https://docs.example.com/path');
  });

  it('respects explicit schemes', () => {
    expect(toNavigableUrl('https://192.168.1.1')).toBe('https://192.168.1.1');
    expect(toNavigableUrl('http://router.local')).toBe('http://router.local');
  });

  it('recognizes local hosts consistently', () => {
    expect(isLikelyLocalUrlHost('192.168.1.1')).toBe(true);
    expect(isLikelyLocalUrlHost('127.0.0.1')).toBe(true);
    expect(isLikelyLocalUrlHost('localhost')).toBe(true);
    expect(isLikelyLocalUrlHost('printer.local')).toBe(true);
    expect(isLikelyLocalUrlHost('openai.com')).toBe(false);
  });
});
