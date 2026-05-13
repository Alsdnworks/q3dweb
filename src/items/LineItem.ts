import * as THREE from 'three';

export type LineType = 'LINE_STRIP' | 'LINES';

export interface LineItemOptions {
    width?: number;
    color?: number | string;
    lineType?: LineType;
}

/**
 * Dynamic line renderer supporting LINE_STRIP and LINES modes.
 * Port of q3dviewer LineItem.
 */
export class LineItem extends THREE.Line {
    lineType: LineType;
    validCount: number = 0;
    capacity: number = 100000;

    constructor(options: LineItemOptions = {}) {
        const lineType = options.lineType ?? 'LINE_STRIP';

        const geometry = new THREE.BufferGeometry();
        const posAttr = new THREE.BufferAttribute(new Float32Array(100000 * 3), 3);
        posAttr.setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute('position', posAttr);
        geometry.setDrawRange(0, 0);

        const material = new THREE.LineBasicMaterial({
            color: options.color ?? 0x00ff00,
            linewidth: options.width ?? 1,
        });

        // Use LineSegments for LINES mode, Line for LINE_STRIP
        super(geometry, material);
        this.lineType = lineType;
        this.frustumCulled = false;
    }

    // Override: if LINES mode, we need LineSegments behavior
    // Three.js Line class draws as LINE_STRIP by default
    // For LINES mode, we swap at construction via static factory

    static create(options: LineItemOptions = {}): LineItem | THREE.LineSegments {
        if (options.lineType === 'LINES') {
            const geometry = new THREE.BufferGeometry();
            const posAttr = new THREE.BufferAttribute(new Float32Array(100000 * 3), 3);
            posAttr.setUsage(THREE.DynamicDrawUsage);
            geometry.setAttribute('position', posAttr);
            geometry.setDrawRange(0, 0);

            const material = new THREE.LineBasicMaterial({
                color: options.color ?? 0x00ff00,
                linewidth: options.width ?? 1,
            });

            const segments = new THREE.LineSegments(geometry, material);
            segments.frustumCulled = false;
            (segments as any)._lineItemValidCount = 0;
            (segments as any)._lineItemCapacity = 100000;
            (segments as any).setData = LineItem.prototype.setData;
            (segments as any).appendData = LineItem.prototype.appendData;
            (segments as any)._ensureCapacity = LineItem.prototype._ensureCapacity;
            return segments;
        }
        return new LineItem(options);
    }

    /**
     * Set line data (replaces all existing data).
     * @param data Float32Array of [x,y,z, x,y,z, ...] vertex positions
     */
    setData(data: Float32Array) {
        const count = data.length / 3;
        this._ensureCapacity(count);

        const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
        posAttr.array.set(data);
        posAttr.needsUpdate = true;

        (this as any).validCount = count;
        (this as any)._lineItemValidCount = count;
        this.geometry.setDrawRange(0, count);
    }

    /**
     * Append points to the existing line.
     */
    appendData(data: Float32Array) {
        const validCount = (this as any).validCount ?? (this as any)._lineItemValidCount ?? 0;
        const newCount = data.length / 3;
        const total = validCount + newCount;
        this._ensureCapacity(total);

        const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
        (posAttr.array as Float32Array).set(data, validCount * 3);
        posAttr.needsUpdate = true;

        (this as any).validCount = total;
        (this as any)._lineItemValidCount = total;
        this.geometry.setDrawRange(0, total);
    }

    private _ensureCapacity(needed: number) {
        const cap = (this as any).capacity ?? (this as any)._lineItemCapacity ?? 100000;
        if (needed > cap) {
            let newCap = cap;
            while (newCap < needed) newCap += 100000;
            const oldAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
            const newArr = new Float32Array(newCap * 3);
            const validCount = (this as any).validCount ?? (this as any)._lineItemValidCount ?? 0;
            newArr.set((oldAttr.array as Float32Array).subarray(0, validCount * 3));
            const newAttr = new THREE.BufferAttribute(newArr, 3);
            newAttr.setUsage(THREE.DynamicDrawUsage);
            this.geometry.setAttribute('position', newAttr);
            (this as any).capacity = newCap;
            (this as any)._lineItemCapacity = newCap;
        }
    }

    setColor(color: number | string) {
        (this.material as THREE.LineBasicMaterial).color.set(color);
    }

    setWidth(width: number) {
        (this.material as THREE.LineBasicMaterial).linewidth = width;
    }
}
