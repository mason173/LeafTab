import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DrawerShortcutAlphabetRail } from '@/components/home/DrawerShortcutAlphabetRail';

describe('DrawerShortcutAlphabetRail', () => {
  it('uses a compact idle width and expands on hover', () => {
    const { getByLabelText } = render(
      <DrawerShortcutAlphabetRail
        letters={['A', 'B', 'C']}
        activeLetter={null}
        onLetterSelect={() => {}}
      />,
    );

    const rail = getByLabelText('快捷方式字母索引');
    const surface = rail.firstElementChild as HTMLDivElement;

    expect(surface.style.width).toBe('32px');
    expect(surface.style.transform).toBe('translate3d(0px, 0, 0)');

    fireEvent.pointerEnter(rail, { pointerType: 'mouse' });
    expect(surface.style.width).toBe('48px');
    expect(surface.style.transform).toBe('translate3d(8px, 0, 0)');

    fireEvent.pointerLeave(rail, { pointerType: 'mouse' });
    expect(surface.style.width).toBe('32px');
    expect(surface.style.transform).toBe('translate3d(0px, 0, 0)');
  });

  it('expands while one of its letter buttons is keyboard-focused', () => {
    const { getByRole, getByLabelText } = render(
      <DrawerShortcutAlphabetRail
        letters={['A', 'B', 'C']}
        activeLetter={null}
        onLetterSelect={() => {}}
      />,
    );

    const rail = getByLabelText('快捷方式字母索引');
    const surface = rail.firstElementChild as HTMLDivElement;
    const button = getByRole('button', { name: '筛选 A 开头的快捷方式' });

    expect(surface.style.width).toBe('32px');
    expect(surface.style.transform).toBe('translate3d(0px, 0, 0)');

    fireEvent.focus(button);
    expect(surface.style.width).toBe('48px');
    expect(surface.style.transform).toBe('translate3d(8px, 0, 0)');

    fireEvent.blur(button);
    expect(surface.style.width).toBe('32px');
    expect(surface.style.transform).toBe('translate3d(0px, 0, 0)');
  });
});
