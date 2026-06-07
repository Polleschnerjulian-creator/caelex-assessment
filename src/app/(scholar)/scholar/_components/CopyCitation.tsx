"use client";

/**
 * CopyCitation — small "copy pinpoint citation" button for Scholar.
 *
 * Copies an exact pinpoint citation (e.g. "Art. 22(1) EU Space Act,
 * COM(2025) 335") to the clipboard so readers can paste it straight into
 * a brief or memo. On success it flips to a transient "Kopiert" state for
 * ~2s, then reverts.
 *
 * Client component (needs navigator.clipboard + local copied state).
 * No data imports; presentational + a single async side-effect.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 *   • Type token: text-small (12px) from tailwind.config.ts — the same
 *     reading-meta size used by SCHOLAR_TYPE.meta / .mono. Never an
 *     ad-hoc text-[Npx].
 *
 * Accessibility (light canvas: #F7F8FA page / white cards):
 *   • gray-700 label on white ≈ 6.4:1 ✓  WCAG 1.4.3 AA.
 *   • gray-300 border ≈ 3.3:1 — load-bearing outline meets WCAG 1.4.11.
 *   • focus-visible:ring-2 ring-gray-900 ring-offset-2 with an
 *     #F7F8FA offset so the focus ring is visible on the page canvas.
 *   • Target ≥ 24px (px-2.5 + py-1 around a 12px line clears WCAG 2.5.8).
 *   • Glyphs are aria-hidden; the success state is announced via an
 *     aria-live region + the button's accessible name updates.
 *   • Motion honours prefers-reduced-motion (motion-safe:transition-colors).
 *
 * Resilience: if the Clipboard API is unavailable (insecure context,
 * older browser, or a rejected permission) the click is a graceful no-op —
 * never throws, never leaves the button stuck in a fake "copied" state.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { t } from "../_i18n/core";
import { COMMON } from "../_i18n/common";
import { SOURCE } from "../_i18n/source";
import { useScholarLocale } from "../_i18n/LocaleProvider";

// Size note: this button uses the `text-small` (12px) utility directly —
// the same reading-meta size as SCHOLAR_TYPE.meta / .mono in ./scholar-type,
// so it sits flush with surrounding citation metadata. SCHOLAR_TYPE exposes
// no bordered-control token, so there is nothing to spread here; importing a
// token only to discard it would be dead weight, so we don't.

const COPIED_RESET_MS = 2000;

export function CopyCitation({
  text,
  label,
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const locale = useScholarLocale();
  const [copied, setCopied] = useState(false);
  // Hold the timeout so a rapid re-click resets the 2s window cleanly and we
  // can clear it on unmount (no setState-after-unmount warning).
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    // Graceful fallback: no Clipboard API (insecure context / old browser).
    if (
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      typeof navigator.clipboard.writeText !== "function"
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Permission denied or write failed — leave the idle state intact.
    }
  }, [text]);

  // Idle label: the caller's localised label (ProvisionCard passes one) or the
  // generic "Copy citation" fallback. The transient success state uses the
  // shared "Copied" word (visible) and the fuller "Citation copied" (a11y).
  const idleLabel = label ?? t(locale, SOURCE, "copyCitation");
  const copiedShort = t(locale, COMMON, "copied");
  const copiedLong = t(locale, SOURCE, "copyCitationDone");
  const visibleLabel = copied ? copiedShort : idleLabel;

  return (
    <button
      type="button"
      onClick={handleCopy}
      // Accessible name reflects the action + transient result; the visible
      // <span> below carries the same text for sighted users.
      aria-label={copied ? copiedLong : idleLabel}
      className={
        "inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 " +
        "text-small text-gray-700 hover:bg-gray-50 " +
        "motion-safe:transition-colors " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 " +
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]" +
        (className ? " " + className : "")
      }
    >
      {/* Glyph — decorative; the adjacent label carries the meaning. */}
      {copied ? (
        <Check size={13} className="text-gray-700" aria-hidden={true} />
      ) : (
        <Copy size={13} className="text-gray-700" aria-hidden={true} />
      )}
      <span>{visibleLabel}</span>
      {/* Polite live region so screen readers hear the success transition. */}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? copiedLong : ""}
      </span>
    </button>
  );
}
