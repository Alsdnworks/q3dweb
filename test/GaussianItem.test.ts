import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GaussianItem } from '../src/items/GaussianItem';

describe('GaussianItem', () => {
  it('creates with default render mode', () => {
    const g = new GaussianItem();
    const geo = g.geometry as THREE.InstancedBufferGeometry;
    expect(geo.instanceCount).toBe(0);
  });

  it('creates with ball mode', () => {
    const g = new GaussianItem({ renderMode: 'ball' });
    expect(g).toBeDefined();
  });

  it('creates with inverse mode', () => {
    const g = new GaussianItem({ renderMode: 'inverse' });
    expect(g).toBeDefined();
  });

  it('setData populates instances', () => {
    const g = new GaussianItem();
    const n = 3;
    g.setData({
      positions: new Float32Array(n * 3),
      quaternions: new Float32Array(n * 4),
      scales: new Float32Array([1, 1, 1, 2, 2, 2, 3, 3, 3]),
      opacities: new Float32Array(n).fill(1),
      colors: new Float32Array(n * 3).fill(0.5),
    });
    expect((g.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(n);
  });

  it('setData without colors uses default', () => {
    const g = new GaussianItem();
    const n = 2;
    g.setData({
      positions: new Float32Array(n * 3),
      quaternions: new Float32Array(n * 4),
      scales: new Float32Array(n * 3).fill(1),
      opacities: new Float32Array(n).fill(1),
    });
    expect((g.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(n);
  });

  it('setRenderMode updates uniform', () => {
    const g = new GaussianItem();
    g.setRenderMode('ball');
    expect((g.material as THREE.ShaderMaterial).uniforms.renderMode.value).toBe(1);
    g.setRenderMode('inverse');
    expect((g.material as THREE.ShaderMaterial).uniforms.renderMode.value).toBe(2);
    g.setRenderMode('normal');
    expect((g.material as THREE.ShaderMaterial).uniforms.renderMode.value).toBe(0);
  });

  it('sortByDepth updates sortedIndices', () => {
    const g = new GaussianItem();
    g.setData({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]),
      quaternions: new Float32Array(12),
      scales: new Float32Array([1, 1, 1, 1, 1, 1, 1, 1, 1]),
      opacities: new Float32Array(3).fill(1),
    });
    const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    cam.position.set(0, 0, 5);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld();
    g.sortByDepth(cam);
    // Second call should early-exit (camera didn't move)
    g.sortByDepth(cam);
  });

  it('sortByDepth early-exits when no data', () => {
    const g = new GaussianItem();
    const cam = new THREE.PerspectiveCamera();
    g.sortByDepth(cam);
  });

  it('updateViewport sets uniforms', () => {
    const g = new GaussianItem();
    g.updateViewport(800, 600, 60);
    const mat = g.material as THREE.ShaderMaterial;
    expect(mat.uniforms.viewport.value.x).toBe(400);
    expect(mat.uniforms.focal.value.x).toBeGreaterThan(0);
  });
});
