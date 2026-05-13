/**
 * LAS VLR parser — extracts CRS info (GeoKeys + WKT).
 * Returns EPSG code and/or WKT string if present.
 */

export interface LASGeoInfo {
    epsg?: number;
    wkt?: string;
    asciiParams?: string;
}

/** Parse LAS header + VLRs. Returns georeference info if any. */
export function parseLASGeoInfo(data: Uint8Array): LASGeoInfo | null {
    if (data.byteLength < 227) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    const magic = String.fromCharCode(
        view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (magic !== 'LASF') return null;

    const headerSize = view.getUint16(94, true);
    const numVLRs = view.getUint32(100, true);
    if (numVLRs === 0) return null;

    const result: LASGeoInfo = {};
    let offset = headerSize;

    for (let i = 0; i < numVLRs; i++) {
        if (offset + 54 > data.byteLength) break;
        const recordID = view.getUint16(offset + 18, true);
        const recordLen = view.getUint16(offset + 20, true);
        const bodyOff = offset + 54;

        if (bodyOff + recordLen > data.byteLength) break;

        if (recordID === 34735) {
            // GeoKeyDirectoryTag
            const numKeys = view.getUint16(bodyOff + 6, true);
            for (let k = 0; k < numKeys; k++) {
                const keyBase = bodyOff + 8 + k * 8;
                if (keyBase + 8 > data.byteLength) break;
                const keyID = view.getUint16(keyBase, true);
                const tiffLoc = view.getUint16(keyBase + 2, true);
                const valueOffset = view.getUint16(keyBase + 6, true);
                // 3072 = ProjectedCSTypeGeoKey, 2048 = GeographicTypeGeoKey
                if ((keyID === 3072 || keyID === 2048) && tiffLoc === 0 && valueOffset > 0) {
                    result.epsg = valueOffset;
                }
            }
        } else if (recordID === 34737) {
            // GeoAsciiParamsTag
            const bytes = new Uint8Array(data.buffer, data.byteOffset + bodyOff, recordLen);
            const nul = bytes.indexOf(0);
            result.asciiParams = new TextDecoder('ascii').decode(
                nul >= 0 ? bytes.subarray(0, nul) : bytes);
        } else if (recordID === 2111 || recordID === 2112) {
            // OGC_MATH_TRANSFORM_WKT or OGC_COORDINATE_SYSTEM_WKT
            const bytes = new Uint8Array(data.buffer, data.byteOffset + bodyOff, recordLen);
            const nul = bytes.indexOf(0);
            result.wkt = new TextDecoder('utf-8').decode(
                nul >= 0 ? bytes.subarray(0, nul) : bytes);
        }

        offset = bodyOff + recordLen;
    }

    return (result.epsg !== undefined || result.wkt) ? result : null;
}

/** Read min/max X/Y/Z from LAS header (bytes 179-227, LAS 1.2+). */
export function readLASBounds(data: Uint8Array): {
    minX: number; maxX: number;
    minY: number; maxY: number;
    minZ: number; maxZ: number;
} | null {
    if (data.byteLength < 227) return null;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    return {
        maxX: view.getFloat64(179, true),
        minX: view.getFloat64(187, true),
        maxY: view.getFloat64(195, true),
        minY: view.getFloat64(203, true),
        maxZ: view.getFloat64(211, true),
        minZ: view.getFloat64(219, true),
    };
}
