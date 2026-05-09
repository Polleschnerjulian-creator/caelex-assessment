/**
 * Atlas Comparator — annotation persistence (D3).
 *
 * Lawyers in client meetings often want to annotate cells: "client
 * cares about this — push for cap". Replaces the "screenshot →
 * annotate in Pages → email" workflow that every M&A lawyer does
 * today.
 *
 * MVP via localStorage. Stage-2 would add backend persistence + per-
 * mandate scoping. The localStorage key uses a stable composite of
 * jurisdiction-code + row-label so the same annotation surfaces on
 * any selection that includes that cell.
 */

const STORAGE_KEY = "atlas-comparator-annotations";

export interface CellAnnotation {
  /** Composite cell-key: `${jurisdictionCode}|${rowLabel}` */
  key: string;
  /** Note text. Plain-text only; multi-line supported. */
  body: string;
  /** Unix-ms timestamp of last edit. */
  updatedAt: number;
}

/* In-memory cache of the parsed map. We re-load lazily on first
   access; subsequent reads/writes hit the cache + sync to
   localStorage. Keeps the read-path cheap (no JSON.parse on every
   render) without losing cross-tab persistence (writes always sync). */
let cache: Map<string, CellAnnotation> | null = null;

function ensureCache(): Map<string, CellAnnotation> {
  if (cache) return cache;
  cache = new Map();
  if (typeof window === "undefined") return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cache;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return cache;
    for (const e of parsed) {
      if (
        e &&
        typeof e === "object" &&
        typeof e.key === "string" &&
        typeof e.body === "string" &&
        typeof e.updatedAt === "number"
      ) {
        cache.set(e.key, e as CellAnnotation);
      }
    }
  } catch {
    /* malformed payload from a prior schema — start clean. */
  }
  return cache;
}

function persist(): void {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(Array.from(cache.values())),
    );
  } catch {
    /* quota / private browsing — silent. */
  }
}

export function makeAnnotationKey(
  jurisdictionCode: string,
  rowLabel: string,
): string {
  return `${jurisdictionCode}|${rowLabel}`;
}

export function getAnnotation(key: string): CellAnnotation | null {
  return ensureCache().get(key) ?? null;
}

export function setAnnotation(key: string, body: string): void {
  const map = ensureCache();
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    map.delete(key);
  } else {
    map.set(key, { key, body: trimmed, updatedAt: Date.now() });
  }
  persist();
}

export function deleteAnnotation(key: string): void {
  const map = ensureCache();
  map.delete(key);
  persist();
}

/** Returns all annotations as a snapshot array. Used for bulk views
 *  (e.g. an "all my notes" panel) and for export-pipeline marginalia. */
export function getAllAnnotations(): CellAnnotation[] {
  return Array.from(ensureCache().values());
}

/** Returns the count of annotations for a given jurisdiction. Used by
 *  the per-column header to show a "3 notes" pill. */
export function countAnnotationsForJurisdiction(
  jurisdictionCode: string,
): number {
  const map = ensureCache();
  let n = 0;
  for (const k of map.keys()) {
    if (k.startsWith(`${jurisdictionCode}|`)) n += 1;
  }
  return n;
}
