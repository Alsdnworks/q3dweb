import { describe, it, expect } from 'vitest';
import { parseLASGeoInfo, readLASBounds } from '../src/utils/lasGeo';

function buildLASHeader(opts: {
    hasVLR?: boolean;
    vlrRecordID?: number;
    vlrBody?: Uint8Array;
    bounds?: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    truncate?: number; // byteLength to truncate to (for negative tests)
    skipMagic?: boolean;
} = {}): Uint8Array {
    const headerSize = 227;
    const vlrHeaderLen = 54;
    const vlrBodyLen = opts.vlrBody ? opts.vlrBody.byteLength : 0;
    const total = headerSize + (opts.hasVLR ? vlrHeaderLen + vlrBodyLen : 0);
    const buf = new Uint8Array(total);
    const dv = new DataView(buf.buffer);
    if (!opts.skipMagic) {
        buf[0] = 0x4C; buf[1] = 0x41; buf[2] = 0x53; buf[3] = 0x46; // 'LASF'
    }
    dv.setUint16(94, headerSize, true); // header_size
    dv.setUint32(100, opts.hasVLR ? 1 : 0, true); // num_vlrs
    if (opts.bounds) {
        dv.setFloat64(179, opts.bounds.maxX, true);
        dv.setFloat64(187, opts.bounds.minX, true);
        dv.setFloat64(195, opts.bounds.maxY, true);
        dv.setFloat64(203, opts.bounds.minY, true);
        dv.setFloat64(211, opts.bounds.maxZ, true);
        dv.setFloat64(219, opts.bounds.minZ, true);
    }
    if (opts.hasVLR) {
        const vlrOff = headerSize;
        dv.setUint16(vlrOff + 18, opts.vlrRecordID ?? 34735, true); // record_id
        dv.setUint16(vlrOff + 20, vlrBodyLen, true);                 // record_len
        if (opts.vlrBody) buf.set(opts.vlrBody, vlrOff + 54);
    }
    if (opts.truncate !== undefined) return buf.subarray(0, opts.truncate);
    return buf;
}

describe('lasGeo.parseLASGeoInfo', () => {
    it('returns null when data too short', () => {
        expect(parseLASGeoInfo(new Uint8Array(10))).toBeNull();
    });

    it('returns null on bad magic', () => {
        const b = buildLASHeader({ skipMagic: true });
        expect(parseLASGeoInfo(b)).toBeNull();
    });

    it('returns null when no VLRs', () => {
        const b = buildLASHeader({ hasVLR: false });
        expect(parseLASGeoInfo(b)).toBeNull();
    });

    it('parses EPSG from GeoKeyDirectoryTag (ProjectedCSType)', () => {
        // GeoKey structure: [KeyDirVer, KeyRev, MinorRev, NumKeys] + numKeys * [KeyID, TIFFTagLoc, Count, ValueOffset]
        const body = new Uint8Array(8 + 8);
        const dv = new DataView(body.buffer);
        dv.setUint16(0, 1, true); // ver
        dv.setUint16(2, 1, true); // rev
        dv.setUint16(4, 0, true); // minor
        dv.setUint16(6, 1, true); // numKeys
        dv.setUint16(8, 3072, true);  // ProjectedCSTypeGeoKey
        dv.setUint16(10, 0, true);    // tiffLoc = 0 => embedded
        dv.setUint16(12, 1, true);    // count
        dv.setUint16(14, 6672, true); // epsg
        const lasData = buildLASHeader({ hasVLR: true, vlrRecordID: 34735, vlrBody: body });
        const info = parseLASGeoInfo(lasData);
        expect(info?.epsg).toBe(6672);
    });

    it('parses EPSG from GeographicTypeGeoKey (keyID 2048)', () => {
        const body = new Uint8Array(16);
        const dv = new DataView(body.buffer);
        dv.setUint16(6, 1, true);
        dv.setUint16(8, 2048, true);  // GeographicTypeGeoKey
        dv.setUint16(12, 1, true);
        dv.setUint16(14, 6668, true);
        const lasData = buildLASHeader({ hasVLR: true, vlrRecordID: 34735, vlrBody: body });
        expect(parseLASGeoInfo(lasData)?.epsg).toBe(6668);
    });

    it('ignores GeoKey with tiffLoc != 0', () => {
        const body = new Uint8Array(16);
        const dv = new DataView(body.buffer);
        dv.setUint16(6, 1, true);
        dv.setUint16(8, 3072, true);
        dv.setUint16(10, 34737, true); // tiffLoc != 0 => indirect
        dv.setUint16(14, 6672, true);
        const lasData = buildLASHeader({ hasVLR: true, vlrRecordID: 34735, vlrBody: body });
        expect(parseLASGeoInfo(lasData)).toBeNull();
    });

    it('parses GeoAsciiParamsTag (34737) with null terminator', () => {
        const ascii = 'JGD2011 / Japan PR IV\0';
        const body = new TextEncoder().encode(ascii);
        const lasData = buildLASHeader({ hasVLR: true, vlrRecordID: 34737, vlrBody: body });
        const info = parseLASGeoInfo(lasData);
        // No EPSG from ascii alone, so returns null
        expect(info).toBeNull();
    });

    it('parses WKT VLR (recordID 2112) and returns it alongside no EPSG', () => {
        const wkt = 'PROJCS["test",GEOGCS["wgs84"]]\0';
        const body = new TextEncoder().encode(wkt);
        const lasData = buildLASHeader({ hasVLR: true, vlrRecordID: 2112, vlrBody: body });
        const info = parseLASGeoInfo(lasData);
        expect(info?.wkt).toContain('PROJCS');
    });

    it('parses WKT VLR (recordID 2111)', () => {
        const wkt = 'GEOGCS["wgs"]\0\0';
        const body = new TextEncoder().encode(wkt);
        const lasData = buildLASHeader({ hasVLR: true, vlrRecordID: 2111, vlrBody: body });
        expect(parseLASGeoInfo(lasData)?.wkt).toContain('GEOGCS');
    });

    it('handles WKT without null terminator', () => {
        const wkt = 'GEOGCS["nonul"]';
        const body = new TextEncoder().encode(wkt);
        const lasData = buildLASHeader({ hasVLR: true, vlrRecordID: 2112, vlrBody: body });
        expect(parseLASGeoInfo(lasData)?.wkt).toBe('GEOGCS["nonul"]');
    });

    it('handles GeoAsciiParams without null terminator', () => {
        const ascii = 'no-null-ascii';
        const body = new TextEncoder().encode(ascii);
        // Combine with GeoKey so result is non-null
        const geoKeyBody = new Uint8Array(16);
        const dv = new DataView(geoKeyBody.buffer);
        dv.setUint16(6, 1, true);
        dv.setUint16(8, 3072, true);
        dv.setUint16(14, 6672, true);

        // Combined VLR sequence: 2 VLRs (GeoKey + AsciiParams)
        const headerSize = 227;
        const vlrHdr = 54;
        const total = headerSize + (vlrHdr + geoKeyBody.byteLength) + (vlrHdr + body.byteLength);
        const buf = new Uint8Array(total);
        const dv2 = new DataView(buf.buffer);
        buf[0] = 0x4C; buf[1] = 0x41; buf[2] = 0x53; buf[3] = 0x46;
        dv2.setUint16(94, headerSize, true);
        dv2.setUint32(100, 2, true);
        // VLR 0: GeoKey
        dv2.setUint16(headerSize + 18, 34735, true);
        dv2.setUint16(headerSize + 20, geoKeyBody.byteLength, true);
        buf.set(geoKeyBody, headerSize + vlrHdr);
        // VLR 1: ascii params (no null)
        const vlr1Off = headerSize + vlrHdr + geoKeyBody.byteLength;
        dv2.setUint16(vlr1Off + 18, 34737, true);
        dv2.setUint16(vlr1Off + 20, body.byteLength, true);
        buf.set(body, vlr1Off + vlrHdr);

        const info = parseLASGeoInfo(buf);
        expect(info?.asciiParams).toBe(ascii);
        expect(info?.epsg).toBe(6672);
    });

    it('stops gracefully when VLR body exceeds buffer', () => {
        const buf = new Uint8Array(227 + 54 + 4);
        buf[0] = 0x4C; buf[1] = 0x41; buf[2] = 0x53; buf[3] = 0x46;
        const dv = new DataView(buf.buffer);
        dv.setUint16(94, 227, true);
        dv.setUint32(100, 1, true);
        dv.setUint16(227 + 18, 34737, true);
        dv.setUint16(227 + 20, 1000, true); // lie about length
        expect(parseLASGeoInfo(buf)).toBeNull();
    });

    it('stops gracefully when VLR header itself is truncated', () => {
        const buf = new Uint8Array(227 + 10);
        buf[0] = 0x4C; buf[1] = 0x41; buf[2] = 0x53; buf[3] = 0x46;
        const dv = new DataView(buf.buffer);
        dv.setUint16(94, 227, true);
        dv.setUint32(100, 1, true);
        expect(parseLASGeoInfo(buf)).toBeNull();
    });
});

describe('lasGeo.readLASBounds', () => {
    it('returns null when too short', () => {
        expect(readLASBounds(new Uint8Array(50))).toBeNull();
    });

    it('returns bounds correctly', () => {
        const b = buildLASHeader({
            bounds: { minX: -100, maxX: 200, minY: -50, maxY: 150, minZ: 0, maxZ: 30 },
        });
        const bounds = readLASBounds(b);
        expect(bounds?.minX).toBe(-100);
        expect(bounds?.maxX).toBe(200);
        expect(bounds?.minY).toBe(-50);
        expect(bounds?.maxY).toBe(150);
        expect(bounds?.minZ).toBe(0);
        expect(bounds?.maxZ).toBe(30);
    });
});
