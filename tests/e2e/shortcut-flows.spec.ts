import type { Page } from '@playwright/test';
import { expect, test } from './extension.fixtures';

type LocalProfileSnapshot = {
  selectedScenarioId: string;
  scenarioShortcuts: Record<string, LocalShortcutSnapshotItem[]>;
};

type LocalShortcutSnapshotItem = {
  id: string;
  title: string;
  url: string;
  icon: string;
  kind?: 'link' | 'folder';
  children?: LocalShortcutSnapshotItem[];
  useOfficialIcon?: boolean;
  autoUseOfficialIcon?: boolean;
  officialIconAvailableAtSave?: boolean;
  iconRendering?: string;
  iconColor?: string;
};

async function readLocalProfileSnapshot(page: Page): Promise<LocalProfileSnapshot> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('leaf_tab_local_profile_v1') || 'null'));
}

async function readCurrentShortcutTitles(page: Page) {
  const snapshot = await readLocalProfileSnapshot(page);
  return snapshot.scenarioShortcuts[snapshot.selectedScenarioId].map((item) => item.title);
}

async function readCurrentShortcut(page: Page, title: string) {
  const snapshot = await readLocalProfileSnapshot(page);
  return snapshot.scenarioShortcuts[snapshot.selectedScenarioId]
    .find((item) => item.title === title);
}

async function seedAdditionalScenario(page: Page, scenario = {
  id: 'e2e-work-mode',
  name: 'E2E Work',
  color: '#1C84E2',
  icon: 'briefcase',
}) {
  await page.evaluate((nextScenario) => {
    const raw = localStorage.getItem('leaf_tab_local_profile_v1');
    if (!raw) {
      throw new Error('leaf_tab_local_profile_v1 is missing');
    }
    const snapshot = JSON.parse(raw);
    if (!snapshot.scenarioModes.some((item: { id: string }) => item.id === nextScenario.id)) {
      snapshot.scenarioModes.push(nextScenario);
      snapshot.scenarioShortcuts[nextScenario.id] = [];
    }
    localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(snapshot));
    localStorage.setItem('scenario_modes_v1', JSON.stringify(snapshot.scenarioModes));
    localStorage.setItem('local_shortcuts_v3', JSON.stringify(snapshot.scenarioShortcuts));
  }, scenario);

  await page.reload({ waitUntil: 'networkidle' });
  return scenario;
}

async function setShortcutCardVariant(page: Page, variant: 'compact' | 'default') {
  await page.evaluate((nextVariant) => {
    localStorage.setItem('shortcutCardVariant', nextVariant);
  }, variant);
  await page.reload({ waitUntil: 'networkidle' });
}

async function seedTopLevelFolder(page: Page, folder = {
  id: 'e2e-folder',
  title: 'E2E Folder',
}) {
  await page.evaluate((nextFolder) => {
    const raw = localStorage.getItem('leaf_tab_local_profile_v1');
    if (!raw) {
      throw new Error('leaf_tab_local_profile_v1 is missing');
    }

    const snapshot = JSON.parse(raw);
    const scenarioId = snapshot.selectedScenarioId;
    const shortcuts = snapshot.scenarioShortcuts[scenarioId];
    const [first, second, ...rest] = shortcuts;

    snapshot.scenarioShortcuts[scenarioId] = [
      {
        id: nextFolder.id,
        title: nextFolder.title,
        url: '',
        icon: '',
        kind: 'folder',
        children: [first, second],
      },
      ...rest,
    ];

    localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(snapshot));
    localStorage.setItem('local_shortcuts_v3', JSON.stringify(snapshot.scenarioShortcuts));
  }, folder);

  await page.reload({ waitUntil: 'networkidle' });
  return folder;
}

async function openGridContextMenu(page: Page) {
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-shortcut-drag-item="true"]'));
    if (items.length === 0) {
      throw new Error('No shortcut drag items found while resolving grid context menu root');
    }

    const ancestorChain: HTMLElement[] = [];
    let current = items[0]?.parentElement;
    while (current) {
      ancestorChain.push(current);
      current = current.parentElement;
    }

    const gridRoot = ancestorChain.find((candidate) => items.every((item) => candidate.contains(item)));
    if (!gridRoot) {
      throw new Error('Unable to resolve grid root for context menu');
    }

    const rect = gridRoot.getBoundingClientRect();
    gridRoot.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      button: 2,
      buttons: 2,
      clientX: rect.left + 24,
      clientY: rect.top + 24,
    }));
  });
  await expect(page.getByTestId('shortcut-context-menu')).toBeVisible();
}

function shortcutCards(page: Page) {
  return page.locator('[data-shortcut-drag-item="true"]');
}

async function patchShortcut(page: Page, title: string, patch: Partial<LocalShortcutSnapshotItem>) {
  await page.evaluate(({ shortcutTitle, shortcutPatch }) => {
    const raw = localStorage.getItem('leaf_tab_local_profile_v1');
    if (!raw) {
      throw new Error('leaf_tab_local_profile_v1 is missing');
    }

    const snapshot = JSON.parse(raw);
    const scenarioId = snapshot.selectedScenarioId;
    const shortcuts = snapshot.scenarioShortcuts[scenarioId];
    const shortcutIndex = shortcuts.findIndex((item: { title: string }) => item.title === shortcutTitle);
    if (shortcutIndex < 0) {
      throw new Error(`Unable to locate shortcut titled ${shortcutTitle}`);
    }

    shortcuts[shortcutIndex] = {
      ...shortcuts[shortcutIndex],
      ...shortcutPatch,
    };

    localStorage.setItem('leaf_tab_local_profile_v1', JSON.stringify(snapshot));
    localStorage.setItem('local_shortcuts_v3', JSON.stringify(snapshot.scenarioShortcuts));
  }, {
    shortcutTitle: title,
    shortcutPatch: patch,
  });

  await page.reload({ waitUntil: 'networkidle' });
}

async function dragShortcutToTarget(page: Page, options: {
  sourceTitle: string;
  targetTitle: string;
  targetXRatio: number;
  targetYRatio: number;
  armOffsetX?: number;
  armOffsetY?: number;
  steps?: number;
}) {
  const {
    sourceTitle,
    targetTitle,
    targetXRatio,
    targetYRatio,
    armOffsetX = 12,
    armOffsetY = 0,
    steps = 12,
  } = options;

  const source = page.locator(`[data-shortcut-title="${sourceTitle}"]`);
  const target = page.locator(`[data-shortcut-title="${targetTitle}"]`);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error(`Unable to resolve shortcut card positions for ${sourceTitle} -> ${targetTitle}`);
  }

  const start = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  const arm = {
    x: start.x + armOffsetX,
    y: start.y + armOffsetY,
  };
  const drop = {
    x: targetBox.x + targetBox.width * targetXRatio,
    y: targetBox.y + targetBox.height * targetYRatio,
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(arm.x, arm.y, { steps: 4 });
  await page.mouse.move(drop.x, drop.y, { steps });
  await page.mouse.up();
}

async function clickSliderAtRatio(page: Page, testId: string, ratio: number) {
  const slider = page.getByTestId(testId);
  const box = await slider.boundingBox();
  if (!box) {
    throw new Error(`Unable to resolve slider bounds for ${testId}`);
  }

  await page.mouse.click(
    box.x + box.width * ratio,
    box.y + box.height / 2,
  );
}

async function confirmDialog(page: Page) {
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /Delete|Confirm|删除|确认/ }).last().click();
}

async function openShortcutContextMenu(page: Page, title: string) {
  await page.locator(`[data-shortcut-title="${title}"]`).click({ button: 'right' });
  await expect(page.getByTestId('shortcut-context-menu')).toBeVisible();
}

async function saveShortcutModal(page: Page, values: {
  title?: string;
  url?: string;
  iconMode?: 'official' | 'favicon' | 'letter';
}) {
  await expect(page.getByTestId('shortcut-modal')).toBeVisible();
  if (typeof values.title === 'string') {
    await page.getByTestId('shortcut-modal-title').fill(values.title);
  }
  if (typeof values.url === 'string') {
    await page.getByTestId('shortcut-modal-url').fill(values.url);
  }
  if (values.iconMode) {
    await page.getByTestId(`shortcut-icon-mode-${values.iconMode}`).click();
  }
  await page.getByTestId('shortcut-modal-save').click();
  await expect(page.getByTestId('shortcut-modal')).toBeHidden();
}

test.describe('LeafTab shortcut flows', () => {
  test('adds a shortcut from the shortcut card context menu', async ({ extensionPage }) => {
    await openShortcutContextMenu(extensionPage, '哔哩哔哩');
    await extensionPage.getByTestId('shortcut-context-new-shortcut').click();

    await saveShortcutModal(extensionPage, {
      title: 'Playwright Added',
      url: 'https://playwright.dev/docs',
    });

    const snapshot = await readLocalProfileSnapshot(extensionPage);
    const shortcuts = snapshot.scenarioShortcuts[snapshot.selectedScenarioId];
    const addedShortcut = shortcuts.find((item) => item.title === 'Playwright Added');

    expect(addedShortcut).toMatchObject({
      title: 'Playwright Added',
      url: 'https://playwright.dev/docs',
    });
  });

  test('adds a shortcut from the grid context menu to the end of the list', async ({ extensionPage }) => {
    await openGridContextMenu(extensionPage);
    await extensionPage.getByTestId('grid-context-add-shortcut').click();

    await saveShortcutModal(extensionPage, {
      title: 'Grid Added',
      url: 'https://example.com/grid-added',
    });

    const titles = await readCurrentShortcutTitles(extensionPage);
    expect(titles[titles.length - 1]).toBe('Grid Added');
  });

  test('inserts a newly created shortcut right after the targeted card', async ({ extensionPage }) => {
    await openShortcutContextMenu(extensionPage, '少数派');
    await extensionPage.getByTestId('shortcut-context-new-shortcut').click();

    await saveShortcutModal(extensionPage, {
      title: 'Inserted After SSPAI',
      url: 'https://example.com/after-sspai',
    });

    const titles = await readCurrentShortcutTitles(extensionPage);
    const targetIndex = titles.indexOf('少数派');
    expect(titles[targetIndex + 1]).toBe('Inserted After SSPAI');
  });

  test('edits a shortcut and switches icon mode to letter', async ({ extensionPage }) => {
    await openShortcutContextMenu(extensionPage, '少数派');
    await extensionPage.getByTestId('shortcut-context-edit').click();

    await saveShortcutModal(extensionPage, {
      title: 'Playwright Edited',
      url: 'https://example.com/edited',
      iconMode: 'letter',
    });

    const snapshot = await readLocalProfileSnapshot(extensionPage);
    const editedShortcut = snapshot.scenarioShortcuts[snapshot.selectedScenarioId]
      .find((item) => item.title === 'Playwright Edited');

    expect(editedShortcut).toMatchObject({
      title: 'Playwright Edited',
      url: 'https://example.com/edited',
      iconRendering: 'letter',
      useOfficialIcon: false,
    });
  });

  test('supports multi-select deletion', async ({ extensionPage }) => {
    await openShortcutContextMenu(extensionPage, '哔哩哔哩');
    await extensionPage.getByTestId('shortcut-context-multi-select').click();

    await shortcutCards(extensionPage).nth(1).click();
    await extensionPage.getByTestId('shortcut-multi-select-delete').click();

    await confirmDialog(extensionPage);

    const titles = await readCurrentShortcutTitles(extensionPage);
    expect(titles).not.toContain('哔哩哔哩');
    expect(titles).not.toContain('少数派');
  });

  test('supports drag-and-drop reordering', async ({ extensionPage }) => {
    const before = await readCurrentShortcutTitles(extensionPage);
    expect(before.slice(0, 2)).toEqual(['哔哩哔哩', '少数派']);

    await dragShortcutToTarget(extensionPage, {
      sourceTitle: '哔哩哔哩',
      targetTitle: '少数派',
      targetXRatio: 1.05,
      targetYRatio: 0.25,
    });

    await expect.poll(async () => (await readCurrentShortcutTitles(extensionPage)).slice(0, 3)).toEqual([
      '少数派',
      '哔哩哔哩',
      '淘宝',
    ]);
  });

  test('creates a folder when dropping a shortcut onto another shortcut center', async ({ extensionPage }) => {
    await dragShortcutToTarget(extensionPage, {
      sourceTitle: '哔哩哔哩',
      targetTitle: '少数派',
      targetXRatio: 0.5,
      targetYRatio: 0.5,
    });

    const dialog = extensionPage.getByRole('dialog').last();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox').fill('Playwright Folder');
    await dialog.getByRole('button', { name: /Save|保存/ }).click();
    await expect(dialog).toBeHidden();

    await expect.poll(async () => {
      const snapshot = await readLocalProfileSnapshot(extensionPage);
      const shortcuts = snapshot.scenarioShortcuts[snapshot.selectedScenarioId];
      const folder = shortcuts.find((item) => item.kind === 'folder' && item.title === 'Playwright Folder');
      return folder?.children?.map((item) => item.title).join('|') ?? null;
    }).toBe('哔哩哔哩|少数派');
  });

  test('moves a shortcut into an existing folder when dropped onto the folder center', async ({ extensionPage }) => {
    await seedTopLevelFolder(extensionPage);

    const source = extensionPage.locator('[data-shortcut-title="什么值得买"]');
    const target = extensionPage.locator('[data-shortcut-title="E2E Folder"]');
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();

    if (!sourceBox || !targetBox) {
      throw new Error('Unable to resolve shortcut card positions for folder-move test');
    }

    await extensionPage.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await extensionPage.mouse.down();
    await extensionPage.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 12 },
    );
    await extensionPage.mouse.up();

    await expect.poll(async () => {
      const snapshot = await readLocalProfileSnapshot(extensionPage);
      const shortcuts = snapshot.scenarioShortcuts[snapshot.selectedScenarioId];
      const folder = shortcuts.find((item) => item.id === 'e2e-folder');
      return folder?.children?.map((item) => item.title).join('|') ?? null;
    }).toContain('什么值得买');

    const snapshot = await readLocalProfileSnapshot(extensionPage);
    const topLevelTitles = snapshot.scenarioShortcuts[snapshot.selectedScenarioId].map((item) => item.title);
    expect(topLevelTitles).not.toContain('什么值得买');
  });

  test('supports pinning selected shortcuts to the bottom', async ({ extensionPage }) => {
    await openShortcutContextMenu(extensionPage, '哔哩哔哩');
    await extensionPage.getByTestId('shortcut-context-multi-select').click();
    await extensionPage.getByTestId('shortcut-multi-select-pin-bottom').click();

    const after = await readCurrentShortcutTitles(extensionPage);
    expect(after[after.length - 1]).toBe('哔哩哔哩');
  });

  test('supports pinning selected shortcuts to the top', async ({ extensionPage }) => {
    await openShortcutContextMenu(extensionPage, '什么值得买');
    await extensionPage.getByTestId('shortcut-context-multi-select').click();
    await extensionPage.getByTestId('shortcut-multi-select-pin-top').click();

    const after = await readCurrentShortcutTitles(extensionPage);
    expect(after[0]).toBe('什么值得买');
  });

  test('keeps selected order when pinning multiple shortcuts to the top', async ({ extensionPage }) => {
    await openShortcutContextMenu(extensionPage, 'Netflix');
    await extensionPage.getByTestId('shortcut-context-multi-select').click();
    await shortcutCards(extensionPage).nth(7).click();
    await extensionPage.getByTestId('shortcut-multi-select-pin-top').click();

    const after = await readCurrentShortcutTitles(extensionPage);
    expect(after.slice(0, 2)).toEqual(['Netflix', '知乎']);
  });

  test('supports deleting a single shortcut through the confirm dialog', async ({ extensionPage }) => {
    await openShortcutContextMenu(extensionPage, '淘宝');
    await extensionPage.getByTestId('shortcut-context-delete').click();
    await confirmDialog(extensionPage);

    const titles = await readCurrentShortcutTitles(extensionPage);
    expect(titles).not.toContain('淘宝');
  });

  test('copies a shortcut hostname through the context menu action', async ({ extensionPage }) => {
    await extensionPage.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as Window & { __e2eCopiedText?: string }).__e2eCopiedText = text;
          },
        },
      });
    });

    await openShortcutContextMenu(extensionPage, 'YouTube');
    await extensionPage.getByTestId('shortcut-context-copy-link').click();

    await expect
      .poll(() => extensionPage.evaluate(() => (window as Window & { __e2eCopiedText?: string }).__e2eCopiedText || ''))
      .toBe('www.youtube.com');
  });

  test('prevents adding a duplicate shortcut url', async ({ extensionPage }) => {
    const before = await readCurrentShortcutTitles(extensionPage);

    await openShortcutContextMenu(extensionPage, '哔哩哔哩');
    await extensionPage.getByTestId('shortcut-context-new-shortcut').click();

    await expect(extensionPage.getByTestId('shortcut-modal')).toBeVisible();
    await extensionPage.getByTestId('shortcut-modal-title').fill('Duplicate Bilibili');
    await extensionPage.getByTestId('shortcut-modal-url').fill('https://www.bilibili.com');
    await extensionPage.getByTestId('shortcut-modal-save').click();

    await expect(extensionPage.getByTestId('shortcut-modal')).toBeVisible();
    const after = await readCurrentShortcutTitles(extensionPage);
    expect(after).toEqual(before);

    await extensionPage.getByTestId('shortcut-modal-cancel').click();
  });

  test('supports moving selected shortcuts to another scenario', async ({ extensionPage }) => {
    const targetScenario = await seedAdditionalScenario(extensionPage);
    const seededSnapshot = await readLocalProfileSnapshot(extensionPage);
    expect(seededSnapshot.scenarioModes.some((item) => item.id === targetScenario.id)).toBe(true);

    await openShortcutContextMenu(extensionPage, '哔哩哔哩');
    await extensionPage.getByTestId('shortcut-context-multi-select').click();
    await extensionPage.getByTestId('shortcut-multi-select-move').click();
    await expect(extensionPage.getByTestId(`shortcut-multi-select-move-target-${targetScenario.id}`)).toBeVisible();
    await extensionPage.getByTestId(`shortcut-multi-select-move-target-${targetScenario.id}`).click();

    const snapshot = await readLocalProfileSnapshot(extensionPage);
    const currentShortcuts = snapshot.scenarioShortcuts[snapshot.selectedScenarioId].map((item) => item.title);
    const movedShortcuts = snapshot.scenarioShortcuts[targetScenario.id].map((item) => item.title);

    expect(currentShortcuts).not.toContain('哔哩哔哩');
    expect(movedShortcuts).toContain('哔哩哔哩');
  });

  test('supports moving multiple selected shortcuts to another scenario', async ({ extensionPage }) => {
    const targetScenario = await seedAdditionalScenario(extensionPage, {
      id: 'e2e-bulk-move',
      name: 'E2E Bulk Move',
      color: '#6B5CE7',
      icon: 'briefcase',
    });

    await openShortcutContextMenu(extensionPage, '哔哩哔哩');
    await extensionPage.getByTestId('shortcut-context-multi-select').click();
    await shortcutCards(extensionPage).nth(1).click();
    await extensionPage.getByTestId('shortcut-multi-select-move').click();
    await extensionPage.getByTestId(`shortcut-multi-select-move-target-${targetScenario.id}`).click();

    const snapshot = await readLocalProfileSnapshot(extensionPage);
    const movedShortcuts = snapshot.scenarioShortcuts[targetScenario.id].map((item) => item.title);
    expect(movedShortcuts).toEqual(expect.arrayContaining(['哔哩哔哩', '少数派']));
  });

  test('persists icon color changes', async ({ extensionPage }) => {
    const beforeColor = (await readCurrentShortcut(extensionPage, '京东'))?.iconColor ?? '';

    await openShortcutContextMenu(extensionPage, '京东');
    await extensionPage.getByTestId('shortcut-context-edit').click();

    await expect(extensionPage.getByTestId('shortcut-modal')).toBeVisible();
    await extensionPage.getByTestId('shortcut-icon-mode-letter').click();
    await clickSliderAtRatio(extensionPage, 'shortcut-color-slider-hue', 0.08);
    await clickSliderAtRatio(extensionPage, 'shortcut-color-slider-saturation', 0.85);
    await clickSliderAtRatio(extensionPage, 'shortcut-color-slider-brightness', 0.42);
    await extensionPage.getByTestId('shortcut-modal-save').click();

    const editedShortcut = await readCurrentShortcut(extensionPage, '京东');
    expect(editedShortcut?.iconRendering).toBe('letter');
    expect(editedShortcut?.iconColor).toMatch(/^#[0-9A-F]{6}$/i);
    expect(editedShortcut?.iconColor).not.toBe(beforeColor);
  });

  test('persists auto-official toggle for shortcuts without official icons', async ({ extensionPage }) => {
    await patchShortcut(extensionPage, '36Kr', {
      useOfficialIcon: false,
      autoUseOfficialIcon: true,
      officialIconAvailableAtSave: false,
      iconRendering: 'favicon',
      iconColor: '',
    });

    await openShortcutContextMenu(extensionPage, '36Kr');
    await extensionPage.getByTestId('shortcut-context-edit').click();

    await expect(extensionPage.getByTestId('shortcut-modal')).toBeVisible();
    await expect(extensionPage.getByTestId('shortcut-auto-official-switch')).toBeEnabled();
    await extensionPage.getByTestId('shortcut-auto-official-switch').click();
    await extensionPage.getByTestId('shortcut-modal-save').click();

    const editedShortcut = await readCurrentShortcut(extensionPage, '36Kr');
    expect(editedShortcut).toMatchObject({
      autoUseOfficialIcon: false,
      useOfficialIcon: false,
      iconRendering: 'favicon',
    });
  });

  test('persists official icon mode for shortcuts with available official icons', async ({ extensionPage }) => {
    await openShortcutContextMenu(extensionPage, 'YouTube');
    await extensionPage.getByTestId('shortcut-context-edit').click();

    await expect(extensionPage.getByTestId('shortcut-modal')).toBeVisible();
    await extensionPage.getByTestId('shortcut-icon-mode-official').click();
    await extensionPage.getByTestId('shortcut-modal-save').click();

    const snapshot = await readLocalProfileSnapshot(extensionPage);
    const editedShortcut = snapshot.scenarioShortcuts[snapshot.selectedScenarioId]
      .find((item) => item.title === 'YouTube');

    expect(editedShortcut).toMatchObject({
      useOfficialIcon: true,
      officialIconAvailableAtSave: true,
    });
  });

  test('supports shortcut interactions in default card variant', async ({ extensionPage }) => {
    await setShortcutCardVariant(extensionPage, 'default');
    await openShortcutContextMenu(extensionPage, 'YouTube');
    await extensionPage.getByTestId('shortcut-context-edit').click();

    await saveShortcutModal(extensionPage, {
      title: 'Default Card Edited',
      url: 'https://example.com/default-card',
    });

    const snapshot = await readLocalProfileSnapshot(extensionPage);
    expect(snapshot.scenarioShortcuts[snapshot.selectedScenarioId]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Default Card Edited',
          url: 'https://example.com/default-card',
        }),
      ]),
    );
  });

  test('opens shortcuts in a new tab when that setting is enabled', async ({ extensionPage }) => {
    await extensionPage.evaluate(() => {
      (window as Window & { __e2eOpenedUrl?: string }).__e2eOpenedUrl = '';
      window.open = ((url?: string | URL | undefined) => {
        (window as Window & { __e2eOpenedUrl?: string }).__e2eOpenedUrl = String(url || '');
        return null;
      }) as typeof window.open;
    });

    await extensionPage.locator('[data-shortcut-title="YouTube"]').click();

    await expect
      .poll(() => extensionPage.evaluate(() => (window as Window & { __e2eOpenedUrl?: string }).__e2eOpenedUrl || ''))
      .toBe('https://www.youtube.com');
  });

  test('opens shortcuts in the current tab when new-tab mode is disabled', async ({ extensionPage }) => {
    await extensionPage.route('https://www.youtube.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<html><head><title>YouTube Mock</title></head><body>YouTube Mock</body></html>',
      });
    });

    await extensionPage.evaluate(() => {
      localStorage.setItem('openInNewTab', 'false');
    });
    await extensionPage.reload({ waitUntil: 'networkidle' });

    await extensionPage.locator('[data-shortcut-title="YouTube"]').click();
    await extensionPage.waitForURL('https://www.youtube.com/');
    await expect(extensionPage).toHaveTitle('YouTube Mock');
  });
});
