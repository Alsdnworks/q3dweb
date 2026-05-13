import * as THREE from 'three';

export interface MeshItemOptions {
    color?: number | string;
    wireframe?: boolean;
    enableLighting?: boolean;
    ambientStrength?: number;
    diffuseStrength?: number;
    specularStrength?: number;
    shininess?: number;
    alpha?: number;
}

/**
 * 3D triangular mesh with Phong lighting.
 * Port of q3dviewer MeshItem.
 * 
 * Supports:
 * - Standard triangle mesh (Nx3 vertex array, every 3 vertices = 1 triangle)
 * - Phong lighting (ambient + diffuse + specular, two-sided)
 * - Wireframe mode
 */
export class MeshItem extends THREE.Mesh {
    private meshColor: THREE.Color;
    private meshOptions: Required<MeshItemOptions>;

    constructor(options: MeshItemOptions = {}) {
        const geometry = new THREE.BufferGeometry();

        const opts: Required<MeshItemOptions> = {
            color: options.color ?? 0x87ceeb, // lightblue
            wireframe: options.wireframe ?? false,
            enableLighting: options.enableLighting ?? true,
            ambientStrength: options.ambientStrength ?? 0.1,
            diffuseStrength: options.diffuseStrength ?? 1.2,
            specularStrength: options.specularStrength ?? 0.1,
            shininess: options.shininess ?? 32.0,
            alpha: options.alpha ?? 1.0,
        };

        const meshColor = new THREE.Color(opts.color);

        const material = new MeshPhongCustomMaterial({
            color: meshColor,
            wireframe: opts.wireframe,
            enableLighting: opts.enableLighting,
            ambientStrength: opts.ambientStrength,
            diffuseStrength: opts.diffuseStrength,
            specularStrength: opts.specularStrength,
            shininess: opts.shininess,
            alpha: opts.alpha,
        });

        super(geometry, material);
        this.meshColor = meshColor;
        this.meshOptions = opts;
        this.frustumCulled = false;
    }

    /**
     * Set mesh data.
     * @param vertices Float32Array of [x,y,z,...] — every 3 consecutive vertices form a triangle.
     */
    setData(vertices: Float32Array) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.computeVertexNormals();

        this.geometry.dispose();
        this.geometry = geometry;
    }

    /**
     * Set mesh data from vertices and face indices.
     */
    setIndexedData(vertices: Float32Array, indices: Uint32Array) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();

        this.geometry.dispose();
        this.geometry = geometry;
    }

    setColor(color: number | string) {
        this.meshColor.set(color);
        const mat = this.material as MeshPhongCustomMaterial;
        mat.uniforms.meshColor.value.copy(this.meshColor);
    }

    setWireframe(enabled: boolean) {
        this.meshOptions.wireframe = enabled;
        (this.material as MeshPhongCustomMaterial).wireframe = enabled;
    }

    setAlpha(alpha: number) {
        this.meshOptions.alpha = alpha;
        (this.material as MeshPhongCustomMaterial).uniforms.alpha.value = alpha;
    }

    setLighting(enabled: boolean) {
        (this.material as MeshPhongCustomMaterial).uniforms.enableLighting.value = enabled ? 1 : 0;
    }
}

interface PhongMaterialParams {
    color: THREE.Color;
    wireframe: boolean;
    enableLighting: boolean;
    ambientStrength: number;
    diffuseStrength: number;
    specularStrength: number;
    shininess: number;
    alpha: number;
}

class MeshPhongCustomMaterial extends THREE.ShaderMaterial {
    constructor(params: PhongMaterialParams) {
        const uniforms = {
            meshColor: { value: params.color.clone() },
            enableLighting: { value: params.enableLighting ? 1 : 0 },
            ambientStrength: { value: params.ambientStrength },
            diffuseStrength: { value: params.diffuseStrength },
            specularStrength: { value: params.specularStrength },
            shininess: { value: params.shininess },
            alpha: { value: params.alpha },
            lightDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
            lightColor: { value: new THREE.Color(1, 1, 1) },
        };

        const vertexShader = `
            varying vec3 vNormal;
            varying vec3 vPosition;

            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec4 worldPos = modelViewMatrix * vec4(position, 1.0);
                vPosition = worldPos.xyz;
                gl_Position = projectionMatrix * worldPos;
            }
        `;

        const fragmentShader = `
            varying vec3 vNormal;
            varying vec3 vPosition;

            uniform vec3 meshColor;
            uniform int enableLighting;
            uniform float ambientStrength;
            uniform float diffuseStrength;
            uniform float specularStrength;
            uniform float shininess;
            uniform float alpha;
            uniform vec3 lightDir;
            uniform vec3 lightColor;

            void main() {
                if (enableLighting == 1) {
                    vec3 norm = normalize(vNormal);

                    // Ambient
                    vec3 ambient = ambientStrength * lightColor;

                    // Two-sided diffuse
                    float diff = max(abs(dot(norm, lightDir)), 0.0);
                    vec3 diffuse = diffuseStrength * diff * lightColor;

                    // Two-sided specular (Phong)
                    vec3 viewDir = normalize(-vPosition);
                    vec3 reflectDir = reflect(-lightDir, norm);
                    float spec = pow(max(abs(dot(viewDir, reflectDir)), 0.0), shininess);
                    vec3 specular = specularStrength * spec * lightColor;

                    vec3 result = (ambient + diffuse + specular) * meshColor;
                    gl_FragColor = vec4(result, alpha);
                } else {
                    gl_FragColor = vec4(meshColor, alpha);
                }
            }
        `;

        super({
            uniforms,
            vertexShader,
            fragmentShader,
            transparent: params.alpha < 1.0,
            depthTest: true,
            depthWrite: true,
            side: THREE.DoubleSide,
            wireframe: params.wireframe,
        });
    }
}
