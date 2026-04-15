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

const verticalLargeFolderProfile = {
  scenarioModes: [{ id: 'life-mode-001', name: 'Life', color: '#3DD6C5', icon: 'leaf' }],
  selectedScenarioId: 'life-mode-001',
  scenarioShortcuts: {
    'life-mode-001': [
      { id: 'u1', title: 'U1', url: 'https://example.com/u1', icon: '' },
      { id: 'u2', title: 'U2', url: 'https://example.com/u2', icon: '' },
      { id: 'u3', title: 'U3', url: 'https://example.com/u3', icon: '' },
      { id: 'u4', title: 'U4', url: 'https://example.com/u4', icon: '' },
      { id: 'tl', title: 'TL', url: 'https://example.com/tl', icon: '' },
      { id: 'a', title: 'Alpha', url: 'https://example.com/a', icon: '' },
      { id: 'b', title: 'Beta', url: 'https://example.com/b', icon: '' },
      { id: 'tr', title: 'TR', url: 'https://example.com/tr', icon: '' },
      { id: 'h', title: 'H', url: 'https://example.com/h', icon: '' },
      {
        id: 'folder-large',
        title: 'Large Folder',
        url: '',
        icon: '',
        kind: 'folder',
        folderDisplayMode: 'large',
        children: [
          { id: 'child-1', title: 'Child 1', url: 'https://example.com/child1', icon: '' },
        ],
      },
      { id: 'c', title: 'C', url: 'https://example.com/c', icon: '' },
      { id: 'g', title: 'G', url: 'https://example.com/g', icon: '' },
      { id: 'd', title: 'D', url: 'https://example.com/d', icon: '' },
      { id: 'bl', title: 'BL', url: 'https://example.com/bl', icon: '' },
      { id: 'f', title: 'F', url: 'https://example.com/f', icon: '' },
      { id: 'e', title: 'E', url: 'https://example.com/e', icon: '' },
      { id: 'br', title: 'BR', url: 'https://example.com/br', icon: '' },
    ],
  },
};

function createNineColumnLargeFolderProfile(folderIndex: number) {
  const profile = {
    scenarioModes: [{ id: 'life-mode-001', name: 'Life', color: '#3DD6C5', icon: 'leaf' }],
    selectedScenarioId: 'life-mode-001',
    scenarioShortcuts: {
      'life-mode-001': Array.from({ length: 28 }, (_, index) => ({
        id: `item-${index + 1}`,
        title: `Item ${index + 1}`,
        url: `https://example.com/${index + 1}`,
        icon: '',
      })),
    },
  };

  profile.scenarioShortcuts['life-mode-001'][folderIndex] = {
    id: 'folder-large',
    title: 'Large Folder',
    url: '',
    icon: '',
    kind: 'folder',
    folderDisplayMode: 'large',
    children: [
      { id: 'child-1', title: 'Child 1', url: 'https://example.com/child1', icon: '' },
      { id: 'child-2', title: 'Child 2', url: 'https://example.com/child2', icon: '' },
      { id: 'child-3', title: 'Child 3', url: 'https://example.com/child3', icon: '' },
      { id: 'child-4', title: 'Child 4', url: 'https://example.com/child4', icon: '' },
      { id: 'child-5', title: 'Child 5', url: 'https://example.com/child5', icon: '' },
    ],
  };

  return profile;
}

const folderReorderProfile = {
  scenarioModes: [{ id: 'life-mode-001', name: 'Life', color: '#3DD6C5', icon: 'leaf' }],
  selectedScenarioId: 'life-mode-001',
  scenarioShortcuts: {
    'life-mode-001': [
      { id: 'a', title: 'A', url: 'https://example.com/a', icon: '' },
      {
        id: 'folder-1',
        title: 'Folder',
        url: '',
        icon: '',
        kind: 'folder',
        folderDisplayMode: 'small',
        children: [
          { id: 'child-1', title: 'Child 1', url: 'https://example.com/child1', icon: '' },
          { id: 'child-2', title: 'Child 2', url: 'https://example.com/child2', icon: '' },
          { id: 'child-3', title: 'Child 3', url: 'https://example.com/child3', icon: '' },
          { id: 'child-4', title: 'Child 4', url: 'https://example.com/child4', icon: '' },
          { id: 'child-5', title: 'Child 5', url: 'https://example.com/child5', icon: '' },
          { id: 'child-6', title: 'Child 6', url: 'https://example.com/child6', icon: '' },
          { id: 'child-7', title: 'Child 7', url: 'https://example.com/child7', icon: '' },
          { id: 'child-8', title: 'Child 8', url: 'https://example.com/child8', icon: '' },
        ],
      },
      { id: 'b', title: 'B', url: 'https://example.com/b', icon: '' },
      { id: 'c', title: 'C', url: 'https://example.com/c', icon: '' },
      { id: 'd', title: 'D', url: 'https://example.com/d', icon: '' },
      { id: 'e', title: 'E', url: 'https://example.com/e', icon: '' },
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

async function seedVerticalLargeFolderScenario(page: Page) {
  await page.evaluate((payload) => {
    localStorage.setItem('shortcutCardVariant', 'compact');
    localStorage.setItem('shortcutGridColumnsByVariant', JSON.stringify({ compact: 4 }));
    localStorage.setItem('shortcutGridColumns', '4');
    localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(payload));
    localStorage.setItem('scenario_modes_v1', JSON.stringify(payload.scenarioModes));
    localStorage.setItem('scenario_selected_v1', payload.selectedScenarioId);
    localStorage.setItem('local_shortcuts_v3', JSON.stringify(payload.scenarioShortcuts));
    localStorage.removeItem('leaf_tab_shortcuts_cache');
  }, verticalLargeFolderProfile);

  await page.reload({ waitUntil: 'networkidle' });
}

async function seedNineColumnLargeFolderScenario(page: Page, folderIndex: number) {
  await page.evaluate((payload) => {
    localStorage.setItem('shortcutCardVariant', 'compact');
    localStorage.setItem('shortcutGridColumnsByVariant', JSON.stringify({ compact: 9 }));
    localStorage.setItem('shortcutGridColumns', '9');
    localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(payload));
    localStorage.setItem('scenario_modes_v1', JSON.stringify(payload.scenarioModes));
    localStorage.setItem('scenario_selected_v1', payload.selectedScenarioId);
    localStorage.setItem('local_shortcuts_v3', JSON.stringify(payload.scenarioShortcuts));
    localStorage.removeItem('leaf_tab_shortcuts_cache');
  }, createNineColumnLargeFolderProfile(folderIndex));

  await page.reload({ waitUntil: 'networkidle' });
}

async function seedFolderReorderScenario(page: Page) {
  await page.evaluate((payload) => {
    localStorage.setItem('shortcutCardVariant', 'compact');
    localStorage.setItem('shortcutGridColumnsByVariant', JSON.stringify({ compact: 5 }));
    localStorage.setItem('shortcutGridColumns', '5');
    localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(payload));
    localStorage.setItem('scenario_modes_v1', JSON.stringify(payload.scenarioModes));
    localStorage.setItem('scenario_selected_v1', payload.selectedScenarioId);
    localStorage.setItem('local_shortcuts_v3', JSON.stringify(payload.scenarioShortcuts));
    localStorage.removeItem('leaf_tab_shortcuts_cache');
  }, folderReorderProfile);

  await page.reload({ waitUntil: 'networkidle' });
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

async function readPreviewBox(page: Page, testId = 'shortcut-drop-preview') {
  return page.evaluate((targetTestId) => {
    const node = document.querySelector<HTMLElement>(`[data-testid="${targetTestId}"]`);
    if (!node) {
      return null;
    }

    const rect = node.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }, testId);
}

async function readRoundedPreviewPosition(page: Page, testId = 'shortcut-drop-preview') {
  const preview = await readPreviewBox(page, testId);
  if (!preview) {
    return null;
  }

  return {
    x: Math.round(preview.x),
    y: Math.round(preview.y),
  };
}

async function collectLargeFolderPreviewSweep(params: {
  page: Page;
  folderIndex: number;
  axis: 'vertical' | 'horizontal';
}) {
  const { page, folderIndex, axis } = params;
  await seedNineColumnLargeFolderScenario(page, folderIndex);

  const folder = page.locator('[data-shortcut-drag-item="true"][data-shortcut-id="folder-large"]');
  await folder.waitFor({ state: 'visible' });
  const folderBox = await folder.boundingBox();
  if (!folderBox) {
    throw new Error(`Missing box for 9-column folder-large at index ${folderIndex}`);
  }

  const start = {
    x: folderBox.x + folderBox.width / 2,
    y: folderBox.y + folderBox.height / 2,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y - 8, { steps: 5 });

  const samples: Array<{ delta: number; preview: { x: number; y: number } | null }> = [];
  const deltas = axis === 'vertical'
    ? Array.from({ length: 37 }, (_, index) => -220 + index * 12)
    : Array.from({ length: 44 }, (_, index) => -260 + index * 12);

  for (const delta of deltas) {
    await page.mouse.move(
      axis === 'vertical' ? start.x : start.x + delta,
      axis === 'vertical' ? start.y + delta : start.y,
      { steps: 2 },
    );
    await page.waitForTimeout(25);
    samples.push({
      delta,
      preview: await readRoundedPreviewPosition(page),
    });
  }

  await page.mouse.up();

  return {
    source: {
      x: Math.round(folderBox.x),
      y: Math.round(folderBox.y),
    },
    samples,
  };
}

async function openFolder(page: Page, folderId = 'folder-1') {
  await page.locator(`[data-shortcut-id="${folderId}"] [data-folder-preview="true"]`).click();
  await page.locator('[data-folder-shortcut-grid="true"]').waitFor({ state: 'visible' });
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

  test('keeps the large-folder drop preview in the same column while dragging vertically through lower gaps', async ({ extensionPage }) => {
    await seedVerticalLargeFolderScenario(extensionPage);

    const getBox = async (id: string) => {
      const locator = extensionPage.locator(`[data-shortcut-drag-item="true"][data-shortcut-id="${id}"]`);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(`Missing box for ${id}`);
      }
      return box;
    };

    const folderBox = await getBox('folder-large');
    const dBox = await getBox('d');
    const eBox = await getBox('e');
    const rowStep = Math.round(eBox.y - dBox.y);
    const expectedPreviewTop = Math.round(folderBox.y + rowStep);
    const probePoint = {
      x: folderBox.x + folderBox.width / 2,
      y: folderBox.y + folderBox.height + 74,
    };

    await extensionPage.mouse.move(
      folderBox.x + folderBox.width / 2,
      folderBox.y + folderBox.height / 2,
    );
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(
      folderBox.x + folderBox.width / 2,
      folderBox.y + folderBox.height / 2 - 16,
      { steps: 6 },
    );
    await extensionPage.mouse.move(probePoint.x, probePoint.y, { steps: 24 });
    await extensionPage.waitForTimeout(180);

    await extensionPage.waitForTimeout(120);
    const previewBox = await readPreviewBox(extensionPage);
    if (!previewBox) {
      throw new Error('Missing shortcut drop preview while dragging large folder downward');
    }

    expect(Math.abs(Math.round(previewBox.x) - Math.round(folderBox.x))).toBeLessThanOrEqual(1);
    expect(Math.abs(Math.round(previewBox.y) - expectedPreviewTop)).toBeLessThanOrEqual(1);

    await extensionPage.mouse.up();
  });

  test('keeps a 9-column large-folder preview latched upward until the drag returns near its source row', async ({ extensionPage }) => {
    await seedNineColumnLargeFolderScenario(extensionPage, 18);

    const folder = extensionPage.locator('[data-shortcut-drag-item="true"][data-shortcut-id="folder-large"]');
    await folder.waitFor({ state: 'visible' });
    const folderBox = await folder.boundingBox();
    if (!folderBox) {
      throw new Error('Missing box for 9-column folder-large');
    }

    const start = {
      x: folderBox.x + folderBox.width / 2,
      y: folderBox.y + folderBox.height / 2,
    };

    await extensionPage.mouse.move(start.x, start.y);
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(start.x + 12, start.y - 8, { steps: 5 });
    await extensionPage.mouse.move(start.x, start.y - 200, { steps: 12 });

    await expect.poll(() => readRoundedPreviewPosition(extensionPage)).not.toBeNull();
    const claimedPreview = await readRoundedPreviewPosition(extensionPage);
    if (!claimedPreview) {
      throw new Error('Missing preview while latching 9-column folder upward');
    }
    expect(claimedPreview.x).toBe(Math.round(folderBox.x));
    expect(claimedPreview.y).toBeLessThan(Math.round(folderBox.y));

    for (let delta = -180; delta <= -160; delta += 20) {
      await extensionPage.mouse.move(start.x, start.y + delta, { steps: 2 });
      await extensionPage.waitForTimeout(40);
      await expect.poll(() => readRoundedPreviewPosition(extensionPage)).toEqual(claimedPreview);
    }

    await extensionPage.mouse.move(start.x, start.y - 140, { steps: 2 });
    await extensionPage.waitForTimeout(40);
    await expect.poll(() => readRoundedPreviewPosition(extensionPage)).toEqual({
      x: claimedPreview.x,
      y: claimedPreview.y + 100,
    });

    await extensionPage.mouse.move(start.x, start.y, { steps: 8 });
    await expect.poll(async () => {
      const preview = await readRoundedPreviewPosition(extensionPage);
      if (!preview) {
        return { xWithinTolerance: false, yWithinTolerance: false };
      }

      return {
        xWithinTolerance: Math.abs(preview.x - Math.round(folderBox.x)) <= 1,
        yWithinTolerance: Math.abs(preview.y - Math.round(folderBox.y)) <= 1,
      };
    }).toEqual({
      xWithinTolerance: true,
      yWithinTolerance: true,
    });

    await extensionPage.mouse.up();
  });

  test('keeps a centered 9-column large-folder preview latched horizontally until the drag returns near its source column', async ({ extensionPage }) => {
    await seedNineColumnLargeFolderScenario(extensionPage, 19);

    const folder = extensionPage.locator('[data-shortcut-drag-item="true"][data-shortcut-id="folder-large"]');
    await folder.waitFor({ state: 'visible' });
    const folderBox = await folder.boundingBox();
    if (!folderBox) {
      throw new Error('Missing box for centered 9-column folder-large');
    }

    const start = {
      x: folderBox.x + folderBox.width / 2,
      y: folderBox.y + folderBox.height / 2,
    };

    await extensionPage.mouse.move(start.x, start.y);
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(start.x + 12, start.y - 8, { steps: 5 });
    await extensionPage.mouse.move(start.x - 200, start.y, { steps: 12 });

    await expect.poll(() => readRoundedPreviewPosition(extensionPage)).not.toBeNull();
    const claimedPreview = await readRoundedPreviewPosition(extensionPage);
    if (!claimedPreview) {
      throw new Error('Missing preview while latching centered 9-column folder leftward');
    }
    expect(claimedPreview.x).toBeLessThan(Math.round(folderBox.x));
    expect(claimedPreview.y).toBe(Math.round(folderBox.y));

    for (let delta = -180; delta <= -100; delta += 20) {
      await extensionPage.mouse.move(start.x + delta, start.y, { steps: 2 });
      await extensionPage.waitForTimeout(40);
      await expect.poll(() => readRoundedPreviewPosition(extensionPage)).toEqual(claimedPreview);
    }

    await extensionPage.mouse.move(start.x, start.y, { steps: 8 });
    await expect.poll(async () => {
      const preview = await readRoundedPreviewPosition(extensionPage);
      if (!preview) {
        return { xWithinTolerance: false, yWithinTolerance: false };
      }

      return {
        xWithinTolerance: Math.abs(preview.x - Math.round(folderBox.x)) <= 1,
        yWithinTolerance: Math.abs(preview.y - Math.round(folderBox.y)) <= 1,
      };
    }).toEqual({
      xWithinTolerance: true,
      yWithinTolerance: true,
    });

    await extensionPage.mouse.up();
  });

  test('does not flash a centered 9-column large-folder into a wrong slot while oscillating across a tiny horizontal gap', async ({ extensionPage }) => {
    await seedNineColumnLargeFolderScenario(extensionPage, 21);

    const folder = extensionPage.locator('[data-shortcut-drag-item="true"][data-shortcut-id="folder-large"]');
    await folder.waitFor({ state: 'visible' });
    const folderBox = await folder.boundingBox();
    if (!folderBox) {
      throw new Error('Missing box for centered 9-column folder-large');
    }

    const source = {
      x: Math.round(folderBox.x),
      y: Math.round(folderBox.y),
    };
    const nextX = source.x + 104;
    const start = {
      x: folderBox.x + folderBox.width / 2,
      y: folderBox.y + folderBox.height / 2,
    };

    await extensionPage.mouse.move(start.x, start.y);
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(start.x + 12, start.y - 8, { steps: 5 });

    const boundaryDeltas = [52, 54, 56, 57, 58, 59, 60, 61, 62, 64, 66, 64, 62, 60, 58, 57, 56, 55, 54, 53, 52];
    const previews: Array<{ delta: number; preview: { x: number; y: number } | null }> = [];

    for (const delta of boundaryDeltas) {
      await extensionPage.mouse.move(start.x + delta, start.y, { steps: 3 });
      await extensionPage.waitForTimeout(16);
      previews.push({
        delta,
        preview: await readRoundedPreviewPosition(extensionPage),
      });
    }

    await extensionPage.mouse.up();

    expect(
      previews.every((entry) => (
        entry.preview
        && Math.abs(entry.preview.y - source.y) <= 1
        && (Math.abs(entry.preview.x - source.x) <= 1 || Math.abs(entry.preview.x - nextX) <= 1)
      )),
    ).toBe(true);
  });

  test('keeps 9-column large-folder slow sweeps axis-aligned at left, middle, and right anchors', async ({ extensionPage }) => {
    for (const folderIndex of [18, 21, 25]) {
      const verticalSweep = await collectLargeFolderPreviewSweep({
        page: extensionPage,
        folderIndex,
        axis: 'vertical',
      });
      expect(
        verticalSweep.samples.every(
          (sample) => sample.preview && Math.abs(sample.preview.x - verticalSweep.source.x) <= 1,
        ),
      ).toBe(true);

      const horizontalSweep = await collectLargeFolderPreviewSweep({
        page: extensionPage,
        folderIndex,
        axis: 'horizontal',
      });
      expect(
        horizontalSweep.samples.every(
          (sample) => sample.preview && Math.abs(sample.preview.y - horizontalSweep.source.y) <= 1,
        ),
      ).toBe(true);
    }
  });

  test('keeps the folder reorder preview latched while crossing the yielded gap before the next folder child', async ({ extensionPage }) => {
    await seedFolderReorderScenario(extensionPage);
    await openFolder(extensionPage);

    const getFolderBox = async (id: string) => {
      const locator = extensionPage.locator(`[data-folder-shortcut-id="${id}"]`);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(`Missing folder box for ${id}`);
      }
      return box;
    };

    const child1 = await getFolderBox('child-1');
    const child2 = await getFolderBox('child-2');
    const child3 = await getFolderBox('child-3');
    const start = {
      x: child1.x + child1.width / 2,
      y: child1.y + 36,
    };
    const claimPoint = {
      x: Math.round(child2.x + child2.width + 44),
      y: child2.y + 50,
    };
    const beforeNextPoint = {
      x: Math.round(child3.x - child2.width + 10),
      y: claimPoint.y,
    };
    const neutralNextPoint = {
      x: Math.round(child3.x - child2.width - 2),
      y: claimPoint.y,
    };

    await extensionPage.mouse.move(start.x, start.y);
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(start.x + 12, start.y, { steps: 4 });
    await extensionPage.mouse.move(claimPoint.x, claimPoint.y, { steps: 12 });

    await expect.poll(() => readRoundedPreviewPosition(extensionPage, 'folder-shortcut-drop-preview')).toEqual({
      x: Math.round(child2.x),
      y: Math.round(child2.y),
    });

    await extensionPage.mouse.move(beforeNextPoint.x, beforeNextPoint.y, { steps: 2 });
    await extensionPage.waitForTimeout(90);
    await expect.poll(() => readRoundedPreviewPosition(extensionPage, 'folder-shortcut-drop-preview')).toEqual({
      x: Math.round(child2.x),
      y: Math.round(child2.y),
    });

    await extensionPage.mouse.move(neutralNextPoint.x, neutralNextPoint.y, { steps: 2 });
    await extensionPage.waitForTimeout(90);
    await expect.poll(() => readRoundedPreviewPosition(extensionPage, 'folder-shortcut-drop-preview')).toEqual({
      x: Math.round(child2.x),
      y: Math.round(child2.y),
    });

    await extensionPage.mouse.up();
  });

  test('reorders inside a folder when a dragged child enters an upper target icon from below', async ({ extensionPage }) => {
    await seedFolderReorderScenario(extensionPage);
    await openFolder(extensionPage);

    const getFolderBox = async (id: string) => {
      const locator = extensionPage.locator(`[data-folder-shortcut-id="${id}"]`);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(`Missing folder box for ${id}`);
      }
      return box;
    };

    const child1 = await getFolderBox('child-1');
    const child5 = await getFolderBox('child-5');
    const start = {
      x: child5.x + child5.width / 2,
      y: child5.y + 36,
    };
    const enterUpperIconPoint = {
      x: child1.x + child1.width / 2,
      y: child1.y + 28,
    };

    await extensionPage.mouse.move(start.x, start.y);
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(start.x + 12, start.y, { steps: 4 });
    await extensionPage.mouse.move(enterUpperIconPoint.x, enterUpperIconPoint.y, { steps: 14 });

    await expect.poll(() => readRoundedPreviewPosition(extensionPage, 'folder-shortcut-drop-preview')).toEqual({
      x: Math.round(child1.x),
      y: Math.round(child1.y),
    });

    await extensionPage.mouse.up();
  });

  test('keeps extracted folder drags latched to the claimed root slot instead of snapping back in gaps', async ({ extensionPage }) => {
    await seedFolderReorderScenario(extensionPage);
    await openFolder(extensionPage);

    const getRootBox = async (id: string) => {
      const locator = extensionPage.locator(`[data-shortcut-drag-item="true"][data-shortcut-id="${id}"]`);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(`Missing root box for ${id}`);
      }
      return box;
    };
    const getFolderBox = async (id: string) => {
      const locator = extensionPage.locator(`[data-folder-shortcut-id="${id}"]`);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(`Missing folder box for ${id}`);
      }
      return box;
    };

    const child1 = await getFolderBox('child-1');
    const folderRoot = await getRootBox('folder-1');
    const start = {
      x: child1.x + child1.width / 2,
      y: child1.y + 36,
    };
    const extractPoint = {
      x: folderRoot.x + folderRoot.width / 2,
      y: folderRoot.y + folderRoot.height + 80,
    };

    await extensionPage.mouse.move(start.x, start.y);
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(start.x + 12, start.y, { steps: 4 });
    await extensionPage.mouse.move(extractPoint.x, extractPoint.y, { steps: 18 });
    await extensionPage.waitForTimeout(700);

    const rootB = await getRootBox('b');
    const rootC = await getRootBox('c');
    const claimAfterBPoint = {
      x: Math.round(rootB.x + rootB.width + 6),
      y: rootB.y + 50,
    };
    const gapBeforeCPoint = {
      x: Math.round(rootC.x - rootB.width - 3),
      y: claimAfterBPoint.y,
    };
    const enterCIconPoint = {
      x: Math.round(rootC.x + 18),
      y: Math.round(rootC.y + 28),
    };
    const stayInsideCIconPoint = {
      x: Math.round(rootC.x + 32),
      y: Math.round(rootC.y + 28),
    };

    await extensionPage.mouse.move(claimAfterBPoint.x, claimAfterBPoint.y, { steps: 8 });
    await expect.poll(() => readRoundedPreviewPosition(extensionPage)).toEqual({
      x: Math.round(rootB.x),
      y: Math.round(rootB.y),
    });

    await extensionPage.mouse.move(gapBeforeCPoint.x, gapBeforeCPoint.y, { steps: 2 });
    await extensionPage.waitForTimeout(90);
    await expect.poll(() => readRoundedPreviewPosition(extensionPage)).toEqual({
      x: Math.round(rootB.x),
      y: Math.round(rootB.y),
    });

    await extensionPage.mouse.move(enterCIconPoint.x, enterCIconPoint.y, { steps: 4 });
    await expect.poll(() => readRoundedPreviewPosition(extensionPage)).toEqual({
      x: Math.round(rootC.x),
      y: Math.round(rootC.y),
    });

    await extensionPage.mouse.move(stayInsideCIconPoint.x, stayInsideCIconPoint.y, { steps: 2 });
    await extensionPage.waitForTimeout(90);
    await expect.poll(() => readRoundedPreviewPosition(extensionPage)).toEqual({
      x: Math.round(rootC.x),
      y: Math.round(rootC.y),
    });

    await extensionPage.mouse.up();
  });

  test('reorders an extracted folder drag when it enters a root target icon without releasing', async ({ extensionPage }) => {
    await seedFolderReorderScenario(extensionPage);
    await openFolder(extensionPage);

    const getRootBox = async (id: string) => {
      const locator = extensionPage.locator(`[data-shortcut-drag-item="true"][data-shortcut-id="${id}"]`);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(`Missing root box for ${id}`);
      }
      return box;
    };
    const getFolderBox = async (id: string) => {
      const locator = extensionPage.locator(`[data-folder-shortcut-id="${id}"]`);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(`Missing folder box for ${id}`);
      }
      return box;
    };

    const child1 = await getFolderBox('child-1');
    const folderRoot = await getRootBox('folder-1');
    const start = {
      x: child1.x + child1.width / 2,
      y: child1.y + 36,
    };
    const extractPoint = {
      x: folderRoot.x + folderRoot.width / 2,
      y: folderRoot.y + folderRoot.height + 80,
    };

    await extensionPage.mouse.move(start.x, start.y);
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(start.x + 12, start.y, { steps: 4 });
    await extensionPage.mouse.move(extractPoint.x, extractPoint.y, { steps: 18 });
    await extensionPage.waitForTimeout(700);

    const rootB = await getRootBox('b');
    const enterRootIconPoint = {
      x: rootB.x + 18,
      y: rootB.y + 28,
    };

    await extensionPage.mouse.move(enterRootIconPoint.x, enterRootIconPoint.y, { steps: 12 });

    await expect.poll(() => readRoundedPreviewPosition(extensionPage)).toEqual({
      x: Math.round(rootB.x),
      y: Math.round(rootB.y),
    });

    await extensionPage.mouse.up();
  });

  test('reorders an extracted folder drag when it re-enters its own source folder icon without releasing', async ({ extensionPage }) => {
    await seedFolderReorderScenario(extensionPage);
    await openFolder(extensionPage);

    const getRootBox = async (id: string) => {
      const locator = extensionPage.locator(`[data-shortcut-drag-item="true"][data-shortcut-id="${id}"]`);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(`Missing root box for ${id}`);
      }
      return box;
    };
    const getFolderBox = async (id: string) => {
      const locator = extensionPage.locator(`[data-folder-shortcut-id="${id}"]`);
      await locator.waitFor({ state: 'visible' });
      const box = await locator.boundingBox();
      if (!box) {
        throw new Error(`Missing folder box for ${id}`);
      }
      return box;
    };

    const child1 = await getFolderBox('child-1');
    const folderRoot = await getRootBox('folder-1');
    const start = {
      x: child1.x + child1.width / 2,
      y: child1.y + 36,
    };
    const extractPoint = {
      x: folderRoot.x + folderRoot.width / 2,
      y: folderRoot.y + folderRoot.height + 80,
    };
    const enterSourceFolderIconPoint = {
      x: folderRoot.x + 18,
      y: folderRoot.y + 28,
    };

    await extensionPage.mouse.move(start.x, start.y);
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(start.x + 12, start.y, { steps: 4 });
    await extensionPage.mouse.move(extractPoint.x, extractPoint.y, { steps: 18 });
    await extensionPage.waitForTimeout(700);
    await extensionPage.mouse.move(enterSourceFolderIconPoint.x, enterSourceFolderIconPoint.y, { steps: 12 });

    await expect.poll(() => readRoundedPreviewPosition(extensionPage)).toEqual({
      x: Math.round(folderRoot.x),
      y: Math.round(folderRoot.y),
    });

    await extensionPage.mouse.up();
  });


});
