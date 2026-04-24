import { describe, expect, it } from 'vitest';
import { createSearchAction } from '@/utils/searchActions';

describe('createSearchAction', () => {
  it('adds tab secondary actions for close, pin toggle, and copy link', () => {
    const action = createSearchAction({
      type: 'tab',
      label: 'LeafTab',
      value: 'https://leaftab.dev/',
      icon: '',
      tabId: 12,
      windowId: 3,
      pinned: true,
    }, 0);

    expect(action.kind).toBe('focus-tab');
    expect(action.secondaryActions).toEqual([
      { id: 'add-shortcut', kind: 'add-shortcut' },
      { id: 'close-tab', kind: 'close-tab' },
      { id: 'toggle-pin-tab', kind: 'toggle-pin-tab', active: true },
      { id: 'copy-link', kind: 'copy-link' },
    ]);
  });

  it('keeps non-tab results action-only with no secondary actions', () => {
    const action = createSearchAction({
      type: 'shortcut',
      label: 'GitHub',
      value: 'https://github.com/',
      icon: '',
    }, 0);

    expect(action.kind).toBe('open-target');
    expect(action.secondaryActions).toEqual([]);
  });

  it('adds bookmark secondary actions for remove and copy link when bookmark id is available', () => {
    const action = createSearchAction({
      type: 'bookmark',
      label: 'GitHub',
      value: 'https://github.com/',
      icon: '',
      bookmarkId: '42',
    }, 0);

    expect(action.kind).toBe('open-target');
    expect(action.secondaryActions).toEqual([
      { id: 'add-shortcut', kind: 'add-shortcut' },
      { id: 'remove-bookmark', kind: 'remove-bookmark' },
      { id: 'copy-link', kind: 'copy-link' },
    ]);
  });

  it('adds shortcut secondary actions for edit, delete, and copy link when shortcut id is available', () => {
    const action = createSearchAction({
      type: 'shortcut',
      label: 'GitHub',
      value: 'https://github.com/',
      icon: '',
      shortcutId: 'shortcut-1',
    }, 0);

    expect(action.kind).toBe('open-target');
    expect(action.secondaryActions).toEqual([
      { id: 'edit-shortcut', kind: 'edit-shortcut' },
      { id: 'delete-shortcut', kind: 'delete-shortcut' },
      { id: 'copy-link', kind: 'copy-link' },
    ]);
  });

  it('adds settings direct actions for the supported settings entries', () => {
    const themeAction = createSearchAction({
      type: 'history',
      label: '主题模式',
      value: 'leaftab://slash-action/theme-mode',
      timestamp: 0,
      historySource: 'browser',
      searchActionKey: 'theme-mode-entry',
      searchActionState: 'dark',
    }, 0);

    const showTimeAction = createSearchAction({
      type: 'history',
      label: '显示时间',
      value: 'leaftab://slash-action/settings-home',
      timestamp: 0,
      historySource: 'browser',
      searchActionKey: 'show-time-setting',
      searchActionState: 'enabled',
    }, 0);

    const wallpaperAction = createSearchAction({
      type: 'history',
      label: '必应壁纸',
      value: 'leaftab://slash-action/wallpaper-settings',
      timestamp: 0,
      historySource: 'browser',
      searchActionKey: 'wallpaper-bing-setting',
      searchActionState: 'weather',
    }, 0);

    const iconAppearanceAction = createSearchAction({
      type: 'history',
      label: '图标外观',
      value: 'leaftab://slash-action/shortcut-icon-settings',
      timestamp: 0,
      historySource: 'browser',
      searchActionKey: 'shortcut-icon-appearance-setting',
      searchActionState: 'accent',
    }, 0);

    expect(themeAction.secondaryActions).toEqual([
      { id: 'set-theme-mode', kind: 'set-theme-mode', targetMode: 'system', active: false },
      { id: 'set-theme-mode', kind: 'set-theme-mode', targetMode: 'light', active: false },
      { id: 'set-theme-mode', kind: 'set-theme-mode', targetMode: 'dark', active: true },
    ]);
    expect(showTimeAction.secondaryActions).toEqual([
      { id: 'toggle-show-time', kind: 'toggle-show-time', active: true },
    ]);
    expect(wallpaperAction.secondaryActions).toEqual([
      { id: 'set-wallpaper-mode', kind: 'set-wallpaper-mode', targetMode: 'bing', active: false },
      { id: 'set-wallpaper-mode', kind: 'set-wallpaper-mode', targetMode: 'weather', active: true },
      { id: 'set-wallpaper-mode', kind: 'set-wallpaper-mode', targetMode: 'color', active: false },
      { id: 'set-wallpaper-mode', kind: 'set-wallpaper-mode', targetMode: 'custom', active: false },
    ]);
    expect(iconAppearanceAction.secondaryActions).toEqual([
      { id: 'set-shortcut-icon-appearance', kind: 'set-shortcut-icon-appearance', targetAppearance: 'colorful', active: false },
      { id: 'set-shortcut-icon-appearance', kind: 'set-shortcut-icon-appearance', targetAppearance: 'monochrome', active: false },
      { id: 'set-shortcut-icon-appearance', kind: 'set-shortcut-icon-appearance', targetAppearance: 'accent', active: true },
    ]);
  });
});
