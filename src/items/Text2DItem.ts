export interface Text2DItemOptions {
    text?: string;
    pos?: [number, number];
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    /** Which corner `pos` is measured from. Default 'top-left'. */
    anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    /** Optional background (e.g., 'rgba(0,0,0,0.6)'). */
    background?: string;
    /** CSS padding (e.g., '6px 10px'). Applied only when background set. */
    padding?: string;
}

/**
 * 2D screen-space text overlay using HTML/CSS.
 * Port of q3dviewer Text2DItem (QPainter-based).
 */
export class Text2DItem {
    private element: HTMLDivElement;
    private _visible: boolean = true;

    constructor(container: HTMLElement, options: Text2DItemOptions = {}) {
        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.style.pointerEvents = 'none';
        this.element.style.userSelect = 'none';
        this.element.style.zIndex = '999';
        this.element.style.fontFamily = options.fontFamily ?? 'Helvetica, sans-serif';
        this.element.style.fontSize = (options.fontSize ?? 16) + 'px';
        this.element.style.color = options.color ?? 'white';
        this.element.style.whiteSpace = 'pre';
        if (options.background) {
            this.element.style.background = options.background;
            this.element.style.padding = options.padding ?? '6px 10px';
            this.element.style.borderRadius = '4px';
        }

        const [x, y] = options.pos ?? [20, 50];
        const anchor = options.anchor ?? 'top-left';
        if (anchor === 'top-right' || anchor === 'bottom-right') {
            this.element.style.right = x + 'px';
        } else {
            this.element.style.left = x + 'px';
        }
        if (anchor === 'bottom-left' || anchor === 'bottom-right') {
            this.element.style.bottom = y + 'px';
        } else {
            this.element.style.top = y + 'px';
        }

        this.element.textContent = options.text ?? '';

        container.appendChild(this.element);
    }

    setText(text: string) {
        this.element.textContent = text;
    }

    /** Set raw HTML content (e.g., multiline with <br>). Use with trusted input only. */
    setHTML(html: string) {
        this.element.innerHTML = html;
    }

    setPosition(x: number, y: number) {
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
    }

    setColor(color: string) {
        this.element.style.color = color;
    }

    setFontSize(size: number) {
        this.element.style.fontSize = size + 'px';
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
