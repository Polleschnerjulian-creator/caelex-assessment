/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET  /api/pharos/time-travel?ts=2026-04-15T14:00:00Z&entryId=<entryId>
 *
 * Time-Travel — rekonstruiert den Stand einer signierten Pharos-AI-
 * Antwort zu einem Zeitpunkt in der Vergangenheit. Liefert:
 *   - die OversightAccessLog-Einträge bis zum Zeitpunkt ts
 *   - den Hash-Chain-Stand (entryHash der letzten Eintrag vor ts)
 *   - falls entryId gegeben: den Receipt + erlaubt das Replay
 *     (= deterministische Re-Inferenz mit demselben Snapshot)
 *
 * Use-Case: Auditor / Verwaltungsgericht möchte wissen "Was wusste
 * Pharos am 15.04.2026 um 14:00 UTC?". Pharos liefert byte-identische
 * Reproduktion via Anthropic Prompt-Caching (Schicht 1) und
 * NormAnchor-Hash-Versionierung (Schicht 2).
 *
 * Auth: AUTHORITY-Member oder Operator-Member, scoped auf Aufsichten
 * in denen der Caller Mitglied ist.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const tsRaw = url.searchParams.get("ts");
    const oversightId = url.searchParams.get("oversightId");
    const entryId = url.searchParams.get("entryId");

    if (!tsRaw) {
      return NextResponse.json(
        { error: "ts (ISO-8601) required" },
        { status: 400 },
      );
    }
    const ts = new Date(tsRaw);
    if (Number.isNaN(ts.getTime())) {
      return NextResponse.json(
        { error: "ts is not a valid ISO-8601 date" },
        { status: 400 },
      );
    }
    if (ts > new Date()) {
      return NextResponse.json(
        { error: "ts is in the future — cannot time-travel forward" },
        { status: 400 },
      );
    }

    // Auth-Scope: caller's organization memberships.
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: session.user.id },
      select: {
        organizationId: true,
        organization: { select: { orgType: true } },
      },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    if (orgIds.length === 0) {
      return NextResponse.json({ error: "No orgs" }, { status: 403 });
    }

    // Resolve which oversights the caller can read at this point in time.
    // Operator-side: oversights where their org is operatorOrgId.
    // Authority-side: oversights tied to the AuthorityProfile of their org.
    const authorityProfileIds = await prisma.authorityProfile
      .findMany({
        where: { organizationId: { in: orgIds } },
        select: { id: true },
      })
      .then((rows) => rows.map((r) => r.id));

    const accessibleOversights = await prisma.oversightRelationship.findMany({
      where: {
        OR: [
          { operatorOrgId: { in: orgIds } },
          { authorityProfileId: { in: authorityProfileIds } },
        ],
      },
      select: { id: true },
    });
    const accessibleIds = new Set(accessibleOversights.map((o) => o.id));

    // ─── Branch 1: replay a specific receipt ──────────────────────────
    if (entryId) {
      const entry = await prisma.oversightAccessLog.findUnique({
        where: { id: entryId },
        select: {
          id: true,
          oversightId: true,
          createdAt: true,
          entryHash: true,
          previousHash: true,
          context: true,
          resourceType: true,
        },
      });
      if (!entry) {
        return NextResponse.json({ error: "entry not found" }, { status: 404 });
      }
      if (!accessibleIds.has(entry.oversightId)) {
        return NextResponse.json(
          { error: "not authorized for this oversight" },
          { status: 403 },
        );
      }
      if (entry.createdAt > ts) {
        return NextResponse.json(
          {
            error:
              "entry was created AFTER requested timestamp — cannot replay before its existence",
          },
          { status: 400 },
        );
      }

      // Recover the chain prefix at point ts (entries with createdAt <= ts).
      const chainPrefix = await prisma.oversightAccessLog.findMany({
        where: {
          oversightId: entry.oversightId,
          createdAt: { lte: ts },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          createdAt: true,
          action: true,
          resourceType: true,
          previousHash: true,
          entryHash: true,
        },
      });

      return NextResponse.json({
        timeTravel: {
          requestedTs: ts.toISOString(),
          oversightId: entry.oversightId,
          chainPrefixSize: chainPrefix.length,
          chainTipEntryHash:
            chainPrefix.length > 0
              ? chainPrefix[chainPrefix.length - 1].entryHash
              : null,
        },
        entry: {
          id: entry.id,
          createdAt: entry.createdAt,
          resourceType: entry.resourceType,
          receipt: entry.context,
        },
        replayInstructions: {
          description:
            "To deterministically reproduce the AI output, replay POST /api/pharos/astra/chat with the original prompt + history. Anthropic prompt-caching + temperature=0 yield byte-identical answers within the same model version. Norm-Anchor versioning is locked via citation contentHashes embedded in the receipt.",
          modelVersionLockedTo:
            (entry.context as { receipt?: { inputHash?: string } })?.receipt
              ?.inputHash ?? null,
        },
      });
    }

    // ─── Branch 2: full chain summary at point ts ─────────────────────
    const filter = oversightId
      ? { oversightId, createdAt: { lte: ts } }
      : {
          oversightId: { in: Array.from(accessibleIds) },
          createdAt: { lte: ts },
        };
    if (oversightId && !accessibleIds.has(oversightId)) {
      return NextResponse.json(
        { error: "not authorized for this oversight" },
        { status: 403 },
      );
    }

    const entries = await prisma.oversightAccessLog.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        oversightId: true,
        createdAt: true,
        action: true,
        resourceType: true,
        actorOrgId: true,
        entryHash: true,
        previousHash: true,
      },
    });

    return NextResponse.json({
      timeTravel: {
        requestedTs: ts.toISOString(),
        oversightFilter: oversightId ?? "all-accessible",
        entryCount: entries.length,
      },
      entries: entries.map((e) => ({
        id: e.id,
        oversightId: e.oversightId,
        createdAt: e.createdAt,
        action: e.action,
        resourceType: e.resourceType,
        actorOrgId: e.actorOrgId,
        entryHashShort: e.entryHash.slice(0, 16),
        previousHashShort: e.previousHash ? e.previousHash.slice(0, 16) : null,
        verifyUrl:
          e.resourceType === "PharosAstraReceipt"
            ? `/api/pharos/receipt/${e.id}`
            : null,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-time-travel] failed: ${msg}`);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
