import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Audit-Log service.
 *
 * Single entry-point for "who did what, when, in what context" inside
 * the Atlas surface. Required for selling Atlas to law firms (legal-
 * software compliance) + for investigating "what happened to my chat?"
 * support tickets.
 *
 * Storage: AtlasAuditLog Prisma model (additive — no migration of
 * existing data). Hash-chained per organisation: each new row
 * references the previous row's hash via prevHash, and the row's
 * own hash is sha256(prevHash + canonical-payload). A break in the
 * chain proves tampering.
 *
 * IMPORTANT — call this from server-side code only (`server-only`
 * imported at top). Never invoke from a client component, never from
 * a route handler with the wrong identity propagation. The userId +
 * organizationId arguments come from getAtlasAuth() in API routes.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/* Action verbs — namespaced under `atlas.*` so they don't collide
   with the platform-wide AuditLog actions. New verbs can be added
   freely; existing verbs must NEVER be renamed (would break the
   audit-log search filters in the admin UI). */
export type AtlasAuditAction =
  | "atlas.chat.create"
  | "atlas.chat.delete"
  | "atlas.chat.export"
  | "atlas.mandate.create"
  | "atlas.mandate.update"
  | "atlas.mandate.archive"
  | "atlas.mandate.member.add"
  | "atlas.mandate.member.remove"
  | "atlas.file.upload"
  | "atlas.file.download"
  | "atlas.file.delete"
  | "atlas.transcribe";

export interface AtlasAuditWriteArgs {
  userId: string | null;
  organizationId: string | null;
  action: AtlasAuditAction;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Append a row to the Atlas audit log. Hash-chained per organisation.
 *
 * Designed to be fire-and-forget: failures are logged but never
 * thrown back to the caller. The reason: an audit-write failing
 * should NEVER block a user action. The platform-wide AuditLog
 * service uses the same approach.
 */
/* T0.4 (2026-05-26): Retry-on-transient-failure. Audit-log writes
   are critical for the tamper-evidence trail; a single Neon hiccup
   or pgpool restart shouldn't silently drop a row. We retry up to 3
   times with exponential-style backoff before falling through to
   the error-log + give-up path. The hash chain stays correct under
   retry because each attempt re-fetches `prevHash` — if a concurrent
   writer inserted between attempts, we chain off the new tail. */
const RETRY_DELAYS_MS: readonly number[] = [100, 500, 2000];

/** Test seam: lets the unit suite override with [0, 0, 0] so retries
 *  don't add 2.6s of real wall-clock to every retry-path test. Not
 *  exported for production consumers — internal-only. */
let retryDelaysOverride: readonly number[] | null = null;
export function __setRetryDelaysForTest(
  delays: readonly number[] | null,
): void {
  retryDelaysOverride = delays;
}
function getRetryDelays(): readonly number[] {
  return retryDelaysOverride ?? RETRY_DELAYS_MS;
}

export async function appendAtlasAudit(
  args: AtlasAuditWriteArgs,
): Promise<void> {
  const delays = getRetryDelays();
  /* attempts = 1 initial + N retries. */
  const maxAttempts = delays.length + 1;
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      /* Resolve previous-hash per org. We chain per-org so a single
         compromised org's audit history doesn't invalidate every
         other org's chain. Re-fetched per attempt so a concurrent
         writer that inserted between our attempts still produces a
         valid chain (we tail off whichever row is now last). */
      let prevHash: string | null = null;
      if (args.organizationId) {
        const last = await prisma.atlasAuditLog.findFirst({
          where: { organizationId: args.organizationId },
          orderBy: { createdAt: "desc" },
          select: { hash: true },
        });
        prevHash = last?.hash ?? null;
      } else {
        /* System events (no org) chain on a global "system" pseudo-org. */
        const last = await prisma.atlasAuditLog.findFirst({
          where: { organizationId: null },
          orderBy: { createdAt: "desc" },
          select: { hash: true },
        });
        prevHash = last?.hash ?? null;
      }

      const payload = {
        userId: args.userId,
        organizationId: args.organizationId,
        action: args.action,
        entityType: args.entityType ?? null,
        entityId: args.entityId ?? null,
        metadata: args.metadata ?? null,
        timestamp: new Date().toISOString(),
      };
      const canonical = JSON.stringify(payload);
      const hash = crypto
        .createHash("sha256")
        .update((prevHash ?? "") + canonical)
        .digest("hex");

      await prisma.atlasAuditLog.create({
        data: {
          userId: args.userId,
          organizationId: args.organizationId,
          action: args.action,
          entityType: args.entityType ?? null,
          entityId: args.entityId ?? null,
          metadata: args.metadata ? (args.metadata as object) : undefined,
          ipAddress: args.ipAddress ?? null,
          userAgent: args.userAgent ?? null,
          hash,
          prevHash,
        },
      });
      /* Success — surface a warn only if we needed retries, so ops
         can spot DB-flakiness trends. */
      if (attempt > 0) {
        logger.warn("[atlas/audit-log] append succeeded after retries", {
          action: args.action,
          attemptsTaken: attempt + 1,
        });
      }
      return;
    } catch (err) {
      lastErr = err;
      const isLastAttempt = attempt === maxAttempts - 1;
      if (!isLastAttempt) {
        const delay = delays[attempt];
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        /* else: zero delay (test mode) — loop immediately. */
      }
    }
  }

  /* All retries exhausted — log + give up. Fire-and-forget: never
     throws to the caller (audit-log failure must not block the user
     action that triggered it). */
  logger.error("[atlas/audit-log] append failed after retries", {
    action: args.action,
    userId: args.userId,
    organizationId: args.organizationId,
    attempts: maxAttempts,
    error: lastErr instanceof Error ? lastErr.message : String(lastErr),
  });
}

export interface AtlasAuditQuery {
  organizationId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  since?: Date;
  until?: Date;
  limit?: number;
}

/**
 * Read the Atlas audit log. Admin-only via the calling page — this
 * helper does NOT enforce access control. The caller (admin page)
 * must gate access via requirePlatformAdmin first.
 */
export async function readAtlasAudit(q: AtlasAuditQuery = {}) {
  return prisma.atlasAuditLog.findMany({
    where: {
      ...(q.organizationId && { organizationId: q.organizationId }),
      ...(q.userId && { userId: q.userId }),
      ...(q.action && { action: q.action }),
      ...(q.entityType && { entityType: q.entityType }),
      ...(q.entityId && { entityId: q.entityId }),
      ...(q.since || q.until
        ? {
            createdAt: {
              ...(q.since && { gte: q.since }),
              ...(q.until && { lte: q.until }),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(q.limit ?? 200, 500),
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Verify the hash-chain integrity for an org (or system, if null).
 * Returns the first broken row index, or null if the chain is
 * intact. Used by an admin "Verify integrity" button on the audit
 * page. Stop-on-first-break so a single tampered row doesn't
 * cascade misleading subsequent diffs.
 */
export async function verifyAtlasAuditChain(
  organizationId: string | null,
): Promise<{ ok: boolean; brokenAt?: number; total: number }> {
  const rows = await prisma.atlasAuditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      hash: true,
      prevHash: true,
    },
  });

  let prevHash: string | null = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.prevHash !== prevHash) {
      return { ok: false, brokenAt: i, total: rows.length };
    }
    const canonical = JSON.stringify({
      userId: r.userId,
      organizationId: r.organizationId,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      metadata: r.metadata ?? null,
      timestamp: r.createdAt.toISOString(),
    });
    const expected: string = crypto
      .createHash("sha256")
      .update((prevHash ?? "") + canonical)
      .digest("hex");
    if (expected !== r.hash) {
      return { ok: false, brokenAt: i, total: rows.length };
    }
    prevHash = r.hash;
  }
  return { ok: true, total: rows.length };
}
