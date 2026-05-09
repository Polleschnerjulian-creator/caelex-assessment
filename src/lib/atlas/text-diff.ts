/**
 * Atlas — minimal line-level text-diff (Bundle 40, B5).
 *
 * No dependencies. Implements LCS-based line diffing: for two text
 * blobs, returns an ordered list of {line, kind} entries where kind
 * is "context" (line in both), "added" (in next only), or "removed"
 * (in prev only).
 *
 * The implementation is the standard Wagner-Fischer dynamic-programming
 * LCS table reconstructed back-to-front. O(M*N) time and space — fine
 * for prompt-sized inputs (the longest prompt this app dispatches is a
 * few thousand chars). For real document diffs we'd want Myers's O(ND)
 * algorithm, but it's overkill here.
 */

export type DiffKind = "context" | "added" | "removed";

export interface DiffLine {
  text: string;
  kind: DiffKind;
}

export function diffLines(prev: string, next: string): DiffLine[] {
  const a = prev.split("\n");
  const b = next.split("\n");
  const m = a.length;
  const n = b.length;

  /* LCS table — lcs[i][j] = length of LCS of a[i..] and b[j..]. */
  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) lcs[i][j] = lcs[i + 1][j + 1] + 1;
      else lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  /* Reconstruct front-to-back. */
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ text: a[i], kind: "context" });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ text: a[i], kind: "removed" });
      i++;
    } else {
      out.push({ text: b[j], kind: "added" });
      j++;
    }
  }
  while (i < m) {
    out.push({ text: a[i++], kind: "removed" });
  }
  while (j < n) {
    out.push({ text: b[j++], kind: "added" });
  }
  return out;
}

/** Aggregate counts per kind — useful for the "+3/-1" summary chip. */
export function diffStats(diff: DiffLine[]): {
  added: number;
  removed: number;
  context: number;
} {
  let added = 0;
  let removed = 0;
  let context = 0;
  for (const d of diff) {
    if (d.kind === "added") added++;
    else if (d.kind === "removed") removed++;
    else context++;
  }
  return { added, removed, context };
}
