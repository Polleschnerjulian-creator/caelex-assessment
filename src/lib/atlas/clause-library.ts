/**
 * Atlas Drafting — Clause Library (Bundle 33, S3).
 *
 * A space-law practice (BHO Legal, Heuking, Dentons Space) maintains a
 * shared "boilerplate" repository — standard liability caps, NIS2
 * confidentiality clauses, ITU coordination disclaimers — that get
 * pasted into 80% of authorization applications, briefs, and cover
 * letters.
 *
 * This module is the MVP backing store for that repository. Clauses are
 * defined per-clause (name, content, jurisdiction tag, free-form tags)
 * and persisted in localStorage. Marie can save a paragraph that her
 * partner approved last week and pull it into the next four mandates
 * without copy-pasting from a Word document.
 *
 * Stage-2 (Bundle 36+ on the network/matter binding work) will lift
 * the store into per-org Postgres so a whole practice shares its
 * library, not just one browser. Today's MVP keeps everything in the
 * lawyer's browser.
 *
 * Same defensive shape-check pattern as drafting-history.ts and
 * mandate-intake.ts so a schema drift doesn't crash the studio.
 */

export const CLAUSE_LIBRARY_KEY = "atlas-drafting-clauses";

const CLAUSE_CAP = 100;

export interface Clause {
  id: string;
  /** Human label, e.g. "Standard liability cap (BHO)" or "NIS2 §21". */
  name: string;
  /** Clause body — the actual text Marie wants to paste. */
  content: string;
  /**
   * Jurisdiction tag. Empty string ("") = universal/cross-jurisdictional.
   * Otherwise an ISO-2 country code or "EU" / "INT".
   */
  jurisdiction: string;
  /** Free-form tags for filtering: ["nis2", "boilerplate", "liability"]. */
  tags: string[];
  /** Created / last-edited timestamp (ms epoch). */
  ts: number;
}

const isClause = (v: unknown): v is Clause =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Clause).id === "string" &&
  typeof (v as Clause).name === "string" &&
  typeof (v as Clause).content === "string" &&
  typeof (v as Clause).jurisdiction === "string" &&
  Array.isArray((v as Clause).tags) &&
  typeof (v as Clause).ts === "number";

export function getClauses(): Clause[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAUSE_LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isClause);
  } catch {
    return [];
  }
}

function writeClauses(list: Clause[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAUSE_LIBRARY_KEY, JSON.stringify(list));
  } catch {
    /* quota / private-browsing — silent. */
  }
}

export function getClause(id: string): Clause | null {
  return getClauses().find((c) => c.id === id) ?? null;
}

export function createClause(fields: Omit<Clause, "id" | "ts">): Clause {
  const clause: Clause = {
    ...fields,
    id: `clause-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  };
  const list = getClauses();
  /* New clause leads. Old ones tail. Cap at 100. */
  writeClauses([clause, ...list].slice(0, CLAUSE_CAP));
  return clause;
}

export function updateClause(
  id: string,
  patch: Partial<Omit<Clause, "id">>,
): void {
  const list = getClauses();
  const next = list.map((c) =>
    c.id === id ? { ...c, ...patch, ts: Date.now() } : c,
  );
  writeClauses(next);
}

export function deleteClause(id: string): void {
  writeClauses(getClauses().filter((c) => c.id !== id));
}

export function clearClauses(): void {
  writeClauses([]);
}

/** Unique tag list for filter UIs. */
export function listAllTags(clauses: Clause[]): string[] {
  const set = new Set<string>();
  for (const c of clauses) for (const t of c.tags) set.add(t);
  return Array.from(set).sort();
}
