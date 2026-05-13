import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { FrameItem } from '../src/items/FrameItem';

describe('FrameItem', () => {
  it('creates with defaults', () => {
    const f = new FrameItem();
    expect(f.children.length).toBe(1); // line only
  });

  it('creates with custom size/color/width', () => {
    const f = new FrameItem({ size: [2, 1.5], color: 0xff0000, width: 5 });
    expect(f.children.length).toBe(1);
    const line = f.children[0] as THREE.LineSegments;
    expect((line.material as THREE.LineBasicMaterial).linewidth).toBe(5);
  });

  it('creates with image option (canvas)', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 4; canvas.height = 4;
    const f = new FrameItem({ image: canvas });
    expect(f.children.length).toBe(2);
  });

  it('setImage replaces existing plane', () => {
    const f = new FrameItem();
    const c1 = document.createElement('canvas'); c1.width = 4; c1.height = 4;
    f.setImage(c1);
    expect(f.children.length).toBe(2);
    const c2 = document.createElement('canvas'); c2.width = 8; c2.height = 8;
    f.setImage(c2);
    expect(f.children.length).toBe(2);
  });

  it('setTransform applies matrix', () => {
    const f = new FrameItem();
    const m = new THREE.Matrix4().makeRotationY(0.5);
    f.setTransform(m);
    expect(f.matrixAutoUpdate).toBe(false);
    expect(f.matrix.equals(m)).toBe(true);
  });

  it('setColor and setLineWidth', () => {
    const f = new FrameItem();
    f.setColor(0x00ff00);
    f.setLineWidth(7);
    const line = f.children[0] as THREE.LineSegments;
    expect((line.material as THREE.LineBasicMaterial).linewidth).toBe(7);
  });
});
