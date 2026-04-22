"use client";

import { useState, useEffect, useRef } from "react";
import { Link2, Check } from "lucide-react";

/**
 * A "Copy share link" button that reads the CURRENT page URL
 * (including any search params) and writes it to the clipboard.
 * Used on /atlas/share so a lawyer can paste a curated selection
 * into an email or chat.
 */
export function ShareLinkCopier() {
  const [copied, setCopied] = useState(false);
  // L10: track pending setTimeout so we can cancel it on unmount.
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function copy() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback: select + execCommand('copy') via a hidden textarea, which
      // works in non-HTTPS / iframe contexts where the Clipboard API is
      // denied. Only if that fails do we reach for the blocking prompt().
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "true");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), 1800);
      } catch {
        window.prompt("Copy this link:", url);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] hover:border-[var(--atlas-border-strong)] rounded-full px-3 py-1 transition-colors"
    >
      {copied ? (
        <>
          <Check size={11} strokeWidth={2.5} className="text-emerald-500" />
          Link copied
        </>
      ) : (
        <>
          <Link2 size={11} strokeWidth={2} />
          Copy share link
        </>
      )}
    </button>
  );
}
