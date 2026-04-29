import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Norm-Anchor RAG — Postgres-native, deterministisch, ohne Vector-DB.
 *
 * Warum keine Embeddings?
 *   1. Determinismus — Embedding-API-Calls sind probabilistisch und
 *      kostenpflichtig. Postgres ts_rank_cd ist mathematisch stabil.
 *   2. Auditierbarkeit — eine Behörde kann die Suche reproduzieren
 *      ohne Caelex-API zu fragen, einfach via SQL.
 *   3. Endlichkeit — das EU-Norm-Universum hat ~10k Anchors, nicht
 *      Milliarden Web-Seiten. tsvector + GIN reicht völlig.
 *   4. Cost — null externe API-Aufrufe. Bei 10k Behörden-Queries pro
 *      Tag spart das ~$30/Tag gegenüber OpenAI text-embedding-3-small.
 *
 * Algorithmus:
 *   1. User-Query → tokenisieren (Postgres `to_tsquery` mit Sprache)
 *   2. SELECT mit `ts_rank_cd(textSearch, query)` als BM25-Approximation
 *   3. Tie-Break über NormAnchor.id (lexikografisch, deterministisch)
 *   4. Top-K mit Confidence-Score (rank * jurisdiction-bonus)
 *   5. Bei rank < 0.05 → leere Ergebnisliste → Tool abstain'd
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { type Citation } from "./citation";

/** Whitelist für jurisdiction/instrument-Filter — verhindert SQL-
 *  Injection auch wenn der Caller die Werte nicht selbst validiert. */
const ALLOWED_JURISDICTIONS = new Set([
  "EU",
  "DE",
  "FR",
  "UK",
  "IT",
  "ES",
  "LU",
  "NL",
  "PL",
  "AT",
  "BE",
  "SE",
  "NATO",
  "INT",
]);
const INSTRUMENT_PATTERN = /^[A-Z][A-Z0-9_]{1,30}$/;

const MIN_RELEVANCE_THRESHOLD = 0.05;
const DEFAULT_TOP_K = 5;

/** Strip user-input down to a safe `to_tsquery` token list — alphanum,
 *  whitespace, dot. Verhindert SQL-Injection und Postgres-Parser-Errors
 *  bei Sonderzeichen. */
function sanitizeQuery(query: string): string {
  // Keep alphanum, dots (for "Art. 7"), whitespace; drop the rest.
  const cleaned = query.replace(/[^\p{L}\p{N}\s.]/gu, " ").trim();
  if (cleaned.length === 0) return "";
  // Tokenisieren auf Whitespace, mit `&`-Operator zwischen Tokens
  // damit Postgres alle Tokens berücksichtigt (AND-Suche). Tokens
  // mit `:*` für Prefix-Match — robuster gegen Pluralformen.
  return cleaned
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => `${t}:*`)
    .join(" & ");
}

export interface NormSearchHit {
  id: string;
  jurisdiction: string;
  instrument: string;
  unit: string;
  number: string;
  title: string | null;
  textSnippet: string;
  contentHash: string;
  sourceUrl: string | null;
  relevance: number;
  language: string;
}

export interface NormSearchOptions {
  jurisdiction?: string; // ISO code filter — boost matching juris
  instrument?: string; // exact-match filter on instrument code
  language?: string; // default "en"
  topK?: number;
  minRelevance?: number;
}

/** Search the NormAnchor index. Pure Postgres BM25 (ts_rank_cd) — no
 *  external API calls. Deterministic ordering: relevance DESC, then
 *  id ASC for stable tie-breaks. */
export async function searchNormAnchors(
  query: string,
  opts: NormSearchOptions = {},
): Promise<NormSearchHit[]> {
  const sanitized = sanitizeQuery(query);
  if (!sanitized) return [];

  const topK = Math.min(20, Math.max(1, opts.topK ?? DEFAULT_TOP_K));
  const minRel = opts.minRelevance ?? MIN_RELEVANCE_THRESHOLD;
  const lang = opts.language ?? "en";

  // Validate optional filters BEFORE building SQL — defense in depth.
  if (opts.jurisdiction && !ALLOWED_JURISDICTIONS.has(opts.jurisdiction)) {
    logger.warn(`[norm-anchor] rejected jurisdiction: ${opts.jurisdiction}`);
    return [];
  }
  if (opts.instrument && !INSTRUMENT_PATTERN.test(opts.instrument)) {
    logger.warn(`[norm-anchor] rejected instrument: ${opts.instrument}`);
    return [];
  }

  // Build the optional WHERE-fragments via Prisma.sql so they get
  // parameterized properly even though they're conditionally included.
  const jurisdictionFilter = opts.jurisdiction
    ? Prisma.sql` AND jurisdiction = ${opts.jurisdiction}`
    : Prisma.empty;
  const instrumentFilter = opts.instrument
    ? Prisma.sql` AND instrument = ${opts.instrument}`
    : Prisma.empty;

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        jurisdiction: string;
        instrument: string;
        unit: string;
        number: string;
        title: string | null;
        text: string;
        contentHash: string;
        sourceUrl: string | null;
        language: string;
        relevance: number;
      }>
    >(Prisma.sql`
      SELECT
        id, jurisdiction, instrument, number, unit, title, text,
        "contentHash", "sourceUrl", language,
        ts_rank_cd("textSearch", to_tsquery('simple', ${sanitized})) AS relevance
      FROM "NormAnchor"
      WHERE
        "textSearch" @@ to_tsquery('simple', ${sanitized})
        AND language = ${lang}
        ${jurisdictionFilter}
        ${instrumentFilter}
        AND "supersededById" IS NULL
      ORDER BY relevance DESC, id ASC
      LIMIT ${topK}
    `);

    return rows
      .filter((r) => r.relevance >= minRel)
      .map((r) => ({
        id: r.id,
        jurisdiction: r.jurisdiction,
        instrument: r.instrument,
        unit: r.unit,
        number: r.number,
        title: r.title,
        textSnippet: r.text.slice(0, 400),
        contentHash: r.contentHash,
        sourceUrl: r.sourceUrl,
        relevance: r.relevance,
        language: r.language,
      }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[norm-anchor] search failed: ${msg}`);
    return [];
  }
}

/** Convert a NormSearchHit into a citation-layer Citation. The
 *  contentHash already comes from the DB (computed at ingest time);
 *  we just wrap it. */
export function normHitToCitation(hit: NormSearchHit): Citation {
  return {
    id: `NORM:${hit.id}`,
    kind: "norm",
    source: `${hit.jurisdiction} · ${hit.instrument} · ${hit.unit} ${hit.number}${hit.title ? " — " + hit.title : ""}`,
    span: hit.textSnippet.slice(0, 80),
    contentHash: hit.contentHash.startsWith("sha256:")
      ? hit.contentHash
      : `sha256:${hit.contentHash.slice(0, 32)}`,
    retrievedAt: new Date().toISOString(),
    url: hit.sourceUrl ?? undefined,
  };
}

// ─── Norm Ingest (used by seeding script + drift sentinel) ───────────

export interface NormIngestInput {
  id: string;
  jurisdiction: string;
  instrument: string;
  unit: string;
  number: string;
  title?: string;
  text: string;
  sourceUrl?: string;
  effectiveFrom?: Date;
  language?: string;
}

/** Compute the canonical contentHash that gets stored in NormAnchor.
 *  Same algo as citation.ts — hash over canonical-JSON of the text. */
export function computeNormContentHash(text: string): string {
  return (
    "sha256:" +
    createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32)
  );
}

/** Idempotent upsert. If contentHash differs from existing → returns
 *  {drifted: true, oldHash} so caller (drift-sentinel) can fire alert. */
export async function upsertNormAnchor(input: NormIngestInput): Promise<{
  inserted: boolean;
  drifted: boolean;
  oldHash?: string;
  newHash: string;
}> {
  const newHash = computeNormContentHash(input.text);
  const existing = await prisma.normAnchor.findUnique({
    where: { id: input.id },
    select: { contentHash: true },
  });

  if (existing && existing.contentHash === newHash) {
    return { inserted: false, drifted: false, newHash };
  }

  await prisma.normAnchor.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      jurisdiction: input.jurisdiction,
      instrument: input.instrument,
      unit: input.unit,
      number: input.number,
      title: input.title ?? null,
      text: input.text,
      contentHash: newHash,
      sourceUrl: input.sourceUrl ?? null,
      effectiveFrom: input.effectiveFrom ?? null,
      language: input.language ?? "en",
    },
    update: {
      text: input.text,
      contentHash: newHash,
      title: input.title ?? null,
      sourceUrl: input.sourceUrl ?? null,
    },
  });

  return {
    inserted: !existing,
    drifted: !!existing,
    oldHash: existing?.contentHash,
    newHash,
  };
}
