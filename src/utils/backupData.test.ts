import { describe, expect, it } from 'vitest';
import { parseLeafTabBackup } from '@/utils/backupData';

describe('parseLeafTabBackup third-party imports', () => {
  it('imports only Infinity web shortcuts and filters app entries', () => {
    const payload = parseLeafTabBackup({
      data: {
        site: {
          sites: [[
            {
              id: 'weather',
              name: '天气',
              type: 'app',
              target: 'infinity://weather',
            },
            {
              id: 'folder-1',
              name: '文件夹',
              children: [
                {
                  id: 'bookmark-app',
                  name: '书签',
                  type: 'app',
                  target: 'infinity://bookmarks',
                },
                {
                  id: 'github-link',
                  name: 'GitHub',
                  type: 'web',
                  target: 'https://github.com',
                  bgImage: 'https://example.com/github.png',
                },
              ],
            },
            {
              id: 'baidu-link',
              name: '百度',
              type: 'web',
              target: 'https://www.baidu.com',
            },
          ]],
        },
      },
    });

    expect(payload).toMatchObject({
      selectedScenarioId: 'imported-shortcuts',
      scenarioShortcuts: {
        'imported-shortcuts': [
          {
            id: 'folder-1',
            kind: 'folder',
            children: [
              expect.objectContaining({
                id: 'github-link',
                title: 'GitHub',
                url: 'https://github.com',
              }),
            ],
          },
          expect.objectContaining({
            id: 'baidu-link',
            title: '百度',
            url: 'https://www.baidu.com',
          }),
        ],
      },
    });
  });

  it('imports iTab nav groups as folders with icon links only', () => {
    const payload = parseLeafTabBackup({
      navConfig: [
        {
          id: 'group-1',
          name: '常用',
          children: [
            {
              id: 'calendar',
              name: '日历',
              type: 'component',
            },
            {
              id: 'gh',
              name: 'GitHub',
              type: 'icon',
              url: 'https://github.com',
              src: 'https://example.com/gh.svg',
            },
          ],
        },
      ],
    });

    expect(payload?.scenarioShortcuts['imported-shortcuts']).toEqual([
      {
        id: 'group-1',
        title: '常用',
        icon: '',
        kind: 'folder',
        children: [
          {
            id: 'gh',
            title: 'GitHub',
            url: 'https://github.com',
            icon: 'https://example.com/gh.svg',
            kind: 'link',
          },
        ],
      },
    ]);
  });

  it('imports WeTab site entries and folder children only', () => {
    const payload = parseLeafTabBackup({
      data: {
        'store-icon': {
          icons: [
            {
              id: 'cat-1',
              name: '主页',
              children: [
                {
                  id: 'widget-1',
                  name: '天气',
                  type: 'widget',
                },
                {
                  id: 'site-1',
                  name: '秘塔写作猫',
                  type: 'site',
                  target: 'https://xiezuocat.com/?s=wetab',
                  bgImage: 'https://example.com/site.png',
                },
                {
                  id: 'folder-1',
                  name: '工具',
                  type: 'folder-icon',
                  children: [
                    {
                      id: 'child-1',
                      name: '豆瓣',
                      type: 'site',
                      target: 'http://www.douban.com',
                    },
                    {
                      id: 'child-2',
                      name: '热搜',
                      type: 'widget',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    });

    expect(payload?.scenarioShortcuts['imported-shortcuts']).toEqual([
      {
        id: 'cat-1',
        title: '主页',
        icon: '',
        kind: 'folder',
        children: [
          {
            id: 'site-1',
            title: '秘塔写作猫',
            url: 'https://xiezuocat.com/?s=wetab',
            icon: 'https://example.com/site.png',
            kind: 'link',
          },
        ],
      },
      {
        id: 'folder-1',
        title: '主页 / 工具',
        icon: '',
        kind: 'folder',
        children: [
          {
            id: 'child-1',
            title: '豆瓣',
            url: 'http://www.douban.com',
            icon: '',
            kind: 'link',
          },
        ],
      },
    ]);
  });
});
