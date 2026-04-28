import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearch } from './useSearch';

describe('useSearch', () => {
  const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

  beforeEach(() => {
    windowOpenSpy.mockClear();
    localStorage.clear();
  });

  it('opens private network addresses over http when no scheme is provided', () => {
    const { result } = renderHook(() => useSearch(true));

    act(() => {
      result.current.openSearchWithQuery('192.168.1.1');
    });

    expect(windowOpenSpy).toHaveBeenCalledWith('http://192.168.1.1', '_blank');
  });

  it('keeps public domains on https when no scheme is provided', () => {
    const { result } = renderHook(() => useSearch(true));

    act(() => {
      result.current.openSearchWithQuery('github.com');
    });

    expect(windowOpenSpy).toHaveBeenCalledWith('https://github.com', '_blank');
  });
});
