import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AxisItem } from '../src/items/AxisItem';

describe('AxisItem', () => {
  it('creates with default size and width', () => {
    const a = new AxisItem();
    expect(a.axisSize).toBe(1.0);
    const pos = a.geometry.getAttribute('position') as THREE.BufferAttribute;
    expect(pos.count).toBe(6);
    const col = a.geometry.getAttribute('color') as THREE.BufferAttribute;
    expect(col.count).toBe(6);
    expect((a.material as THREE.LineBasicMaterial).vertexColors).toBe(true);
  });

  it('creates with custom size and width', () => {
    const a = new AxisItem({ size: 5, width: 4 });
    expect(a.axisSize).toBe(5);
    const pos = a.geometry.getAttribute('position') as THREE.BufferAttribute;
    expect(pos.array[3]).toBe(5);
    expect((a.material as THREE.LineBasicMaterial).linewidth).toBe(4);
  });

  it('setSize updates endpoints', () => {
    const a = new AxisItem({ size: 1 });
    a.setSize(7);
    expect(a.axisSize).toBe(7);
    const pos = a.geometry.getAttribute('position') as THREE.BufferAttribute;
    expect(pos.array[3]).toBe(7);
    expect(pos.array[10]).toBe(7);
    expect(pos.array[17]).toBe(7);
  });

  it('setTransform applies matrix', () => {
    const a = new AxisItem();
    const m = new THREE.Matrix4().makeTranslation(1, 2, 3);
    a.setTransform(m);
    expect(a.matrix.equals(m)).toBe(true);
    expect(a.matrixAutoUpdate).toBe(false);
  });
});
