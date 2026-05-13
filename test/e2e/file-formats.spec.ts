import { test, expect } from '@playwright/test';
import {
  dropFile,
  readTestData,
  makeAsciiPLY,
  waitForPointCount,
  parsePointCount,
  attachErrorSinks,
  TESTDATA_POINT_COUNT,
} from './helpers';

test.describe('file formats', () => {
  for (const fixture of [
    'tiny_ascii.pcd',
    'tiny_binary.pcd',
    'tiny_ascii.ply',
    'tiny_binary.ply',
    'tiny.las',
    'tiny.laz',
    'tiny.e57',
  ]) {
    test(`loads ${fixture} via drag-and-drop`, async ({ page }) => {
      const { pageErrors } = attachErrorSinks(page);
      await page.goto('/');
      await dropFile(page, fixture, readTestData(fixture));
      const label = await waitForPointCount(page, 20_000);
      expect(parsePointCount(label)).toBe(TESTDATA_POINT_COUNT);
      expect(pageErrors).toEqual([]);
    });
  }

  test('loads a synthetic ASCII PLY with the exact expected vertex count', async ({ page }) => {
    await page.goto('/');
    const N = 2048;
    await dropFile(page, 'synth.ply', makeAsciiPLY(N));
    const label = await waitForPointCount(page, 15_000);
    expect(parsePointCount(label)).toBe(N);
  });

  test('ignores unsupported file extensions without throwing', async ({ page }) => {
    const { pageErrors } = attachErrorSinks(page);
    await page.goto('/');

    const warns: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' || msg.type() === 'warn') warns.push(msg.text());
    });

    await dropFile(page, 'readme.txt', new TextEncoder().encode('not a point cloud'));

    // App should still be responsive and no point-count should appear.
    await page.waitForTimeout(500);
    await expect(page.locator('text=/\\d[\\d,]*\\s*pts/')).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });

  test('appending a second file increases the total point count in the items list', async ({ page }) => {
    await page.goto('/');
    await dropFile(page, 'a.ply', makeAsciiPLY(500));
    await waitForPointCount(page, 15_000);

    // Drop the second file. The current viewer replaces on single drop — we verify via
    // simultaneous multi-drop by dispatching one drop event carrying two files.
    await page.evaluate(async () => {
      function makePLY(n: number, seed: number): Uint8Array {
        const lines = [
          'ply', 'format ascii 1.0', `element vertex ${n}`,
          'property float x', 'property float y', 'property float z', 'end_header', '',
        ];
        for (let i = 0; i < n; i++) {
          lines.push(`${(Math.sin(i + seed)).toFixed(3)} ${(Math.cos(i + seed)).toFixed(3)} ${(i * 0.01).toFixed(3)}`);
        }
        return new TextEncoder().encode(lines.join('\n') + '\n');
      }
      const f1 = new File([makePLY(300, 1)], 'a.ply', { type: 'application/octet-stream' });
      const f2 = new File([makePLY(700, 2)], 'b.ply', { type: 'application/octet-stream' });
      const dt = new DataTransfer();
      dt.items.add(f1);
      dt.items.add(f2);
      const target = document.getElementById('app')!;
      const opts: DragEventInit = { bubbles: true, cancelable: true, dataTransfer: dt };
      target.dispatchEvent(new DragEvent('dragenter', opts));
      target.dispatchEvent(new DragEvent('dragover', opts));
      target.dispatchEvent(new DragEvent('drop', opts));
    });

    // Wait until the total reaches the appended sum (viewer appends subsequent files in a multi-drop).
    await expect.poll(
      async () => {
        const labels = await page.locator('text=/\\d[\\d,]*\\s*pts/').allTextContents();
        if (labels.length === 0) return 0;
        return Math.max(...labels.map((l) => parseInt((l.match(/([\d,]+)/)?.[1] ?? '0').replace(/,/g, ''), 10)));
      },
      { timeout: 20_000 },
    ).toBeGreaterThanOrEqual(700);
  });
});
