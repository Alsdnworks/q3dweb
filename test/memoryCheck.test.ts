import { describe, it, expect } from 'vitest';
import {
    estimateMemoryRequirement,
    detectHeapLimit,
    detectHeapUsed,
    formatBytes,
} from '../src/utils/memoryCheck';

describe('memoryCheck', () => {
    describe('formatBytes', () => {
        it('formats bytes under 1 KiB', () => {
            expect(formatBytes(0)).toBe('0 B');
            expect(formatBytes(512)).toBe('512 B');
        });
        it('formats KiB/MiB/GiB', () => {
            expect(formatBytes(2048)).toBe('2.00 KiB');
            expect(formatBytes(5 * 1024 * 1024)).toBe('5.00 MiB');
            expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.00 GiB');
        });
        it('uses one decimal for >= 10', () => {
            expect(formatBytes(20 * 1024)).toBe('20.0 KiB');
        });
    });

    describe('detectHeapLimit / detectHeapUsed', () => {
        it('returns a positive heap limit', () => {
            expect(detectHeapLimit()).toBeGreaterThan(0);
        });
        it('uses navigator.deviceMemory when performance.memory is unavailable', () => {
            const perf = (globalThis as any).performance;
            const nav = (globalThis as any).navigator;
            const memoryDescriptor = Object.getOwnPropertyDescriptor(perf, 'memory');
            const deviceMemoryDescriptor = Object.getOwnPropertyDescriptor(nav, 'deviceMemory');
            Object.defineProperty(perf, 'memory', { value: undefined, configurable: true });
            Object.defineProperty(nav, 'deviceMemory', { value: 4, configurable: true });
            try {
                expect(detectHeapLimit()).toBe(2 * 1024 * 1024 * 1024);
            } finally {
                if (memoryDescriptor) Object.defineProperty(perf, 'memory', memoryDescriptor);
                else delete perf.memory;
                if (deviceMemoryDescriptor) Object.defineProperty(nav, 'deviceMemory', deviceMemoryDescriptor);
                else delete nav.deviceMemory;
            }
        });
        it('heap used is non-negative', () => {
            expect(detectHeapUsed()).toBeGreaterThanOrEqual(0);
        });
    });

    describe('estimateMemoryRequirement', () => {
        const HEAP_4G = 4 * 1024 * 1024 * 1024;

        it('returns ok for a small PCD', () => {
            const r = estimateMemoryRequirement(10 * 1024 * 1024, 'pcd', HEAP_4G, 0);
            expect(r.level).toBe('ok');
            expect(r.proceed).toBe(true);
            expect(r.estimatedBytes).toBe(Math.ceil(10 * 1024 * 1024 * 2.0));
        });

        it('applies a larger expansion factor for LAZ', () => {
            const r = estimateMemoryRequirement(100 * 1024 * 1024, 'laz', HEAP_4G, 0);
            expect(r.estimatedBytes).toBe(Math.ceil(100 * 1024 * 1024 * 8.0));
        });

        it('marks warn between 60% and 90% of the budget', () => {
            // budget = 1 GiB, want ratio ~0.7 with pcd factor 2.0 -> fileSize ~360 MiB
            const heap = 1024 * 1024 * 1024;
            const fileSize = Math.floor((heap * 0.7) / 2.0);
            const r = estimateMemoryRequirement(fileSize, 'pcd', heap, 0);
            expect(r.level).toBe('warn');
            expect(r.proceed).toBe(true);
        });

        it('marks block at >= 90% of the budget', () => {
            const heap = 1024 * 1024 * 1024;
            const fileSize = Math.floor((heap * 0.95) / 2.0);
            const r = estimateMemoryRequirement(fileSize, 'pcd', heap, 0);
            expect(r.level).toBe('block');
            expect(r.proceed).toBe(false);
        });

        it('accounts for already-used heap', () => {
            const heap = 1024 * 1024 * 1024;
            const used = 900 * 1024 * 1024; // only ~124 MiB free
            // 100 MiB pcd -> 200 MiB estimate, exceeds available -> block
            const r = estimateMemoryRequirement(100 * 1024 * 1024, 'pcd', heap, used);
            expect(r.level).toBe('block');
            expect(r.proceed).toBe(false);
        });

        it('falls back to the unknown factor for unrecognised formats', () => {
            const r = estimateMemoryRequirement(50 * 1024 * 1024, 'xyz', HEAP_4G, 0);
            expect(r.estimatedBytes).toBe(Math.ceil(50 * 1024 * 1024 * 3.0));
        });

        it('includes file size and factor in the message', () => {
            const r = estimateMemoryRequirement(1024 * 1024, 'las', HEAP_4G, 0);
            expect(r.message).toMatch(/LAS/);
            expect(r.message).toMatch(/x 2\.5/);
        });
    });
});
