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
import { createLeafTabSyncSerializedSnapshot } from './fileMap';
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

  it('exports and applies stored custom shortcut icons by shortcut id', () => {
    applyShortcutCustomIcons({
      shortcut_a: ICON_A,
      shortcut_b: ICON_B,
    });

    expect(exportShortcutCustomIcons(['shortcut_a'])).toEqual({
      shortcut_a: ICON_A,
    });

    applyShortcutCustomIcons({
      shortcut_a: ICON_B,
    }, {
      replace: true,
      shortcutIds: ['shortcut_a', 'shortcut_b'],
    });
    flushQueuedLocalStorageWrites();

    expect(readShortcutCustomIcon('shortcut_a')).toBe(ICON_B);
    expect(readShortcutCustomIcon('shortcut_b')).toBe('');
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
