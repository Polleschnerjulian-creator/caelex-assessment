import { NextResponse } from "next/server";
import type {
  CelesTrakGPRecord,
  CelesTrakResponse,
  SatelliteData,
} from "@/lib/satellites/types";
import { classifyOrbit, normalizeObjectType } from "@/lib/satellites/types";

// In-memory cache with 2-hour TTL
let cachedData: CelesTrakResponse | null = null;
let cachedAt = 0;
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

function normalizeSatellite(gp: CelesTrakGPRecord): SatelliteData {
  return {
    noradId: gp.NORAD_CAT_ID,
    name: gp.OBJECT_NAME,
    cosparId: gp.OBJECT_ID,
    objectType: normalizeObjectType(gp.OBJECT_TYPE),
    countryCode: gp.COUNTRY_CODE,
    orbitType: classifyOrbit(gp.APOAPSIS, gp.PERIAPSIS),
    inclination: gp.INCLINATION,
    period: gp.PERIOD,
    apoapsis: gp.APOAPSIS,
    periapsis: gp.PERIAPSIS,
    epoch: gp.EPOCH,
    meanMotion: gp.MEAN_MOTION,
    eccentricity: gp.ECCENTRICITY,
    raOfAscNode: gp.RA_OF_ASC_NODE,
    argOfPericenter: gp.ARG_OF_PERICENTER,
    meanAnomaly: gp.MEAN_ANOMALY,
    bstar: gp.BSTAR,
    meanMotionDot: gp.MEAN_MOTION_DOT,
    meanMotionDdot: gp.MEAN_MOTION_DDOT,
    elementSetNo: gp.ELEMENT_SET_NO,
    revAtEpoch: gp.REV_AT_EPOCH,
    classificationType: gp.CLASSIFICATION_TYPE,
    ephemerisType: gp.EPHEMERIS_TYPE,
  };
}

function computeStats(satellites: SatelliteData[]): CelesTrakResponse["stats"] {
  const stats = {
    total: satellites.length,
    payloads: 0,
    rocketBodies: 0,
    debris: 0,
    unknown: 0,
    leo: 0,
    meo: 0,
    geo: 0,
    heo: 0,
  };

  for (const sat of satellites) {
    // Object type
    if (sat.objectType === "PAYLOAD") stats.payloads++;
    else if (sat.objectType === "ROCKET BODY") stats.rocketBodies++;
    else if (sat.objectType === "DEBRIS") stats.debris++;
    else stats.unknown++;

    // Orbit type
    if (sat.orbitType === "LEO") stats.leo++;
    else if (sat.orbitType === "MEO") stats.meo++;
    else if (sat.orbitType === "GEO") stats.geo++;
    else stats.heo++;
  }

  return stats;
}

export async function GET() {
  const now = Date.now();

  // Return cached data if fresh
  if (cachedData && now - cachedAt < CACHE_TTL) {
    return NextResponse.json(cachedData, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=7200",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const res = await fetch(
      "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json",
      {
        next: { revalidate: 7200 },
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!res.ok) {
      // Stale-while-revalidate: return stale cache if CelesTrak is down
      if (cachedData) {
        return NextResponse.json(cachedData, {
          headers: {
            "Cache-Control": "public, max-age=3600, s-maxage=7200",
            "X-Cache": "STALE",
          },
        });
      }
      return NextResponse.json(
        { error: "Failed to fetch satellite data from CelesTrak" },
        { status: 502 },
      );
    }

    const gpData: CelesTrakGPRecord[] = await res.json();
    const satellites = gpData.map(normalizeSatellite);
    const stats = computeStats(satellites);

    const response: CelesTrakResponse = {
      satellites,
      stats,
      cachedAt: new Date().toISOString(),
    };

    // Update cache
    cachedData = response;
    cachedAt = now;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=7200",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    // Return stale cache on network error
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=7200",
          "X-Cache": "STALE",
        },
      });
    }

    console.error("CelesTrak fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch satellite data" },
      { status: 502 },
    );
  }
}
