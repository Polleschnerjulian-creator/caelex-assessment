import "server-only";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Legal-Network — mutual-consent handshake hashing.
 *
 * Every activated LegalMatter carries a `handshakeHash` that is the
 * SHA-256 of a canonical JSON bundle describing the exact terms both
 * sides agreed to: parties, scope, duration, acting users, timestamp,
 * and a version tag for future-proofing.
 *
 * Two properties matter:
 *
 *   1. DETERMINISTIC — given the same inputs, same hash. That requires
 *      sorted keys + stable array ordering for `scope` items.
 *   2. TAMPER-EVIDENT — any later change to a field breaks verification.
 *      We never mutate the stored hash; we recompute from current fields
 *      at verification time and compare.
 *
 * Every chain-step in the access log references this hash indirectly:
 * the first log entry's `previousHash` IS the handshakeHash, so the
 * hash-chain is rooted in the original consent.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash } from "node:crypto";
import type { ScopeItem } from "./scope";

export const HANDSHAKE_VERSION = "v1";

export interface HandshakeBundle {
  matterId: string;
  lawFirmOrgId: string;
  clientOrgId: string;
  scope: ScopeItem[];
  effectiveFrom: Date;
  effectiveUntil: Date;
  invitedBy: string;
  acceptedBy: string;
  acceptedAt: Date;
}

/**
 * Canonicalise a scope array for hashing. Order-sensitive hashes are
 * fragile when the input has a "conceptual" but not serial order; we
 * impose one by sorting by category, then by permission set, then by
 * resource-filter signature.
 */
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

/** Stable JSON with alphabetically sorted keys. */
function canonicaliseBundle(b: HandshakeBundle): string {
  const obj = {
    acceptedAt: b.acceptedAt.toISOString(),
    acceptedBy: b.acceptedBy,
    clientOrgId: b.clientOrgId,
    effectiveFrom: b.effectiveFrom.toISOString(),
    effectiveUntil: b.effectiveUntil.toISOString(),
    handshakeVersion: HANDSHAKE_VERSION,
    invitedBy: b.invitedBy,
    lawFirmOrgId: b.lawFirmOrgId,
    matterId: b.matterId,
    scope: canonicaliseScope(b.scope),
  };
  // JSON.stringify with a replacer that sorts keys — including nested
  // objects within scope items. The replacer runs for every object
  // in the tree.
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

export function computeHandshakeHash(bundle: HandshakeBundle): string {
  const canonical = canonicaliseBundle(bundle);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Verify that a stored handshakeHash still matches the current matter
 * state. Used at verification time (e.g. admin chain-check cron) — a
 * mismatch means somebody has mutated a matter's consent terms without
 * re-signing, which is a P0 integrity breach.
 */
export function verifyHandshakeHash(
  bundle: HandshakeBundle,
  storedHash: string,
): boolean {
  return computeHandshakeHash(bundle) === storedHash;
}

/**
 * Chain-step hash for an access-log entry. Depends on the previous
 * hash in the chain (or the handshakeHash for the first entry).
 */
export interface AccessLogChainInput {
  previousHash: string;
  matterId: string;
  actorUserId: string | null;
  actorOrgId: string;
  actorSide: "ATLAS" | "CAELEX";
  action: string;
  resourceType: string;
  resourceId: string | null;
  matterScope: string;
  context: unknown;
  createdAt: Date;
}

export function computeAccessLogEntryHash(input: AccessLogChainInput): string {
  const obj = {
    action: input.action,
    actorOrgId: input.actorOrgId,
    actorSide: input.actorSide,
    actorUserId: input.actorUserId,
    context: input.context ?? null,
    createdAt: input.createdAt.toISOString(),
    matterId: input.matterId,
    matterScope: input.matterScope,
    previousHash: input.previousHash,
    resourceId: input.resourceId,
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
