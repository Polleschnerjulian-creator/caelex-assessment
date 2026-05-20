/**
 * Caelex Comply — Trilateral Auto-Discovery (Sprint A4)
 *
 * The "moat" types: shapes for auto-discovering an operator's
 * supervising authorities (NCAs) and likely legal counsel from
 * minimal input (operatorType + establishment country).
 *
 * Three actors:
 *   - OPERATOR (this organization)
 *   - COUNSEL (law firms that already represent operators in the
 *              same jurisdiction; matched via Atlas mandates +
 *              public filings)
 *   - AUTHORITY (NCAs in scope per jurisdiction × operator-type)
 *
 * Cross-actor signals (Patterns 3-5 from CAELEX-COMPLY-WORLD-BEST):
 *   - Operator → Counsel match suggestions
 *   - Operator → NCA mandatory disclosure scope
 *   - Counsel sees new mandate matching their alert subscriptions
 *   - Authority sees aggregated pipeline (anonymous)
 *   - Cross-operator pattern detection (anonymous)
 */

import "server-only";

// ─── Public input ──────────────────────────────────────────────────────────

export interface DiscoveryInput {
  organizationId: string;
  /** EU Space Act operator code: "SCO" | "LO" | "LSO" | etc. */
  operatorType: string;
  /** ISO 3166-1 alpha-2 country code of operator establishment. */
  establishmentCountry: string;
  /** Optional: launch country if different from establishment. */
  launchCountry?: string;
  /** Optional: true if operator is non-EU (third-country). */
  isThirdCountry?: boolean;
  /** Optional: all operating jurisdictions (for multi-jurisdiction matches). */
  operatingJurisdictions?: string[];
}

// ─── Public output ─────────────────────────────────────────────────────────

export interface TrilateralDiscoveryResult {
  /** Authority-side: supervisory NCAs determined for this operator. */
  authorities: AuthoritySuggestion[];
  /** Counsel-side: matched law firms (with confidence). */
  counsel: CounselSuggestion[];
  /** Cross-actor signals (anonymized aggregations). */
  signals: CrossActorSignal[];
  /** Provenance + telemetry. */
  meta: DiscoveryMeta;
}

// ─── Authority ─────────────────────────────────────────────────────────────

export interface AuthoritySuggestion {
  /** NCA ID from src/data/ncas.ts (e.g. "bafa", "bnetza"). */
  ncaId: string;
  /** Display name. */
  name: string;
  /** Country code (ISO 3166-1 alpha-2). */
  countryCode: string;
  /** Whether this NCA is the primary supervisor (true) or secondary. */
  primary: boolean;
  /** Authorization pathway hint. */
  pathway: string;
  /** Articles + requirements the NCA covers for this operator. */
  relevantArticles: number[];
  requirements: string[];
  estimatedTimeline: string;
  /** Whether this NCA has Pharos enabled (= can receive submissions). */
  pharosEnabled: boolean;
  /** Confidence (0..1). 1.0 if determineNCA() matched directly. */
  confidence: number;
  notes?: string;
}

// ─── Counsel ───────────────────────────────────────────────────────────────

export interface CounselSuggestion {
  /** Atlas mandate ID if we matched an existing mandate. */
  matchedMandateId?: string;
  /** Display name of the law firm. */
  firmName: string;
  /** Country code where the firm primarily practices. */
  countryCode: string;
  /** Number of existing Caelex mandates this firm holds (proxy for fit). */
  existingMandateCount: number;
  /**
   * Match strategy:
   * - "mandate-jurisdiction-match": firm has mandates for operators in
   *   the same jurisdiction × operator-type
   * - "stakeholder-engagement": this org already has the firm in their
   *   stakeholder network
   * - "atlas-directory": the firm advertises capabilities matching
   *   this operator's profile
   * - "stub": no real match data available yet (Sprint A4.2 will fill)
   */
  matchStrategy: CounselMatchStrategy;
  /** Confidence (0..1). */
  confidence: number;
  /** Optional contact hint (email or website). */
  contactHint?: string;
  /** Optional reason ("Dr. Schmidt @ BHO has 12 DE LEO mandates"). */
  reasoning?: string;
}

export type CounselMatchStrategy =
  | "mandate-jurisdiction-match"
  | "stakeholder-engagement"
  | "atlas-directory"
  | "stub";

// ─── Cross-actor signals ───────────────────────────────────────────────────

export interface CrossActorSignal {
  /** Signal kind drives the UI affordance. */
  kind: CrossActorSignalKind;
  /** Human label for the operator. */
  label: string;
  /** Severity drives styling (info/warning/critical). */
  severity: "info" | "warning" | "critical";
  /** Optional CTA the UI can present. */
  cta?: { label: string; href: string };
  /** Structured payload — UI may render extra details. */
  details?: Record<string, unknown>;
}

export type CrossActorSignalKind =
  | "mandate-invite-ready" // Pattern 1 — counsel suggested
  | "oversight-handshake-ready" // Pattern 2 — NCA auto-detected
  | "counsel-search-alert" // Pattern 3 — counsel can subscribe
  | "authority-pipeline-share" // Pattern 4 — authority gets visibility
  | "cross-operator-anomaly"; // Pattern 5 — aggregated detection

// ─── Discovery metadata ────────────────────────────────────────────────────

export interface DiscoveryMeta {
  startedAt: string;
  durationMs: number;
  /** Whether the input was sufficient to attempt discovery. */
  inputComplete: boolean;
  /** Soft-fail warnings during discovery. */
  warnings: string[];
}
