/**
 * Comply v2 — TypeScript types for the unified ComplianceItem atom.
 *
 * This namespace is the V2 projection over the 8 existing
 * `*RequirementStatus` Prisma models (DebrisRequirementStatus,
 * CybersecurityRequirementStatus, NIS2RequirementStatus,
 * CRARequirementStatus, UkRequirementStatus, UsRequirementStatus,
 * ExportControlRequirementStatus, SpectrumRequirementStatus).
 *
 * Phase 0–1: pure projection. No new Prisma tables — the fetcher in
 * compliance-item.server.ts reads from the 8 existing tables and
 * converts on the fly. Every V2 surface (Today, Triage, Review-Queue,
 * Lineage) consumes ComplianceItem; UI never touches the legacy
 * status models directly.
 *
 * Phase 2+: optional materialized view for performance once we exceed
 * ~10k items per org.
 *
 * Scope: only /dashboard/* (Comply). Atlas, Pharos, Assure are not
 * supposed to import from here.
 *
 * Why this lives in src/lib/comply-v2/ and NOT src/lib/ontology/:
 * the existing src/lib/ontology/ is the static regulatory-knowledge
 * graph (Regulation → Obligation → Jurisdiction → EvidenceReq nodes).
 * That's WHICH obligations exist in the world. ComplianceItem here
 * tracks an organization's COMPLIANCE STATE against those obligations.
 * Two related-but-distinct domains.
 */

/**
 * The eight regulatory regimes Caelex Comply tracks. Each maps to
 * exactly one `*RequirementStatus` Prisma model.
 */
export const REGULATIONS = [
  "DEBRIS",
  "CYBERSECURITY",
  "NIS2",
  "CRA",
  "UK_SPACE_ACT",
  "US_REGULATORY",
  "EXPORT_CONTROL",
  "SPECTRUM",
] as const;
export type RegulationKey = (typeof REGULATIONS)[number];

export const REGULATION_LABELS: Record<RegulationKey, string> = {
  DEBRIS: "Debris Mitigation",
  CYBERSECURITY: "Cybersecurity",
  NIS2: "NIS2 Directive",
  CRA: "Cyber Resilience Act",
  UK_SPACE_ACT: "UK Space Industry Act",
  US_REGULATORY: "US Regulatory",
  EXPORT_CONTROL: "Export Control (ITAR/EAR)",
  SPECTRUM: "Spectrum & ITU",
};

/**
 * Normalized status across all regimes. Original Prisma rows store
 * status as a free-form string ("compliant", "partial", etc.). We map
 * those into the V2 vocabulary so every UI surface renders one
 * Badge-variant set.
 */
export type ComplianceStatus =
  | "PENDING" //              not_assessed / unknown
  | "DRAFT" //                user has started but not committed
  | "EVIDENCE_REQUIRED" //    status set but no evidence uploaded
  | "UNDER_REVIEW" //         submitted, awaiting counsel/auditor signoff
  | "ATTESTED" //             compliant + evidence accepted
  | "EXPIRED" //              attested but past validity window
  | "NOT_APPLICABLE";

/**
 * Convert legacy status strings into the V2 vocabulary. Defensive —
 * unknown values fall back to PENDING.
 */
export function normalizeStatus(
  raw: string | null | undefined,
): ComplianceStatus {
  if (!raw) return "PENDING";
  const t = raw.trim().toLowerCase();
  switch (t) {
    case "compliant":
      return "ATTESTED";
    case "partial":
      return "DRAFT";
    case "non_compliant":
      return "EVIDENCE_REQUIRED";
    case "not_applicable":
    case "not-applicable":
    case "n/a":
      return "NOT_APPLICABLE";
    case "expired":
      return "EXPIRED";
    case "under_review":
    case "under-review":
    case "review":
      return "UNDER_REVIEW";
    case "not_assessed":
    case "not-assessed":
    case "":
    case "pending":
    default:
      return "PENDING";
  }
}

/**
 * Priority surfaces a ComplianceItem for the user's Today inbox.
 * Computed from due-date proximity, regulation criticality, and
 * outstanding-evidence flags. See computePriority() in the fetcher.
 */
export type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Universal ComplianceItem — the single atom across all regimes.
 *
 * This is a *projection* of the underlying `*RequirementStatus` row
 * + optional metadata. Constructed by converters in
 * src/lib/comply-v2/compliance-item.server.ts; not persisted to the
 * database in Phase 0.
 */
export interface ComplianceItem {
  /** Cross-regime stable ID: `${regulation}:${rowId}`. */
  id: string;

  /** Owning RequirementStatus row primary key in its native table. */
  rowId: string;

  /** Which Prisma table this row came from. */
  regulation: RegulationKey;

  /** Owning user. */
  userId: string;

  /** Identifier used in the static data file (e.g. "Art.7"). */
  requirementId: string;

  /** Normalized status. */
  status: ComplianceStatus;

  /** Free-form user notes (markdown-capable in V2). */
  notes: string | null;

  /** Evidence notes (separate field in some regimes). */
  evidenceNotes: string | null;

  /** Target compliance date if set; null if regime doesn't track it. */
  targetDate: Date | null;

  /** Last-updated timestamp on the underlying row. */
  updatedAt: Date;

  /** Computed priority for the Today inbox (not stored). */
  priority: Priority;
}

/**
 * Filter shape for the ontology fetcher. All filters are AND-ed.
 * Empty filter returns everything for the requesting user.
 */
export interface ComplianceItemFilter {
  regulations?: RegulationKey[];
  statuses?: ComplianceStatus[];
  /** Surfaces items with `targetDate <= now + N days`. */
  dueWithinDays?: number;
  /** Substring match against notes / evidenceNotes / requirementId. */
  search?: string;
  /** Maximum number of items to return (default 200). */
  limit?: number;
}
