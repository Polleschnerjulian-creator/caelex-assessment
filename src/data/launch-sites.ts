// ─── Launch Site Coordinates ─────────────────────────────────────────────────
// Maps launch sites and vehicles to geographic coordinates for Copernicus
// Sentinel-5P atmospheric data queries.

export interface LaunchSiteCoords {
  name: string;
  lat: number;
  lon: number;
  radiusKm: number;
  country: string;
}

export const LAUNCH_SITES: Record<string, LaunchSiteCoords> = {
  kourou: {
    name: "Guiana Space Centre (CSG)",
    lat: 5.236,
    lon: -52.775,
    radiusKm: 30,
    country: "FR-GF",
  },
  cape_canaveral: {
    name: "Cape Canaveral SFS",
    lat: 28.396,
    lon: -80.605,
    radiusKm: 20,
    country: "US",
  },
  vandenberg: {
    name: "Vandenberg SFB",
    lat: 34.632,
    lon: -120.611,
    radiusKm: 20,
    country: "US",
  },
  baikonur: {
    name: "Baikonur Cosmodrome",
    lat: 45.965,
    lon: 63.305,
    radiusKm: 30,
    country: "KZ",
  },
  mahia: {
    name: "Rocket Lab LC-1",
    lat: -39.262,
    lon: 177.864,
    radiusKm: 15,
    country: "NZ",
  },
  esrange: {
    name: "Esrange Space Center",
    lat: 67.893,
    lon: 21.104,
    radiusKm: 20,
    country: "SE",
  },
  andoya: {
    name: "Andøya Spaceport",
    lat: 69.294,
    lon: 16.021,
    radiusKm: 15,
    country: "NO",
  },
  santa_maria: {
    name: "Santa Maria Spaceport (Azores)",
    lat: 36.971,
    lon: -25.17,
    radiusKm: 15,
    country: "PT",
  },
  kiruna: {
    name: "Kiruna (SSC)",
    lat: 67.857,
    lon: 20.964,
    radiusKm: 20,
    country: "SE",
  },
};

/** Map launch vehicles to their primary launch sites */
export const VEHICLE_LAUNCH_SITES: Record<string, string> = {
  ariane_6: "kourou",
  vega_c: "kourou",
  falcon_9: "cape_canaveral",
  falcon_heavy: "cape_canaveral",
  electron: "mahia",
  soyuz: "baikonur",
  generic_small: "kourou",
};

/** Resolve a launch site for a given vehicle */
export function getLaunchSiteForVehicle(
  vehicle: string,
): LaunchSiteCoords | null {
  const siteKey = VEHICLE_LAUNCH_SITES[vehicle];
  return siteKey ? (LAUNCH_SITES[siteKey] ?? null) : null;
}

/** Build a GeoJSON polygon (square) from center + radius */
export function polygonFromCenter(
  lat: number,
  lon: number,
  radiusKm: number,
): number[][] {
  const d = radiusKm / 111; // rough degrees per km
  return [
    [lon - d, lat - d],
    [lon + d, lat - d],
    [lon + d, lat + d],
    [lon - d, lat + d],
    [lon - d, lat - d],
  ];
}

/** Build a bbox [west, south, east, north] from center + radius */
export function bboxFromCenter(
  lat: number,
  lon: number,
  radiusKm: number,
): [number, number, number, number] {
  const d = radiusKm / 111;
  return [lon - d, lat - d, lon + d, lat + d];
}
