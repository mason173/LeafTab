import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromium, expect, test as base, type BrowserContext, type Page } from '@playwright/test';

type ExtensionFixtures = {
  extensionContext: BrowserContext;
  extensionId: string;
  extensionPage: Page;
};

const extensionPath = path.resolve(__dirname, '../../build');
const mockedOfficialIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#111827"/><path d="M36 36h56v56H36z" fill="#22c55e"/></svg>`;
const baselineScenarioModes = [
  {
    id: 'life-mode-001',
    name: '生活模式',
    color: '#3DD6C5',
    icon: 'leaf',
  },
];
const baselineScenarioShortcuts = {
  'life-mode-001': [
    { id: 'ent-01', title: '哔哩哔哩', url: 'https://www.bilibili.com', icon: '' },
    { id: 'read-01', title: '少数派', url: 'https://sspai.com', icon: '' },
    { id: 'shop-01', title: '淘宝', url: 'https://www.taobao.com', icon: '' },
    { id: 'ent-02', title: 'YouTube', url: 'https://www.youtube.com', icon: 'https://api.iowen.cn/favicon/www.youtube.com.png' },
    { id: 'read-02', title: '36Kr', url: 'https://36kr.com', icon: '' },
    { id: 'shop-02', title: '京东', url: 'https://www.jd.com', icon: '' },
    { id: 'ent-03', title: 'Netflix', url: 'https://www.netflix.com', icon: '' },
    { id: 'read-03', title: '知乎', url: 'https://www.zhihu.com', icon: '' },
    { id: 'shop-03', title: '什么值得买', url: 'https://www.smzdm.com', icon: '' },
  ],
};
const baselineProfileSnapshot = {
  scenarioModes: baselineScenarioModes,
  selectedScenarioId: 'life-mode-001',
  scenarioShortcuts: baselineScenarioShortcuts,
};

export const test = base.extend<ExtensionFixtures>({
  extensionContext: [async ({}, use) => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leaftabb-e2e-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    await context.addInitScript(() => {
      if (!localStorage.getItem('i18nextLng')) {
        localStorage.setItem('i18nextLng', 'en');
      }
      if (!localStorage.getItem('has_visited')) {
        localStorage.setItem('has_visited', 'true');
      }
      if (!localStorage.getItem('role')) {
        localStorage.setItem('role', 'programmer');
      }
      if (!localStorage.getItem('time_animation_mode')) {
        localStorage.setItem('time_animation_mode', 'on');
      }
      if (!localStorage.getItem('showTime')) {
        localStorage.setItem('showTime', 'true');
      }
      if (!localStorage.getItem('weather_manual_location_v3')) {
        localStorage.setItem('weather_manual_location_v3', JSON.stringify({
          city: 'Hangzhou',
          latitude: 30.2741,
          longitude: 120.1551,
          updatedAt: Date.now(),
        }));
      }
    });

    await context.route('https://wttr.in/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          current_condition: [
            {
              weatherCode: '113',
              temp_C: '22',
            },
          ],
          nearest_area: [
            {
              areaName: [{ value: 'Hangzhou' }],
              region: [{ value: 'Zhejiang' }],
            },
          ],
        }),
      });
    });
    await context.route('https://mason173.github.io/leaftab-icons/manifest.json', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          version: 'e2e',
          generatedAt: '2026-03-27T00:00:00.000Z',
          icons: {
            'youtube.com': 'icons/youtube.svg',
            'bilibili.com': 'icons/bilibili.svg',
          },
        }),
      });
    });
    await context.route('https://mason173.github.io/leaftab-icons/icons/*.svg', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: mockedOfficialIconSvg,
      });
    });

    try {
      await use(context);
    } finally {
      await context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  }, { scope: 'worker' }],

  extensionId: [async ({ extensionContext }, use) => {
    let serviceWorker = extensionContext.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await extensionContext.waitForEvent('serviceworker');
    }

    const extensionId = new URL(serviceWorker.url()).host;
    await use(extensionId);
  }, { scope: 'worker' }],

  extensionPage: async ({ extensionContext, extensionId }, use) => {
    const page = await extensionContext.newPage();
    await page.goto(`chrome-extension://${extensionId}/index.html?nt=1`);
    await page.waitForLoadState('networkidle');
    await page.evaluate((payload) => {
      localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(payload.profile));
      localStorage.setItem('scenario_modes_v1', JSON.stringify(payload.profile.scenarioModes));
      localStorage.setItem('scenario_selected_v1', payload.profile.selectedScenarioId);
      localStorage.setItem('local_shortcuts_v3', JSON.stringify(payload.profile.scenarioShortcuts));
      localStorage.removeItem('leaf_tab_shortcuts_cache');
      localStorage.removeItem('leaf_tab_sync_pending');
    }, {
      profile: baselineProfileSnapshot,
    });
    await page.reload({ waitUntil: 'networkidle' });
    await expect(page.locator('button[title="设置"], button[title="Settings"]').first()).toBeVisible();

    try {
      await use(page);
    } finally {
      await page.close();
    }
  },
});

export { expect };
