import { describe, expect, it } from 'vitest';
import { parseLeafTabBackup } from '@/utils/backupData';
import { normalizeCloudShortcutsPayload, normalizeScenarioShortcuts } from '@/utils/shortcutsPayload';

describe('normalizeScenarioShortcuts', () => {
  it('preserves explicit icon colors and keeps missing colors empty', () => {
    const normalized = normalizeScenarioShortcuts({
      work: [
        {
          id: 'a',
          title: 'Alpha',
          url: 'https://alpha.example',
          iconColor: '#12ab90',
        },
        {
          id: 'b',
          title: 'Beta',
          url: 'https://beta.example',
        },
      ],
    });

    expect(normalized.work).toEqual([
      expect.objectContaining({
        id: 'a',
        iconColor: '#12AB90',
      }),
      expect.objectContaining({
        id: 'b',
        iconColor: '',
      }),
    ]);
  });

  it('normalizes folder shortcuts and their child links recursively', () => {
    const normalized = normalizeScenarioShortcuts({
      work: [
        {
          id: 'folder-1',
          kind: 'folder',
          title: 'Workspace',
          folderDisplayMode: 'large',
          children: [
            {
              id: 'link-1',
              title: 'Docs',
              url: 'https://docs.example',
              icon: '',
            },
          ],
        },
      ],
    });

    expect(normalized.work).toEqual([
      expect.objectContaining({
        id: 'folder-1',
        kind: 'folder',
        title: 'Workspace',
        url: '',
        folderDisplayMode: 'large',
        children: [
          expect.objectContaining({
            id: 'link-1',
            kind: 'link',
            title: 'Docs',
            url: 'https://docs.example',
          }),
        ],
      }),
    ]);
  });

  it('supports legacy folder and shortcut field names from historical cloud payloads', () => {
    const normalized = normalizeScenarioShortcuts({
      work: {
        'p0-0': {
          id: 'group-1',
          name: '常用合集',
          shortcuts: [
            {
              id: 'legacy-link-1',
              name: 'Bilibili',
              link: 'https://www.bilibili.com',
              iconUrl: 'https://cdn.example.com/bilibili.png',
            },
          ],
        },
      },
    });

    expect(normalized.work).toEqual([
      expect.objectContaining({
        id: 'group-1',
        kind: 'folder',
        title: '常用合集',
        children: [
          expect.objectContaining({
            id: 'legacy-link-1',
            kind: 'link',
            title: 'Bilibili',
            url: 'https://www.bilibili.com',
            icon: 'https://cdn.example.com/bilibili.png',
          }),
        ],
      }),
    ]);
  });

  it('dedupes repeated shortcut urls across a scenario while keeping the first occurrence', () => {
    const normalized = normalizeScenarioShortcuts({
      work: [
        {
          id: 'primary',
          title: 'GitHub',
          url: 'https://github.com/',
          icon: '',
        },
        {
          id: 'duplicate-root',
          title: 'GitHub Duplicate',
          url: 'https://www.github.com',
          icon: '',
        },
        {
          id: 'folder-1',
          kind: 'folder',
          title: 'Workspace',
          children: [
            {
              id: 'docs',
              title: 'Docs',
              url: 'https://docs.example',
              icon: '',
            },
            {
              id: 'duplicate-child',
              title: 'GitHub Child',
              url: 'https://github.com',
              icon: '',
            },
          ],
        },
      ],
    });

    expect(normalized.work).toEqual([
      expect.objectContaining({
        id: 'primary',
        title: 'GitHub',
        url: 'https://github.com/',
      }),
      expect.objectContaining({
        id: 'folder-1',
        kind: 'folder',
        children: [
          expect.objectContaining({
            id: 'docs',
            title: 'Docs',
            url: 'https://docs.example',
          }),
        ],
      }),
    ]);
  });
});

describe('normalizeCloudShortcutsPayload', () => {
  it('accepts unwrapped legacy backup data that omits the version field', () => {
    const normalized = normalizeCloudShortcutsPayload({
      scenarioModes: [
        {
          id: 'work',
          name: '工作模式',
          color: '#000000',
          icon: 'briefcase',
        },
      ],
      selectedScenarioId: 'work',
      scenarioGroups: {
        work: {
          'p0-0': {
            id: 'group-1',
            name: '常用合集',
            shortcuts: [
              {
                id: 'legacy-link-1',
                title: 'Docs',
                url: 'https://docs.example.com',
                icon: '',
              },
            ],
          },
        },
      },
    }, '未命名');

    expect(normalized).toEqual(expect.objectContaining({
      version: 3,
      selectedScenarioId: 'work',
      scenarioShortcuts: {
        work: [
          expect.objectContaining({
            id: 'group-1',
            kind: 'folder',
            title: '常用合集',
          }),
        ],
      },
    }));
  });

  it('keeps legacy scenarioGroups backups parseable through the backup parser', () => {
    const payload = parseLeafTabBackup({
      type: 'leaftab_backup',
      version: 2,
      data: {
        scenarioModes: [
          {
            id: 'work',
            name: '工作模式',
            color: '#000000',
            icon: 'briefcase',
          },
        ],
        selectedScenarioId: 'work',
        scenarioGroups: {
          work: {
            'p0-0': {
              id: 'group-1',
              name: '常用合集',
              shortcuts: [
                {
                  id: 'shortcut-1',
                  title: 'LeafTab',
                  url: 'https://www.leaftab.cc',
                  icon: '',
                },
              ],
            },
          },
        },
      },
    });

    expect(payload).toEqual({
      scenarioModes: [
        {
          id: 'work',
          name: '工作模式',
          color: '#000000',
          icon: 'briefcase',
        },
      ],
      selectedScenarioId: 'work',
      scenarioShortcuts: {
        work: [
          {
            id: 'group-1',
            name: '常用合集',
            shortcuts: [
              {
                id: 'shortcut-1',
                title: 'LeafTab',
                url: 'https://www.leaftab.cc',
                icon: '',
              },
            ],
          },
        ],
      },
    });
  });
});
