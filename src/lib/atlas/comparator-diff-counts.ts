/**
 * Atlas Comparator — per-dimension difference counter.
 *
 * Audit D7 ("dimension count badges in tab row"): renders a subscript
 * next to each dimension tab showing how many rows DIFFER across the
 * currently-selected jurisdictions for that dimension. Helps the user
 * focus on the dimensions where variance lives.
 *
 * The accessor logic mirrors `ComparisonTable.tsx`'s row definitions
 * compactly. We don't depend on `t` (translations) because counts are
 * locale-independent.
 *
 * Definition of "differing": for each row's accessor output across the
 * selected jurisdictions, count distinct values. > 1 distinct value =
 * row differs. Rows whose own RowDef sets `highlightDifferences: false`
 * are EXCLUDED from the count (mirrors what the table considers
 * highlightable — cosmetic-only rows like "Legislation" don't count).
 */

import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type {
  JurisdictionLaw,
  SpaceLawCountryCode,
} from "@/lib/space-law-types";

export type ComparatorDimensionKey =
  | "authorization"
  | "liability"
  | "debris"
  | "registration"
  | "timeline"
  | "eu_readiness";

interface RowAccessor {
  /** True if this row contributes to the differences count. Mirrors
   *  the table's `highlightDifferences` flag. */
  diffable: boolean;
  read: (l: JurisdictionLaw) => string;
}

/* Per-dimension accessor lists. Compact mirror of getAuthRows /
   getLiabilityRows etc. in `ComparisonTable.tsx`. Not translated —
   we compare accessor *outputs* across jurisdictions, not labels. */
const DIMENSION_ACCESSORS: Record<ComparatorDimensionKey, RowAccessor[]> = {
  authorization: [
    { diffable: false, read: (l) => l.licensingAuthority.name },
    {
      diffable: false,
      read: (l) =>
        `${l.legislation.name} (${l.legislation.yearEnacted || "N/A"})`,
    },
    { diffable: true, read: (l) => l.legislation.status },
    {
      diffable: true,
      read: (l) =>
        l.insuranceLiability.mandatoryInsurance
          ? `yes-${l.insuranceLiability.minimumCoverage ?? "TBD"}`
          : "no",
    },
    {
      diffable: true,
      read: (l) => String(l.insuranceLiability.governmentIndemnification),
    },
    { diffable: true, read: (l) => String(l.licensingRequirements.length) },
  ],
  liability: [
    { diffable: true, read: (l) => l.insuranceLiability.liabilityRegime },
    { diffable: true, read: (l) => l.insuranceLiability.liabilityCap ?? "" },
    {
      diffable: true,
      read: (l) => String(l.insuranceLiability.mandatoryInsurance),
    },
    {
      diffable: true,
      read: (l) => l.insuranceLiability.minimumCoverage ?? "",
    },
    {
      diffable: true,
      read: (l) => String(l.insuranceLiability.thirdPartyRequired),
    },
    {
      diffable: true,
      read: (l) => String(l.insuranceLiability.governmentIndemnification),
    },
    {
      diffable: false,
      read: (l) => l.insuranceLiability.indemnificationCap ?? "",
    },
  ],
  debris: [
    {
      diffable: true,
      read: (l) => String(l.debrisMitigation.deorbitRequirement),
    },
    { diffable: true, read: (l) => l.debrisMitigation.deorbitTimeline ?? "" },
    {
      diffable: true,
      read: (l) => String(l.debrisMitigation.passivationRequired),
    },
    {
      diffable: true,
      read: (l) => String(l.debrisMitigation.debrisMitigationPlan),
    },
    {
      diffable: true,
      read: (l) => String(l.debrisMitigation.collisionAvoidance),
    },
    {
      diffable: false,
      read: (l) => (l.debrisMitigation.standards ?? []).join(";"),
    },
  ],
  registration: [
    {
      diffable: true,
      read: (l) => String(l.registration.nationalRegistryExists),
    },
    { diffable: true, read: (l) => l.registration.registryName ?? "" },
    {
      diffable: true,
      read: (l) => String(l.registration.unRegistrationRequired),
    },
  ],
  timeline: [
    { diffable: true, read: (l) => l.timeline.annualFee ?? "" },
    {
      diffable: true,
      read: (l) => (l.timeline.otherCosts ?? []).join(";"),
    },
  ],
  eu_readiness: [
    { diffable: true, read: (l) => l.euSpaceActCrossRef.relationship },
    { diffable: false, read: (l) => l.euSpaceActCrossRef.description },
    {
      diffable: false,
      read: (l) => (l.euSpaceActCrossRef.keyArticles ?? []).join(";"),
    },
    {
      diffable: false,
      read: (l) => l.euSpaceActCrossRef.transitionNotes ?? "",
    },
  ],
};

/**
 * Returns the count of differing-rows for one dimension across the
 * given selection. 0 selected jurisdictions → always 0.
 *
 * Uses the diffable subset of accessors per dimension — non-diffable
 * rows (free-text descriptions, identifying labels) don't contribute.
 */
export function countDifferingRows(
  dimension: ComparatorDimensionKey,
  selected: SpaceLawCountryCode[],
): number {
  if (selected.length < 2) return 0;
  const data: JurisdictionLaw[] = selected
    .map((c) => JURISDICTION_DATA.get(c))
    .filter((d): d is JurisdictionLaw => d !== undefined);
  if (data.length < 2) return 0;
  let diff = 0;
  for (const acc of DIMENSION_ACCESSORS[dimension]) {
    if (!acc.diffable) continue;
    const values = new Set(data.map(acc.read));
    if (values.size > 1) diff += 1;
  }
  return diff;
}

/** Returns counts for every dimension at once. Cheap to compute (~6
 *  dimensions × ~5 jurisdictions × ~6 accessors = 180 ops), so the
 *  page can call this per-render without memoizing. */
export function countDifferingRowsByDimension(
  selected: SpaceLawCountryCode[],
): Record<ComparatorDimensionKey, number> {
  return {
    authorization: countDifferingRows("authorization", selected),
    liability: countDifferingRows("liability", selected),
    debris: countDifferingRows("debris", selected),
    registration: countDifferingRows("registration", selected),
    timeline: countDifferingRows("timeline", selected),
    eu_readiness: countDifferingRows("eu_readiness", selected),
  };
}
