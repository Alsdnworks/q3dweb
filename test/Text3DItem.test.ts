import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Text3DItem } from '../src/items/Text3DItem';

describe('Text3DItem', () => {
  it('creates empty', () => {
    const t = new Text3DItem();
    expect(t.children.length).toBe(0);
  });

  it('creates with initial data', () => {
    const t = new Text3DItem([
      { position: [0, 0, 0], pointSize: 5 },
      { position: [1, 1, 1], pointSize: 5, lineWidth: 2 },
    ]);
    // Should have points and possibly lines
    expect(t.children.length).toBeGreaterThan(0);
  });

  it('handles Vector3 positions', () => {
    const t = new Text3DItem();
    t.setData([
      { position: new THREE.Vector3(1, 2, 3), pointSize: 4, color: [1, 0, 0, 1] },
      { position: new THREE.Vector3(4, 5, 6), pointSize: 4, lineWidth: 1 },
    ]);
    expect(t.children.length).toBeGreaterThan(0);
  });

  it('append data adds without clearing', () => {
    const t = new Text3DItem();
    t.setData([{ position: [0, 0, 0], pointSize: 3 }]);
    t.setData([{ position: [1, 1, 1], pointSize: 3 }], true);
    // Has points mesh
    const points = t.children.find((c) => c instanceof THREE.Points);
    expect(points).toBeDefined();
  });

  it('clearData removes meshes', () => {
    const t = new Text3DItem([{ position: [0, 0, 0], pointSize: 5 }]);
    expect(t.children.length).toBeGreaterThan(0);
    t.clearData();
    expect(t.children.length).toBe(0);
  });

  it('items with no pointSize and no lineWidth produce no meshes', () => {
    const t = new Text3DItem();
    t.setData([{ position: [0, 0, 0] }]);
    expect(t.children.length).toBe(0);
  });

  it('lines without colors use default', () => {
    const t = new Text3DItem();
    t.setData([
      { position: [0, 0, 0], lineWidth: 1 },
      { position: [1, 0, 0] },
    ]);
    // Has lines mesh
    const lines = t.children.find((c) => c instanceof THREE.LineSegments);
    expect(lines).toBeDefined();
  });
});
