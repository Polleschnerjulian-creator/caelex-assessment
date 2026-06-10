import "server-only";

/**
 * Caelex Trade — organisational classification precedents (ILA review #5).
 *
 * The org's OWN accepted classifications are its most trustworthy
 * training data: "you classified RW-250 Reaction Wheel as 9A004" is a
 * stronger prior than any generic matcher. This service ranks the org's
 * CLASSIFIED items by description-token overlap with a query text and
 * returns the top precedents as SUGGESTIONS (never determinations — the
 * apply path parks them in REQUIRES_REVIEW like every other candidate).
 *
 * The learning loop closes WITHOUT a schema change: every reviewed
 * classification automatically becomes a precedent for the next similar
 * item.
 */

import { prisma } from "@/lib/prisma";
import { DEMO_PREFIX } from "@/lib/trade/demo-workspace.server";

export interface OrgPrecedent {
  itemId: string;
  /** Display name ([DEMO] prefix stripped for cleanliness). */
  name: string;
  field: "eccnEU" | "eccnUS" | "usmlCategory" | "germanAlEntry";
  code: string;
  /** Jaccard token overlap with the query (0..1). */
  similarity: number;
}

// Minimal stopword set — enough to stop "the/and/für" dominating overlap.
const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "von",
  "und",
  "für",
  "mit",
  "der",
  "die",
  "das",
  "ein",
  "eine",
]);

/** Lowercase alphanumeric tokens, ≥3 chars, stopword-filtered. Pure. */
export function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9äöüß]+/)) {
    if (raw.length < 3) continue;
    if (STOPWORDS.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

/** Jaccard similarity over token sets. Pure. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export interface PrecedentSourceRow {
  id: string;
  name: string;
  description: string;
  eccnEU: string | null;
  eccnUS: string | null;
  usmlCategory: string | null;
  germanAlEntry: string | null;
}

/** Rank rows against a query. Pure — node-tested without Prisma. */
export function rankPrecedents(
  rows: ReadonlyArray<PrecedentSourceRow>,
  queryText: string,
  options: { limit?: number; minSimilarity?: number } = {},
): OrgPrecedent[] {
  const { limit = 3, minSimilarity = 0.12 } = options;
  const query = tokenize(queryText);
  const ranked: OrgPrecedent[] = [];

  for (const row of rows) {
    const similarity = jaccard(
      query,
      tokenize(`${row.name} ${row.description}`),
    );
    if (similarity < minSimilarity) continue;

    // One precedent per row — the most specific populated code field.
    const fieldOrder = [
      ["usmlCategory", row.usmlCategory],
      ["eccnEU", row.eccnEU],
      ["eccnUS", row.eccnUS],
      ["germanAlEntry", row.germanAlEntry],
    ] as const;
    const populated = fieldOrder.find(([, code]) => code !== null);
    if (!populated) continue;

    ranked.push({
      itemId: row.id,
      name: row.name.startsWith(DEMO_PREFIX)
        ? row.name.slice(DEMO_PREFIX.length)
        : row.name,
      field: populated[0],
      code: populated[1] as string,
      similarity: Math.round(similarity * 100) / 100,
    });
  }

  return ranked.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
}

/** Fetch the org's CLASSIFIED items and rank them against the query. */
export async function findOrgPrecedents(
  organizationId: string,
  queryText: string,
  excludeItemId?: string,
): Promise<OrgPrecedent[]> {
  if (queryText.trim().length < 3) return [];
  const rows = await prisma.tradeItem.findMany({
    where: {
      organizationId,
      status: "CLASSIFIED",
      ...(excludeItemId ? { id: { not: excludeItemId } } : {}),
      OR: [
        { eccnEU: { not: null } },
        { eccnUS: { not: null } },
        { usmlCategory: { not: null } },
        { germanAlEntry: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      description: true,
      eccnEU: true,
      eccnUS: true,
      usmlCategory: true,
      germanAlEntry: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return rankPrecedents(rows, queryText);
}
