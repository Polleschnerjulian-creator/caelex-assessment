"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * CitationPill — clickable Atlas-ID with hover-preview tooltip.
 *
 * Renders the Atlas-ID as an inline pill. On hover (or focus for
 * keyboard users) it lazily fetches the source's title and
 * scope_description and shows them in a tooltip — letting the lawyer
 * preview the citation's scope WITHOUT leaving the chat. Click still
 * navigates to the full source-detail page.
 *
 * Lazy loading: the tooltip only fetches when first hovered/focused.
 * Once loaded, the result is cached on the component for the lifetime
 * of the chat bubble. No prefetch, no waterfall.
 *
 * Resilient to ID-not-found: if the API returns 404, the tooltip
 * shows "Quelle nicht gefunden" but the link still navigates. The
 * source-page handles the canonical not-found rendering.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";

interface CitationPillProps {
  id: string;
  href: string;
}

interface SourcePreview {
  title: string;
  scope_description: string;
  jurisdiction: string;
  type: string;
  status: string;
}

const previewCache = new Map<string, SourcePreview | null>();

export function CitationPill({ id, href }: CitationPillProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<SourcePreview | null | undefined>(
    previewCache.get(id),
  );
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const ensureLoaded = useCallback(async () => {
    if (fetchedRef.current) return;
    if (previewCache.has(id)) {
      setPreview(previewCache.get(id) ?? null);
      fetchedRef.current = true;
      return;
    }
    fetchedRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/atlas/source-preview/${encodeURIComponent(id)}`,
        { cache: "force-cache" },
      );
      if (!res.ok) {
        previewCache.set(id, null);
        setPreview(null);
        return;
      }
      const data = (await res.json()) as SourcePreview;
      previewCache.set(id, data);
      setPreview(data);
    } catch {
      previewCache.set(id, null);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Close tooltip on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => {
        setOpen(true);
        ensureLoaded();
      }}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => {
        setOpen(true);
        ensureLoaded();
      }}
      onBlur={() => setOpen(false)}
    >
      <Link
        href={href}
        className="atlas-citation-link inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[12px] font-mono no-underline transition-colors"
      >
        {id}
      </Link>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 left-0 top-[120%] w-80 max-w-[20rem] p-3 rounded-lg bg-[#0d111c] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.55)] text-[12px] leading-relaxed text-white/85 pointer-events-none"
          style={{
            // Prevent the tooltip from getting clipped by the chat's
            // overflow:hidden parents — float above on z-50 + absolute.
            transform: "translateY(2px)",
          }}
        >
          {loading && <span className="text-white/50">Lädt Quelle…</span>}
          {!loading && preview && (
            <>
              <span className="block text-emerald-400 font-mono text-[11px] mb-1">
                {preview.jurisdiction} · {preview.type.replace(/_/g, " ")} ·{" "}
                {preview.status}
              </span>
              <span className="block font-semibold text-white mb-1.5">
                {preview.title}
              </span>
              <span className="block text-white/70 text-[11.5px]">
                {preview.scope_description.length > 320
                  ? preview.scope_description.slice(0, 320) + "…"
                  : preview.scope_description}
              </span>
              <span className="block mt-2 text-[10.5px] text-white/40">
                Klick öffnet die Quelle.
              </span>
            </>
          )}
          {!loading && preview === null && (
            <span className="text-white/50">
              Quelle nicht im Atlas-Index. Klick öffnet die Quellseite trotzdem.
            </span>
          )}
        </span>
      )}
    </span>
  );
}
