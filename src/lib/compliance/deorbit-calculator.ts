import "server-only";

import { type CanonicalOrbitType } from "./orbit-types";

/**
 * Centralized Deorbit Deadline Calculator
 * Single source of truth for LEO deorbit rules across all regulatory frameworks.
 *
 * Supports: EU Space Act Art. 59, FCC Orbital Debris Rule 2024,
 * COPUOS Guidelines, IADC Guidelines, ISO 24113:2024
 */

// ─── Types ───

export interface DeorbitParams {
  orbitType: CanonicalOrbitType;
  altitudeKm: number;
  launchDate?: Date;
  missionEndDate?: Date;
  satelliteMassKg?: number;
  isConstellation?: boolean;
  constellationSize?: number;
}

export interface DeorbitResult {
  required: boolean;
  maxYears: number;
  deadlineDate?: Date;
  startFrom: "launch" | "mission_end" | "orbit_decay_start";
  regulation: string;
  article: string;
  notes: string[];
}

export interface MultiRegulationDeorbitResult {
  euSpaceAct: DeorbitResult;
  fcc: DeorbitResult;
  copuos: DeorbitResult;
  iadc: DeorbitResult;
  mostRestrictive: DeorbitResult;
}

// ─── LEO Thresholds (vary by regulation) ───

export const LEO_THRESHOLDS = {
  euSpaceAct: 2000, // km — EU Space Act Art. 59
  fcc: 2000, // km — FCC 2024 Rule
  copuos: 2000, // km — COPUOS Guidelines
  iadc: 2000, // km — IADC Guidelines
} as const;

// ─── Helper: Is LEO ───

export function isLEO(
  altitudeKm: number,
  regulation?: keyof typeof LEO_THRESHOLDS,
): boolean {
  const threshold = regulation ? LEO_THRESHOLDS[regulation] : 2000;
  return altitudeKm > 0 && altitudeKm <= threshold;
}

// ─── Helper: Is GEO ───

export function isGEO(altitudeKm: number): boolean {
  return altitudeKm >= 35586 && altitudeKm <= 35986; // ±200km of 35786
}

// ─── Individual Regulation Calculators ───

function calculateEUSpaceAct(params: DeorbitParams): DeorbitResult {
  const inLEO = isLEO(params.altitudeKm, "euSpaceAct");
  const inGEO = isGEO(params.altitudeKm);

  if (!inLEO && !inGEO) {
    return {
      required: false,
      maxYears: 0,
      startFrom: "mission_end",
      regulation: "EU Space Act (COM(2025) 335)",
      article: "Art. 59",
      notes: [
        "Deorbit not required for orbits outside LEO/GEO protected regions",
      ],
    };
  }

  if (inGEO) {
    return {
      required: true,
      maxYears: 0, // Immediate re-orbit to graveyard
      startFrom: "mission_end",
      regulation: "EU Space Act (COM(2025) 335)",
      article: "Art. 59",
      notes: [
        "GEO spacecraft must be re-orbited to graveyard orbit (≥235 km above GEO)",
        "Passivation of energy sources required",
      ],
    };
  }

  // LEO: 5-year rule
  const maxYears = 5;
  const notes: string[] = [
    "LEO spacecraft must deorbit within 5 years of mission end",
    "Applies to all EU-authorized space operators",
  ];

  if (params.isConstellation && (params.constellationSize ?? 0) > 100) {
    notes.push(
      "Large constellation (>100 satellites): enhanced debris management plan required",
    );
    notes.push(
      "Art. 60: Collision avoidance capability and coordinated deorbit plan mandatory",
    );
  }

  const deadlineDate = params.missionEndDate
    ? addYears(params.missionEndDate, maxYears)
    : undefined;

  return {
    required: true,
    maxYears,
    deadlineDate,
    startFrom: "mission_end",
    regulation: "EU Space Act (COM(2025) 335)",
    article: "Art. 59",
    notes,
  };
}

function calculateFCC(params: DeorbitParams): DeorbitResult {
  const inLEO = isLEO(params.altitudeKm, "fcc");

  if (!inLEO) {
    return {
      required: false,
      maxYears: 0,
      startFrom: "mission_end",
      regulation: "FCC Orbital Debris Rule (47 CFR § 25.114)",
      article: "§ 25.114(d)(14)",
      notes: ["FCC 5-year rule applies only to LEO operations"],
    };
  }

  // FCC 2024 rule: 5 years post-mission (replaced 25-year guideline)
  const maxYears = 5;
  const notes: string[] = [
    "FCC 2024 rule: LEO deorbit within 5 years of mission completion",
    "Applies to all FCC-licensed or market-access satellites",
    "Effective for new applications from September 2024",
  ];

  if (params.satelliteMassKg && params.satelliteMassKg > 1000) {
    notes.push(
      "Large satellite (>1000 kg): casualty risk assessment required for uncontrolled reentry",
    );
  }

  const deadlineDate = params.missionEndDate
    ? addYears(params.missionEndDate, maxYears)
    : undefined;

  return {
    required: true,
    maxYears,
    deadlineDate,
    startFrom: "mission_end",
    regulation: "FCC Orbital Debris Rule (47 CFR § 25.114)",
    article: "§ 25.114(d)(14)",
    notes,
  };
}

function calculateCOPUOS(params: DeorbitParams): DeorbitResult {
  const inLEO = isLEO(params.altitudeKm, "copuos");
  const inGEO = isGEO(params.altitudeKm);

  if (!inLEO && !inGEO) {
    return {
      required: false,
      maxYears: 0,
      startFrom: "mission_end",
      regulation: "COPUOS Space Debris Mitigation Guidelines",
      article: "Guideline 4",
      notes: ["COPUOS guidelines focus on LEO and GEO protected regions"],
    };
  }

  if (inGEO) {
    return {
      required: true,
      maxYears: 0,
      startFrom: "mission_end",
      regulation: "COPUOS Space Debris Mitigation Guidelines",
      article: "Guideline 5",
      notes: [
        "Relocate GEO spacecraft to disposal orbit above GEO protected region",
        "Passivate all stored energy sources",
      ],
    };
  }

  // COPUOS: 25-year guideline (non-binding but widely referenced)
  const maxYears = 25;
  const notes: string[] = [
    "COPUOS Guideline 4: Limit long-term presence in LEO after mission end",
    "25-year guideline — non-binding but widely adopted as best practice",
    "Note: EU Space Act and FCC have superseded with stricter 5-year requirement",
  ];

  const deadlineDate = params.missionEndDate
    ? addYears(params.missionEndDate, maxYears)
    : undefined;

  return {
    required: true,
    maxYears,
    deadlineDate,
    startFrom: "mission_end",
    regulation: "COPUOS Space Debris Mitigation Guidelines",
    article: "Guideline 4",
    notes,
  };
}

function calculateIADC(params: DeorbitParams): DeorbitResult {
  const inLEO = isLEO(params.altitudeKm, "iadc");
  const inGEO = isGEO(params.altitudeKm);

  if (!inLEO && !inGEO) {
    return {
      required: false,
      maxYears: 0,
      startFrom: "mission_end",
      regulation: "IADC Space Debris Mitigation Guidelines (Rev. 3)",
      article: "Section 5.3",
      notes: ["IADC guidelines address LEO and GEO protected regions"],
    };
  }

  if (inGEO) {
    return {
      required: true,
      maxYears: 0,
      startFrom: "mission_end",
      regulation: "IADC Space Debris Mitigation Guidelines (Rev. 3)",
      article: "Section 5.3.2",
      notes: [
        "Re-orbit to disposal orbit: minimum 235 km + (Cr × A/m × 1000) km above GEO",
        "Cr: solar radiation pressure coefficient, A/m: area-to-mass ratio",
      ],
    };
  }

  // IADC: 25-year guideline
  const maxYears = 25;
  const notes: string[] = [
    "IADC Guideline 5.3.1: Limit post-mission orbital lifetime to ≤25 years",
    "Controlled reentry preferred when feasible",
  ];

  if (params.satelliteMassKg && params.satelliteMassKg > 500) {
    notes.push("Spacecraft >500 kg: controlled reentry strongly recommended");
  }

  const deadlineDate = params.missionEndDate
    ? addYears(params.missionEndDate, maxYears)
    : undefined;

  return {
    required: true,
    maxYears,
    deadlineDate,
    startFrom: "mission_end",
    regulation: "IADC Space Debris Mitigation Guidelines (Rev. 3)",
    article: "Section 5.3.1",
    notes,
  };
}

// ─── Main Calculator ───

export function calculateDeorbitDeadline(
  params: DeorbitParams,
): MultiRegulationDeorbitResult {
  const euSpaceAct = calculateEUSpaceAct(params);
  const fcc = calculateFCC(params);
  const copuos = calculateCOPUOS(params);
  const iadc = calculateIADC(params);

  // Find most restrictive (shortest deadline among required results)
  const allRequired = [euSpaceAct, fcc, copuos, iadc].filter((r) => r.required);

  let mostRestrictive: DeorbitResult;
  if (allRequired.length === 0) {
    mostRestrictive = {
      required: false,
      maxYears: 0,
      startFrom: "mission_end",
      regulation: "None",
      article: "N/A",
      notes: ["No deorbit requirement applies for this orbit"],
    };
  } else {
    // Sort by maxYears ascending; GEO immediate re-orbit (maxYears=0, required=true) takes priority
    mostRestrictive = allRequired.sort((a, b) => {
      // Immediate actions (maxYears=0 but required) come first
      if (a.maxYears === 0 && b.maxYears > 0) return -1;
      if (b.maxYears === 0 && a.maxYears > 0) return 1;
      return a.maxYears - b.maxYears;
    })[0];
  }

  return {
    euSpaceAct,
    fcc,
    copuos,
    iadc,
    mostRestrictive,
  };
}

// ─── Utility ───

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Get a human-readable summary of the deorbit requirement.
 */
export function getDeorbitSummary(
  result: MultiRegulationDeorbitResult,
): string {
  const { mostRestrictive } = result;

  if (!mostRestrictive.required) {
    return "No deorbit requirement applies for this orbital regime.";
  }

  if (mostRestrictive.maxYears === 0) {
    return `Immediate re-orbit/disposal required per ${mostRestrictive.regulation} (${mostRestrictive.article}).`;
  }

  return `Deorbit within ${mostRestrictive.maxYears} years of mission end per ${mostRestrictive.regulation} (${mostRestrictive.article}).`;
}
