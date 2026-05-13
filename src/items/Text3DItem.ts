import * as THREE from 'three';

export interface Text3DData {
    text?: string;
    position: [number, number, number] | THREE.Vector3;
    color?: [number, number, number, number]; // RGBA (0-1)
    fontSize?: number;
    pointSize?: number;
    lineWidth?: number;
}

/**
 * 3D text/marker item that renders points and connecting lines in 3D space.
 * Port of q3dviewer Text3DItem.
 * 
 * Note: WebGL cannot render bitmap text like GLUT. Instead, this item
 * renders the marker points and connecting lines. For 3D text labels,
 * use CSS2DRenderer or sprite-based text (not included here for simplicity).
 */
export class Text3DItem extends THREE.Group {
    private dataList: Text3DData[] = [];
    private pointsMesh: THREE.Points | null = null;
    private linesMesh: THREE.LineSegments | null = null;

    constructor(data: Text3DData[] = []) {
        super();
        this.frustumCulled = false;
        if (data.length > 0) {
            this.setData(data);
        }
    }

    setData(data: Text3DData[], append: boolean = false) {
        if (!append) {
            this.dataList = [];
        }
        this.dataList.push(...data);
        this.rebuild();
    }

    clearData() {
        this.dataList = [];
        this.rebuild();
    }

    private rebuild() {
        // Remove existing meshes
        if (this.pointsMesh) {
            this.remove(this.pointsMesh);
            this.pointsMesh.geometry.dispose();
            (this.pointsMesh.material as THREE.Material).dispose();
            this.pointsMesh = null;
        }
        if (this.linesMesh) {
            this.remove(this.linesMesh);
            this.linesMesh.geometry.dispose();
            (this.linesMesh.material as THREE.Material).dispose();
            this.linesMesh = null;
        }

        if (this.dataList.length === 0) return;

        // Build points
        const pointPositions: number[] = [];
        const pointColors: number[] = [];
        const pointSizes: number[] = [];

        for (const item of this.dataList) {
            const ps = item.pointSize ?? 0;
            if (ps > 0) {
                const pos = item.position;
                const [px, py, pz] = pos instanceof THREE.Vector3 ? [pos.x, pos.y, pos.z] : pos;
                pointPositions.push(px, py, pz);
                const col = item.color ?? [1, 1, 1, 1];
                pointColors.push(col[0], col[1], col[2]);
                pointSizes.push(ps);
            }
        }

        if (pointPositions.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(pointColors, 3));

            // Use the maximum point size (WebGL doesn't support per-point sizes easily with basic material)
            const maxSize = Math.max(...pointSizes);
            const mat = new THREE.PointsMaterial({
                size: maxSize,
                vertexColors: true,
                sizeAttenuation: false,
            });

            this.pointsMesh = new THREE.Points(geo, mat);
            this.pointsMesh.frustumCulled = false;
            this.add(this.pointsMesh);
        }

        // Build lines between consecutive items that have lineWidth > 0
        const linePositions: number[] = [];
        const lineColors: number[] = [];

        for (let i = 0; i < this.dataList.length - 1; i++) {
            const item1 = this.dataList[i];
            const item2 = this.dataList[i + 1];
            const lw = item1.lineWidth ?? 0;
            if (lw > 0) {
                const p1 = item1.position;
                const p2 = item2.position;
                const [x1, y1, z1] = p1 instanceof THREE.Vector3 ? [p1.x, p1.y, p1.z] : p1;
                const [x2, y2, z2] = p2 instanceof THREE.Vector3 ? [p2.x, p2.y, p2.z] : p2;
                linePositions.push(x1, y1, z1, x2, y2, z2);
                const col = item1.color ?? [1, 1, 1, 1];
                lineColors.push(col[0], col[1], col[2], col[0], col[1], col[2]);
            }
        }

        if (linePositions.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            geo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

            const mat = new THREE.LineBasicMaterial({
                vertexColors: true,
                linewidth: 1,
            });

            this.linesMesh = new THREE.LineSegments(geo, mat);
            this.linesMesh.frustumCulled = false;
            this.add(this.linesMesh);
        }
    }
}
