"use client";

import { useMemo, useState } from "react";
import type { DiffSegment } from "@/lib/atlas/redline";

/**
 * Renders a word-level redline (inserts highlighted green, deletions
 * strike-through red) for an Atlas amendment. Segments come from the
 * server-side diffWords() helper so the client pays no CPU cost —
 * just styling.
 *
 * Collapsible when the diff is long (common on full-page snapshots):
 * shows a 'Show N more words' teaser above a fold. The fold is
 * tuned for ~80 words which renders as 3-4 lines of body text.
 */

const INITIAL_VISIBLE_WORDS = 120;

function countWords(segments: DiffSegment[]): number {
  return segments.reduce(
    (sum, s) => sum + (s.text.match(/\S+/g)?.length ?? 0),
    0,
  );
}

function truncateSegments(
  segments: DiffSegment[],
  limit: number,
): { head: DiffSegment[]; remainingWords: number } {
  let budget = limit;
  const head: DiffSegment[] = [];
  let remaining = 0;
  for (const seg of segments) {
    const words = seg.text.match(/\S+/g)?.length ?? 0;
    if (budget <= 0) {
      remaining += words;
      continue;
    }
    if (words <= budget) {
      head.push(seg);
      budget -= words;
    } else {
      // Partial segment — keep enough tokens to hit the budget.
      const tokens = seg.text.split(/(\s+)/);
      let kept = "";
      let taken = 0;
      for (const tok of tokens) {
        const isWord = /\S/.test(tok);
        if (isWord && taken >= budget) break;
        kept += tok;
        if (isWord) taken++;
      }
      head.push({ op: seg.op, text: kept });
      remaining += words - taken;
      budget = 0;
    }
  }
  return { head, remainingWords: remaining };
}

export function RedlineView({ segments }: { segments: DiffSegment[] }) {
  const [expanded, setExpanded] = useState(false);
  const totalWords = useMemo(() => countWords(segments), [segments]);
  const visible = useMemo(() => {
    if (expanded || totalWords <= INITIAL_VISIBLE_WORDS)
      return { head: segments, remainingWords: 0 };
    return truncateSegments(segments, INITIAL_VISIBLE_WORDS);
  }, [segments, expanded, totalWords]);

  if (segments.length === 0) {
    return (
      <p className="text-[11px] italic text-[var(--atlas-text-faint)]">
        No diff available — the previous snapshot wasn&rsquo;t captured (this
        was likely the first time the source was indexed).
      </p>
    );
  }

  return (
    <div className="text-[12px] leading-[1.7] text-[var(--atlas-text-secondary)] whitespace-pre-wrap break-words">
      {visible.head.map((seg, i) => {
        if (seg.op === "equal") {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.op === "insert") {
          return (
            <ins
              key={i}
              className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 no-underline px-0.5 rounded-sm"
            >
              {seg.text}
            </ins>
          );
        }
        return (
          <del
            key={i}
            className="bg-red-500/15 text-red-700 dark:text-red-300 line-through decoration-red-500/40 px-0.5 rounded-sm"
          >
            {seg.text}
          </del>
        );
      })}
      {visible.remainingWords > 0 && !expanded && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
          >
            Show {visible.remainingWords} more words
          </button>
        </>
      )}
      {expanded && totalWords > INITIAL_VISIBLE_WORDS && (
        <>
          {" "}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="text-[11px] font-medium text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] underline underline-offset-2"
          >
            Collapse
          </button>
        </>
      )}
    </div>
  );
}
