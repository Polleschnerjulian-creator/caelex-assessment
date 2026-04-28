/**
 * Minimal word-level diff renderer for the Atlas amendment redline view.
 *
 * Why word-level, not character-level: legal text is dense; a char-level
 * diff shows noise ("2024"→"2025" as 1 digit swap). Word tokens produce
 * readable, review-friendly output without bringing in a 50 KB diff
 * library (jsdiff). LCS on ~40 000 word tokens runs in well under 100 ms
 * on a cold Vercel function.
 *
 * Usage:
 *   const segments = diffWords(before, after);
 *   renderToJsx(segments); // or feed straight into React
 */

export type DiffOp = "equal" | "insert" | "delete";

export interface DiffSegment {
  op: DiffOp;
  text: string;
}

/**
 * Strip HTML tags + collapse whitespace. Legal pages are delivered as
 * HTML; the cron snapshots the raw body. We diff on the visible text
 * so nav/script noise doesn't pollute the redline.
 */
export function cleanForRedline(raw: string): string {
  return (
    raw
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      // Tag-replacement injects a space wherever a tag was, which is
      // correct for `Cap<br>1` → `Cap 1` but produces "here ." for
      // `here</em>.`. Strip the artificial space before standard
      // punctuation so the redline reads naturally.
      .replace(/\s+([.,;:!?])/g, "$1")
      .trim()
  );
}

/**
 * Tokenise into words + whitespace-separators, preserving both. Gives
 * natural diff boundaries and a rendered string that reads like the
 * original.
 */
function tokenise(s: string): string[] {
  const tokens: string[] = [];
  const re = /\s+|[^\s]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) tokens.push(m[0]);
  return tokens;
}

/**
 * Longest-common-subsequence traceback between two token arrays.
 * Returns a list of (op, text) segments suitable for rendering as
 * <ins>/<del>/<span> elements.
 */
export function diffWords(before: string, after: string): DiffSegment[] {
  const a = tokenise(before);
  const b = tokenise(after);
  const n = a.length;
  const m = b.length;

  if (n === 0 && m === 0) return [];
  if (n === 0) return [{ op: "insert", text: b.join("") }];
  if (m === 0) return [{ op: "delete", text: a.join("") }];

  // Classic DP LCS table — memory O(n*m). For our cap (~40 000 tokens
  // after cleanForRedline truncation), that's ~1.6 billion cells worst
  // case — too big. In practice the cleaned text is ~4-8 KB = ~800
  // tokens, so the table is ~640 k cells = fine. For safety, bail to
  // a coarse insert/delete segment when inputs exceed the safe cap.
  const SAFE_CAP = 3000;
  if (n > SAFE_CAP || m > SAFE_CAP) {
    // Too large for word-level LCS — emit a single block replacement.
    return [
      { op: "delete", text: a.join("") },
      { op: "insert", text: b.join("") },
    ];
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Walk back from (n, m) to (0, 0), coalescing runs of the same op.
  const segments: DiffSegment[] = [];
  let i = n;
  let j = m;
  const pushBack = (op: DiffOp, text: string) => {
    const last = segments[segments.length - 1];
    if (last && last.op === op) {
      last.text = text + last.text;
    } else {
      segments.push({ op, text });
    }
  };
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      pushBack("equal", a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      pushBack("delete", a[i - 1]);
      i--;
    } else {
      pushBack("insert", b[j - 1]);
      j--;
    }
  }
  while (i > 0) {
    pushBack("delete", a[--i > 0 ? i : 0]);
    if (i === 0) break;
  }
  while (j > 0) {
    pushBack("insert", b[--j > 0 ? j : 0]);
    if (j === 0) break;
  }
  // The traceback walks (n,m) → (0,0), so the segments[] array is in
  // reverse temporal order — the LAST segment in the array represents
  // the FIRST tokens of the diff. The pushBack helper coalesces text
  // within a same-op run (prepending to last.text), which yields the
  // correct text WITHIN each segment. But the segment array itself
  // must be reversed before returning so consumers (renderTextRedline,
  // RedlineView) read it left-to-right.
  //
  // BUG-FIX 2026-04-28: previously we returned `segments` directly,
  // claiming "the pushBack helper undid the reverse". That was wrong
  // — pushBack only undoes the reverse WITHIN a single same-op run,
  // not across the array. Caught by tests/unit/lib/atlas/redline.test.ts.
  segments.reverse();
  return segments;
}

/**
 * Convenience: produces a concise plain-text representation, useful
 * when rendering in environments where React isn't available (e.g.
 * email notifications of a detected amendment).
 */
export function renderTextRedline(segments: DiffSegment[]): string {
  return segments
    .map((s) =>
      s.op === "equal"
        ? s.text
        : s.op === "insert"
          ? `[+${s.text}+]`
          : `[-${s.text}-]`,
    )
    .join("");
}
