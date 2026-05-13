import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { LineItem } from '../src/items/LineItem';

describe('LineItem', () => {
  it('creates LINE_STRIP by default', () => {
    const l = new LineItem();
    expect(l.lineType).toBe('LINE_STRIP');
    expect(l.validCount).toBe(0);
    expect(l.capacity).toBe(100000);
  });

  it('static create returns LineItem for LINE_STRIP', () => {
    const l = LineItem.create({ lineType: 'LINE_STRIP', color: 0xff0000, width: 3 });
    expect(l).toBeInstanceOf(LineItem);
  });

  it('static create returns LineSegments for LINES', () => {
    const seg = LineItem.create({ lineType: 'LINES', color: 0x00ff00, width: 2 });
    expect(seg).toBeInstanceOf(THREE.LineSegments);
    expect(seg).not.toBeInstanceOf(LineItem);
    // segments has setData/appendData attached
    const data = new Float32Array([0, 0, 0, 1, 1, 1]);
    (seg as any).setData(data);
    expect((seg as any).validCount).toBe(2);
    (seg as any).appendData(new Float32Array([2, 2, 2]));
    expect((seg as any).validCount).toBe(3);
  });

  it('static create defaults to LINE_STRIP when no opts', () => {
    const l = LineItem.create();
    expect(l).toBeInstanceOf(LineItem);
  });

  it('setData/appendData updates buffers', () => {
    const l = new LineItem();
    l.setData(new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]));
    expect(l.validCount).toBe(3);
    l.appendData(new Float32Array([3, 0, 0]));
    expect(l.validCount).toBe(4);
  });

  it('expands capacity when needed', () => {
    const l = new LineItem();
    const big = new Float32Array(100001 * 3);
    l.setData(big);
    expect(l.capacity).toBeGreaterThan(100000);
  });

  it('setColor / setWidth', () => {
    const l = new LineItem();
    l.setColor(0x123456);
    l.setWidth(4);
    expect((l.material as THREE.LineBasicMaterial).linewidth).toBe(4);
  });
});
