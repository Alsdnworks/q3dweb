import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.mock('three', async () => {
  const actual = await vi.importActual<any>('three');
  class FakeWebGLRenderer {
    domElement: HTMLCanvasElement;
    capabilities = { isWebGL2: true, maxTextures: 16 };
    constructor() { this.domElement = document.createElement('canvas'); }
    setPixelRatio() {}
    setSize(w: number, h: number) { this.domElement.width = w; this.domElement.height = h; }
    render() {}
    dispose() {}
    getContext() { return {}; }
  }
  return { ...actual, WebGLRenderer: FakeWebGLRenderer };
});

import { Viewer } from '../src/viewer';

const SAMPLE_DIR = '/home/hara/web_q3d/test_sample';

const SAMPLES = [
  'warehouse_ascii.pcd',
  'umeda_7F_color_opt.pcd',
  'mihara_binary.pcd',
  'mihara_ascii.ply',
  'mihara_binary.ply',
  'mihara_binary.las',
  'mihara_gnss.las',
];

function makeContainer(): HTMLElement {
  const c = document.createElement('div');
  c.id = 'app';
  document.body.appendChild(c);
  return c;
}

describe('Integration: load real sample files', () => {
  let v: Viewer;

  beforeEach(() => {
    makeContainer();
    v = new Viewer('app');
    // Smaller cap so very large files don't allocate too much memory in CI
    v.MAX_POINTS_VISUAL = 200_000;
    // Bypass the heap-size guard: the jsdom environment does not expose
    // performance.memory, so the default budget is a conservative 2 GiB
    // which would otherwise block some >500 MB sample files in tests.
    v.skipMemoryCheck = true;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  for (const name of SAMPLES) {
    const fp = path.join(SAMPLE_DIR, name);
    const exists = fs.existsSync(fp);
    const itFn = exists ? it : it.skip;

    itFn(`loads ${name}`, () => {
      const buf = fs.readFileSync(fp);
      const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      v.loadData(u8, name);
      expect(v.items.cloud).toBeDefined();
      expect(v.pointsLoaded).toBeGreaterThan(0);
    }, 300_000);
  }
});
