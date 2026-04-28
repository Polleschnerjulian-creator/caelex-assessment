import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Handshake — kryptografische Bindung der Aufsichts-Beziehung.
 *
 * Mirroring zu @/lib/legal-network/handshake (LegalMatter): wir hashen
 * das Bundle aus Bestellung-Metadaten + Scope-Definition canonical mit
 * SHA-256. Der Hash ist die ROOT der OversightAccessLog-Hash-Chain —
 * jeder Behörden-Zugriff verkettet sich daran und ist tamper-evident.
 *
 * Unterschied zu LegalMatter-Handshake: das Bundle trägt zusätzlich
 * `mandatoryDisclosure` (MDF) und `voluntaryDisclosure` (VDF) als zwei
 * separate Felder. Eine spätere VDF-Anpassung erzeugt einen neuen Hash
 * (mit logischer Migration des Audit-Chains durch ein Lifecycle-Event).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash } from "node:crypto";
import type { ScopeItem } from "@/lib/legal-network/scope";

export const PHAROS_HANDSHAKE_VERSION = "v1";

export interface OversightHandshakeBundle {
  oversightId: string;
  authorityProfileId: string;
  operatorOrgId: string;
  mandatoryDisclosure: ScopeItem[];
  voluntaryDisclosure: ScopeItem[];
  effectiveFrom: Date;
  effectiveUntil: Date;
  initiatedBy: string;
  acceptedBy: string;
  acceptedAt: Date;
  legalReference: string;
}

/** Canonicalise a scope array for hashing. Same algorithm as Atlas-side
 *  to keep cross-pillar consistency — order-sensitive hashes are fragile
 *  when the input has a "conceptual" but not serial order, so we sort
 *  by category, then by permission set. */
function canonicaliseScope(scope: ScopeItem[]): ScopeItem[] {
  return [...scope]
    .map((item) => ({
      category: item.category,
      permissions: [...item.permissions].sort(),
      ...(item.resourceFilter
        ? {
            resourceFilter: {
              ...(item.resourceFilter.assessmentIds
                ? {
                    assessmentIds: [
                      ...item.resourceFilter.assessmentIds,
                    ].sort(),
                  }
                : {}),
              ...(item.resourceFilter.jurisdictions
                ? {
                    jurisdictions: [
                      ...item.resourceFilter.jurisdictions,
                    ].sort(),
                  }
                : {}),
              ...(item.resourceFilter.spacecraftIds
                ? {
                    spacecraftIds: [
                      ...item.resourceFilter.spacecraftIds,
                    ].sort(),
                  }
                : {}),
            },
          }
        : {}),
    }))
    .sort((a, b) => {
      if (a.category !== b.category)
        return a.category.localeCompare(b.category);
      return a.permissions.join(",").localeCompare(b.permissions.join(","));
    });
}

/** Stable JSON with alphabetically sorted keys at all nesting levels. */
function canonicaliseBundle(b: OversightHandshakeBundle): string {
  const obj = {
    acceptedAt: b.acceptedAt.toISOString(),
    acceptedBy: b.acceptedBy,
    authorityProfileId: b.authorityProfileId,
    effectiveFrom: b.effectiveFrom.toISOString(),
    effectiveUntil: b.effectiveUntil.toISOString(),
    handshakeVersion: PHAROS_HANDSHAKE_VERSION,
    initiatedBy: b.initiatedBy,
    legalReference: b.legalReference,
    mandatoryDisclosure: canonicaliseScope(b.mandatoryDisclosure),
    operatorOrgId: b.operatorOrgId,
    oversightId: b.oversightId,
    voluntaryDisclosure: canonicaliseScope(b.voluntaryDisclosure),
  };
  return JSON.stringify(obj, (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort())
        out[k] = (v as Record<string, unknown>)[k];
      return out;
    }
    return v;
  });
}

export function computeOversightHandshakeHash(
  bundle: OversightHandshakeBundle,
): string {
  return createHash("sha256")
    .update(canonicaliseBundle(bundle), "utf8")
    .digest("hex");
}

/** Verify a stored handshakeHash still matches the current oversight
 *  state. For chain-verification crons / admin integrity checks. */
export function verifyOversightHandshakeHash(
  bundle: OversightHandshakeBundle,
  storedHash: string,
): boolean {
  return computeOversightHandshakeHash(bundle) === storedHash;
}

/** Hash one entry in the OversightAccessLog chain. previousHash is the
 *  prior log entry's entryHash (or the OversightRelationship.handshakeHash
 *  for the first entry). Identical pattern to legal-network log chain. */
export interface OversightAccessLogChainInput {
  previousHash: string;
  oversightId: string;
  actorUserId: string | null;
  actorOrgId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  matterScope: string;
  context: unknown;
  createdAt: Date;
}

export function computeOversightAccessLogEntryHash(
  input: OversightAccessLogChainInput,
): string {
  const obj = {
    action: input.action,
    actorOrgId: input.actorOrgId,
    actorUserId: input.actorUserId ?? "",
    context: input.context ?? null,
    createdAt: input.createdAt.toISOString(),
    matterScope: input.matterScope,
    oversightId: input.oversightId,
    previousHash: input.previousHash,
    resourceId: input.resourceId ?? "",
    resourceType: input.resourceType,
  };
  const canonical = JSON.stringify(obj, (_k, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort())
        out[k] = (v as Record<string, unknown>)[k];
      return out;
    }
    return v;
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
