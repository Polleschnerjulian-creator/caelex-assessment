/**
 * Caelex Comply — Precision Engine Types (Sprint A3)
 *
 * Transforms an EnrichedProfile + OperatorProfile into a personalized,
 * dependency-resolved set of compliance obligations with target dates.
 *
 * Design contract:
 * - Pure compute. No DB writes. Callers (onboarding, cron, Astra tools)
 *   decide whether to persist as AstraProposals, *RequirementStatus rows,
 *   or just display in-memory.
 * - Soft-fail. Returns PrecisionRunResult.status="EMPTY" when no obligations
 *   match the input (e.g. operator is out-of-scope for all regulations).
 * - Provenance preserved. Every generated item carries the upstream
 *   ObligationResult so consumers can trace "why was this generated?".
 */

import "server-only";

import type { EnrichedProfile } from "@/lib/profile-enrichment/types";
import type { ObligationResult } from "@/lib/ontology/types";

// ─── Input ─────────────────────────────────────────────────────────────────

export interface PrecisionRunInput {
  /** Tenant for which we're generating items. */
  organizationId: string;
  /** Profile fields needed to walk the ontology. */
  applicability: ApplicabilityContextInput;
  /** Optional enrichment payload — used as a fallback when fields are missing. */
  enrichedProfile?: EnrichedProfile;
  /**
   * Optional domain filter (e.g. "DEBRIS", "CYBERSECURITY"). Default: all
   * domains. Used by per-module pregenerate Astra tools.
   */
  domain?: string;
  /**
   * If true, include proposal-confidence obligations from the ontology
   * (confidence < 0.9). Default: false (only-shipped obligations).
   */
  includeProposals?: boolean;
  /**
   * Anchor date for time-backward planning. Default: today.
   * Tests pass a fixed date for determinism.
   */
  now?: Date;
}

/**
 * The minimum operator-context the engine needs. Caller fills in from
 * OperatorProfile (existing) + EnrichedProfile (Sprint A1).
 */
export interface ApplicabilityContextInput {
  /** EU Space Act operator code: "SCO" (satellite operator), "LO" (launch operator), etc. */
  operatorType: string;
  /** ISO 3166 alpha-2 codes (e.g. ["DE", "FR"]). */
  jurisdictions: string[];
  /** Optional: primary orbit. Drives debris/spectrum applicability. */
  primaryOrbit?: string;
  /** Optional: planned constellation size. Drives Article 70 applicability. */
  constellationSize?: number;
  /** Optional: planned launch date. Drives time-backward planning. */
  plannedLaunchDate?: Date;
  /** Optional: mission lifetime in months. Drives de-orbit obligations. */
  missionDurationMonths?: number;
}

// ─── Output ────────────────────────────────────────────────────────────────

export type PrecisionRunStatus =
  | "SUCCESS" // ≥1 item generated
  | "EMPTY" // no obligations matched (out-of-scope)
  | "PARTIAL" // ontology returned obligations but some couldn't be mapped to a regulation
  | "FAILED"; // engine error (defensive — never expected to fire)

export interface PrecisionRunResult {
  status: PrecisionRunStatus;
  /** Generated compliance items, ordered by dependency-resolver. */
  items: GeneratedComplianceItem[];
  /**
   * Items keyed by domain — convenience view for the per-module renderer.
   * Same items as `items`, just grouped.
   */
  itemsByDomain: Record<string, GeneratedComplianceItem[]>;
  /** Aggregate stats for telemetry. */
  stats: PrecisionRunStats;
  /** ISO-8601 UTC when the run started. */
  startedAt: string;
  /** Wall-clock duration in ms. */
  durationMs: number;
  /** Soft-fail error messages — populated even on SUCCESS for partial issues. */
  warnings: string[];
}

export interface PrecisionRunStats {
  obligationsFromOntology: number;
  itemsGenerated: number;
  itemsByPriority: Record<Priority, number>;
  itemsByRegulation: Record<string, number>;
  /** Number of items with at least one upstream dependency. */
  itemsWithDependencies: number;
}

/**
 * A compliance item the engine deems applicable to the operator.
 *
 * This is an in-memory candidate. It is NOT a Prisma row. Callers map it
 * to whatever store fits — AstraProposal, *RequirementStatus, an Astra
 * chat response — keeping the engine decoupled from persistence.
 */
export interface GeneratedComplianceItem {
  /**
   * Stable cross-run identity. Composed as
   * `${regulationRef}:${requirementCode}` so the same input always
   * produces the same id; idempotent re-runs don't create duplicates.
   */
  id: string;
  /** Human label (from ontology obligation). */
  title: string;
  /** Short machine code (from ontology obligation). */
  requirementCode: string;
  /** Regulation namespace: "EU_SPACE_ACT" | "NIS2" | "DE_BWRG" | ... */
  regulationRef: RegulationRef;
  /** Domain bucket (CYBERSECURITY, DEBRIS, AUTHORIZATION, etc.). */
  domain: string;
  /** Jurisdictions in scope for this item. */
  jurisdictions: string[];
  /** Article reference (e.g. "Art. 7", "§ 12 Abs. 2"). May be empty. */
  articleRef: string;
  /** Confidence (0..1) from the ontology + applicability heuristics. */
  confidence: number;
  /** Computed priority for the Today inbox / triage. */
  priority: Priority;
  /** Suggested target date (from time-backward-planner). */
  targetDate: Date | null;
  /** Earliest reasonable start date — work begins by then. */
  startDate: Date | null;
  /** Evidence types the operator must collect. */
  evidenceRequired: Array<{ code: string; label: string }>;
  /** IDs of other GeneratedComplianceItems that should be done before this one. */
  dependsOn: string[];
  /** Why was this generated? Pointer back to the upstream obligation. */
  origin: GeneratedItemOrigin;
}

export type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "WATCHING";

export type RegulationRef =
  | "EU_SPACE_ACT"
  | "NIS2"
  | "CRA"
  | "COPUOS"
  | "ITU_SPECTRUM"
  | "ITAR_EAR"
  | "EU_DUAL_USE"
  | "DE_BWRG"
  | "FR_LOS"
  | "UK_SIA"
  | "US_FCC_FAA"
  | "OTHER";

export interface GeneratedItemOrigin {
  /** The ontology nodeId we generated this from. */
  ontologyNodeId: string;
  /** Verbatim ontology source attribution. */
  framework: string;
  reference: string;
  /** Whether the obligation came from APPLIES_TO (operator-type) or SCOPED_TO (jurisdiction). */
  match: "operator-type" | "jurisdiction" | "both";
}

// ─── Internal types (not re-exported) ──────────────────────────────────────

/** Internal: the resolved applicability context after normalization. */
export interface ApplicabilityContext {
  operatorType: string;
  /** Normalized to upper-case ISO codes, deduplicated. */
  jurisdictions: string[];
  /** Domains we should look at — empty array means "all". */
  domainFilter?: string;
  primaryOrbit?: string;
  constellationSize?: number;
  plannedLaunchDate?: Date;
  missionDurationMonths?: number;
}

/**
 * Internal: an obligation paired with its source attribution + match type,
 * ready to be transformed into a GeneratedComplianceItem.
 */
export interface ResolvedObligation extends ObligationResult {
  match: GeneratedItemOrigin["match"];
}
