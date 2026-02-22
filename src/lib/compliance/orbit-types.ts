/**
 * Canonical Orbit Type Registry
 * Single source of truth for orbit type definitions across all regulatory frameworks.
 *
 * Supports: EU Space Act, ITU, COPUOS, IADC, FCC, debris regulations
 */

// Canonical orbit types (superset of all frameworks)
export type CanonicalOrbitType =
  | "LEO"
  | "MEO"
  | "GEO"
  | "GTO"
  | "HEO"
  | "SSO"
  | "cislunar"
  | "deep_space"
  | "NGSO";

// Framework-specific orbit type sets
export const DEBRIS_ORBIT_TYPES = [
  "LEO",
  "MEO",
  "GEO",
  "HEO",
  "cislunar",
] as const;
export const COPUOS_ORBIT_TYPES = [
  "LEO",
  "MEO",
  "GEO",
  "HEO",
  "GTO",
  "cislunar",
  "deep_space",
] as const;
export const SPECTRUM_ORBIT_TYPES = [
  "GEO",
  "NGSO",
  "LEO",
  "MEO",
  "HEO",
] as const;
export const EU_SPACE_ACT_ORBIT_TYPES = [
  "LEO",
  "MEO",
  "GEO",
  "GTO",
  "HEO",
  "SSO",
  "cislunar",
  "deep_space",
] as const;

// ─── Altitude Ranges ───

export interface OrbitAltitudeRange {
  min: number; // km
  max: number; // km
  description: string;
}

const ORBIT_ALTITUDE_RANGES: Record<CanonicalOrbitType, OrbitAltitudeRange> = {
  LEO: { min: 160, max: 2000, description: "Low Earth Orbit" },
  MEO: { min: 2000, max: 35786, description: "Medium Earth Orbit" },
  GEO: { min: 35786, max: 35786, description: "Geostationary Earth Orbit" },
  GTO: {
    min: 200,
    max: 35786,
    description: "Geostationary Transfer Orbit",
  },
  HEO: { min: 200, max: 400000, description: "Highly Elliptical Orbit" },
  SSO: { min: 600, max: 800, description: "Sun-Synchronous Orbit" },
  cislunar: {
    min: 35786,
    max: 384400,
    description: "Cislunar Space (Earth-Moon)",
  },
  deep_space: {
    min: 384400,
    max: Infinity,
    description: "Deep Space (beyond Moon)",
  },
  NGSO: {
    min: 160,
    max: 35785,
    description: "Non-Geostationary Orbit (ITU classification)",
  },
};

export function getOrbitAltitudeRange(
  orbit: CanonicalOrbitType,
): OrbitAltitudeRange {
  return ORBIT_ALTITUDE_RANGES[orbit];
}

// ─── Orbit Classification ───

export function classifyByAltitude(altitudeKm: number): CanonicalOrbitType {
  if (altitudeKm <= 0) {
    throw new Error("Altitude must be positive");
  }
  if (altitudeKm <= 2000) return "LEO";
  if (altitudeKm < 35786) return "MEO";
  if (altitudeKm <= 35800) return "GEO"; // ±14km tolerance for GEO
  if (altitudeKm <= 384400) return "cislunar";
  return "deep_space";
}

// ─── Validation ───

const FRAMEWORK_ORBIT_SETS: Record<string, ReadonlyArray<string>> = {
  debris: DEBRIS_ORBIT_TYPES,
  copuos: COPUOS_ORBIT_TYPES,
  spectrum: SPECTRUM_ORBIT_TYPES,
  eu_space_act: EU_SPACE_ACT_ORBIT_TYPES,
};

export function isValidOrbit(orbit: string, framework: string): boolean {
  const validOrbits = FRAMEWORK_ORBIT_SETS[framework];
  if (!validOrbits) return false;
  return validOrbits.includes(orbit);
}

const ALL_CANONICAL_ORBITS = new Set<string>([
  "LEO",
  "MEO",
  "GEO",
  "GTO",
  "HEO",
  "SSO",
  "cislunar",
  "deep_space",
  "NGSO",
]);

export function isCanonicalOrbit(orbit: string): orbit is CanonicalOrbitType {
  return ALL_CANONICAL_ORBITS.has(orbit);
}

// ─── Labels ───

const ORBIT_LABELS: Record<CanonicalOrbitType, { en: string; de: string }> = {
  LEO: { en: "Low Earth Orbit (LEO)", de: "Niedrige Erdumlaufbahn (LEO)" },
  MEO: {
    en: "Medium Earth Orbit (MEO)",
    de: "Mittlere Erdumlaufbahn (MEO)",
  },
  GEO: {
    en: "Geostationary Orbit (GEO)",
    de: "Geostationäre Umlaufbahn (GEO)",
  },
  GTO: {
    en: "Geostationary Transfer Orbit (GTO)",
    de: "Geostationäre Transferbahn (GTO)",
  },
  HEO: {
    en: "Highly Elliptical Orbit (HEO)",
    de: "Stark elliptische Umlaufbahn (HEO)",
  },
  SSO: {
    en: "Sun-Synchronous Orbit (SSO)",
    de: "Sonnensynchrone Umlaufbahn (SSO)",
  },
  cislunar: { en: "Cislunar Space", de: "Zislunarer Raum" },
  deep_space: { en: "Deep Space", de: "Tiefer Weltraum" },
  NGSO: {
    en: "Non-Geostationary Orbit (NGSO)",
    de: "Nicht-geostationäre Umlaufbahn (NGSO)",
  },
};

export function getOrbitLabel(
  orbit: CanonicalOrbitType,
  locale: "en" | "de" = "en",
): string {
  return ORBIT_LABELS[orbit]?.[locale] ?? orbit;
}

// ─── Regulatory Properties ───

export interface OrbitRegulatoryProperties {
  requiresDeorbit: boolean;
  requiresDebrisPlan: boolean;
  requiresSpaceTrafficCoordination: boolean;
  protectedRegion: boolean;
  protectedRegionName?: string;
}

export function getOrbitRegulatoryProperties(
  orbit: CanonicalOrbitType,
): OrbitRegulatoryProperties {
  switch (orbit) {
    case "LEO":
    case "SSO":
      return {
        requiresDeorbit: true,
        requiresDebrisPlan: true,
        requiresSpaceTrafficCoordination: true,
        protectedRegion: true,
        protectedRegionName: "LEO Protected Region (up to 2000 km)",
      };
    case "GEO":
      return {
        requiresDeorbit: false, // Re-orbit to graveyard instead
        requiresDebrisPlan: true,
        requiresSpaceTrafficCoordination: true,
        protectedRegion: true,
        protectedRegionName: "GEO Protected Region (±200 km, ±15° longitude)",
      };
    case "GTO":
      return {
        requiresDeorbit: true, // Must not leave debris in LEO/GEO regions
        requiresDebrisPlan: true,
        requiresSpaceTrafficCoordination: true,
        protectedRegion: false,
      };
    case "MEO":
    case "HEO":
      return {
        requiresDeorbit: false,
        requiresDebrisPlan: true,
        requiresSpaceTrafficCoordination: true,
        protectedRegion: false,
      };
    case "cislunar":
    case "deep_space":
      return {
        requiresDeorbit: false,
        requiresDebrisPlan: true,
        requiresSpaceTrafficCoordination: false,
        protectedRegion: false,
      };
    case "NGSO":
      return {
        requiresDeorbit: true, // ITU assumes LEO/MEO
        requiresDebrisPlan: true,
        requiresSpaceTrafficCoordination: true,
        protectedRegion: false,
      };
  }
}
