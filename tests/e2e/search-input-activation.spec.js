const { test, expect } = require('@playwright/test');

const APP_URL = process.env.PLAYWRIGHT_APP_URL
  || 'http://127.0.0.1:4173/index.html';

function createSeedSnapshot() {
  return {
    scenarioModes: [
      { id: 'life-mode-001', name: '生活模式', color: '#3DD6C5', icon: 'leaf' },
    ],
    selectedScenarioId: 'life-mode-001',
    scenarioShortcuts: {
      'life-mode-001': [],
    },
  };
}

test.describe('search input activation', () => {
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

  test('keeps the first typed character when typing immediately after load', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });

    const searchInput = page.locator('[data-testid="home-search-input"]');
    await searchInput.waitFor({ state: 'attached' });
    await expect.poll(async () => page.evaluate(() => {
      const input = document.querySelector('[data-testid="home-search-input"]');
      return Boolean(input && document.activeElement === input);
    })).toBe(true);

    await page.locator('body').press('a');

    await expect(searchInput).toBeFocused();
    await expect(searchInput).toHaveValue('a');
  });

  test('keeps sequential typing and single-step backspace behavior after bootstrap activation', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });

    const searchInput = page.locator('[data-testid="home-search-input"]');
    await searchInput.waitFor({ state: 'attached' });
    await expect.poll(async () => page.evaluate(() => {
      const input = document.querySelector('[data-testid="home-search-input"]');
      return Boolean(input && document.activeElement === input);
    })).toBe(true);

    await page.locator('body').press('a');
    await searchInput.press('b');
    await searchInput.press('c');
    await expect(searchInput).toHaveValue('abc');

    await searchInput.press('Backspace');
    await expect(searchInput).toHaveValue('ab');

    await searchInput.press('Backspace');
    await expect(searchInput).toHaveValue('a');

    await searchInput.press('Backspace');
    await expect(searchInput).toHaveValue('');
  });
});
