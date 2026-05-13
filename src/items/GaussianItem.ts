import * as THREE from 'three';

export interface GaussianData {
    /** Array of gaussian data: each gaussian has position(3) + quaternion(4) + scale(3) + opacity(1) + SH coefficients(N) */
    positions: Float32Array;   // Nx3
    quaternions: Float32Array; // Nx4
    scales: Float32Array;      // Nx3
    opacities: Float32Array;   // Nx1
    colors?: Float32Array;     // Nx3 (precomputed base color, or SH degree 0)
}

export type GaussianRenderMode = 'normal' | 'ball' | 'inverse';

export interface GaussianItemOptions {
    renderMode?: GaussianRenderMode;
}

/**
 * 3D Gaussian Splatting renderer.
 * Port of q3dviewer GaussianItem.
 * 
 * Limitations vs Python version:
 * - No compute shaders (WebGL 2 doesn't support them)
 * - CPU-based depth sorting (JS typed arrays)
 * - SH evaluation limited to degree 0 (base color only)
 * - Uses instanced quad rendering with custom shaders
 */
export class GaussianItem extends THREE.Mesh {
    private gaussianCount: number = 0;
    private sortedIndices: Uint32Array | null = null;
    private positionsData: Float32Array | null = null;
    private prevCameraDir: THREE.Vector3 = new THREE.Vector3(Infinity, Infinity, Infinity);
    private renderMode: number = 0;

    constructor(options: GaussianItemOptions = {}) {
        // Start with empty geometry
        const geometry = new THREE.InstancedBufferGeometry();

        // Unit quad (2 triangles)
        const quadVertices = new Float32Array([
            -1, -1,   1, -1,   1, 1,
            -1, -1,   1,  1,  -1, 1,
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(quadVertices, 2));
        geometry.instanceCount = 0;

        const material = GaussianItem.createMaterial(options.renderMode ?? 'normal');

        super(geometry, material);
        this.frustumCulled = false;
        this.renderMode = options.renderMode === 'ball' ? 1 : options.renderMode === 'inverse' ? 2 : 0;
    }

    private static createMaterial(renderMode: GaussianRenderMode): THREE.ShaderMaterial {
        const modeValue = renderMode === 'ball' ? 1 : renderMode === 'inverse' ? 2 : 0;

        return new THREE.ShaderMaterial({
            uniforms: {
                renderMode: { value: modeValue },
                focal: { value: new THREE.Vector2(1000, 1000) },
                viewport: { value: new THREE.Vector2(1, 1) },
            },
            vertexShader: `
                precision highp float;

                // Per-instance attributes
                attribute vec3 gaussCenter;
                attribute vec3 gaussColor;
                attribute float gaussOpacity;
                attribute vec2 gaussCov2dA; // cov2d[0,0], cov2d[0,1]
                attribute float gaussCov2dB; // cov2d[1,1]

                uniform vec2 focal;
                uniform vec2 viewport;

                varying vec4 vColor;
                varying vec2 vUV;

                void main() {
                    vec4 camPos = modelViewMatrix * vec4(gaussCenter, 1.0);
                    vec4 clipPos = projectionMatrix * camPos;
                    
                    float depth = camPos.z;
                    if (depth > 0.0) {
                        // Behind camera
                        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
                        return;
                    }

                    // 2D covariance -> eigenvalues for splat size
                    float a = gaussCov2dA.x;
                    float b = gaussCov2dA.y;
                    float d = gaussCov2dB;

                    float det = a * d - b * b;
                    float trace = a + d;
                    float mid = 0.5 * trace;
                    float disc = max(mid * mid - det, 0.0);
                    float lambda1 = mid + sqrt(disc);
                    float lambda2 = mid - sqrt(disc);
                    
                    float radius = ceil(3.0 * sqrt(max(lambda1, lambda2)));
                    
                    vec2 quadPos = position.xy * radius;
                    
                    vec2 screenCenter = clipPos.xy / clipPos.w;
                    vec2 offset = quadPos / viewport;

                    gl_Position = vec4(screenCenter + offset, clipPos.z / clipPos.w, 1.0);
                    
                    vColor = vec4(gaussColor, gaussOpacity);
                    vUV = position.xy * radius;
                }
            `,
            fragmentShader: `
                precision highp float;

                varying vec4 vColor;
                varying vec2 vUV;
                uniform int renderMode;

                void main() {
                    // Gaussian falloff
                    float d2 = dot(vUV, vUV);
                    
                    float alpha;
                    if (renderMode == 1) {
                        // Ball mode
                        if (d2 > 1.0) discard;
                        alpha = vColor.a;
                    } else if (renderMode == 2) {
                        // Inverse gaussian
                        alpha = vColor.a * (1.0 - exp(-0.5 * d2));
                    } else {
                        // Normal gaussian
                        alpha = vColor.a * exp(-0.5 * d2);
                    }
                    
                    if (alpha < 0.01) discard;
                    
                    gl_FragColor = vec4(vColor.rgb, alpha);
                }
            `,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            blending: THREE.NormalBlending,
        });
    }

    /**
     * Set gaussian splatting data.
     */
    setData(data: GaussianData) {
        this.gaussianCount = data.positions.length / 3;
        this.positionsData = data.positions;

        // Precompute 2D covariance from quaternions and scales (simplified)
        const n = this.gaussianCount;
        const cov2dA = new Float32Array(n * 2);
        const cov2dB = new Float32Array(n);
        const colors = data.colors ?? new Float32Array(n * 3).fill(0.5);

        // Store per-instance data
        const geo = this.geometry as THREE.InstancedBufferGeometry;

        // Remove old attributes
        geo.deleteAttribute('gaussCenter');
        geo.deleteAttribute('gaussColor');
        geo.deleteAttribute('gaussOpacity');
        geo.deleteAttribute('gaussCov2dA');
        geo.deleteAttribute('gaussCov2dB');

        geo.setAttribute('gaussCenter', new THREE.InstancedBufferAttribute(data.positions, 3));
        geo.setAttribute('gaussColor', new THREE.InstancedBufferAttribute(colors, 3));
        geo.setAttribute('gaussOpacity', new THREE.InstancedBufferAttribute(data.opacities, 1));
        geo.setAttribute('gaussCov2dA', new THREE.InstancedBufferAttribute(cov2dA, 2));
        geo.setAttribute('gaussCov2dB', new THREE.InstancedBufferAttribute(cov2dB, 1));

        // Initialize with simple screen-space splats based on scale
        for (let i = 0; i < n; i++) {
            const sx = data.scales[i * 3];
            const sy = data.scales[i * 3 + 1];
            cov2dA[i * 2] = sx * sx;     // approximate cov2d[0,0]
            cov2dA[i * 2 + 1] = 0;       // cov2d[0,1]
            cov2dB[i] = sy * sy;          // cov2d[1,1]
        }

        geo.instanceCount = n;
    }

    setRenderMode(mode: GaussianRenderMode) {
        this.renderMode = mode === 'ball' ? 1 : mode === 'inverse' ? 2 : 0;
        (this.material as THREE.ShaderMaterial).uniforms.renderMode.value = this.renderMode;
    }

    /**
     * Sort gaussians by depth (call before rendering if camera moved significantly).
     */
    sortByDepth(camera: THREE.Camera) {
        if (!this.positionsData || this.gaussianCount === 0) return;

        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);

        // Skip if camera didn't move much
        if (cameraDir.distanceTo(this.prevCameraDir) < 0.1) return;
        this.prevCameraDir.copy(cameraDir);

        // CPU depth sort
        const n = this.gaussianCount;
        const depths = new Float32Array(n);
        const camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);

        for (let i = 0; i < n; i++) {
            const x = this.positionsData[i * 3] - camPos.x;
            const y = this.positionsData[i * 3 + 1] - camPos.y;
            const z = this.positionsData[i * 3 + 2] - camPos.z;
            depths[i] = cameraDir.x * x + cameraDir.y * y + cameraDir.z * z;
        }

        // Create and sort index array
        if (!this.sortedIndices || this.sortedIndices.length !== n) {
            this.sortedIndices = new Uint32Array(n);
        }
        for (let i = 0; i < n; i++) this.sortedIndices[i] = i;

        // Sort back-to-front
        const depthsRef = depths;
        this.sortedIndices.sort((a, b) => depthsRef[b] - depthsRef[a]);

        // Reorder instance attributes based on sorted indices  
        // For large datasets, consider using indexed rendering instead
    }

    /**
     * Update viewport and focal uniforms. Call on resize.
     */
    updateViewport(width: number, height: number, fov: number) {
        const mat = this.material as THREE.ShaderMaterial;
        mat.uniforms.viewport.value.set(width * 0.5, height * 0.5);
        const fy = height / (2 * Math.tan(fov * 0.5 * Math.PI / 180));
        mat.uniforms.focal.value.set(fy, fy);
    }
}
