import { describe, it, expect } from 'vitest';
import proj4 from 'proj4';
import { projToLatLon, registerWKT, convertByKey } from '../src/utils/projConvert';

describe('projConvert.projToLatLon', () => {
    it('returns null for unknown EPSG', () => {
        expect(projToLatLon(99999999, 0, 0)).toBeNull();
    });

    it('converts JGD2011 PR CS IV (EPSG:6672) to Mihara lat/lon', () => {
        // Mihara approx (34.47, 132.99) corresponds to (x=-46827, y=163672) in PR CS IV
        const res = projToLatLon(6672, -46827, 163672);
        expect(res).not.toBeNull();
        const [lat, lon] = res!;
        expect(lat).toBeCloseTo(34.47, 1);
        expect(lon).toBeCloseTo(132.99, 1);
    });

    it('converts UTM WGS84 zone 54N (EPSG:32654)', () => {
        // Tokyo ~(35.68N, 139.76E) ≈ UTM zone 54N
        const res = projToLatLon(32654, 389500, 3950000);
        expect(res).not.toBeNull();
    });

    it('handles identity EPSG:4326', () => {
        const res = projToLatLon(4326, 139, 35);
        expect(res).not.toBeNull();
        const [lat, lon] = res!;
        expect(lat).toBeCloseTo(35, 5);
        expect(lon).toBeCloseTo(139, 5);
    });

    it('JGD2000 PR CS I (EPSG:2443)', () => {
        const res = projToLatLon(2443, 0, 0);
        expect(res).not.toBeNull();
        const [lat, lon] = res!;
        expect(lat).toBeCloseTo(33, 3);
        expect(lon).toBeCloseTo(129.5, 3);
    });

    it('UTM south zone (EPSG:32701)', () => {
        const res = projToLatLon(32701, 500000, 10000000);
        expect(res).not.toBeNull();
    });

    it('returns null when a registered EPSG definition throws during conversion', () => {
        proj4.defs('EPSG:987654', '+proj=bad +units=m +no_defs');
        expect(projToLatLon(987654, 0, 0)).toBeNull();
    });
});

describe('projConvert.registerWKT / convertByKey', () => {
    it('registers a valid WKT and converts with it', () => {
        const wkt = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]';
        const key = registerWKT(wkt, '__TEST_WKT_1__');
        expect(key).toBe('__TEST_WKT_1__');
        const res = convertByKey('__TEST_WKT_1__', 139, 35);
        expect(res).not.toBeNull();
    });

    it('returns null for invalid WKT', () => {
        const key = registerWKT('not a valid wkt at all', '__TEST_WKT_BAD__');
        // proj4 is surprisingly forgiving; accept either null or a non-usable key
        if (key) {
            expect(convertByKey(key, 0, 0)).toBeNull();
        } else {
            expect(key).toBeNull();
        }
    });

    it('convertByKey returns null for unregistered key', () => {
        expect(convertByKey('__NEVER_REGISTERED__', 0, 0)).toBeNull();
    });

    it('convertByKey returns null when conversion throws', () => {
        proj4.defs('__THROWING_PROJ__', '+proj=bad +units=m +no_defs');
        expect(convertByKey('__THROWING_PROJ__', 0, 0)).toBeNull();
    });
});
