const { test, expect } = require('@playwright/test');

const APP_URL = process.env.PLAYWRIGHT_APP_URL
  || 'http://127.0.0.1:4173/index.html';

function createLink(id, title) {
  return {
    id,
    title,
    url: `https://${id}.example`,
    icon: '',
  };
}

function createFolder(id, title, children) {
  return {
    id,
    title,
    url: '',
    icon: '',
    kind: 'folder',
    folderDisplayMode: 'small',
    children,
  };
}

test.describe('shortcut workspace browser sanity', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('/__mock/admin/reset');

    const snapshot = {
      scenarioModes: [
        { id: 'life-mode-001', name: '生活模式', color: '#3DD6C5', icon: 'leaf' },
      ],
      selectedScenarioId: 'life-mode-001',
      scenarioShortcuts: {
        'life-mode-001': [
          createLink('docs', 'Docs'),
          createFolder('folder-work', 'Work', [
            createLink('github', 'GitHub'),
            createLink('linear', 'Linear'),
          ]),
          createLink('mail', 'Mail'),
        ],
      },
    };

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

  test('loads seeded root shortcuts from local profile snapshot', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });

    await expect(page.getByTestId('root-shortcut-card-docs')).toBeVisible();
    await expect(page.getByTestId('root-shortcut-card-folder-work')).toBeVisible();
    await expect(page.getByTestId('root-shortcut-card-mail')).toBeVisible();
  });

  test('opens folder overlay from a seeded folder shortcut', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });

    await page.getByTestId('root-shortcut-card-folder-work').click();

    const folderOverlay = page.getByTestId('shortcut-folder-overlay');
    await expect(folderOverlay).toBeVisible();
    await expect(folderOverlay).toHaveAttribute('data-folder-id', 'folder-work');
    await expect(folderOverlay.getByText('GitHub').first()).toBeVisible();
    await expect(folderOverlay.getByText('Linear').first()).toBeVisible();
  });

  test('enters folder title edit mode from the overlay title button', async ({ page }) => {
    await page.goto(APP_URL, { waitUntil: 'load' });

    await page.getByTestId('root-shortcut-card-folder-work').click();
    await page.getByRole('button', { name: 'Work' }).click();

    await expect(page.getByTestId('shortcut-folder-overlay-title-input')).toBeVisible();
    await expect(page.getByTestId('shortcut-folder-overlay-title-input')).toHaveValue('Work');
  });
});
