"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * CitationPill — clickable Atlas-ID OR Case-ID with hover-preview
 * tooltip. Single component, two backing endpoints:
 *   - kind="source" → /api/atlas/source-preview/[id]   (legal sources)
 *   - kind="case"   → /api/atlas/case-preview/[id]     (case-law)
 *
 * Lazy fetch on first hover/focus, in-memory cache for the rest of the
 * page life. Resilient to 404s (tooltip says "nicht gefunden", link
 * still navigates).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getVerbatimAttribution } from "@/lib/atlas/verbatim-attribution";

type CitationKind = "source" | "case";

interface CitationPillProps {
  id: string;
  href: string;
  kind?: CitationKind;
}

interface SourcePreview {
  kind: "source";
  title: string;
  scope_description: string;
  jurisdiction: string;
  type: string;
  status: string;
  /** First backfilled verbatim provision (≤280 chars). When present
   *  the tooltip shows the law's own words instead of the scope
   *  description — the strongest "is Atlas real?" signal we ship. */
  verbatim_section?: string | null;
  verbatim_snippet?: string | null;
  verbatim_url?: string | null;
}

interface CasePreview {
  kind: "case";
  title: string;
  jurisdiction: string;
  forum: string;
  date_decided: string;
  plaintiff: string;
  defendant: string;
  ruling_summary: string;
  precedential_weight: string;
}

type Preview = SourcePreview | CasePreview;

const previewCache = new Map<string, Preview | null>();

export function CitationPill({ id, href, kind = "source" }: CitationPillProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null | undefined>(
    previewCache.get(`${kind}:${id}`),
  );
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const ensureLoaded = useCallback(async () => {
    if (fetchedRef.current) return;
    const cacheKey = `${kind}:${id}`;
    if (previewCache.has(cacheKey)) {
      setPreview(previewCache.get(cacheKey) ?? null);
      fetchedRef.current = true;
      return;
    }
    fetchedRef.current = true;
    setLoading(true);
    try {
      const endpoint = kind === "case" ? "case-preview" : "source-preview";
      const res = await fetch(
        `/api/atlas/${endpoint}/${encodeURIComponent(id)}`,
        { cache: "force-cache" },
      );
      if (!res.ok) {
        previewCache.set(cacheKey, null);
        setPreview(null);
        return;
      }
      const raw = await res.json();
      const data: Preview =
        kind === "case"
          ? { kind: "case", ...(raw as Omit<CasePreview, "kind">) }
          : { kind: "source", ...(raw as Omit<SourcePreview, "kind">) };
      previewCache.set(cacheKey, data);
      setPreview(data);
    } catch {
      previewCache.set(`${kind}:${id}`, null);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [id, kind]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Case pills get a violet accent so users can tell them apart from
  // source pills (emerald) at a glance.
  const palette =
    kind === "case"
      ? "bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400"
      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";

  const accentText = kind === "case" ? "text-violet-400" : "text-emerald-400";

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
        className={`atlas-citation-link inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${palette} text-[12px] font-mono no-underline transition-colors`}
      >
        {id}
      </Link>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 left-0 top-[120%] w-80 max-w-[20rem] p-3 rounded-lg bg-[#0d111c] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.55)] text-[12px] leading-relaxed text-white/85 pointer-events-none"
          style={{ transform: "translateY(2px)" }}
        >
          {loading && (
            <span className="text-white/50">{t("atlas.pill_loading")}</span>
          )}
          {!loading && preview && preview.kind === "source" && (
            <>
              <span
                className={`block ${accentText} font-mono text-[11px] mb-1`}
              >
                {/* Defensive nullish-coalescing so a malformed
                    /api/atlas/source-preview/[id] response (missing
                    type/status/jurisdiction) doesn't crash the
                    tooltip with `undefined.replace()`. Caught by
                    tests/unit/components/atlas/CitationPill.test.tsx. */}
                {preview.jurisdiction ?? "—"} ·{" "}
                {(preview.type ?? "").replace(/_/g, " ") || "—"} ·{" "}
                {preview.status ?? "—"}
              </span>
              <span className="block font-semibold text-white mb-1.5">
                {preview.title}
              </span>
              {preview.verbatim_snippet ? (
                <>
                  {preview.verbatim_section && (
                    <span className="block text-[10.5px] text-emerald-300/80 font-mono mb-1">
                      {preview.verbatim_section} —{" "}
                      <span className="italic text-white/40">
                        verbatim text
                      </span>
                    </span>
                  )}
                  <span
                    className="block text-white/85 text-[11.5px] leading-relaxed"
                    style={{
                      fontFamily: "Georgia, 'Times New Roman', serif",
                    }}
                  >
                    “{preview.verbatim_snippet}”
                  </span>
                  {/* Per-jurisdiction publisher attribution — minimal in
                      the tooltip context (tight on space). The full
                      licence-clause is on the source-detail page; here
                      we just name the publisher so the lawyer can tell
                      this is genuinely-quoted text, not Caelex prose.
                      Helper is the same single-source as the
                      source-detail / compare-articles surfaces. */}
                  <span className="mt-1.5 block text-[9.5px] text-white/40 leading-tight">
                    {language === "de" ? "Quelle: " : "Source: "}
                    {getVerbatimAttribution(preview.jurisdiction).publisher}
                  </span>
                </>
              ) : (
                <span className="block text-white/70 text-[11.5px]">
                  {/* Same nullish-defence as the metadata line above: a
                      malformed source-preview response (no scope_description)
                      would otherwise crash with `undefined.length`. */}
                  {(preview.scope_description ?? "").length > 320
                    ? (preview.scope_description ?? "").slice(0, 320) + "…"
                    : (preview.scope_description ?? "")}
                </span>
              )}
              <span className="block mt-2 text-[10.5px] text-white/40">
                {t("atlas.pill_click_opens_source")}
              </span>
            </>
          )}
          {!loading && preview && preview.kind === "case" && (
            <>
              <span
                className={`block ${accentText} font-mono text-[11px] mb-1`}
              >
                {/* Mirror the source-mode defence: malformed
                    case-preview responses must not crash the tooltip. */}
                {preview.jurisdiction ?? "—"} ·{" "}
                {(preview.forum ?? "").replace(/_/g, " ") || "—"} ·{" "}
                {preview.date_decided ?? "—"}
              </span>
              <span className="block font-semibold text-white mb-1.5">
                {preview.title}
              </span>
              <span className="block text-white/60 text-[11px] mb-1.5">
                {preview.plaintiff ?? "—"} v. {preview.defendant ?? "—"}
              </span>
              <span className="block text-white/70 text-[11.5px]">
                {preview.ruling_summary}
              </span>
              <span className="block mt-2 text-[10.5px] text-white/40">
                {t("atlas.pill_click_opens_case")} ·{" "}
                {(preview.precedential_weight ?? "").replace(/_/g, " ") || "—"}
              </span>
            </>
          )}
          {!loading && preview === null && (
            <span className="text-white/50">
              {kind === "case"
                ? t("atlas.pill_case_not_found")
                : t("atlas.pill_source_not_found")}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
