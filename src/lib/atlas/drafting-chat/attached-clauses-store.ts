"use client";

/**
 * Atlas Drafting Chat — attached-clauses session store (A-H9).
 *
 * Holds the IDs of clauses the user has attached to the current drafting
 * session. The chat backend is stateless, so browser-context.ts resolves
 * these IDs against clause-library.ts and ships the full Clause objects
 * with each turn; server-tools buildClauseDirective then injects them.
 * Mirrors the defensive localStorage pattern of clause-library.ts.
 */
export const ATTACHED_CLAUSES_KEY = "atlas-drafting-attached-clauses";
const CAP = 25;

export function getAttachedClauseIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ATTACHED_CLAUSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      ATTACHED_CLAUSES_KEY,
      JSON.stringify(ids.slice(0, CAP)),
    );
  } catch {
    /* quota / private browsing — silent. */
  }
}

export function attachClause(id: string): void {
  const s = getAttachedClauseIds();
  if (!s.includes(id)) write([id, ...s]);
}

export function detachClause(id: string): void {
  write(getAttachedClauseIds().filter((x) => x !== id));
}

export function clearAttachedClauses(): void {
  write([]);
}
