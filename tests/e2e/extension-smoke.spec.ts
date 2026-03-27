import { expect, test } from './extension.fixtures';

test.describe('LeafTab extension smoke', () => {
  test('loads the new tab extension page', async ({ extensionPage }) => {
    await expect(extensionPage).toHaveTitle(/LeafTab|New Tab/);
    await expect(extensionPage.locator('button[title="设置"], button[title="Settings"]').first()).toBeVisible();
  });

  test('opens the settings modal from the top controls', async ({ extensionPage }) => {
    await extensionPage.locator('button[title="设置"], button[title="Settings"]').first().evaluate((node: HTMLButtonElement) => {
      node.click();
    });

    await expect(extensionPage.getByRole('dialog')).toContainText(/设置|Settings/);
  });

  test('opens the sync center dialog from the top controls', async ({ extensionPage }) => {
    await extensionPage.locator('button[title="同步中心"], button[title="Sync Center"]').first().evaluate((node: HTMLButtonElement) => {
      node.click();
    });

    await expect(extensionPage.getByRole('dialog')).toContainText(/同步中心|Sync Center/);
  });

  test('toggles the time animation setting without page errors', async ({ extensionPage }) => {
    const pageErrors: string[] = [];
    extensionPage.on('pageerror', (error) => {
      pageErrors.push(String(error));
    });

    await extensionPage.locator('button[aria-label*=":"]').first().click();
    await expect(extensionPage.getByRole('dialog')).toContainText(/时间显示|Time Display/);

    await extensionPage.locator('#time-display-dialog-time-animation').click();
    await expect
      .poll(() => extensionPage.evaluate(() => localStorage.getItem('time_animation_mode')))
      .toBe('off');

    expect(pageErrors).toEqual([]);
  });
});
