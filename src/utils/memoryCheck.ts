/**
 * Memory budget estimation for point cloud loading.
 *
 * Large PCD/PLY/LAS/LAZ/E57 files are accumulated into a single contiguous
 * Uint8Array before parsing, and the parsed output (Float32 positions,
 * Uint8 colors, Float32 intensities) also lives in memory at the same time.
 * Loading a file that is too large for the current JS heap causes the tab
 * to OOM and die silently. This module estimates the peak memory requirement
 * and decides whether to proceed / warn / refuse.
 */

export type MemoryCheckResult = {
    /** Whether the caller should proceed with loading. */
    proceed: boolean;
    /** Human-readable message that was (or would be) shown to the user. */
    message: string;
    /** Estimated peak memory in bytes. */
    estimatedBytes: number;
    /** Detected heap limit in bytes (0 if unknown). */
    heapLimitBytes: number;
    /** Severity level. */
    level: 'ok' | 'warn' | 'block';
};

/**
 * Per-format expansion factor applied to the raw file size to estimate the
 * peak resident memory footprint (raw buffer + parsed typed arrays).
 *
 * These are deliberately conservative; it is better to over-estimate than to
 * let the tab OOM.
 */
const FORMAT_EXPANSION_FACTOR: Record<string, number> = {
    pcd: 2.0,   // binary PCD: raw + float32 pos + u8 rgb + f32 intensity
    ply: 2.5,   // similar to PCD but parsing keeps intermediate string buffers
    las: 2.5,   // raw + parsed float32 pos + colors/intensity
    laz: 8.0,   // LAZ decompresses ~5-10x the compressed size
    e57: 3.0,   // e57 WASM keeps raw + decoded float64 then float32
    unknown: 3.0,
};

/**
 * Return `performance.memory.jsHeapSizeLimit` when available (Chromium),
 * otherwise fall back to a heuristic based on `navigator.deviceMemory`,
 * otherwise assume a conservative 2 GiB.
 */
export function detectHeapLimit(): number {
    const perf = (globalThis as any).performance;
    if (perf && perf.memory && typeof perf.memory.jsHeapSizeLimit === 'number' && perf.memory.jsHeapSizeLimit > 0) {
        return perf.memory.jsHeapSizeLimit as number;
    }
    const nav = (globalThis as any).navigator;
    if (nav && typeof nav.deviceMemory === 'number' && nav.deviceMemory > 0) {
        // deviceMemory is in GiB; assume ~50% is usable by a single tab.
        return Math.floor(nav.deviceMemory * 1024 * 1024 * 1024 * 0.5);
    }
    // Conservative fallback: 2 GiB.
    return 2 * 1024 * 1024 * 1024;
}

/**
 * Currently used JS heap, when available. Returns 0 when unknown.
 */
export function detectHeapUsed(): number {
    const perf = (globalThis as any).performance;
    if (perf && perf.memory && typeof perf.memory.usedJSHeapSize === 'number') {
        return perf.memory.usedJSHeapSize as number;
    }
    return 0;
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KiB', 'MiB', 'GiB', 'TiB'];
    let v = bytes / 1024;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

/**
 * Estimate peak memory requirement for loading a file of the given
 * size/format, and classify the risk against the detected heap limit.
 *
 * Thresholds:
 *   estimate < 60% of limit  -> 'ok'   (proceed silently)
 *   60% <= estimate < 90%    -> 'warn' (user confirmation recommended)
 *   estimate >= 90%          -> 'block' (hard block by default)
 */
export function estimateMemoryRequirement(
    fileSize: number,
    format: string,
    heapLimit: number = detectHeapLimit(),
    heapUsed: number = detectHeapUsed(),
): MemoryCheckResult {
    const factor = FORMAT_EXPANSION_FACTOR[format] ?? FORMAT_EXPANSION_FACTOR.unknown;
    const estimatedBytes = Math.ceil(fileSize * factor);
    const available = Math.max(heapLimit - heapUsed, 0);
    const budget = available > 0 ? available : heapLimit;

    let level: MemoryCheckResult['level'] = 'ok';
    if (budget > 0) {
        const ratio = estimatedBytes / budget;
        if (ratio >= 0.9) level = 'block';
        else if (ratio >= 0.6) level = 'warn';
    }

    const message =
        `Estimated memory to load this ${format.toUpperCase()} file: ` +
        `${formatBytes(estimatedBytes)} (raw ${formatBytes(fileSize)} x ${factor}). ` +
        `Available JS heap: ${formatBytes(budget)}` +
        (heapLimit > 0 ? ` (limit ${formatBytes(heapLimit)})` : '') + '.';

    return {
        proceed: level !== 'block',
        message,
        estimatedBytes,
        heapLimitBytes: heapLimit,
        level,
    };
}
