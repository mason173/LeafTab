import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimeDisplayDialog } from '@/components/TimeDisplayDialog';

function renderDialog(overrides?: Partial<React.ComponentProps<typeof TimeDisplayDialog>>) {
  const props: React.ComponentProps<typeof TimeDisplayDialog> = {
    open: true,
    onOpenChange: vi.fn(),
    currentFont: 'Pacifico',
    previewTime: '12:34',
    is24Hour: true,
    onIs24HourChange: vi.fn(),
    showDate: true,
    onShowDateChange: vi.fn(),
    showWeekday: true,
    onShowWeekdayChange: vi.fn(),
    showSeconds: true,
    onShowSecondsChange: vi.fn(),
    showLunar: true,
    onShowLunarChange: vi.fn(),
    timeAnimationMode: 'on',
    onTimeAnimationModeChange: vi.fn(),
    onSelect: vi.fn(),
    ...overrides,
  };

  render(<TimeDisplayDialog {...props} />);
  return props;
}

function clickSettingCard(id: string) {
  const node = document.getElementById(id)?.closest('[role="button"]');
  if (!node) {
    throw new Error(`Unable to find clickable card for ${id}`);
  }
  fireEvent.click(node);
}

describe('TimeDisplayDialog', () => {
  it('toggles time animation through the card interaction', () => {
    const props = renderDialog();

    clickSettingCard('time-display-dialog-time-animation');

    expect(props.onTimeAnimationModeChange).toHaveBeenCalledWith('off');
  });

  it('toggles show seconds through the card interaction', () => {
    const props = renderDialog();

    clickSettingCard('time-display-dialog-show-seconds');

    expect(props.onShowSecondsChange).toHaveBeenCalledWith(false);
  });

  it('does not crash if time animation callback is unexpectedly missing at runtime', () => {
    renderDialog({
      onTimeAnimationModeChange: undefined as unknown as (mode: 'inherit' | 'on' | 'off') => void,
    });

    expect(() => clickSettingCard('time-display-dialog-time-animation')).not.toThrow();
  });
});
