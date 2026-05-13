import * as THREE from 'three';

export interface FrameItemOptions {
    size?: [number, number]; // [width, height]
    width?: number;          // line width
    color?: number | string;
    image?: HTMLImageElement | HTMLCanvasElement | ImageBitmap | null;
}

/**
 * Camera frame visualization with optional texture.
 * Draws a frustum-like wireframe (rectangle + apex) and optional image plane.
 * Port of q3dviewer FrameItem.
 */
export class FrameItem extends THREE.Group {
    private frameLine: THREE.LineSegments;
    private imagePlane: THREE.Mesh | null = null;
    private frameWidth: number;
    private frameHeight: number;

    constructor(options: FrameItemOptions = {}) {
        super();

        const [w, h] = options.size ?? [1, 0.8];
        this.frameWidth = w;
        this.frameHeight = h;

        const hw = w / 2;
        const hh = h / 2;
        const apex = [0, 0, hh * 0.66]; // center-Z apex like Python version

        // Rectangle corners (in XY plane at z=0)
        const v0 = [-hw,  hh, 0];
        const v1 = [ hw,  hh, 0];
        const v2 = [ hw, -hh, 0];
        const v3 = [-hw, -hh, 0];

        // Line segments: rectangle + 4 lines from apex to corners
        const lineVertices = new Float32Array([
            ...v0, ...v1,  ...v1, ...v2,  ...v2, ...v3,  ...v3, ...v0,
            ...apex, ...v0,  ...apex, ...v1,  ...apex, ...v2,  ...apex, ...v3,
        ]);

        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(lineVertices, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            color: options.color ?? 0x0000ff,
            linewidth: options.width ?? 3,
        });

        this.frameLine = new THREE.LineSegments(lineGeometry, lineMaterial);
        this.add(this.frameLine);

        // Image plane (textured quad)
        if (options.image) {
            this.setImage(options.image);
        }
    }

    setImage(image: HTMLImageElement | HTMLCanvasElement | ImageBitmap) {
        // Remove old plane
        if (this.imagePlane) {
            this.remove(this.imagePlane);
            this.imagePlane.geometry.dispose();
            (this.imagePlane.material as THREE.Material).dispose();
        }

        const planeGeo = new THREE.PlaneGeometry(this.frameWidth, this.frameHeight);
        // PlaneGeometry is already centered, so position is (0, 0, 0)

        const texture = new THREE.Texture(image);
        texture.needsUpdate = true;

        const planeMat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
        });

        this.imagePlane = new THREE.Mesh(planeGeo, planeMat);
        this.add(this.imagePlane);
    }

    setTransform(matrix: THREE.Matrix4) {
        this.matrix.copy(matrix);
        this.matrixAutoUpdate = false;
    }

    setColor(color: number | string) {
        (this.frameLine.material as THREE.LineBasicMaterial).color.set(color);
    }

    setLineWidth(width: number) {
        (this.frameLine.material as THREE.LineBasicMaterial).linewidth = width;
    }
}
