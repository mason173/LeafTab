import type { Page } from '@playwright/test';
import { expect, test } from './extension.fixtures';

const largeFolderProfile = {
  scenarioModes: [{ id: 'life-mode-001', name: 'Life', color: '#3DD6C5', icon: 'leaf' }],
  selectedScenarioId: 'life-mode-001',
  scenarioShortcuts: {
    'life-mode-001': [
      { id: 'f1', title: 'F1', url: 'https://example.com/f1', icon: '' },
      { id: 'f2', title: 'F2', url: 'https://example.com/f2', icon: '' },
      { id: 'f3', title: 'F3', url: 'https://example.com/f3', icon: '' },
      { id: 'a', title: 'A', url: 'https://example.com/a', icon: '' },
      {
        id: 'folder-large',
        title: 'Large Folder',
        url: '',
        icon: '',
        kind: 'folder',
        folderDisplayMode: 'large',
        children: [
          { id: 'child-1', title: 'Child 1', url: 'https://example.com/child1', icon: '' },
          { id: 'child-2', title: 'Child 2', url: 'https://example.com/child2', icon: '' },
        ],
      },
      { id: 'b', title: 'B', url: 'https://example.com/b', icon: '' },
      { id: 'f4', title: 'F4', url: 'https://example.com/f4', icon: '' },
      { id: 'f5', title: 'F5', url: 'https://example.com/f5', icon: '' },
      { id: 'g1', title: 'G1', url: 'https://example.com/g1', icon: '' },
      { id: 'g2', title: 'G2', url: 'https://example.com/g2', icon: '' },
      { id: 'g3', title: 'G3', url: 'https://example.com/g3', icon: '' },
      { id: 'd', title: 'D', url: 'https://example.com/d', icon: '' },
      { id: 'c', title: 'C', url: 'https://example.com/c', icon: '' },
      { id: 'g4', title: 'G4', url: 'https://example.com/g4', icon: '' },
      { id: 'g5', title: 'G5', url: 'https://example.com/g5', icon: '' },
    ],
  },
};

async function seedLargeFolderScenario(page: Page) {
  await page.evaluate((payload) => {
    localStorage.setItem('shortcutCardVariant', 'compact');
    localStorage.setItem('shortcutGridColumnsByVariant', JSON.stringify({ compact: 9 }));
    localStorage.setItem('shortcutGridColumns', '9');
    localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(payload));
    localStorage.setItem('scenario_modes_v1', JSON.stringify(payload.scenarioModes));
    localStorage.setItem('scenario_selected_v1', payload.selectedScenarioId);
    localStorage.setItem('local_shortcuts_v3', JSON.stringify(payload.scenarioShortcuts));
    localStorage.removeItem('leaf_tab_shortcuts_cache');
  }, largeFolderProfile);

  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function readTransforms(page: Page) {
  return page.evaluate(() => {
    const getTransform = (id: string) => {
      const node = document.querySelector<HTMLElement>(`[data-shortcut-drag-item="true"][data-shortcut-id="${id}"]`);
      return node?.style.transform ?? null;
    };

    return {
      b: getTransform('b'),
      c: getTransform('c'),
    };
  });
}

test.describe('LeafTab shortcut drag regressions', () => {
  test('does not displace upper-right shortcuts while crossing the large-folder side gap', async ({ extensionPage }) => {
    await seedLargeFolderScenario(extensionPage);

    const getBox = async (id: string) => {
      const locator = extensionPage.locator(`[data-shortcut-drag-item="true"][data-shortcut-id="${id}"]`);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(`Missing box for ${id}`);
      }
      return box;
    };

    const a = await getBox('a');
    const folderLarge = await getBox('folder-large');
    const b = await getBox('b');

    const start = { x: a.x + a.width / 2, y: a.y + 30 };
    const arm = { x: start.x + 10, y: start.y };
    const folder = { x: folderLarge.x + folderLarge.width * 0.82, y: start.y };
    const gap = { x: (folderLarge.x + folderLarge.width + b.x) / 2, y: start.y };

    await extensionPage.mouse.move(start.x, start.y);
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(arm.x, arm.y, { steps: 4 });
    await extensionPage.mouse.move(folder.x, folder.y, { steps: 12 });
    await extensionPage.mouse.move(gap.x, gap.y, { steps: 10 });
    await extensionPage.waitForTimeout(120);

    await expect.poll(() => readTransforms(extensionPage)).toEqual({
      b: '',
      c: '',
    });

    await extensionPage.mouse.up();
  });
});
