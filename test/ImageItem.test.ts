import { describe, it, expect } from 'vitest';
import { ImageItem } from '../src/items/ImageItem';

describe('ImageItem', () => {
  it('creates with defaults', () => {
    const c = document.createElement('div');
    const img = new ImageItem(c);
    expect(c.children.length).toBe(1);
    expect(img.visible).toBe(true);
  });

  it('creates with custom options', () => {
    const c = document.createElement('div');
    const img = new ImageItem(c, { pos: [10, 20], size: [100, 50], alpha: 0.5 });
    const canvas = c.firstChild as HTMLCanvasElement;
    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(50);
  });

  it('setData with ImageData', () => {
    const c = document.createElement('div');
    const img = new ImageItem(c);
    const data = new ImageData(new Uint8ClampedArray(4 * 4 * 4), 4, 4);
    img.setData(data);
    expect((c.firstChild as HTMLCanvasElement).width).toBe(4);
  });

  it('setData with canvas', () => {
    const c = document.createElement('div');
    const img = new ImageItem(c);
    const src = document.createElement('canvas');
    src.width = 10; src.height = 10;
    img.setData(src);
    expect((c.firstChild as HTMLCanvasElement).width).toBe(10);
  });

  it('setRawData copies bytes', () => {
    const c = document.createElement('div');
    const img = new ImageItem(c);
    img.setRawData(new Uint8Array(2 * 2 * 4), 2, 2);
    expect((c.firstChild as HTMLCanvasElement).width).toBe(2);
  });

  it('setAlpha / setPosition / show / hide / dispose', () => {
    const c = document.createElement('div');
    const img = new ImageItem(c);
    img.setAlpha(0.3);
    img.setPosition(5, 6);
    img.hide();
    expect(img.visible).toBe(false);
    img.show();
    expect(img.visible).toBe(true);
    img.dispose();
    expect(c.children.length).toBe(0);
  });
});
