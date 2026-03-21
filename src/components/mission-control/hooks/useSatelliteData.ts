"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  SatelliteData,
  FleetSpacecraft,
  CelesTrakResponse,
  FleetResponse,
  ObjectType,
  OrbitType,
} from "@/lib/satellites/types";

const SESSION_CACHE_KEY = "caelex-satellite-data-v2";
const SESSION_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Compact format from the API (short keys to reduce payload)
interface CompactSat {
  i: number;
  n: string;
  c: string;
  t: string;
  cc: string;
  o: string;
  in: number;
  p: number;
  ap: number;
  pe: number;
  e: string;
  mm: number;
  ec: number;
  ra: number;
  ar: number;
  ma: number;
  bs: number;
  md: number;
  mdd: number;
  es: number;
  re: number;
  ct: string;
  et: number;
}

interface CompactResponse {
  satellites: CompactSat[];
  stats: CelesTrakResponse["stats"];
  cachedAt: string;
  compact: true;
}

const OBJ_TYPE_EXPAND: Record<string, ObjectType> = {
  P: "PAYLOAD",
  R: "ROCKET BODY",
  D: "DEBRIS",
  U: "UNKNOWN",
};

const ORBIT_TYPE_EXPAND: Record<string, OrbitType> = {
  L: "LEO",
  M: "MEO",
  G: "GEO",
  H: "HEO",
};

function expandSatellite(s: CompactSat): SatelliteData {
  return {
    noradId: s.i,
    name: s.n,
    cosparId: s.c,
    objectType: OBJ_TYPE_EXPAND[s.t] || "UNKNOWN",
    countryCode: s.cc,
    orbitType: ORBIT_TYPE_EXPAND[s.o] || "LEO",
    inclination: s.in,
    period: s.p,
    apoapsis: s.ap,
    periapsis: s.pe,
    epoch: s.e,
    meanMotion: s.mm,
    eccentricity: s.ec,
    raOfAscNode: s.ra,
    argOfPericenter: s.ar,
    meanAnomaly: s.ma,
    bstar: s.bs,
    meanMotionDot: s.md,
    meanMotionDdot: s.mdd,
    elementSetNo: s.es,
    revAtEpoch: s.re,
    classificationType: s.ct,
    ephemerisType: s.et,
  };
}

interface CacheEntry {
  satellites: SatelliteData[];
  stats: CelesTrakResponse["stats"];
  timestamp: number;
}

function getSessionCache(): CacheEntry | null {
  // Disabled: expanded satellite data is ~7.5 MB, exceeds sessionStorage 5 MB limit.
  // Previous attempts to cache would silently fail or corrupt, causing render crashes.
  // The API has a 2-hour server-side cache, so re-fetching is fast.
  try {
    // Clean up any stale/corrupt data from previous versions
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // sessionStorage unavailable
  }
  return null;
}

function setSessionCache(
  _satellites: SatelliteData[],
  _stats: CelesTrakResponse["stats"],
) {
  // No-op: data is ~7.5 MB expanded, exceeds sessionStorage 5 MB quota.
  // Server-side 2-hour cache handles repeat visits efficiently.
}

export function useSatelliteData() {
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [fleet, setFleet] = useState<FleetSpacecraft[]>([]);
  const [fleetNoradIds, setFleetNoradIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<CelesTrakResponse["stats"] | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    // 1. Fetch fleet first (fast, authenticated)
    try {
      const fleetRes = await fetch("/api/satellites/fleet");
      if (fleetRes.ok) {
        const data: FleetResponse = await fleetRes.json();
        setFleet(data.spacecraft);
        setFleetNoradIds(new Set(data.noradIds.map((id) => parseInt(id, 10))));
      }
    } catch {
      // Fleet is optional
    }

    // 2. Check session cache
    const cached = getSessionCache();
    if (cached) {
      setSatellites(cached.satellites);
      setStats(cached.stats);
      setIsLoading(false);
      return;
    }

    // 3. Fetch from CelesTrak proxy API
    try {
      const res = await fetch("/api/satellites/celestrak");
      if (res.ok) {
        const data = await res.json();

        let sats: SatelliteData[];
        let responseStats: CelesTrakResponse["stats"];

        if (data.compact) {
          // Compact format — expand short keys to full SatelliteData
          const compact = data as CompactResponse;
          sats = compact.satellites.map(expandSatellite);
          responseStats = compact.stats;
        } else {
          // Legacy full format
          sats = data.satellites;
          responseStats = data.stats;
        }

        setSatellites(sats);
        setStats(responseStats);
        setSessionCache(sats, responseStats);
      } else {
        console.error("CelesTrak API error:", res.status);
      }
    } catch (error) {
      console.error("Failed to fetch satellite data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const satelliteMap = useMemo(() => {
    const map = new Map<number, SatelliteData>();
    for (const sat of satellites) {
      map.set(sat.noradId, sat);
    }
    return map;
  }, [satellites]);

  return {
    satellites,
    fleet,
    fleetNoradIds,
    isLoading,
    stats,
    satelliteMap,
    refetch: fetchData,
  };
}
