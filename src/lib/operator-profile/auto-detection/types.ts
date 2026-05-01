/**
 * Auto-Detection Framework — public contract types (Sprint 2A)
 *
 * Every public-source adapter (VIES, Handelsregister-DE, UNOOSA, BAFA)
 * implements `AutoDetectionAdapter`. The cross-verifier (`cross-verifier.ts`)
 * consumes the results and writes `T2_SOURCE_VERIFIED` evidence rows via
 * `bulkSetVerifiedFields()`.
 *
 * **Why a uniform shape:** the cross-verifier needs to merge results from
 * multiple sources, detect agreement / conflict, score confidence, and
 * produce an audit trail showing exactly which sources contributed which
 * fields. A homogenous adapter contract makes that compression possible.
 *
 * Reference: ADR-009 (VIES first, Handelsregister second)
 */

import type { AttestationRef, WritableVerifiedField } from "../types";

// Re-export for convenience — adapters import from one place.
export type { WritableVerifiedField };

// ─── Source Identification ─────────────────────────────────────────────────

/**
 * Stable identifier for an upstream source. Stored on `AttestationRef.source`
 * so revoked / re-verified rows can be correlated. New adapters add new
 * keys here — never reuse an existing key for a different source.
 */
export type SourceKey =
  | "vies-eu-vat"
  | "celestrak-satcat"
  | "handelsregister-de"
  | "bundesanzeiger-de"
  | "unoosa-online-index"
  | "bafa-public-register"
  | "opencorporates"
  | "other";

// ─── Adapter Input ─────────────────────────────────────────────────────────

/**
 * Identity hints we already have about the operator. The adapter uses
 * whichever fields are relevant to its source. Most fields are optional —
 * adapters that need a specific one (VIES needs vatId) should reject early
 * with a clear `error` if it's missing.
 */
export interface AdapterInput {
  organizationId: string;

  /** Legal name as the operator typed it (or anything we already extracted). */
  legalName?: string;

  /** Country hint — ISO 3166-1 alpha-2 (DE, FR, NL, ...). */
  establishment?: string;

  /** EU VAT-ID format: <countryCode><digits>, e.g. "DE123456789". */
  vatId?: string;

  /** Handelsregister number, e.g. "HRB 12345 Berlin". */
  registryNumber?: string;

  /** UNOOSA satellite registration number, if known. */
  unoosaId?: string;

  /** BAFA export licence number, if known. */
  bafaLicenceId?: string;

  /**
   * Optional caller-supplied AbortSignal for cancellation (re-verification
   * cron uses this when its function-execution budget expires).
   */
  signal?: AbortSignal;

  /** Override fetch implementation — used by tests, never in prod. */
  fetchImpl?: typeof fetch;

  /** Fetch timeout in ms (default 10 000). */
  timeoutMs?: number;
}

// ─── Adapter Output ────────────────────────────────────────────────────────

/**
 * One verified field returned by an adapter. The cross-verifier inspects
 * `confidence` to detect agreement between sources.
 *
 *   - `value`        — the value the source asserts
 *   - `confidence`   — adapter's self-reported confidence ([0, 1])
 *   - `evidenceText` — short human-readable note for the audit trail
 *
 * The value type is intentionally `unknown` so adapters can return strings,
 * numbers, booleans, dates — whatever the field's TypeScript type expects.
 */
export interface DetectedField {
  fieldName: WritableVerifiedField;
  value: unknown;
  confidence: number;
  evidenceText?: string;
}

/**
 * Complete adapter result. The `rawArtifact` is the un-parsed payload from
 * the source — used by `appendEvidence()` to compute `sourceHash` so anyone
 * with the same artifact can reproduce the proof.
 */
export interface AdapterResult {
  source: SourceKey;
  fetchedAt: Date;
  sourceUrl: string;

  /**
   * Raw upstream content (HTML, JSON dump, SOAP envelope text). Hashed
   * verbatim so later verifiers can recompute the source-hash and detect
   * tampering. Not exposed to UI — internal evidence only.
   */
  rawArtifact: string | Record<string, unknown> | null;

  /**
   * AttestationRef the cross-verifier should attach when calling
   * setVerifiedField. Adapters fill this themselves so they're authoritative
   * on what kind of attestation they're producing.
   */
  attestation: Extract<AttestationRef, { kind: "public-source" }>;

  fields: DetectedField[];

  /** Non-fatal warnings — surfaced to operator UI as "verify this manually". */
  warnings: string[];
}

/**
 * Adapter outcome — either success with fields, or failure with an error
 * code that the cross-verifier can react to (back-off, alternative source).
 */
export type AdapterOutcome =
  | { ok: true; result: AdapterResult }
  | {
      ok: false;
      source: SourceKey;
      errorKind:
        | "missing-input"
        | "not-found"
        | "rate-limited"
        | "remote-error"
        | "parse-error"
        | "timeout"
        | "unauthorized"
        | "network";
      message: string;
      retryAfterMs?: number;
    };

// ─── Adapter Contract ──────────────────────────────────────────────────────

/**
 * Every adapter exports an `AutoDetectionAdapter` object. Function-shaped
 * (not class-shaped) because the runtime never instantiates adapters — they
 * are used as singletons. Easier to mock in tests, easier to compose.
 */
export interface AutoDetectionAdapter {
  /** Stable source key — matches `SourceKey` above. */
  readonly source: SourceKey;

  /** Human-readable name for logs / UI. */
  readonly displayName: string;

  /**
   * True iff the adapter has enough input hints to attempt detection.
   * The cross-verifier checks this before calling detect() so we don't
   * fire requests with insufficient information.
   */
  canDetect(input: AdapterInput): boolean;

  /**
   * Run the adapter. MUST handle network errors, parse errors, timeouts
   * gracefully — never throw uncaught. Return `{ ok: false, ... }` instead.
   */
  detect(input: AdapterInput): Promise<AdapterOutcome>;
}

// ─── Cross-Verification Result ─────────────────────────────────────────────

/**
 * Result of running multiple adapters and merging their outputs.
 *
 * For each field, the cross-verifier reports:
 *   - `agreementCount` — how many adapters returned this same value
 *   - `conflicts` — adapters that returned a different value
 *   - `chosenValue` — the cross-verifier's pick
 *   - `chosenSource` — which adapter we trusted most
 *   - `tier` — verification tier we should write (T1 if 1 source, T2 if ≥2 agreeing)
 */
export interface MergedField {
  fieldName: WritableVerifiedField;
  chosenValue: unknown;
  chosenSource: SourceKey;
  agreementCount: number;
  conflicts: Array<{ source: SourceKey; conflictingValue: unknown }>;
  contributingAdapters: SourceKey[];
}

export interface CrossVerificationResult {
  organizationId: string;
  startedAt: Date;
  finishedAt: Date;

  /** Successful adapter outcomes — used for source-hash + attestation. */
  successfulOutcomes: AdapterResult[];

  /** Failed adapter outcomes — recorded for telemetry. */
  failures: Array<Extract<AdapterOutcome, { ok: false }>>;

  /** Merged fields ready to be written via bulkSetVerifiedFields. */
  mergedFields: MergedField[];
}
