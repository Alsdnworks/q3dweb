import * as THREE from 'three';

export interface GridItemOptions {
    size?: number;
    spacing?: number;
    color?: number | string;
    opacity?: number;
    offset?: [number, number, number];
}

/**
 * XY plane grid.
 * Port of q3dviewer GridItem.
 */
export class GridItem extends THREE.LineSegments {
    private gridSize: number;
    private gridSpacing: number;
    private gridOffset: [number, number, number];
    renderCb: (() => void) | null = null;

    constructor(options: GridItemOptions = {}) {
        const size = options.size ?? 100;
        const spacing = options.spacing ?? 20;
        const offset: [number, number, number] = options.offset ?? [0, 0, 0];
        const opacity = options.opacity ?? 0.25;

        const geometry = GridItem.buildGeometry(size, spacing, offset);

        const material = new THREE.LineBasicMaterial({
            color: options.color ?? 0xffffff,
            transparent: opacity < 1.0,
            opacity: opacity,
        });

        super(geometry, material);
        this.gridSize = size;
        this.gridSpacing = spacing;
        this.gridOffset = offset;
    }

    private static buildGeometry(size: number, spacing: number, offset: [number, number, number]): THREE.BufferGeometry {
        const [ox, oy, oz] = offset;
        const half = size / 2;
        const vertices: number[] = [];

        for (let i = -half; i <= half + 0.001; i += spacing) {
            // Lines parallel to Y axis
            vertices.push(i + ox, -half + oy, oz, i + ox, half + oy, oz);
            // Lines parallel to X axis
            vertices.push(-half + ox, i + oy, oz, half + ox, i + oy, oz);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        return geometry;
    }

    setSize(size: number) {
        if (size <= 0) return;
        this.gridSize = size;
        this.rebuild();
    }

    setSpacing(spacing: number) {
        if (spacing > 0) {
            this.gridSpacing = spacing;
            this.rebuild();
        }
    }

    setOffset(offset: [number, number, number]) {
        this.gridOffset = offset;
        this.rebuild();
    }

    addSetting(container: HTMLElement): void {
        const mkLabel = (text: string) => {
            const el = document.createElement('div');
            el.textContent = text;
            el.style.cssText = 'font-size:11px;color:#bbb;margin:4px 0 2px 0;';
            container.appendChild(el);
        };
        const mkNumber = (val: number, min: number, max: number, step: number, cb: (v: number) => void) => {
            const el = document.createElement('input');
            el.type = 'number';
            el.value = String(val);
            el.min = String(min);
            el.max = String(max);
            el.step = String(step);
            el.style.cssText = 'width:100%;box-sizing:border-box;background:#333;color:#eee;border:1px solid #555;padding:3px 6px;border-radius:3px;margin-bottom:4px;font-family:monospace;font-size:11px;';
            el.onchange = () => {
                const v = parseFloat(el.value);
                if (!isNaN(v)) cb(v);
            };
            container.appendChild(el);
        };

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;margin:6px 0;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = this.visible;
        cb.onchange = () => {
            this.visible = cb.checked;
            this.renderCb?.();
        };
        const txt = document.createElement('label');
        txt.textContent = 'Show Grid';
        txt.style.marginLeft = '6px';
        row.appendChild(cb);
        row.appendChild(txt);
        container.appendChild(row);

        mkLabel('Spacing:');
        mkNumber(this.gridSpacing, 0.1, 100000, 0.1, (v) => this.setSpacing(v));
    }

    private rebuild() {
        this.geometry.dispose();
        this.geometry = GridItem.buildGeometry(this.gridSize, this.gridSpacing, this.gridOffset);
        this.renderCb?.();
    }
}
