import type { ComplianceScore, ScoreBreakdown } from "./types";

// ─── Trust Level Weights ──────────────────────────────────────────────────────
const TRUST_WEIGHTS: Record<string, number> = {
  HIGH: 1.0,
  MEDIUM: 0.7,
  LOW: 0.4,
};

// ─── Known Regulation Thresholds (for coverage %) ────────────────────────────
const KNOWN_REGULATION_COUNT = 9;

// ─── Category Mapping ────────────────────────────────────────────────────────
type Category = keyof ScoreBreakdown;

function mapRegulationToCategory(regulationRef: string): Category {
  const ref = regulationRef.toLowerCase();
  if (
    ref.startsWith("eu_art70") ||
    ref.startsWith("eu_art68") ||
    ref.startsWith("eu_art72") ||
    ref.startsWith("eu_art64") ||
    ref.startsWith("iadc")
  ) {
    return "debris";
  }
  if (ref.startsWith("nis2")) {
    return "cybersecurity";
  }
  // Environmental, spectrum, insurance based on common prefixes
  if (ref.startsWith("eu_art75") || ref.startsWith("environmental")) {
    return "environmental";
  }
  if (ref.startsWith("itu") || ref.startsWith("spectrum")) {
    return "spectrum";
  }
  if (ref.startsWith("insurance") || ref.startsWith("eu_art80")) {
    return "insurance";
  }
  return "authorization";
}

// ─── Input Shape ─────────────────────────────────────────────────────────────
export interface AttestationInput {
  regulationRef: string;
  result: boolean;
  trustLevel: string;
  expiresAt: Date | string;
  issuedAt?: Date | string;
}

// ─── Core Calculator ─────────────────────────────────────────────────────────

/**
 * Pure function — takes attestation records and produces a ComplianceScore.
 * Does not touch the database; can be called server-side or in tests.
 */
export function computeComplianceScore(
  attestations: AttestationInput[],
): ComplianceScore {
  const now = new Date();

  // Separate expired from active
  const expired = attestations.filter((a) => new Date(a.expiresAt) <= now);
  const active = attestations.filter((a) => new Date(a.expiresAt) > now);

  const passing = active.filter((a) => a.result);
  const failing = active.filter((a) => !a.result);

  // Group active attestations by category
  const categoryMap: Record<Category, AttestationInput[]> = {
    debris: [],
    cybersecurity: [],
    authorization: [],
    environmental: [],
    spectrum: [],
    insurance: [],
  };

  for (const attestation of active) {
    const category = mapRegulationToCategory(attestation.regulationRef);
    categoryMap[category].push(attestation);
  }

  // Per-category score: average of (result ? 100 : 0) * trust_weight
  const breakdown: ScoreBreakdown = {
    debris: 0,
    cybersecurity: 0,
    authorization: 0,
    environmental: 0,
    spectrum: 0,
    insurance: 0,
  };

  const activeCategories: Category[] = [];

  for (const category of Object.keys(categoryMap) as Category[]) {
    const entries = categoryMap[category];
    if (entries.length === 0) continue;

    activeCategories.push(category);

    const sum = entries.reduce((acc, a) => {
      const weight = TRUST_WEIGHTS[a.trustLevel.toUpperCase()] ?? 0.4;
      const score = a.result ? 100 : 0;
      return acc + score * weight;
    }, 0);

    breakdown[category] = Math.round(sum / entries.length);
  }

  // Overall = average across active categories (0 if none)
  const overall =
    activeCategories.length === 0
      ? 0
      : Math.round(
          activeCategories.reduce((acc, cat) => acc + breakdown[cat], 0) /
            activeCategories.length,
        );

  // Coverage: unique regulation refs among active / known count
  const uniqueRefs = new Set(active.map((a) => a.regulationRef));
  const coveragePercent = Math.min(
    100,
    Math.round((uniqueRefs.size / KNOWN_REGULATION_COUNT) * 100),
  );

  return {
    overall,
    breakdown,
    attestationCount: attestations.length,
    passingCount: passing.length,
    failingCount: failing.length,
    expiredCount: expired.length,
    coveragePercent,
    trend: "stable",
    computedAt: now.toISOString(),
  };
}
