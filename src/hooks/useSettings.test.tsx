import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useSettings } from '@/hooks/useSettings';

describe('useSettings search rotating placeholder setting', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('defaults rotating search placeholder to enabled', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.searchRotatingPlaceholderEnabled).toBe(true);
  });

  it('reads disabled rotating search placeholder from storage', () => {
    localStorage.setItem('search_rotating_placeholder_enabled', 'false');

    const { result } = renderHook(() => useSettings());

    expect(result.current.searchRotatingPlaceholderEnabled).toBe(false);
  });

  it('defaults time animation mode to enabled', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.timeAnimationMode).toBe('on');
  });
});
