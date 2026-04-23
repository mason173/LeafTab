import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPlaceholderBannerText } from '@/components/search/SearchPlaceholderBannerText';

describe('SearchPlaceholderBannerText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => window.setTimeout(() => {
      callback(performance.now());
    }, 0));
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      window.clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('slides to the next placeholder and removes the previous text after the transition', () => {
    const { rerender } = render(
      <SearchPlaceholderBannerText
        text="Search anything"
        className="block truncate"
        fontSize={14}
        lineHeight={20}
      />,
    );

    rerender(
      <SearchPlaceholderBannerText
        text="Switch tabs with @"
        className="block truncate"
        fontSize={14}
        lineHeight={20}
      />,
    );

    expect(screen.getByText('Search anything')).toBeInTheDocument();
    expect(screen.getByText('Switch tabs with @')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.queryByText('Search anything')).not.toBeInTheDocument();
    expect(screen.getByText('Switch tabs with @')).toBeInTheDocument();
  });

  it('renders the latest placeholder immediately when animation is disabled', () => {
    const { rerender } = render(
      <SearchPlaceholderBannerText
        text="Search anything"
        className="block truncate"
        fontSize={14}
        lineHeight={20}
        disableAnimation
      />,
    );

    rerender(
      <SearchPlaceholderBannerText
        text="Switch tabs with @"
        className="block truncate"
        fontSize={14}
        lineHeight={20}
        disableAnimation
      />,
    );

    expect(screen.queryByText('Search anything')).not.toBeInTheDocument();
    expect(screen.getByText('Switch tabs with @')).toBeInTheDocument();
  });
});
