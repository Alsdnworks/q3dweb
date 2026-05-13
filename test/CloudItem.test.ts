import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CloudItem } from '../src/items/CloudItem';

describe('CloudItem color modes', () => {
  it('FLAT color mode resolves uniform to 2', () => {
    const c = new CloudItem(new Float32Array([0, 0, 0]), new Float32Array([0]), { colorMode: 'FLAT' });
    expect(((c.material as any).uniforms.colorMode.value)).toBe(2);
  });
  it('I (intensity) color mode resolves uniform to 0', () => {
    const c = new CloudItem(new Float32Array([0, 0, 0]), new Float32Array([0]), { colorMode: 'I' });
    expect(((c.material as any).uniforms.colorMode.value)).toBe(0);
  });
  it('RGB color mode via rgbColors arg resolves uniform to 1', () => {
    const c = new CloudItem(new Float32Array([0, 0, 0]), new Float32Array([0]), {}, new Uint8Array([255, 0, 0]));
    expect(((c.material as any).uniforms.colorMode.value)).toBe(1);
  });
  it('default colorMode resolves to 0', () => {
    const c = new CloudItem(new Float32Array([0, 0, 0]), new Float32Array([0]));
    expect(((c.material as any).uniforms.colorMode.value)).toBe(0);
  });
});

describe('CloudItem geometry & uniforms', () => {
  it('initializes with correct geometry attributes', () => {
    const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
    const values = new Float32Array([10, 20]);
    const cloud = new CloudItem(positions, values);
    expect(cloud.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(cloud.geometry.getAttribute('position').count).toBe(2);
    expect(cloud.geometry.getAttribute('value').count).toBe(2);
  });
  it('sets default uniforms', () => {
    const cloud = new CloudItem(new Float32Array(3), new Float32Array(1));
    const m = cloud.material as THREE.ShaderMaterial;
    expect(m.uniforms.pointSize.value).toBe(1.0);
    expect(m.uniforms.alpha.value).toBe(1.0);
  });
  it('accepts custom options', () => {
    const cloud = new CloudItem(new Float32Array(3), new Float32Array(1), { size: 5.0, alpha: 0.5 });
    const m = cloud.material as THREE.ShaderMaterial;
    expect(m.uniforms.pointSize.value).toBe(5.0);
    expect(m.uniforms.alpha.value).toBe(0.5);
  });

  it('maps pointType options to uniforms', () => {
    const cloud = new CloudItem(new Float32Array(3), new Float32Array(1), { pointType: 'SPHERE' });
    const m = cloud.material as THREE.ShaderMaterial;
    expect(m.uniforms.pointType.value).toBe(2);
  });

  it('updates viewport height for world-space point sizing', () => {
    const cloud = new CloudItem(new Float32Array(3), new Float32Array(1), { pointType: 'SQUARE' });
    cloud.updateViewport(720);
    const m = cloud.material as THREE.ShaderMaterial;
    expect(m.uniforms.viewportHeight.value).toBe(720);
  });

  it('uses branch-light shader code for color selection and point masking', () => {
    const cloud = new CloudItem(new Float32Array(3), new Float32Array(1), { pointType: 'SPHERE', colorMode: 'RGB' }, new Uint8Array([255, 0, 0]));
    const m = cloud.material as THREE.ShaderMaterial;
    expect(m.vertexShader).not.toContain('if (colorMode');
    expect(m.fragmentShader).not.toContain('if (pointType');
    expect(m.fragmentShader).not.toContain('discard');
    expect(m.vertexShader).toContain('mix(');
    expect(m.fragmentShader).toContain('step(');
    expect(m.vertexShader).toContain('viewportHeight');
    expect(m.vertexShader).toContain('projectionMatrix[1][1]');
  });
});
