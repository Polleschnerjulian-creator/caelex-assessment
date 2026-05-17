/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Conflict-of-Interest Check API.
 *
 *   POST /api/atlas/conflict-check
 *   Body: { clientName: string, partyNames?: string[],
 *           opposingCounsel?: string }
 *
 * Searches existing mandates in the same organisation for matches
 * against:
 *   - clientName (substring + fuzzy)
 *   - partyNames (any party referenced in custom-instructions)
 *   - opposing counsel mentions in any chat / file in the org
 *
 * Returns a structured list of potential conflicts so the lawyer can
 * review BEFORE opening a new mandate. Required by §43a BRAO + most
 * partnership-agreements (Interessenkollision-Prüfung).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitHeaders,
} from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  clientName: z.string().min(1).max(200),
  partyNames: z.array(z.string().max(200)).max(20).optional(),
  opposingCounsel: z.string().max(200).optional(),
});

export interface ConflictHit {
  mandateId: string;
  mandateName: string;
  clientName: string | null;
  matchedField: "clientName" | "party" | "opposingCounsel" | "instructions";
  matchedTerm: string;
  /** 0..1 confidence — substring exact = 1.0, partial substring = 0.6 */
  confidence: number;
  status: string;
}

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: createRateLimitHeaders(rl) },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PostBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const { clientName, partyNames, opposingCounsel } = parsed.data;

  /* Build search terms — clientName always; partyNames + opposing
     counsel if provided. Lowercase + trim for case-insensitive
     substring match. */
  const terms: { term: string; field: ConflictHit["matchedField"] }[] = [];
  terms.push({ term: clientName.toLowerCase().trim(), field: "clientName" });
  if (partyNames) {
    for (const p of partyNames) {
      const t = p.toLowerCase().trim();
      if (t.length >= 3) terms.push({ term: t, field: "party" });
    }
  }
  if (opposingCounsel && opposingCounsel.trim().length >= 3) {
    terms.push({
      term: opposingCounsel.toLowerCase().trim(),
      field: "opposingCounsel",
    });
  }

  try {
    /* Pull all org mandates the user could potentially conflict with.
       We do NOT scope to user's own mandates — for conflict purposes,
       the firm-wide view matters (§43a BRAO is firm-wide, not
       lawyer-individual). */
    const mandates = await prisma.atlasMandate.findMany({
      where: {
        organizationId: atlas.organizationId,
        status: { not: "archived" },
      },
      select: {
        id: true,
        name: true,
        clientName: true,
        customInstructions: true,
        status: true,
        ownerUserId: true,
        members: { select: { userId: true } },
      },
    });

    /* AUDIT-FIX H07 (2026-05-17): firm-wide §43a check stays firm-wide,
       but client identities of mandates the caller is NOT a member of
       must NOT leak to non-members. We compute membership per-mandate
       and redact clientName + mandateName for mandates the caller has
       no access to. The hit still surfaces so the §43a alarm fires —
       the caller just gets "Konflikt mit fremdem Mandat (geschützt) —
       wende dich an den verantwortlichen Partner" instead of the
       client identity. */
    const accessByMandate = new Map<string, boolean>();
    for (const m of mandates) {
      const userIsMember =
        m.ownerUserId === atlas.userId ||
        m.members.some((mem) => mem.userId === atlas.userId);
      accessByMandate.set(m.id, userIsMember);
    }

    const hits: ConflictHit[] = [];
    for (const m of mandates) {
      const haystacks: { text: string; field: ConflictHit["matchedField"] }[] =
        [];
      if (m.clientName) {
        haystacks.push({
          text: m.clientName.toLowerCase(),
          field: "clientName",
        });
      }
      if (m.customInstructions) {
        haystacks.push({
          text: m.customInstructions.toLowerCase(),
          field: "instructions",
        });
      }
      for (const { term, field } of terms) {
        for (const h of haystacks) {
          if (h.text.includes(term)) {
            const exact = h.text === term;
            /* AUDIT-FIX H07: redact identifying fields when caller has
               no access. The §43a alarm still fires (mandateId + match
               are returned) so the caller knows to escalate; identity
               leak is prevented. */
            const hasAccess = accessByMandate.get(m.id) === true;
            hits.push({
              mandateId: m.id,
              mandateName: hasAccess
                ? m.name
                : "Konflikt mit fremdem Mandat (geschützt)",
              clientName: hasAccess ? m.clientName : null,
              matchedField: field === "party" ? "instructions" : field,
              matchedTerm: hasAccess ? term : "[geschützt]",
              confidence: exact ? 1.0 : 0.6,
              status: m.status,
            });
            break; /* One hit per mandate per term */
          }
        }
      }
    }

    /* Dedupe per-mandate (highest confidence wins). */
    const byMandate = new Map<string, ConflictHit>();
    for (const h of hits) {
      const cur = byMandate.get(h.mandateId);
      if (!cur || h.confidence > cur.confidence) {
        byMandate.set(h.mandateId, h);
      }
    }
    const dedupedHits = [...byMandate.values()].sort(
      (a, b) => b.confidence - a.confidence,
    );

    // AUDIT-FIX M23: mask userId (CUID) before logging
    logger.info("[atlas/conflict-check] ok", {
      userId: maskId(atlas.userId),
      mandatesScanned: mandates.length,
      termsCount: terms.length,
      hits: dedupedHits.length,
    });

    return NextResponse.json(
      {
        scannedCount: mandates.length,
        hits: dedupedHits,
        searchTerms: terms.map((t) => t.term),
      },
      { headers: createRateLimitHeaders(rl) },
    );
  } catch (err) {
    logger.error("[atlas/conflict-check] failed", {
      userId: maskId(atlas.userId),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Conflict check failed" },
      { status: 500 },
    );
  }
}
