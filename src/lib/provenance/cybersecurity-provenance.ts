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
  single_satellite: "single satellite",
  small_constellation: "small constellation",
  large_constellation: "large constellation",
  ground_only: "ground segment only",
};

const DATA_LABEL: Record<DataSensitivityLevel, string> = {
  public: "public data only",
  internal: "internal data",
  confidential: "confidential data",
  restricted: "restricted data",
};

/**
 * Defensive lookup — returns the raw value string if a key isn't in the
 * label map. Protects against requirements that carry enum values the
 * UI doesn't know yet (e.g. after a data-file extension). No throws.
 */
function safeLabel(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}

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
      value: safeLabel(ORG_SIZE_LABEL, profile.organizationSize),
      requirementGate: `applies to ${req.applicableTo.organizationSizes
        .map((s) => safeLabel(ORG_SIZE_LABEL, s).split(" ")[0])
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
      value: safeLabel(SEGMENT_LABEL, profile.spaceSegmentComplexity),
      requirementGate: `applies to ${req.applicableTo.spaceSegmentComplexities
        .map((s) => safeLabel(SEGMENT_LABEL, s).split(" ")[0])
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
      value: safeLabel(DATA_LABEL, profile.dataSensitivityLevel),
      requirementGate: `applies to ${req.applicableTo.dataSensitivities
        .map((s) => safeLabel(DATA_LABEL, s).split(" ")[0])
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

// ─── Per-control context window ────────────────────────────────────────

/**
 * Three-beat context for a single control — feeds the animated
 * ControlContextWindow. Every beat is a short human sentence designed to
 * be read on first expand of the card:
 *
 *   wieso   — WHY does this regulation exist?
 *   weshalb — WHAT does it protect against?
 *   warum   — WHY does it apply to you specifically?
 *
 * Deterministic: template-driven from the requirement's own data fields
 * plus the operator's profile. No LLM call, no data-file change.
 */
export interface ControlContext {
  wieso: string;
  weshalb: string;
  warum: string;
}

/**
 * Category-keyed short descriptions of the threat the control guards
 * against. Kept opinionated but factual — each line matches the
 * corresponding ENISA / NIS2 objective. When the category is unknown
 * we fall back to a generic line.
 */
const CATEGORY_THREAT: Record<string, string> = {
  governance:
    "gaps in accountability — nobody owns security outcomes, nobody signs off the budget, and audits fail to show board-level oversight.",
  risk_assessment:
    "unknown exposure — threats are not catalogued, impact is not quantified, and the operator cannot prioritise mitigations rationally.",
  infosec:
    "data exposure and system compromise — without enforced controls, confidentiality, integrity, and availability guarantees cannot be demonstrated.",
  cryptography:
    "interception and tampering — unencrypted data in transit or at rest makes every communication a leak vector.",
  detection_monitoring:
    "silent intrusions — an attacker who is not observed cannot be stopped, and regulatory incident windows start from the moment of detection.",
  business_continuity:
    "extended outages — after an incident, operations stay down longer than the regulatory maximum downtime, triggering reporting and fines.",
  incident_reporting:
    "late or missing notifications — the NIS2 24h early-warning window is binding; missing it is itself a breach.",
  eusrn:
    "fragmented national reporting — without a single EU channel, the operator repeats notifications across MS and risks contradictory statements.",
};

function threatForCategory(category: string): string {
  return (
    CATEGORY_THREAT[category] ??
    "non-conformance — the operator cannot demonstrate the control, which is itself a finding under audit."
  );
}

/**
 * Build the three animated beats. Inputs are the requirement + the
 * caller's profile-derived applicability reason (reused from
 * describeApplicabilityReason so the "why you?" sentence stays
 * consistent with the per-card CausalBreadcrumb).
 */
export function buildControlContext(args: {
  req: CybersecurityRequirement;
  reason: ApplicabilityReason | null;
}): ControlContext {
  const { req, reason } = args;

  // ── Wieso: regulatory origin ──────────────────────────────────────
  const wieso = buildWiesoSentence(req);

  // ── Weshalb: threat model ─────────────────────────────────────────
  const weshalb = buildWeshalbSentence(req);

  // ── Warum: applicability for THIS operator ────────────────────────
  const warum = buildWarumSentence(req, reason);

  return { wieso, weshalb, warum };
}

function buildWiesoSentence(req: CybersecurityRequirement): string {
  const source = req.articleRef || "This requirement";
  const aligned: string[] = [];
  if (req.nis2Reference) aligned.push(`NIS2 (${req.nis2Reference})`);
  if (req.isoReference) aligned.push(`ISO 27001 (${req.isoReference})`);
  const alignment =
    aligned.length > 0 ? ` and aligns with ${aligned.join(" and ")}` : "";
  // req.description is usually 1 sentence already — if empty, skip.
  const tail = req.description
    ? ` — ${ensureSentenceEnd(req.description.trim())}`
    : ".";
  return `${source} establishes this control${alignment}${tail}`;
}

function buildWeshalbSentence(req: CybersecurityRequirement): string {
  const threat = threatForCategory(req.category);
  return `Without it, the operator is exposed to ${threat}`;
}

function buildWarumSentence(
  req: CybersecurityRequirement,
  reason: ApplicabilityReason | null,
): string {
  if (!reason) {
    return "Applies to your profile under the current scope.";
  }
  if (reason.matched.length === 0) {
    return "Applies to every operator in scope regardless of size or segment.";
  }
  // Stitch a natural sentence from the matched dimensions.
  const parts = reason.matched
    .filter((m) => m.dimension !== "regime")
    .map((m) => m.value);
  if (parts.length === 0) {
    return "Applies to you under the standard (non-simplified) regime.";
  }
  return `Applies to you because your profile matches ${joinNaturally(parts)}.`;
}

function joinNaturally(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function ensureSentenceEnd(s: string): string {
  if (/[.!?]$/.test(s)) return s;
  return `${s}.`;
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
    `Organization size: ${safeLabel(ORG_SIZE_LABEL, profile.organizationSize)}`,
    `Space segment: ${safeLabel(SEGMENT_LABEL, profile.spaceSegmentComplexity)}`,
    `Data sensitivity: ${safeLabel(DATA_LABEL, profile.dataSensitivityLevel)}`,
  ];

  return {
    headline: `${applicableCount} of ${totalCount} controls apply to you`,
    bullets,
  };
}
