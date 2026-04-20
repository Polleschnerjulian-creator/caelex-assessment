/**
 * Verity Phase 2 — Regulator-Ready Bundle (Pillar 5).
 *
 * Shape of the single JSON artifact emitted by /api/v1/verity/bundle/export.
 * Contains every cryptographic primitive a third-party regulator needs to
 * verify a set of Verity attestations completely offline, including the
 * current revocation status of each.
 */

import type { ThresholdAttestation } from "../core/types";
import type {
  VerifiableCredential,
  DidWebDocument,
} from "../vc/verifiable-credential";
import type {
  InclusionProof,
  SignedTreeHead,
} from "../transparency/merkle-tree";

export type BundleStatusState = "valid" | "revoked" | "expired";

export interface BundleEntryStatus {
  state: BundleStatusState;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
}

export interface BundleEntry {
  /** The signed native attestation (Ed25519 + Pedersen/range-proof etc.). */
  attestation: ThresholdAttestation;
  /** The W3C Verifiable Credential form — identical semantic content. */
  vc: VerifiableCredential;
  /** Inclusion proof against the bundle's `sth`. Null when the attestation
   *  hasn't been covered by any signed tree head yet (freshly issued,
   *  pre-cron). */
  inclusion: InclusionProof | null;
  /** Current revocation / expiry state. */
  status: BundleEntryStatus;
}

export interface BundleConsistencyLink {
  fromSize: number;
  toSize: number;
  fromRoot: string;
  toRoot: string;
  proof: string[];
}

export interface BundleIssuerKey {
  keyId: string;
  publicKeyHex: string;
  algorithm: "Ed25519";
  active: boolean;
  createdAt: string;
  rotatedAt: string | null;
}

export interface BundleOperator {
  id: string;
  name: string | null;
}

export interface Bundle {
  bundleVersion: "verity-bundle-v1";
  /** SHA-256 over canonicalJson(bundle_without_bundleId). Deterministic —
   *  any recipient can re-derive it. */
  bundleId: string;
  issuedAt: string;
  operator: BundleOperator;
  entries: BundleEntry[];
  /** The signed tree head the inclusion proofs are anchored to. Null when
   *  no STH has been signed yet (log-empty or first-day). */
  sth: SignedTreeHead | null;
  /** Walk of consistency proofs across historical STHs, oldest → newest.
   *  Empty when only one STH has been signed. Each link proves that the
   *  log at `toSize` strictly extends the log at `fromSize`. */
  consistencyChain: BundleConsistencyLink[];
  /** Every Verity issuer key that signed anything in the bundle
   *  (attestations + STH), plus the currently-active key. */
  issuerKeys: BundleIssuerKey[];
  /** Snapshot of /.well-known/did.json at bundle emission time. */
  didDocument: DidWebDocument | null;
  /** Human-readable offline-verification guide (markdown). */
  readme: string;
}
