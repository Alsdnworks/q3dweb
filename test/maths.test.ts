import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
    eulerToMatrix3,
    matrixToEuler,
    expSO3,
    logSO3,
    interpolatePose,
    recoverCenterEuler,
    makeT,
} from '../src/utils/maths';

function mat3Close(a: THREE.Matrix3, b: THREE.Matrix3, tol = 1e-6) {
    for (let i = 0; i < 9; i++) {
        expect(Math.abs(a.elements[i] - b.elements[i])).toBeLessThan(tol);
    }
}

describe('maths: euler <-> matrix', () => {
    it('identity at zero', () => {
        const R = eulerToMatrix3(0, 0, 0);
        mat3Close(R, new THREE.Matrix3().identity());
        expect(matrixToEuler(R)).toEqual([0, 0, 0]);
    });

    it('roundtrip for arbitrary euler', () => {
        const cases: Array<[number, number, number]> = [
            [0.1, 0.2, 0.3],
            [-0.5, 1.0, 0.7],
            [Math.PI / 4, Math.PI / 6, -Math.PI / 5],
        ];
        for (const c of cases) {
            const R = eulerToMatrix3(c[0], c[1], c[2]);
            const [r, p, y] = matrixToEuler(R);
            expect(r).toBeCloseTo(c[0], 6);
            expect(p).toBeCloseTo(c[1], 6);
            expect(y).toBeCloseTo(c[2], 6);
        }
    });
});

describe('maths: expSO3 / logSO3', () => {
    it('exp(0) == I', () => {
        const R = expSO3(new THREE.Vector3(0, 0, 0));
        mat3Close(R, new THREE.Matrix3().identity());
    });

    it('log(exp(omega)) == omega for small omega', () => {
        const cases: THREE.Vector3[] = [
            new THREE.Vector3(0.01, 0, 0),
            new THREE.Vector3(0, 0.3, 0),
            new THREE.Vector3(0.1, -0.2, 0.3),
            new THREE.Vector3(0.7, -0.5, 0.3),
        ];
        for (const omega of cases) {
            const R = expSO3(omega);
            const back = logSO3(R);
            expect(back.x).toBeCloseTo(omega.x, 5);
            expect(back.y).toBeCloseTo(omega.y, 5);
            expect(back.z).toBeCloseTo(omega.z, 5);
        }
    });

    it('exp preserves rotation magnitude', () => {
        const omega = new THREE.Vector3(0, 0, Math.PI / 2);
        const R = expSO3(omega);
        const v = new THREE.Vector3(1, 0, 0).applyMatrix3(R);
        expect(v.x).toBeCloseTo(0, 5);
        expect(v.y).toBeCloseTo(1, 5);
    });

    it('logSO3 handles near-pi rotations around each dominant axis', () => {
        const cases = [
            new THREE.Vector3(Math.PI, 0, 0),
            new THREE.Vector3(0, Math.PI, 0),
            new THREE.Vector3(0, 0, Math.PI),
        ];
        for (const omega of cases) {
            const back = logSO3(expSO3(omega));
            expect(back.length()).toBeCloseTo(Math.PI, 5);
            expect(Math.abs(back.dot(omega.clone().normalize()))).toBeCloseTo(Math.PI, 5);
        }
    });
});

describe('maths: interpolatePose', () => {
    it('returns start pose as first frame', () => {
        const T1 = new THREE.Matrix4().identity();
        const T2 = new THREE.Matrix4().makeTranslation(10, 0, 0);
        const Ts = interpolatePose(T1, T2, 2, 0, 0.1);
        expect(Ts.length).toBeGreaterThan(0);
        // s=0 → identity
        for (let i = 0; i < 16; i++) {
            expect(Ts[0].elements[i]).toBeCloseTo(T1.elements[i], 5);
        }
    });

    it('generates enough frames for pure translation', () => {
        const T1 = new THREE.Matrix4().makeTranslation(0, 0, 0);
        const T2 = new THREE.Matrix4().makeTranslation(10, 0, 0);
        const Ts = interpolatePose(T1, T2, 1, 0, 0.1);
        // 10m / 1 m/s / 0.1s = 100 steps (ceil).
        expect(Ts.length).toBe(100);
        // Last frame's translation should be close to but less than 10.
        const e = Ts[Ts.length - 1].elements;
        expect(e[12]).toBeGreaterThan(9.0);
        expect(e[12]).toBeLessThan(10.0);
    });

    it('handles zero-distance gracefully', () => {
        const T1 = new THREE.Matrix4().identity();
        const T2 = new THREE.Matrix4().identity();
        const Ts = interpolatePose(T1, T2, 1, 1, 0.1);
        expect(Ts.length).toBeGreaterThanOrEqual(1);
    });
});

describe('maths: recoverCenterEuler', () => {
    it('inverse of the film-maker camera construction', () => {
        // Build Twc such that the camera orbits around center=(1,2,3) at dist=5 with Euler [π/4,0,0].
        const center = new THREE.Vector3(1, 2, 3);
        const euler: [number, number, number] = [Math.PI / 4, 0.1, 0.2];
        const R = eulerToMatrix3(euler[0], euler[1], euler[2]);
        const offset = new THREE.Vector3(0, 0, 5).applyMatrix3(R);
        const t = center.clone().add(offset);
        const Twc = makeT(R, t);

        const { center: c2, euler: e2 } = recoverCenterEuler(Twc, 5);
        expect(c2.x).toBeCloseTo(center.x, 5);
        expect(c2.y).toBeCloseTo(center.y, 5);
        expect(c2.z).toBeCloseTo(center.z, 5);
        expect(e2[0]).toBeCloseTo(euler[0], 5);
        expect(e2[1]).toBeCloseTo(euler[1], 5);
        expect(e2[2]).toBeCloseTo(euler[2], 5);
    });
});

describe('maths: matrixToEuler singular pitch', () => {
    it('uses the singular branch when pitch is +/-90 degrees', () => {
        const positive = matrixToEuler(eulerToMatrix3(0.4, Math.PI / 2, 1.2));
        expect(positive[1]).toBeCloseTo(Math.PI / 2, 6);
        expect(positive[2]).toBe(0);

        const negative = matrixToEuler(eulerToMatrix3(-0.3, -Math.PI / 2, 0.8));
        expect(negative[1]).toBeCloseTo(-Math.PI / 2, 6);
        expect(negative[2]).toBe(0);
    });
});
