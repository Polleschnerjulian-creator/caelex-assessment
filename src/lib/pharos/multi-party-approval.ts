import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos k-of-n Multi-Party-Approval.
 *
 * Substanzielle Behörden-Entscheidungen (Genehmigungs-Bescheide,
 * Sanktions-Anordnungen, Cross-Border-Sharing-Freigaben, MDF-Erweiterungen)
 * sollten NIE von einer einzelnen Person final unterzeichnet werden —
 * gerade in einer Glass-Box-Architektur ist die Einzelperson das
 * schwächste Glied.
 *
 * Pattern: jede "high-stakes"-Aktion erzeugt eine `ApprovalRequest`,
 * sammelt Ed25519-Signaturen von k-of-n autorisierten Sachbearbeitern,
 * validiert das Quorum und schreibt das Aggregat als signierten Receipt
 * in die Hash-Chain. Default-Profil EU Space Act Art. 88 TLPT-Ergebnis:
 * 2-of-3 (Sachbearbeiter + Referatsleiter + Datenschutzbeauftragter).
 *
 * Phase 1 (jetzt): in-memory Approval-Sammlung + crypto-Quorum-
 * Verifikation + Receipt-Persistierung. Phase 2: dedizierte
 * `ApprovalRequest`-Tabelle in Prisma + UI-Surface in Pharos-Shell
 * für ausstehende Approvals.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash, sign } from "node:crypto";
import { logger } from "@/lib/logger";
import { deriveAuthorityKeypair, verifyReceiptSignature } from "./receipt";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) {
        out[k] = (v as Record<string, unknown>)[k];
      }
      return out;
    }
    return v;
  });
}

// ─── Approval Profiles ────────────────────────────────────────────────

export type ApprovalKind =
  | "OVERSIGHT_INITIATION"
  | "OVERSIGHT_REVOCATION"
  | "MDF_AMENDMENT"
  | "CROSS_BORDER_SHARING"
  | "SANCTION_ORDER"
  | "AUTHORIZATION_DECISION"
  | "GENERIC";

export interface ApprovalProfile {
  /** Wieviele Signaturen sind nötig? */
  k: number;
  /** Aus wie vielen autorisierten Approvers? */
  n: number;
  /** Welche Rollen müssen mindestens vertreten sein? */
  requiredRoles: ApproverRole[];
  /** Maximale Wartezeit bevor die Request expiriert. */
  ttlHours: number;
}

export type ApproverRole =
  | "SACHBEARBEITER"
  | "REFERATSLEITER"
  | "DATENSCHUTZBEAUFTRAGTER"
  | "RECHTSREFERENT"
  | "INSPEKTOR"
  | "BEHOERDENLEITER";

export const DEFAULT_PROFILES: Record<ApprovalKind, ApprovalProfile> = {
  OVERSIGHT_INITIATION: {
    k: 1,
    n: 1,
    requiredRoles: ["SACHBEARBEITER"],
    ttlHours: 168,
  },
  OVERSIGHT_REVOCATION: {
    k: 2,
    n: 3,
    requiredRoles: ["SACHBEARBEITER", "REFERATSLEITER"],
    ttlHours: 72,
  },
  MDF_AMENDMENT: {
    k: 2,
    n: 3,
    requiredRoles: ["SACHBEARBEITER", "DATENSCHUTZBEAUFTRAGTER"],
    ttlHours: 72,
  },
  CROSS_BORDER_SHARING: {
    k: 3,
    n: 5,
    requiredRoles: [
      "SACHBEARBEITER",
      "REFERATSLEITER",
      "DATENSCHUTZBEAUFTRAGTER",
    ],
    ttlHours: 168,
  },
  SANCTION_ORDER: {
    k: 2,
    n: 3,
    requiredRoles: ["SACHBEARBEITER", "RECHTSREFERENT"],
    ttlHours: 240,
  },
  AUTHORIZATION_DECISION: {
    k: 2,
    n: 3,
    requiredRoles: ["SACHBEARBEITER", "REFERATSLEITER"],
    ttlHours: 336,
  },
  GENERIC: {
    k: 2,
    n: 3,
    requiredRoles: ["SACHBEARBEITER"],
    ttlHours: 168,
  },
};

// ─── ApprovalRequest payloads ────────────────────────────────────────

export interface ApprovalRequest {
  id: string;
  kind: ApprovalKind;
  payload: Record<string, unknown>;
  authorityProfileId: string;
  oversightId?: string;
  initiatedBy: string;
  initiatedAt: string;
  expiresAt: string;
  /** Hash über (kind, payload, authorityProfileId, oversightId, initiatedAt).
   *  Jede Approval-Signatur deckt EXAKT diesen Hash ab — wenn der Payload
   *  geändert wird, sind alle bisherigen Signaturen invalid. */
  payloadHash: string;
}

export function buildApprovalRequest(input: {
  id: string;
  kind: ApprovalKind;
  payload: Record<string, unknown>;
  authorityProfileId: string;
  oversightId?: string;
  initiatedBy: string;
  ttlHours?: number;
}): ApprovalRequest {
  const profile = DEFAULT_PROFILES[input.kind];
  const ttl = input.ttlHours ?? profile.ttlHours;
  const initiatedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttl * 3600_000).toISOString();
  const payloadHash = sha256Hex(
    canonicalJson({
      authorityProfileId: input.authorityProfileId,
      initiatedAt,
      kind: input.kind,
      oversightId: input.oversightId ?? null,
      payload: input.payload,
    }),
  );
  return {
    id: input.id,
    kind: input.kind,
    payload: input.payload,
    authorityProfileId: input.authorityProfileId,
    oversightId: input.oversightId,
    initiatedBy: input.initiatedBy,
    initiatedAt,
    expiresAt,
    payloadHash,
  };
}

// ─── Approval Signing ─────────────────────────────────────────────────

export interface ApprovalSignature {
  approverUserId: string;
  approverRole: ApproverRole;
  payloadHash: string;
  signature: string; // base64 Ed25519
  publicKeyBase64: string;
  signedAt: string;
}

/** Sign an approval request as one approver. The Ed25519 keypair is
 *  derived deterministically from `ENCRYPTION_KEY + approverUserId`,
 *  identical pattern to AuthorityProfile-keypairs. */
export function signApproval(
  request: ApprovalRequest,
  approverUserId: string,
  approverRole: ApproverRole,
): ApprovalSignature {
  const kp = deriveAuthorityKeypair(`approver:${approverUserId}`);
  const sig = sign(
    null,
    Buffer.from(request.payloadHash, "hex"),
    kp.privateKey,
  );
  return {
    approverUserId,
    approverRole,
    payloadHash: request.payloadHash,
    signature: sig.toString("base64"),
    publicKeyBase64: kp.publicKeyBase64,
    signedAt: new Date().toISOString(),
  };
}

// ─── Quorum Verification ─────────────────────────────────────────────

export interface ApprovalVerdict {
  ok: boolean;
  validSignatures: number;
  invalidSignatures: number;
  requiredK: number;
  rolesPresent: ApproverRole[];
  rolesMissing: ApproverRole[];
  reason?: string;
  /** Aggregierter Quorum-Hash — Ed25519-signierbar als finales Receipt
   *  für die Hash-Chain. */
  aggregateHash?: string;
}

export function verifyApprovalQuorum(
  request: ApprovalRequest,
  signatures: ApprovalSignature[],
  profile: ApprovalProfile = DEFAULT_PROFILES[request.kind],
): ApprovalVerdict {
  // Expiry check.
  if (Date.now() > Date.parse(request.expiresAt)) {
    return {
      ok: false,
      validSignatures: 0,
      invalidSignatures: signatures.length,
      requiredK: profile.k,
      rolesPresent: [],
      rolesMissing: profile.requiredRoles,
      reason: "Approval-Request ist abgelaufen.",
    };
  }

  let validSignatures = 0;
  let invalidSignatures = 0;
  const seenApprovers = new Set<string>();
  const rolesPresent = new Set<ApproverRole>();

  for (const s of signatures) {
    if (s.payloadHash !== request.payloadHash) {
      invalidSignatures++;
      continue;
    }
    if (seenApprovers.has(s.approverUserId)) continue;
    if (verifyReceiptSignature(s.payloadHash, s.signature, s.publicKeyBase64)) {
      validSignatures++;
      seenApprovers.add(s.approverUserId);
      rolesPresent.add(s.approverRole);
    } else {
      invalidSignatures++;
    }
  }

  const rolesMissing = profile.requiredRoles.filter(
    (r) => !rolesPresent.has(r),
  );

  if (validSignatures < profile.k) {
    return {
      ok: false,
      validSignatures,
      invalidSignatures,
      requiredK: profile.k,
      rolesPresent: Array.from(rolesPresent),
      rolesMissing,
      reason: `Nur ${validSignatures}/${profile.k} gültige Signaturen.`,
    };
  }
  if (rolesMissing.length > 0) {
    return {
      ok: false,
      validSignatures,
      invalidSignatures,
      requiredK: profile.k,
      rolesPresent: Array.from(rolesPresent),
      rolesMissing,
      reason: `Fehlende Pflicht-Rollen: ${rolesMissing.join(", ")}.`,
    };
  }

  // Aggregat-Hash: deterministisch über alle gültigen Signaturen.
  const validSorted = signatures
    .filter((s) => seenApprovers.has(s.approverUserId))
    .sort((a, b) => a.approverUserId.localeCompare(b.approverUserId));
  const aggregateHash = sha256Hex(
    canonicalJson({
      payloadHash: request.payloadHash,
      signers: validSorted.map((s) => ({
        approverUserId: s.approverUserId,
        approverRole: s.approverRole,
        signature: s.signature,
      })),
    }),
  );

  return {
    ok: true,
    validSignatures,
    invalidSignatures,
    requiredK: profile.k,
    rolesPresent: Array.from(rolesPresent),
    rolesMissing: [],
    aggregateHash,
  };
}
