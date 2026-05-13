import * as THREE from 'three';

export interface AxisItemOptions {
    size?: number;
    width?: number;
}

/**
 * 3D coordinate axes (X=red, Y=green, Z=blue).
 * Port of q3dviewer AxisItem.
 */
export class AxisItem extends THREE.LineSegments {
    axisSize: number;

    constructor(options: AxisItemOptions = {}) {
        const size = options.size ?? 1.0;

        const vertices = new Float32Array([
            // X axis
            0, 0, 0,   size, 0, 0,
            // Y axis
            0, 0, 0,   0, size, 0,
            // Z axis
            0, 0, 0,   0, 0, size,
        ]);

        const colors = new Float32Array([
            // X axis (red)
            1, 0, 0,   1, 0, 0,
            // Y axis (green)
            0, 1, 0,   0, 1, 0,
            // Z axis (blue)
            0, 0, 1,   0, 0, 1,
        ]);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.LineBasicMaterial({
            vertexColors: true,
            linewidth: options.width ?? 2,
        });

        super(geometry, material);
        this.axisSize = size;
    }

    setSize(size: number) {
        this.axisSize = size;
        const pos = this.geometry.getAttribute('position') as THREE.BufferAttribute;
        // X endpoint
        pos.setXYZ(1, size, 0, 0);
        // Y endpoint
        pos.setXYZ(3, 0, size, 0);
        // Z endpoint
        pos.setXYZ(5, 0, 0, size);
        pos.needsUpdate = true;
    }

    setTransform(matrix: THREE.Matrix4) {
        this.matrix.copy(matrix);
        this.matrixAutoUpdate = false;
    }
}
