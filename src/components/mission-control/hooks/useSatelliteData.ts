"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  SatelliteData,
  FleetSpacecraft,
  CelesTrakResponse,
  FleetResponse,
} from "@/lib/satellites/types";

const SESSION_CACHE_KEY = "caelex-satellite-data";
const SESSION_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CacheEntry {
  data: CelesTrakResponse;
  timestamp: number;
}

function getSessionCache(): CelesTrakResponse | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > SESSION_CACHE_TTL) {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setSessionCache(data: CelesTrakResponse) {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // SessionStorage full or unavailable
  }
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
      // Fleet is optional (user may not be authenticated)
    }

    // 2. Check session cache for CelesTrak data
    const cached = getSessionCache();
    if (cached) {
      setSatellites(cached.satellites);
      setStats(cached.stats);
      setIsLoading(false);
      return;
    }

    // 3. Fetch from our CelesTrak proxy API
    try {
      const res = await fetch("/api/satellites/celestrak");
      if (res.ok) {
        const data: CelesTrakResponse = await res.json();
        setSatellites(data.satellites);
        setStats(data.stats);
        setSessionCache(data);
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
