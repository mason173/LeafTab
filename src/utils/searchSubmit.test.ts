import { describe, expect, it } from 'vitest';
import { createSearchAction } from '@/utils/searchActions';
import { createSearchSessionModel } from '@/utils/searchSessionModel';
import { resolveSearchSubmitDecision } from '@/utils/searchSubmit';

describe('resolveSearchSubmitDecision', () => {
  it('activates the selected tab action in /tabs mode', () => {
    const session = createSearchSessionModel('/tabs leaf');
    const action = createSearchAction({
      type: 'tab',
      label: 'LeafTab',
      value: 'https://leaf.example',
      icon: '',
      tabId: 7,
      windowId: 3,
    }, 0);

    expect(resolveSearchSubmitDecision({ session, selectedAction: action })).toEqual({
      kind: 'activate-action',
      action,
    });
  });

  it('activates the selected bookmark action in /bookmarks mode', () => {
    const session = createSearchSessionModel('/bookmarks leaf');
    const action = createSearchAction({
      type: 'bookmark',
      label: 'Leaf docs',
      value: 'https://leaf.example/docs',
      icon: '',
    }, 0);

    expect(resolveSearchSubmitDecision({ session, selectedAction: action })).toEqual({
      kind: 'activate-action',
      action,
    });
  });

  it('activates the selected shortcut action in default mode', () => {
    const session = createSearchSessionModel('leaf');
    const action = createSearchAction({
      type: 'shortcut',
      label: 'Leaf homepage',
      value: 'https://leaf.example',
      icon: '',
    }, 0);

    expect(resolveSearchSubmitDecision({ session, selectedAction: action })).toEqual({
      kind: 'activate-action',
      action,
    });
  });

  it('activates the selected history action in default mode', () => {
    const session = createSearchSessionModel('leaf');
    const action = createSearchAction({
      type: 'history',
      label: 'leaf history',
      value: 'leaf history',
      timestamp: Date.now(),
      historySource: 'local',
    }, 0);

    expect(resolveSearchSubmitDecision({ session, selectedAction: action })).toEqual({
      kind: 'activate-action',
      action,
    });
  });
});
