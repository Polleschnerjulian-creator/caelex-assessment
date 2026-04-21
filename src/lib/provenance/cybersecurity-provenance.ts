/**
 * Cybersecurity-module provenance helpers — compute "why is this control
 * applicable to me?" purely from profile + requirement metadata.
 *
 * No DB. No engine. Pure function: same inputs → same explanation. This
 * is intentionally compute-on-read rather than write-through-DB because:
 *
 *   1. The filter logic in `getApplicableRequirements()` is deterministic
 *      and already fully data-driven — every reason lives in
 *      requirement.applicableTo.
 *   2. 40+ controls × every page-load writing ~40 rows of DerivationTrace
 *      would bloat the ledger with mechanical repetition.
 *   3. The reason can always be re-derived. For audit / regulator use-
 *      cases, the Verity ProfileSnapshot anchors the source-of-truth
 *      profile state — the module-level mapping is then reproducible
 *      from that anchored profile alone.
 *
 * For AI-suggested values (ASTRA's status suggestion) we do write real
 * traces — those aren't reproducible from metadata, they depend on model
 * + prompt + time.
 */

import type {
  CybersecurityProfile,
  CybersecurityRequirement,
  OrganizationSize,
  SpaceSegmentComplexity,
  DataSensitivityLevel,
} from "@/data/cybersecurity-requirements";

// ─── Labels ─────────────────────────────────────────────────────────────
// Human-friendly labels for the enum values. Kept adjacent to the
// provenance logic so the explanation strings stay in one place.

const ORG_SIZE_LABEL: Record<OrganizationSize, string> = {
  micro: "micro org (<10 staff)",
  small: "small org (<50 staff)",
  medium: "medium org (<250 staff)",
  large: "large org (≥250 staff)",
};

const SEGMENT_LABEL: Record<SpaceSegmentComplexity, string> = {
  simple: "simple space segment",
  moderate: "moderate space segment",
  complex: "complex space segment",
};

const DATA_LABEL: Record<DataSensitivityLevel, string> = {
  public: "public data only",
  internal: "internal data",
  confidential: "confidential data",
  regulated: "regulated data",
  classified: "classified data",
};

// ─── Public API ────────────────────────────────────────────────────────

export interface ApplicabilityReason {
  /** One-line human phrase, ready to drop into a CausalBreadcrumb. */
  summary: string;
  /** Ordered list of profile dimensions that actually matched. Used for
   *  bullet-list rendering (Why-Sidebar) + keyboard-friendly stepping. */
  matched: Array<{
    dimension:
      | "organizationSize"
      | "spaceSegmentComplexity"
      | "dataSensitivity"
      | "regime";
    value: string;
    requirementGate: string;
  }>;
  /** Confidence tag — always "deterministic" for applicability since the
   *  decision is hard-coded filter logic, not inference. Provided for
   *  downstream consumers that want to render a trust chip. */
  origin: "deterministic";
}

/**
 * Explain WHY a requirement is applicable to the given profile. Returns
 * null if the requirement is NOT applicable (caller shouldn't render it
 * anyway, but safer than throwing).
 *
 * The returned `summary` is designed to fit an inline CausalBreadcrumb:
 *   "⟵ weil <summary>"
 */
export function describeApplicabilityReason(
  req: CybersecurityRequirement,
  profile: CybersecurityProfile,
  isSimplified: boolean,
): ApplicabilityReason | null {
  const matched: ApplicabilityReason["matched"] = [];

  // Check organization size.
  if (req.applicableTo.organizationSizes) {
    if (
      !req.applicableTo.organizationSizes.includes(profile.organizationSize)
    ) {
      return null;
    }
    matched.push({
      dimension: "organizationSize",
      value: ORG_SIZE_LABEL[profile.organizationSize],
      requirementGate: `applies to ${req.applicableTo.organizationSizes
        .map((s) => ORG_SIZE_LABEL[s].split(" ")[0])
        .join("/")}`,
    });
  }

  // Check space segment complexity.
  if (req.applicableTo.spaceSegmentComplexities) {
    if (
      !req.applicableTo.spaceSegmentComplexities.includes(
        profile.spaceSegmentComplexity,
      )
    ) {
      return null;
    }
    matched.push({
      dimension: "spaceSegmentComplexity",
      value: SEGMENT_LABEL[profile.spaceSegmentComplexity],
      requirementGate: `applies to ${req.applicableTo.spaceSegmentComplexities
        .map((s) => SEGMENT_LABEL[s].split(" ")[0])
        .join("/")} segments`,
    });
  }

  // Check data sensitivity.
  if (req.applicableTo.dataSensitivities) {
    if (
      !req.applicableTo.dataSensitivities.includes(profile.dataSensitivityLevel)
    ) {
      return null;
    }
    matched.push({
      dimension: "dataSensitivity",
      value: DATA_LABEL[profile.dataSensitivityLevel],
      requirementGate: `applies to ${req.applicableTo.dataSensitivities
        .map((s) => DATA_LABEL[s].split(" ")[0])
        .join("/")} data`,
    });
  }

  // Simplified regime exclusion.
  if (isSimplified && req.applicableTo.simplifiedRegimeExcluded) {
    return null;
  }
  if (req.applicableTo.simplifiedRegimeExcluded) {
    matched.push({
      dimension: "regime",
      value: "standard regime",
      requirementGate: "not applicable in simplified regime",
    });
  }

  const summary = buildSummaryPhrase(matched, req);

  return {
    summary,
    matched,
    origin: "deterministic",
  };
}

/**
 * Build a one-line summary from the matched dimensions. Falls back to
 * the requirement's own scope description if the applicability list is
 * empty — that means the requirement is "applies to everyone" by default.
 */
function buildSummaryPhrase(
  matched: ApplicabilityReason["matched"],
  req: CybersecurityRequirement,
): string {
  if (matched.length === 0) {
    return "applies to all operators in scope";
  }

  // Prefer a tight phrase: "<org-size> + <segment>"
  const values = matched
    .filter((m) => m.dimension !== "regime")
    .map((m) => m.value);

  if (values.length === 0) {
    // Only regime gate matched — the reason is the regime alone.
    return "standard regime (not simplified)";
  }

  // Prefix with the article/framework origin so the breadcrumb reads
  // naturally: "NIS2 Art. 21(2)(a) · medium org · moderate segment".
  const head = req.articleRef || req.nis2Reference || "scope";
  return `${head} · ${values.join(" · ")}`;
}

/**
 * Build a top-level summary for the whole module — powers the
 * Why-Sidebar header. Explains "why N controls out of M".
 */
export function describeModuleScope(args: {
  profile: CybersecurityProfile;
  isSimplified: boolean;
  applicableCount: number;
  totalCount: number;
}): {
  headline: string;
  bullets: string[];
} {
  const { profile, isSimplified, applicableCount, totalCount } = args;
  const regime = isSimplified ? "simplified" : "standard";

  const bullets = [
    `Regime: ${regime}${isSimplified ? " (eligible due to size)" : ""}`,
    `Organization size: ${ORG_SIZE_LABEL[profile.organizationSize]}`,
    `Space segment: ${SEGMENT_LABEL[profile.spaceSegmentComplexity]}`,
    `Data sensitivity: ${DATA_LABEL[profile.dataSensitivityLevel]}`,
  ];

  return {
    headline: `${applicableCount} of ${totalCount} controls apply to you`,
    bullets,
  };
}
