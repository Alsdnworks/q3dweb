import { test, expect } from '@playwright/test';
import { attachErrorSinks } from './helpers';

test.describe('smoke', () => {
  test('app boots and exposes a WebGL canvas with no JS errors', async ({ page }) => {
    const { consoleErrors, pageErrors } = attachErrorSinks(page);
    await page.goto('/');
    const canvas = page.locator('#app canvas');
    await expect(canvas).toBeVisible();

    // Canvas has non-zero size.
    const box = await canvas.boundingBox();
    expect(box && box.width > 100 && box.height > 100).toBeTruthy();

    // WebGL context obtainable.
    const hasGL = await page.evaluate(() => {
      const c = document.querySelector('#app canvas') as HTMLCanvasElement | null;
      if (!c) return false;
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    });
    expect(hasGL).toBe(true);

    expect(pageErrors).toEqual([]);
    // Allow benign console errors from missing optional resources but fail on uncaught throws.
    expect(consoleErrors.filter((e) => /Uncaught|TypeError|ReferenceError/i.test(e))).toEqual([]);
  });

  test('settings panel is present on boot and can be toggled with M', async ({ page }) => {
    await page.goto('/');
    const title = page.locator('text=Settings (Push M to toggle)');
    await expect(title).toBeVisible();
    const panel = title.locator('..');

    await page.locator('#app').click({ position: { x: 500, y: 500 } });
    await page.keyboard.press('m');
    await expect(panel).toBeHidden();

    await page.keyboard.press('m');
    await expect(panel).toBeVisible();
  });

  test('main win settings are shown initially (bg color + center toggle)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Set background color:')).toBeVisible();
    await expect(page.locator('text=Show Center Point')).toBeVisible();

    // Default selection is "main win(Viewer)".
    const select = page.locator('select').first();
    await expect(select).toHaveValue('__main_win__');
  });
});
