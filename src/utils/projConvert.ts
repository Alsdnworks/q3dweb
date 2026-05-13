/**
 * Projected-coords → WGS84 lat/lon converter.
 *
 * Wraps proj4 with pre-registered EPSG definitions that are common in
 * LAS files (Japanese Plane Rectangular, UTM, etc.). Unknown EPSG codes
 * return null.
 */

import proj4 from 'proj4';

// ---- Japanese Plane Rectangular (JGD2011): EPSG 6669..6687 ----
// origin lat/lon from the 19 zones.
const JPR_ORIGINS: Array<[number, number]> = [
    [33, 129.5],    // I
    [33, 131],      // II
    [36, 132.1666666666667], // III
    [33, 133.5],    // IV
    [36, 134.3333333333333], // V
    [36, 136],      // VI
    [36, 137.1666666666667], // VII
    [36, 138.5],    // VIII
    [36, 139.8333333333333], // IX
    [40, 140.8333333333333], // X
    [44, 140.25],   // XI
    [44, 142.25],   // XII
    [44, 144.25],   // XIII
    [26, 142],      // XIV
    [26, 127.5],    // XV
    [26, 124],      // XVI
    [26, 131],      // XVII
    [20, 136],      // XVIII
    [26, 154],      // XIX
];

function jprDef(lat0: number, lon0: number, datum: 'JGD2011' | 'JGD2000'): string {
    // Datum params (approx). JGD2011/JGD2000 ≈ WGS84 within a few cm.
    const base = `+proj=tmerc +lat_0=${lat0} +lon_0=${lon0} +k=0.9999 +x_0=0 +y_0=0`;
    const datumPart = datum === 'JGD2011'
        ? '+ellps=GRS80 +towgs84=0,0,0,0,0,0,0'
        : '+ellps=GRS80 +towgs84=0,0,0,0,0,0,0';
    return `${base} ${datumPart} +units=m +no_defs`;
}

let registered = false;
function registerDefs() {
    if (registered) return;
    registered = true;
    // JGD2011 PR CS I–XIX: EPSG 6669..6687
    for (let i = 0; i < 19; i++) {
        const [lat0, lon0] = JPR_ORIGINS[i];
        proj4.defs('EPSG:' + (6669 + i), jprDef(lat0, lon0, 'JGD2011'));
    }
    // JGD2000 PR CS I–XIX: EPSG 2443..2461
    for (let i = 0; i < 19; i++) {
        const [lat0, lon0] = JPR_ORIGINS[i];
        proj4.defs('EPSG:' + (2443 + i), jprDef(lat0, lon0, 'JGD2000'));
    }
    // UTM WGS84 zones 1..60: EPSG 32601..32660 (N), 32701..32760 (S)
    for (let z = 1; z <= 60; z++) {
        proj4.defs('EPSG:' + (32600 + z),
            `+proj=utm +zone=${z} +datum=WGS84 +units=m +no_defs`);
        proj4.defs('EPSG:' + (32700 + z),
            `+proj=utm +zone=${z} +south +datum=WGS84 +units=m +no_defs`);
    }
    // WGS84 geographic
    proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
    proj4.defs('EPSG:4612', '+proj=longlat +ellps=GRS80 +towgs84=0,0,0 +no_defs'); // JGD2000
    proj4.defs('EPSG:6668', '+proj=longlat +ellps=GRS80 +towgs84=0,0,0 +no_defs'); // JGD2011
}

/** Convert projected X,Y → [lat, lon] in WGS84. Returns null on failure. */
export function projToLatLon(epsg: number, x: number, y: number): [number, number] | null {
    registerDefs();
    const key = 'EPSG:' + epsg;
    try {
        if (!proj4.defs(key)) return null;
        const [lon, lat] = proj4(key, 'EPSG:4326', [x, y]);
        if (!isFinite(lat) || !isFinite(lon)) return null;
        return [lat, lon];
    } catch {
        return null;
    }
}

/** Register a custom WKT-derived definition under a synthetic key. */
export function registerWKT(wkt: string, name: string = 'CUSTOM'): string | null {
    registerDefs();
    try {
        proj4.defs(name, wkt);
        return name;
    } catch {
        return null;
    }
}

/** Convert using a registered key (e.g., from registerWKT). */
export function convertByKey(key: string, x: number, y: number): [number, number] | null {
    try {
        if (!proj4.defs(key)) return null;
        const [lon, lat] = proj4(key, 'EPSG:4326', [x, y]);
        if (!isFinite(lat) || !isFinite(lon)) return null;
        return [lat, lon];
    } catch {
        return null;
    }
}
