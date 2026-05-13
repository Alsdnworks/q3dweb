import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MeshItem } from '../src/items/MeshItem';

describe('MeshItem', () => {
  it('creates with defaults', () => {
    const m = new MeshItem();
    expect(m.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect((m.material as THREE.ShaderMaterial).uniforms.alpha.value).toBe(1.0);
  });

  it('creates with alpha < 1 and lighting off', () => {
    const m = new MeshItem({ alpha: 0.5, enableLighting: false });
    expect((m.material as THREE.ShaderMaterial).transparent).toBe(true);
    expect((m.material as THREE.ShaderMaterial).uniforms.enableLighting.value).toBe(0);
  });

  it('setData rebuilds geometry from triangles', () => {
    const m = new MeshItem();
    m.setData(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
    expect(m.geometry.getAttribute('position').count).toBe(3);
    expect(m.geometry.getAttribute('normal')).toBeDefined();
  });

  it('setIndexedData uses indices', () => {
    const m = new MeshItem();
    m.setIndexedData(
      new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]),
      new Uint32Array([0, 1, 2, 0, 2, 3])
    );
    expect(m.geometry.getIndex()?.count).toBe(6);
  });

  it('setColor / setWireframe / setAlpha / setLighting', () => {
    const m = new MeshItem();
    m.setColor(0xff00ff);
    m.setWireframe(true);
    expect((m.material as THREE.ShaderMaterial).wireframe).toBe(true);
    m.setAlpha(0.3);
    expect((m.material as THREE.ShaderMaterial).uniforms.alpha.value).toBe(0.3);
    m.setLighting(false);
    expect((m.material as THREE.ShaderMaterial).uniforms.enableLighting.value).toBe(0);
    m.setLighting(true);
    expect((m.material as THREE.ShaderMaterial).uniforms.enableLighting.value).toBe(1);
  });
});
