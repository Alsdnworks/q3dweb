import * as THREE from 'three';

function colorModeToUniformValue(colorMode?: 'FLAT' | 'I' | 'RGB'): number {
    switch (colorMode) {
        case 'RGB':
            return 1;
        case 'FLAT':
            return 2;
        case 'I':
        default:
            return 0;
    }
}

function pointTypeToUniformValue(pointType?: 'PIXEL' | 'SQUARE' | 'SPHERE'): number {
    switch (pointType) {
        case 'SQUARE':
            return 1;
        case 'SPHERE':
            return 2;
        case 'PIXEL':
        default:
            return 0;
    }
}

export interface CloudItemOptions {
    size?: number;
    alpha?: number;
    colorMode?: 'FLAT' | 'I' | 'RGB';
    color?: string;
    pointType?: 'PIXEL' | 'SQUARE' | 'SPHERE';
}

export class CloudItem extends THREE.Points {
    constructor(positions: Float32Array, values: Float32Array, options: CloudItemOptions = {}, rgbColors?: Float32Array | Uint8Array) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('value', new THREE.BufferAttribute(values, 1));

        if (rgbColors) {
            const normalized = (rgbColors instanceof Uint8Array || rgbColors instanceof Uint8ClampedArray);
            geometry.setAttribute('color', new THREE.BufferAttribute(rgbColors, 3, normalized));
            options.colorMode = 'RGB';
        } else {
            geometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(positions.length), 3, true));
        }

        const material = new CloudShaderMaterial(options);

        super(geometry, material);
        this.frustumCulled = false; // often necessary for custom shaders or dynamic bounds
    }
}

export class CloudShaderMaterial extends THREE.ShaderMaterial {
    constructor(options: CloudItemOptions) {
        const uniforms = {
            pointSize: { value: options.size || 1.0 },
            alpha: { value: options.alpha !== undefined ? options.alpha : 1.0 },
            vmin: { value: 0.0 },
            vmax: { value: 255.0 },
            colorMode: { value: colorModeToUniformValue(options.colorMode) },
            flatColor: { value: new THREE.Color(options.color || 'white') },
            pointType: { value: pointTypeToUniformValue(options.pointType) },
        };

        const vertexShader = `
            attribute float value;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float vmin;
            uniform float vmax;
            uniform float pointSize;
            uniform float colorMode;
            uniform vec3 flatColor;

            vec3 getRainbowColor(float value_raw) {
                float range = vmax - vmin;
                float val = (value_raw - vmin) / range;
                val = clamp(val, 0.0, 1.0);

                float h = val * 0.6666; 
                float s = 1.0; 
                float v = 1.0;

                vec3 c = vec3(h, s, v);
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }

            void main() {
                vec3 rainbowColor = getRainbowColor(value);
                float rgbWeight = 1.0 - step(0.5, abs(colorMode - 1.0));
                float flatWeight = step(1.5, colorMode);
                vec3 mixedColor = mix(rainbowColor, color, rgbWeight);
                vColor = mix(mixedColor, flatColor, flatWeight);

                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                gl_PointSize = pointSize;
            }
        `;

        const fragmentShader = `
            varying vec3 vColor;
            uniform float alpha;
            uniform float pointType;

            void main() {
                vec2 coord = gl_PointCoord * 2.0 - 1.0;
                float sphereEnabled = step(1.5, pointType);
                float insideSphere = 1.0 - step(1.0, dot(coord, coord));
                float pointAlpha = alpha * mix(1.0, insideSphere, sphereEnabled);
                gl_FragColor = vec4(vColor, pointAlpha);
            }
        `;

        super({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            depthTest: true,
            depthWrite: false, // usually better for transparent points
        });
    }
}
