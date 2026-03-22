import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar } from '@/components/SearchBar';
import type { SearchAction } from '@/utils/searchActions';

function createAction(): SearchAction {
  return {
    id: 'shortcut:https://leaf.example:0',
    kind: 'open-target',
    permission: null,
    usageKey: 'query:leaf',
    item: {
      type: 'shortcut',
      label: 'Leaf',
      value: 'https://leaf.example',
      icon: '',
    },
  };
}

function dispatchComposingEnter(target: HTMLElement) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Enter',
  });
  Object.defineProperty(event, 'isComposing', {
    configurable: true,
    value: true,
  });
  fireEvent(target, event);
}

function renderSearchBar(props?: Partial<React.ComponentProps<typeof SearchBar>>) {
  const onSubmit = vi.fn();
  const inputRef = { current: null as HTMLInputElement | null };
  const searchAction = createAction();

  render(
    <SearchBar
      value="leaf"
      onValueChange={vi.fn()}
      onSubmit={onSubmit}
      searchEngine="system"
      dropdownOpen={false}
      onEngineOpenChange={vi.fn()}
      onEngineSelect={vi.fn()}
      searchActions={[searchAction]}
      historyOpen
      onHistoryOpen={vi.fn()}
      onSuggestionSelect={vi.fn()}
      onSuggestionHighlight={vi.fn()}
      onHistoryClear={vi.fn()}
      onClear={vi.fn()}
      historyRef={{ current: null }}
      historySelectedIndex={0}
      inputRef={inputRef}
      {...props}
    />,
  );

  return {
    onSubmit,
    input: screen.getByRole('textbox'),
  };
}

describe('SearchBar Enter handling', () => {
  it('submits on Enter when not composing', () => {
    const { input, onSubmit } = renderSearchBar();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit on Enter during IME composition when no suggestion is selected', () => {
    const { input, onSubmit } = renderSearchBar({
      allowSelectedSuggestionEnter: false,
      historySelectedIndex: -1,
    });

    dispatchComposingEnter(input);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('still submits selected suggestion on Enter during IME composition', () => {
    const { input, onSubmit } = renderSearchBar({
      allowSelectedSuggestionEnter: true,
      historySelectedIndex: 0,
    });

    dispatchComposingEnter(input);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
