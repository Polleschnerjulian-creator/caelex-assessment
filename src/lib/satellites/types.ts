// CelesTrak GP (General Perturbations) JSON record
export interface CelesTrakGPRecord {
  OBJECT_NAME: string;
  OBJECT_ID: string; // COSPAR ID
  NORAD_CAT_ID: number;
  OBJECT_TYPE: string; // PAYLOAD, ROCKET BODY, DEBRIS, UNKNOWN
  COUNTRY_CODE: string;
  LAUNCH_DATE: string;
  DECAY_DATE: string | null;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
  SEMIMAJOR_AXIS: number;
  PERIOD: number; // minutes
  APOAPSIS: number; // km
  PERIAPSIS: number; // km
  RCS_SIZE: string | null;
}

export type OrbitType = "LEO" | "MEO" | "GEO" | "HEO";
export type ObjectType = "PAYLOAD" | "ROCKET BODY" | "DEBRIS" | "UNKNOWN";

export interface SatelliteData {
  noradId: number;
  name: string;
  cosparId: string;
  objectType: ObjectType;
  countryCode: string;
  orbitType: OrbitType;
  inclination: number;
  period: number;
  apoapsis: number;
  periapsis: number;
  // GP elements for SGP4 propagation
  epoch: string;
  meanMotion: number;
  eccentricity: number;
  raOfAscNode: number;
  argOfPericenter: number;
  meanAnomaly: number;
  bstar: number;
  meanMotionDot: number;
  meanMotionDdot: number;
  elementSetNo: number;
  revAtEpoch: number;
  classificationType: string;
  ephemerisType: number;
}

export interface SatellitePosition {
  x: number;
  y: number;
  z: number;
}

export interface FleetSpacecraft {
  id: string;
  name: string;
  noradId: string | null;
  cosparId: string | null;
  orbitType: string;
  altitudeKm: number | null;
  inclinationDeg: number | null;
  status: string;
  missionType: string;
}

export interface CelesTrakResponse {
  satellites: SatelliteData[];
  stats: {
    total: number;
    payloads: number;
    rocketBodies: number;
    debris: number;
    unknown: number;
    leo: number;
    meo: number;
    geo: number;
    heo: number;
  };
  cachedAt: string;
}

export interface FleetResponse {
  spacecraft: FleetSpacecraft[];
  noradIds: string[];
}

export function classifyOrbit(
  apoapsisKm: number,
  periapsisKm: number,
): OrbitType {
  const avgAlt = (apoapsisKm + periapsisKm) / 2;
  if (avgAlt < 2000) return "LEO";
  if (avgAlt < 35000) return "MEO";
  if (avgAlt >= 35000 && avgAlt <= 36500) return "GEO";
  return "HEO";
}

export function normalizeObjectType(
  raw: string | null | undefined,
): ObjectType {
  if (!raw) return "UNKNOWN";
  const upper = raw.toUpperCase();
  if (upper === "PAYLOAD" || upper === "PAY") return "PAYLOAD";
  if (upper.includes("ROCKET") || upper === "R/B") return "ROCKET BODY";
  if (upper === "DEBRIS" || upper === "DEB") return "DEBRIS";
  return "UNKNOWN";
}
