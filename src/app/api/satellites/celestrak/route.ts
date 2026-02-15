import type { CelesTrakGPRecord } from "@/lib/satellites/types";
import { classifyOrbit, normalizeObjectType } from "@/lib/satellites/types";

export const runtime = "edge";

// Edge-compatible in-memory cache
let cachedJson: string | null = null;
let cachedAt = 0;
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

// Compact satellite format — short keys to stay under response limits
// Client expands these back to full SatelliteData in useSatelliteData hook
interface CompactSat {
  i: number; // noradId
  n: string; // name
  c: string; // cosparId
  t: string; // objectType: P=PAYLOAD, R=ROCKET BODY, D=DEBRIS, U=UNKNOWN
  cc: string; // countryCode
  o: string; // orbitType: L=LEO, M=MEO, G=GEO, H=HEO
  in: number; // inclination
  p: number; // period
  ap: number; // apoapsis
  pe: number; // periapsis
  e: string; // epoch
  mm: number; // meanMotion
  ec: number; // eccentricity
  ra: number; // raOfAscNode
  ar: number; // argOfPericenter
  ma: number; // meanAnomaly
  bs: number; // bstar
  md: number; // meanMotionDot
  mdd: number; // meanMotionDdot
  es: number; // elementSetNo
  re: number; // revAtEpoch
  ct: string; // classificationType
  et: number; // ephemerisType
}

const OBJ_TYPE_MAP: Record<string, string> = {
  PAYLOAD: "P",
  "ROCKET BODY": "R",
  DEBRIS: "D",
  UNKNOWN: "U",
};

const ORBIT_TYPE_MAP: Record<string, string> = {
  LEO: "L",
  MEO: "M",
  GEO: "G",
  HEO: "H",
};

function compactSatellite(gp: CelesTrakGPRecord): CompactSat {
  const objType = normalizeObjectType(gp.OBJECT_TYPE);
  const orbitType = classifyOrbit(gp.APOAPSIS, gp.PERIAPSIS);
  return {
    i: gp.NORAD_CAT_ID,
    n: gp.OBJECT_NAME,
    c: gp.OBJECT_ID,
    t: OBJ_TYPE_MAP[objType] || "U",
    cc: gp.COUNTRY_CODE,
    o: ORBIT_TYPE_MAP[orbitType] || "L",
    in: gp.INCLINATION,
    p: gp.PERIOD,
    ap: gp.APOAPSIS,
    pe: gp.PERIAPSIS,
    e: gp.EPOCH,
    mm: gp.MEAN_MOTION,
    ec: gp.ECCENTRICITY,
    ra: gp.RA_OF_ASC_NODE,
    ar: gp.ARG_OF_PERICENTER,
    ma: gp.MEAN_ANOMALY,
    bs: gp.BSTAR,
    md: gp.MEAN_MOTION_DOT,
    mdd: gp.MEAN_MOTION_DDOT,
    es: gp.ELEMENT_SET_NO,
    re: gp.REV_AT_EPOCH,
    ct: gp.CLASSIFICATION_TYPE,
    et: gp.EPHEMERIS_TYPE,
  };
}

interface CompactStats {
  total: number;
  payloads: number;
  rocketBodies: number;
  debris: number;
  unknown: number;
  leo: number;
  meo: number;
  geo: number;
  heo: number;
}

function computeStats(sats: CompactSat[]): CompactStats {
  const stats: CompactStats = {
    total: sats.length,
    payloads: 0,
    rocketBodies: 0,
    debris: 0,
    unknown: 0,
    leo: 0,
    meo: 0,
    geo: 0,
    heo: 0,
  };
  for (const s of sats) {
    if (s.t === "P") stats.payloads++;
    else if (s.t === "R") stats.rocketBodies++;
    else if (s.t === "D") stats.debris++;
    else stats.unknown++;
    if (s.o === "L") stats.leo++;
    else if (s.o === "M") stats.meo++;
    else if (s.o === "G") stats.geo++;
    else stats.heo++;
  }
  return stats;
}

export async function GET() {
  const now = Date.now();

  // Return cached data if fresh
  if (cachedJson && now - cachedAt < CACHE_TTL) {
    return new Response(cachedJson, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, s-maxage=7200",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(
      "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json",
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      if (cachedJson) {
        return new Response(cachedJson, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600, s-maxage=7200",
            "X-Cache": "STALE",
          },
        });
      }
      return Response.json(
        {
          error: `CelesTrak returned ${res.status}`,
          satellites: [],
          stats: null,
        },
        { status: 502 },
      );
    }

    const gpData: CelesTrakGPRecord[] = await res.json();
    const satellites = gpData.map(compactSatellite);
    const stats = computeStats(satellites);

    const json = JSON.stringify({
      satellites,
      stats,
      cachedAt: new Date().toISOString(),
      compact: true, // flag so client knows to expand
    });

    // Update cache
    cachedJson = json;
    cachedAt = now;

    return new Response(json, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, s-maxage=7200",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    if (cachedJson) {
      return new Response(cachedJson, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600, s-maxage=7200",
          "X-Cache": "STALE",
        },
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("CelesTrak fetch error:", message);
    return Response.json(
      { error: message, satellites: [], stats: null },
      { status: 502 },
    );
  }
}
