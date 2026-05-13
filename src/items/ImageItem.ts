export interface ImageItemOptions {
    pos?: [number, number];    // bottom-left position in pixels
    size?: [number, number];   // [width, height] in pixels
    alpha?: number;
}

/**
 * Screen-space 2D image overlay using HTML/CSS.
 * Port of q3dviewer ImageItem.
 */
export class ImageItem {
    private element: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private _alpha: number;
    private _visible: boolean = true;

    constructor(container: HTMLElement, options: ImageItemOptions = {}) {
        const [w, h] = options.size ?? [640, 360];
        this._alpha = options.alpha ?? 1.0;

        this.element = document.createElement('canvas');
        this.element.width = w;
        this.element.height = h;
        this.element.style.position = 'absolute';
        this.element.style.pointerEvents = 'none';
        this.element.style.zIndex = '998';
        this.element.style.opacity = String(this._alpha);

        const [x, y] = options.pos ?? [0, 0];
        this.element.style.left = x + 'px';
        this.element.style.bottom = y + 'px';

        this.ctx = this.element.getContext('2d')!;
        container.appendChild(this.element);
    }

    /**
     * Set image data from an ImageData, Image, Canvas, or ImageBitmap.
     */
    setData(image: HTMLImageElement | HTMLCanvasElement | ImageBitmap | ImageData) {
        if (image instanceof ImageData) {
            this.element.width = image.width;
            this.element.height = image.height;
            this.ctx.putImageData(image, 0, 0);
        } else {
            this.element.width = image.width;
            this.element.height = image.height;
            this.ctx.drawImage(image, 0, 0);
        }
    }

    /**
     * Set image from raw RGBA Uint8Array data.
     */
    setRawData(data: Uint8Array | Uint8ClampedArray, width: number, height: number) {
        this.element.width = width;
        this.element.height = height;
        const imageData = new ImageData(new Uint8ClampedArray(data), width, height);
        this.ctx.putImageData(imageData, 0, 0);
    }

    setAlpha(alpha: number) {
        this._alpha = alpha;
        this.element.style.opacity = String(alpha);
    }

    setPosition(x: number, y: number) {
        this.element.style.left = x + 'px';
        this.element.style.bottom = y + 'px';
    }

    show() {
        this._visible = true;
        this.element.style.display = '';
    }

    hide() {
        this._visible = false;
        this.element.style.display = 'none';
    }

    get visible(): boolean {
        return this._visible;
    }

    dispose() {
        this.element.remove();
    }
}
