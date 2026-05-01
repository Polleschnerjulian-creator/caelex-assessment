/**
 * Operator-Profile — Public Types (Sprint 1A)
 *
 * Contract for the verified-profile-tier system. These types are the bridge
 * between:
 *
 *   - Prisma's `DerivationTrace` row (extended in Sprint 1A with verification
 *     fields, see ADR-008)
 *   - Service callers (`evidence.server.ts`, `profile.server.ts`, future
 *     `auto-detection-engine.server.ts`)
 *   - UI consumers (Trust-Chips, Verification-Badge, Re-verification panel)
 *
 * This file is **isomorphic** — safe to import from both server and client.
 * Server-only logic lives in `evidence.server.ts`.
 *
 * Reference: docs/CAELEX-PRECISION-COMPLIANCE-ENGINE.md (T0-T5 semantics)
 */

// ─── Writable Field Names ──────────────────────────────────────────────────

/**
 * Set of OperatorProfile fields that can be verified through the tier
 * system. Maps 1:1 onto OperatorProfile columns. Defined here (in the
 * isomorphic types module) so non-server callers like the auto-detection
 * adapter framework can reference it without dragging in `server-only`.
 */
export type WritableVerifiedField =
  | "operatorType"
  | "euOperatorCode"
  | "entitySize"
  | "establishment"
  | "primaryOrbit"
  | "orbitAltitudeKm"
  | "satelliteMassKg"
  | "isConstellation"
  | "constellationSize"
  | "missionDurationMonths"
  | "plannedLaunchDate"
  | "offersEUServices";

// ─── Verification Tier ─────────────────────────────────────────────────────

/**
 * The T0–T5 verification ladder. Mirrors the Prisma enum exactly — kept here
 * so non-Prisma callers (UI, tests, public API contracts) do not need to
 * import from `@prisma/client`.
 *
 * Higher tier = stronger evidence + auditable chain. Drives:
 *   - UI Trust-Chip color
 *   - Workflow gate ("step requires ≥ T3")
 *   - Re-verification cron priority
 *   - Snapshot inclusion threshold
 */
export const VerificationTier = {
  T0_UNVERIFIED: "T0_UNVERIFIED",
  T1_SELF_CONFIRMED: "T1_SELF_CONFIRMED",
  T2_SOURCE_VERIFIED: "T2_SOURCE_VERIFIED",
  T3_COUNSEL_ATTESTED: "T3_COUNSEL_ATTESTED",
  T4_AUTHORITY_VERIFIED: "T4_AUTHORITY_VERIFIED",
  T5_CRYPTOGRAPHIC_PROOF: "T5_CRYPTOGRAPHIC_PROOF",
} as const;

export type VerificationTier =
  (typeof VerificationTier)[keyof typeof VerificationTier];

/** Canonical ordering — useful for "≥ T3" comparisons. */
export const TIER_RANK: Record<VerificationTier, number> = {
  T0_UNVERIFIED: 0,
  T1_SELF_CONFIRMED: 1,
  T2_SOURCE_VERIFIED: 2,
  T3_COUNSEL_ATTESTED: 3,
  T4_AUTHORITY_VERIFIED: 4,
  T5_CRYPTOGRAPHIC_PROOF: 5,
};

/** Compare two tiers by strength. Returns true iff `a` ≥ `b`. */
export function tierAtLeast(
  a: VerificationTier | null | undefined,
  b: VerificationTier,
): boolean {
  if (!a) return false;
  return TIER_RANK[a] >= TIER_RANK[b];
}

/**
 * Default re-verification interval per tier. After this many days, evidence
 * is considered "stale" and the re-verification cron re-checks the source.
 * Lower tiers re-verify more often because they are the cheapest to refresh.
 */
export const TIER_REVERIFICATION_DAYS: Record<VerificationTier, number> = {
  T0_UNVERIFIED: 30, // re-poke the operator monthly to upgrade tier
  T1_SELF_CONFIRMED: 90, // operator confirms quarterly
  T2_SOURCE_VERIFIED: 180, // re-fetch public source semi-annually
  T3_COUNSEL_ATTESTED: 365, // counsel re-attests annually
  T4_AUTHORITY_VERIFIED: 730, // authority verification is sticky for 2 years
  T5_CRYPTOGRAPHIC_PROOF: 0, // never expires (cryptographic proof is timeless)
};

// ─── Attestation Pointer ───────────────────────────────────────────────────

/**
 * Free-form pointer to whatever outer object attests this evidence row.
 * Discriminated union keeps consumers honest about which kind of pointer
 * they are dealing with — no implicit JSON-blob unpacking.
 *
 * Stored in `DerivationTrace.attestationRef` as JSONB.
 */
export type AttestationRef =
  | {
      kind: "verity";
      attestationId: string; // VerityAttestation.id
      issuerKeyId: string; // VerityIssuerKey.keyId
    }
  | {
      kind: "counsel";
      engagementId: string; // future CounselEngagement.id
      counselFirmName?: string;
      signedDocumentRef?: string; // pointer to signed PDF in document vault
    }
  | {
      kind: "authority";
      authority: string; // "BAFA" | "BNetzA" | "ESA" | ...
      decisionRef: string; // NCA-decision-id or letter-ref
      decisionDate: string; // ISO date
    }
  | {
      kind: "public-source";
      source: "handelsregister-de" | "unoosa" | "bafa-public" | "other";
      sourceUrl: string;
      fetchedAt: string; // ISO datetime
      etag?: string; // for re-verification cache busting
    }
  | {
      kind: "self";
      userId: string;
      confirmedAt: string; // ISO datetime
    };

// ─── Evidence Row (read-shape) ─────────────────────────────────────────────

/**
 * Read-shape returned by `loadEvidence()` — DerivationTrace row narrowed
 * to verification-relevant fields. Other fields (origin, sourceRef,
 * confidence, modelVersion) are still on the row but not required to render
 * a Trust-Chip.
 */
export interface EvidenceRow {
  id: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  value: string;

  verificationTier: VerificationTier | null;
  sourceHash: string | null;
  prevHash: string | null;
  entryHash: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  attestationRef: AttestationRef | null;
  revokedAt: Date | null;
  revokedReason: string | null;

  derivedAt: Date;
  expiresAt: Date | null;
}

// ─── Append-Evidence Input ─────────────────────────────────────────────────

/**
 * Input shape for `appendEvidence()` — one verified value being added to the
 * provenance chain.
 *
 * Important: `value` is anything JSON-serialisable; the service serialises
 * it canonically before hashing. Consumers should NOT pre-serialise.
 *
 * `sourceArtifact` is the raw upstream content used to derive the value.
 * The service computes `sourceHash = sha256(sourceArtifact)` so anyone with
 * the same artifact can reproduce the proof.
 */
export interface AppendEvidenceInput {
  organizationId: string;
  entityType: string; // "operator_profile" | "workflow_step" | ...
  entityId: string;
  fieldName: string;
  value: unknown;

  tier: VerificationTier;

  /**
   * Free-form upstream artifact. Either a string (raw HTML, JSON dump,
   * regulator letter text), a Buffer, or a structured object. The service
   * canonicalises and hashes it.
   */
  sourceArtifact: string | Buffer | Record<string, unknown> | null;

  /** Pointer to the outer attestation. See AttestationRef discriminated union. */
  attestationRef: AttestationRef | null;

  /** ISO datetime when verification took place. Default: now(). */
  verifiedAt?: Date;

  /** User.id of whoever triggered the verification. */
  verifiedBy?: string;

  /**
   * Origin (mirrors existing DerivationTrace.origin field). If omitted,
   * inferred from tier:
   *   - T0 → "user-asserted"
   *   - T1 → "user-asserted"
   *   - T2 → "source-backed"
   *   - T3 → "user-asserted" (counsel-asserted)
   *   - T4 → "deterministic" (authority-asserted)
   *   - T5 → "deterministic"
   */
  origin?:
    | "deterministic"
    | "source-backed"
    | "assessment"
    | "user-asserted"
    | "ai-inferred";

  /** AI fields — required when origin = "ai-inferred". */
  confidence?: number;
  modelVersion?: string;

  /** Custom expiry. Default: derived from tier (TIER_REVERIFICATION_DAYS). */
  expiresAt?: Date | null;

  /** Upstream trace IDs — used for what-if downstream-impact queries. */
  upstreamTraceIds?: string[];
}

/**
 * Result of a successful evidence append. The hash fields are guaranteed
 * non-null at this point; `prevHash === GENESIS_<orgId>` if this is the
 * first row in the chain for that org.
 */
export interface AppendEvidenceResult {
  id: string;
  entryHash: string;
  prevHash: string;
  sourceHash: string;
  verificationTier: VerificationTier;
  derivedAt: Date;
}

// ─── Chain-Verification Result ─────────────────────────────────────────────

export interface VerifyEvidenceChainResult {
  valid: boolean;
  checkedEntries: number;
  brokenAt?: {
    entryId: string;
    derivedAt: Date;
    expectedPrev: string;
    actualPrev: string | null;
    fieldDiffers?: "prevHash" | "entryHash";
  };
}

// ─── Tier Inference Helpers ────────────────────────────────────────────────

/**
 * Default origin to assume when the caller doesn't pass one. Matches the
 * mapping documented on AppendEvidenceInput.origin.
 */
export function defaultOriginForTier(
  tier: VerificationTier,
): "deterministic" | "source-backed" | "user-asserted" {
  switch (tier) {
    case "T0_UNVERIFIED":
    case "T1_SELF_CONFIRMED":
    case "T3_COUNSEL_ATTESTED":
      return "user-asserted";
    case "T2_SOURCE_VERIFIED":
      return "source-backed";
    case "T4_AUTHORITY_VERIFIED":
    case "T5_CRYPTOGRAPHIC_PROOF":
      return "deterministic";
  }
}

/**
 * UI palette for Trust-Chip rendering. Tailwind class fragments only —
 * components compose into final classNames. Mirrors the precision-compliance
 * design system (see docs/CAELEX-PRECISION-COMPLIANCE-ENGINE.md).
 */
export const TIER_UI_PALETTE: Record<
  VerificationTier,
  { bg: string; border: string; text: string; label: string }
> = {
  T0_UNVERIFIED: {
    bg: "bg-slate-700/30",
    border: "border-slate-500/40",
    text: "text-slate-300",
    label: "Unverified",
  },
  T1_SELF_CONFIRMED: {
    bg: "bg-amber-700/20",
    border: "border-amber-500/40",
    text: "text-amber-200",
    label: "Self-Confirmed",
  },
  T2_SOURCE_VERIFIED: {
    bg: "bg-sky-700/20",
    border: "border-sky-500/40",
    text: "text-sky-200",
    label: "Source-Verified",
  },
  T3_COUNSEL_ATTESTED: {
    bg: "bg-emerald-700/20",
    border: "border-emerald-500/40",
    text: "text-emerald-200",
    label: "Counsel-Attested",
  },
  T4_AUTHORITY_VERIFIED: {
    bg: "bg-indigo-700/20",
    border: "border-indigo-500/40",
    text: "text-indigo-200",
    label: "Authority-Verified",
  },
  T5_CRYPTOGRAPHIC_PROOF: {
    bg: "bg-yellow-600/20",
    border: "border-yellow-500/50",
    text: "text-yellow-200",
    label: "Cryptographic Proof",
  },
};
