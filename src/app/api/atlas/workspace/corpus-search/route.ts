/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET /api/atlas/workspace/corpus-search?q=<query>&kinds=eu,nis2,nat&limit=20
 *
 * Searches the Atlas regulatory corpus (EU Space Act articles, NIS2
 * requirements, national space laws of 14 jurisdictions) and returns
 * normalized hits ready to be pinned as "Quelle"-archetype cards.
 *
 * Why a server endpoint instead of bundling the corpus client-side:
 *  - articles + nis2 + national-space-laws together are ~380 KB. Shipping
 *    that into the workspace bundle blows up the lazy-loaded chunk and
 *    delays first paint on the AI-Mode page.
 *  - The corpus is also imported by ~40 other server-side modules.
 *    Keeping it server-only avoids a second copy in the client bundle.
 *  - Search lives next to the data — keyword-matching against fields
 *    can be tuned without a frontend release.
 *
 * Search strategy is deliberately simple: case-insensitive substring
 * match across (title, content, articleRef/number, jurisdiction). No
 * embeddings yet — for a corpus of ~150 entries, regex beats latency
 * of a vector lookup. Atlas-AI handles semantic search elsewhere; this
 * is a straight pinboard picker.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

import { articles, EU_SPACE_ACT_PROPOSAL_STATUS } from "@/data/articles";
import { NIS2_REQUIREMENTS } from "@/data/nis2-requirements";
import { JURISDICTION_DATA } from "@/data/national-space-laws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Shape of a single corpus hit returned to the client. The pinboard
 *  pins this directly as a card — `title`, `content`, `citation`, and
 *  `kind` map straight to the existing card UI. */
interface CorpusHit {
  /** Stable id for React keys + dedupe. Prefixed with kind to avoid
   *  collisions across corpora. */
  id: string;
  kind: "eu" | "nis2" | "nat";
  /** Display title (article name + number, requirement name, etc.) */
  title: string;
  /** Body text the lawyer pins to their board. */
  content: string;
  /** Short citation string — already-formatted "Art. X EU Space Act"
   *  / "NIS2 Art. 21(2)(a)" / "Art. 4 LOS (FR)". The pinboard composer
   *  inserts this at the top of the card content. */
  citation: string;
  /** For UI grouping / filter chips. */
  jurisdiction?: string;
  /** Optional URL to the official source. Useful later when we add a
   *  "Quelle öffnen" link in the card. */
  officialUrl?: string;
}

/**
 * Cheap full-text-style match across multiple fields. Splits the query
 * by whitespace and requires every term to appear in at least one of
 * the searchable fields. Empty query returns false (caller falls back
 * to "show top N").
 */
function matchesQuery(query: string, fields: (string | undefined)[]): boolean {
  const haystack = fields
    .filter((f): f is string => typeof f === "string" && f.length > 0)
    .join(" ")
    .toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (terms.length === 0) return true;
  return terms.every((t) => haystack.includes(t));
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reuse the standard Atlas rate-limit bucket. Picker keystrokes
    // shouldn't fire 10x/sec — frontend debounces, so 100/min stays
    // ample for normal use.
    const rl = await checkRateLimit(
      "astra_chat",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const kindsParam = searchParams.get("kinds") ?? "eu,nis2,nat";
    const limitParam = parseInt(searchParams.get("limit") ?? "20", 10);
    const limit = Math.min(
      50,
      Math.max(1, isNaN(limitParam) ? 20 : limitParam),
    );

    // Kinds is a CSV — empty / unknown values are dropped. Default
    // searches everything.
    const kindSet = new Set(
      kindsParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s === "eu" || s === "nis2" || s === "nat"),
    );

    const hits: CorpusHit[] = [];

    // ─── EU Space Act articles ────────────────────────────────────────
    if (kindSet.has("eu")) {
      for (const art of articles) {
        if (
          !matchesQuery(q, [
            art.title,
            art.summary,
            art.operatorAction,
            art.number,
            art.titleName,
            art.titleGroup,
            art.module,
            art.moduleLabel,
          ])
        ) {
          continue;
        }
        hits.push({
          id: `eu-${art.id}`,
          kind: "eu",
          title: `Art. ${art.number}: ${art.title}`,
          content: art.summary,
          citation: `Art. ${art.number} EU Space Act (${EU_SPACE_ACT_PROPOSAL_STATUS.reference})`,
          jurisdiction: "EU",
        });
      }
    }

    // ─── NIS2 requirements ────────────────────────────────────────────
    if (kindSet.has("nis2")) {
      for (const req of NIS2_REQUIREMENTS) {
        if (
          !matchesQuery(q, [
            req.title,
            req.description,
            req.articleRef,
            req.spaceSpecificGuidance,
            req.category,
          ])
        ) {
          continue;
        }
        hits.push({
          id: `nis2-${req.id}`,
          kind: "nis2",
          title: req.title,
          content: req.description,
          citation: req.articleRef,
          jurisdiction: "EU",
          officialUrl: req.officialUrl,
        });
      }
    }

    // ─── National space laws ──────────────────────────────────────────
    // The corpus is country-keyed maps with nested licensingRequirements
    // arrays — flatten those into hits, prefix each with the country
    // code so the lawyer immediately sees jurisdiction context.
    if (kindSet.has("nat")) {
      for (const [code, law] of JURISDICTION_DATA.entries()) {
        for (const req of law.licensingRequirements) {
          if (
            !matchesQuery(q, [
              req.title,
              req.description,
              req.articleRef,
              law.legislation.name,
              law.legislation.nameLocal,
              law.countryName,
              code,
              req.category,
            ])
          ) {
            continue;
          }
          hits.push({
            id: `nat-${code}-${req.id}`,
            kind: "nat",
            title: `${law.flagEmoji} ${req.title}`,
            content: req.description,
            citation: `${req.articleRef ?? law.legislation.name} (${code})`,
            jurisdiction: `${code} — ${law.countryName}`,
            officialUrl: law.legislation.officialUrl,
          });
        }
      }
    }

    // Slice after collecting so EU/NIS2/NAT all get a chance to show
    // up in the limit window. Empty query returns first N entries —
    // useful for the picker's "browse" mode when the user opens it
    // before typing.
    return NextResponse.json({
      hits: hits.slice(0, limit),
      total: hits.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`GET /api/atlas/workspace/corpus-search failed: ${msg}`);
    return NextResponse.json(
      { error: "Korpus-Suche fehlgeschlagen" },
      { status: 500 },
    );
  }
}
