import { useMemo, useRef, useState } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGlobalSearchActivation } from '@/components/home/useGlobalSearchActivation';
import {
  focusSearchInputElement,
  type SearchActivationHandle,
} from '@/components/search/searchActivation.shared';

function ActivationHarness({
  anyKeyCaptureEnabled = true,
  initialValue = '',
  armFocusedCapture = false,
}: {
  anyKeyCaptureEnabled?: boolean;
  initialValue?: string;
  armFocusedCapture?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const focusedCapturePendingRef = useRef(armFocusedCapture);

  const activationHandle = useMemo<SearchActivationHandle>(() => ({
    id: 'test-search',
    inputRef,
    anyKeyCaptureEnabled,
    focusInput: (options) => {
      const input = inputRef.current;
      if (!input) return;
      focusSearchInputElement(input, options);
    },
    appendText: (text) => {
      const input = inputRef.current;
      if (input) {
        focusSearchInputElement(input);
      }
      setValue((prev) => `${prev}${text}`);
    },
    armFocusedPrintableCapture: () => {
      focusedCapturePendingRef.current = true;
    },
    consumeFocusedPrintableCapture: () => {
      if (!focusedCapturePendingRef.current) return false;
      focusedCapturePendingRef.current = false;
      return true;
    },
  }), [anyKeyCaptureEnabled]);

  useGlobalSearchActivation(activationHandle);

  return (
    <input
      ref={inputRef}
      data-testid="search-input"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

describe('useGlobalSearchActivation', () => {
  it('focuses the search input and preserves the first printable character', () => {
    const { getByTestId } = render(<ActivationHarness />);
    const input = getByTestId('search-input') as HTMLInputElement;

    fireEvent.keyDown(window, {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });

    expect(input).toHaveFocus();
    expect(input).toHaveValue('a');
  });

  it('can capture the first printable key while the bootstrap-focused input is already active', () => {
    const { getByTestId } = render(<ActivationHarness armFocusedCapture />);
    const input = getByTestId('search-input') as HTMLInputElement;

    input.focus();
    fireEvent.keyDown(input, {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });
    fireEvent.change(input, {
      target: {
        value: 'a',
      },
    });

    expect(input).toHaveFocus();
    expect(input).toHaveValue('a');
  });

  it('falls back to manual append when a focused printable capture is consumed outside the input target', () => {
    const { getByTestId } = render(<ActivationHarness armFocusedCapture />);
    const input = getByTestId('search-input') as HTMLInputElement;

    input.focus();
    fireEvent.keyDown(window, {
      key: 'a',
      bubbles: true,
      cancelable: true,
    });

    expect(input).toHaveFocus();
    expect(input).toHaveValue('a');
  });

  it('routes global paste into the active search input when the page is not focused on an editor', () => {
    const { getByTestId } = render(<ActivationHarness initialValue="go:" />);
    const input = getByTestId('search-input') as HTMLInputElement;
    fireEvent.paste(document.body, {
      clipboardData: {
        getData: () => 'leaf',
      },
    });

    expect(input).toHaveFocus();
    expect(input).toHaveValue('go:leaf');
  });

  it('uses Cmd/Ctrl+K to focus and select the existing query', () => {
    const { getByTestId } = render(<ActivationHarness initialValue="existing query" />);
    const input = getByTestId('search-input') as HTMLInputElement;

    fireEvent.keyDown(window, {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });

    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);
  });
});
