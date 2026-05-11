// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { buildBackupDataV4, parseLeafTabBackup } from '@/utils/backupData';
import {
  applyShortcutCustomIcons,
  exportShortcutCustomIcons,
  readShortcutCustomIcon,
} from '@/utils/shortcutCustomIcons';
import { flushQueuedLocalStorageWrites } from '@/utils/storageWriteQueue';
import { createLeafTabLocalBackupBundle, parseLeafTabLocalBackupImport } from './localBackup';
import { collectLeafTabSyncChangedPayloadPaths, createLeafTabSyncSerializedSnapshot } from './fileMap';
import { materializeLeafTabSyncSnapshotFromPayloadMap } from './snapshotCodec';
import type { LeafTabSyncSnapshot } from './schema';

const ICON_A = 'data:image/png;base64,aaaa';
const ICON_B = 'data:image/png;base64,bbbb';

const createSnapshot = (): LeafTabSyncSnapshot => {
  const now = '2026-05-09T00:00:00.000Z';
  return {
    meta: {
      version: 2,
      deviceId: 'device-a',
      generatedAt: now,
    },
    preferences: null,
    scenarios: {
      default: {
        id: 'default',
        type: 'scenario',
        name: 'Default',
        color: '#22c55e',
        icon: 'leaf',
        archived: false,
        createdAt: now,
        updatedAt: now,
        updatedBy: 'device-a',
        revision: 1,
      },
    },
    shortcuts: {
      shortcut_a: {
        id: 'shortcut_a',
        type: 'shortcut',
        scenarioId: 'default',
        title: 'Docs',
        url: 'https://docs.example',
        icon: '',
        description: '',
        createdAt: now,
        updatedAt: now,
        updatedBy: 'device-a',
        revision: 1,
      },
    },
    customShortcutIcons: {
      shortcut_a: ICON_A,
    },
    bookmarkFolders: {},
    bookmarkItems: {},
    scenarioOrder: {
      type: 'scenario-order',
      ids: ['default'],
      updatedAt: now,
      updatedBy: 'device-a',
      revision: 1,
    },
    shortcutOrders: {
      default: {
        type: 'shortcut-order',
        scenarioId: 'default',
        ids: ['shortcut_a'],
        updatedAt: now,
        updatedBy: 'device-a',
        revision: 1,
      },
    },
    bookmarkOrders: {},
    tombstones: {},
  };
};

describe('custom shortcut icon sync payloads', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('temporarily disables stored custom shortcut icons for CPU mitigation', () => {
    applyShortcutCustomIcons({
      shortcut_a: ICON_A,
      shortcut_b: ICON_B,
    });
    flushQueuedLocalStorageWrites();

    expect(readShortcutCustomIcon('shortcut_a')).toBe('');
    expect(readShortcutCustomIcon('shortcut_b')).toBe('');
    expect(exportShortcutCustomIcons(['shortcut_a'])).toEqual({});

    applyShortcutCustomIcons({
      shortcut_a: ICON_B,
    }, {
      replace: true,
      shortcutIds: ['shortcut_a', 'shortcut_b'],
    });
    flushQueuedLocalStorageWrites();

    expect(readShortcutCustomIcon('shortcut_a')).toBe('');
    expect(readShortcutCustomIcon('shortcut_b')).toBe('');
  });

  it('ignores oversized custom icon payloads', () => {
    const oversizedIcon = `data:image/png;base64,${'a'.repeat(230_000)}`;

    applyShortcutCustomIcons({
      shortcut_a: oversizedIcon,
      shortcut_b: ICON_B,
    }, {
      replace: true,
      shortcutIds: ['shortcut_a', 'shortcut_b'],
    });
    flushQueuedLocalStorageWrites();

    expect(readShortcutCustomIcon('shortcut_a')).toBe('');
    expect(readShortcutCustomIcon('shortcut_b')).toBe('');
    expect(exportShortcutCustomIcons(['shortcut_a', 'shortcut_b'])).toEqual({});
  });

  it('serializes custom icons through engine packs and local backup bundles', () => {
    const snapshot = createSnapshot();
    const serialized = createLeafTabSyncSerializedSnapshot(snapshot);
    const rematerialized = materializeLeafTabSyncSnapshotFromPayloadMap(
      serialized.payloads,
      serialized.commit,
    );

    expect(rematerialized?.customShortcutIcons).toEqual({
      shortcut_a: ICON_A,
    });
    expect(Object.keys(serialized.payloads)).toContain('leaftab/v1/packs/custom-shortcut-icons.pack.json');

    const bundle = createLeafTabLocalBackupBundle({ snapshot });
    const imported = parseLeafTabLocalBackupImport(bundle);

    expect(imported?.kind).toBe('engine-bundle');
    if (imported?.kind === 'engine-bundle') {
      expect(imported.snapshot.customShortcutIcons).toEqual({
        shortcut_a: ICON_A,
      });
    }
  });

  it('filters oversized custom icons and compares custom icon changes by hash', () => {
    const snapshot = createSnapshot();
    const oversizedIcon = `data:image/png;base64,${'a'.repeat(230_000)}`;
    snapshot.shortcuts.shortcut_b = {
      ...snapshot.shortcuts.shortcut_a,
      id: 'shortcut_b',
      title: 'Large Icon',
    };
    snapshot.customShortcutIcons = {
      shortcut_a: ICON_A,
      shortcut_b: oversizedIcon,
      missing_shortcut: ICON_B,
    };

    const serialized = createLeafTabSyncSerializedSnapshot(snapshot);
    const iconPack = serialized.payloads['leaftab/v1/packs/custom-shortcut-icons.pack.json'] as {
      icons?: Record<string, string>;
      hashes?: Record<string, string>;
      skipped?: { oversized?: number; orphaned?: number };
    };

    expect(iconPack.icons).toEqual({ shortcut_a: ICON_A });
    expect(Object.keys(iconPack.hashes || {})).toEqual(['shortcut_a']);
    expect(iconPack.skipped?.oversized).toBe(1);
    expect(iconPack.skipped?.orphaned).toBe(1);

    const nextSnapshot = {
      ...snapshot,
      customShortcutIcons: {
        shortcut_a: ICON_A,
        shortcut_b: oversizedIcon,
      },
    };
    const changedPaths = collectLeafTabSyncChangedPayloadPaths(snapshot, nextSnapshot);
    expect(Array.from(changedPaths || [])).not.toContain('leaftab/v1/packs/custom-shortcut-icons.pack.json');
  });

  it('keeps custom icons in legacy backup envelopes', () => {
    const envelope = buildBackupDataV4({
      scenarioModes: [],
      selectedScenarioId: '',
      scenarioShortcuts: {},
      customShortcutIcons: {
        shortcut_a: ICON_A,
      },
    });

    expect(parseLeafTabBackup(envelope)?.customShortcutIcons).toEqual({
      shortcut_a: ICON_A,
    });
  });
});
