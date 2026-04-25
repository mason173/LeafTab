const { test, expect } = require('@playwright/test');

const APP_URL = process.env.PLAYWRIGHT_APP_URL
  || 'http://127.0.0.1:4173/index.html';

function createSeedSnapshot(shortcutCount = 0) {
  return {
    scenarioModes: [
      { id: 'life-mode-001', name: '生活模式', color: '#3DD6C5', icon: 'leaf' },
    ],
    selectedScenarioId: 'life-mode-001',
    scenarioShortcuts: {
      'life-mode-001': Array.from({ length: shortcutCount }, (_, index) => ({
        id: `shortcut-${index + 1}`,
        title: `站点 ${index + 1}`,
        url: `https://example.com/${index + 1}`,
        icon: '',
      })),
    },
  };
}

test.describe('floating search height', () => {
  test.beforeEach(async ({ page }) => {
    const snapshot = createSeedSnapshot();

    await page.addInitScript((seedSnapshot) => {
      window.localStorage.clear();
      window.localStorage.setItem('i18nextLng', 'zh');
      window.localStorage.setItem('has_visited', 'true');
      window.localStorage.setItem('role', 'tester');
      window.localStorage.setItem('displayMode', 'fresh');
      window.localStorage.setItem('privacy_consent', 'true');
      window.localStorage.setItem('leaftab_top_nav_layout_intro_seen_v1', 'true');
      window.localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(seedSnapshot));
      window.localStorage.setItem('scenario_modes_v1', JSON.stringify(seedSnapshot.scenarioModes));
      window.localStorage.setItem('scenario_selected_v1', seedSnapshot.selectedScenarioId);
      window.localStorage.setItem(
        'local_shortcuts_v3',
        JSON.stringify(seedSnapshot.scenarioShortcuts),
      );
    }, snapshot);
  });

  test('renders the bottom floating search shell at 44px tall', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP_URL, { waitUntil: 'load' });

    const searchInput = page.getByTestId('home-search-input');
    await searchInput.waitFor({ state: 'visible' });

    const shellHeight = await searchInput.evaluate((input) => {
      const shell = input.closest('.content-stretch.group.relative.isolate.flex');
      if (!shell) return null;
      return Math.round(shell.getBoundingClientRect().height);
    });

    expect(shellHeight).toBe(44);
  });

  test('does not create page-level vertical scrolling on short viewports', async ({ page }) => {
    const snapshot = createSeedSnapshot(28);

    await page.addInitScript((seedSnapshot) => {
      window.localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(seedSnapshot));
      window.localStorage.setItem('scenario_modes_v1', JSON.stringify(seedSnapshot.scenarioModes));
      window.localStorage.setItem('scenario_selected_v1', seedSnapshot.selectedScenarioId);
      window.localStorage.setItem(
        'local_shortcuts_v3',
        JSON.stringify(seedSnapshot.scenarioShortcuts),
      );
    }, snapshot);

    await page.setViewportSize({ width: 1280, height: 640 });
    await page.goto(APP_URL, { waitUntil: 'load' });

    const searchInput = page.getByTestId('home-search-input');
    await searchInput.waitFor({ state: 'visible' });

    const metrics = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));

    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight + 1);
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
  });
});
