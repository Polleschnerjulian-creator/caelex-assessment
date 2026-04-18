"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

/**
 * A "Copy share link" button that reads the CURRENT page URL
 * (including any search params) and writes it to the clipboard.
 * Used on /atlas/share so a lawyer can paste a curated selection
 * into an email or chat.
 */
export function ShareLinkCopier() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 rounded-full px-3 py-1 transition-colors"
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
