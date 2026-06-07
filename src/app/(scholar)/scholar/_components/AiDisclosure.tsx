/**
 * AiDisclosure — persistent, accessible AI-transparency notice for Scholar.
 *
 * EU AI Act Art. 50(1): users must be told, at first interaction, that they
 * are interacting with an AI system. Scholar's search ranks results with AI
 * semantic search, so this notice renders near the search input AND on the
 * results list. It also carries the research-aid / not-legal-advice line
 * (gap AI5) to reinforce the human-in-the-loop framing.
 *
 * Presentational only — no hooks, no data imports, no "use client" of its own
 * (it inherits the client boundary of the search page). The caller resolves
 * the i18n strings (search page is a client component → useScholarLocale())
 * and passes them in, so this component stays locale-agnostic and reusable.
 *
 * STRICTLY MONOCHROME — only gray Tailwind classes, zero other hue.
 *   • text token: SCHOLAR_TYPE.meta (text-small / gray-600) — subtle, per spec.
 *   • Info glyph inherits gray-500, aria-hidden (decorative; the text carries
 *     the meaning).
 *
 * Accessibility:
 *   • WCAG 1.4.3 — gray-600 on the light canvas / white cards ≈ 5.7–6:1 ✓ (AA).
 *   • role="note" + aria-label gives assistive tech a labelled, persistent
 *     landmark for the disclosure without being an alert (it is informational,
 *     not time-sensitive).
 *   • No focusable/interactive elements → no target-size or focus concerns.
 */

import { Info } from "lucide-react";
import { SCHOLAR_TYPE } from "./scholar-type";

export function AiDisclosure({
  label,
  text,
  className,
}: {
  /** Accessible name for the note landmark (e.g. "About these results"). */
  label: string;
  /** The visible disclosure sentence (AI-ranked + verify + not legal advice). */
  text: string;
  /** Optional extra layout classes from the call site (spacing only). */
  className?: string;
}) {
  return (
    <div
      role="note"
      aria-label={label}
      className={`flex items-start gap-2 ${className ?? ""}`}
    >
      <Info
        size={13}
        strokeWidth={1.5}
        className="text-gray-500 flex-shrink-0 mt-0.5"
        aria-hidden={true}
      />
      <p className={`${SCHOLAR_TYPE.meta} leading-normal`}>{text}</p>
    </div>
  );
}
