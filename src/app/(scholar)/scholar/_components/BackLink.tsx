/**
 * BackLink — context-aware back navigation for Caelex Scholar.
 *
 * Fixes the bug where the source-detail page always returned to /scholar:
 * if there is real browser history (e.g. the user came from a search-results
 * scroll position, a filtered list, or a different source), router.back()
 * restores that exact prior view. Only when there is no history to go back to
 * (direct navigation, fresh tab, bookmark) do we fall back to a fixed href.
 *
 * Rendered as a real <a href={fallbackHref}> so it:
 *   - works without JS (progressive enhancement — the href is the no-JS path),
 *   - is keyboard-focusable and announced as a link by AT,
 *   - still honours the smarter router.back() when JS is available.
 *
 * Styling mirrors the existing back link in sources/[id]/page.tsx, but uses the
 * SCHOLAR_TYPE "meta"-adjacent sizing via the text-small token (12px) instead
 * of an ad-hoc text-[12px], per the Scholar type-token rule.
 *
 * WCAG 2.2 AA:
 *   - 2.4.7 Focus Visible: focus-visible:ring-2 ring-gray-900 ring-offset-2
 *     ring-offset-[#F7F8FA].
 *   - 2.5.8 Target Size (Minimum): py-1 + size-13 icon + text gives a ≥24px
 *     high target.
 *   - 2.3.3 / motion: colour transition is gated behind motion-safe:.
 *   - The ArrowLeft glyph is aria-hidden; the visible label carries meaning.
 */

"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  /** Where to go when there is no browser history to return to. Default "/scholar". */
  fallbackHref?: string;
  /** Visible label. Default "Zurück". */
  fallbackLabel?: string;
  /** Extra classes appended to the base link styling. */
  className?: string;
}

export function BackLink({
  fallbackHref = "/scholar",
  fallbackLabel = "Zurück",
  className,
}: BackLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Prefer real back-navigation when there is history to return to; this is
    // what makes the link context-aware. Otherwise let the <a href> fallback
    // take over (don't preventDefault → native navigation to fallbackHref).
    if (typeof window !== "undefined" && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <a
      href={fallbackHref}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 py-1 text-small text-gray-700 hover:text-gray-900 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded${
        className ? ` ${className}` : ""
      }`}
    >
      <ArrowLeft size={13} aria-hidden="true" />
      {fallbackLabel}
    </a>
  );
}
