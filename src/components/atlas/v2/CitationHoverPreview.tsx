"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Citation Hover-Preview
 *
 * Wraps a citation pill (e.g. `[ATLAS:DE-NIS2-Art.21]`) and on hover
 * fetches + displays a popover with the source's title, validity-badge,
 * last-verified date, and a short text snippet.
 *
 * Lazy: only fires the snippet-fetch on FIRST hover per sourceId
 * (module-level cache shared across all instances). Subsequent hovers
 * reuse the cached result.
 *
 * Open/close hysteresis:
 *   - 50ms delay before opening (avoids flicker on accidental cursor-drag)
 *   - 100ms delay before closing (lets user move cursor INTO the popover)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { ValidityBadge } from "./ValidityBadge";
import type { ValidityBadge as BadgeEnum } from "@/lib/atlas/validity-tools.server";

interface SnippetData {
  title: string;
  status: string;
  lastVerified: string | null;
  sourceUrl: string | null;
  snippet: string;
  badge: BadgeEnum;
}

type CacheState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; data: SnippetData }
  | { state: "error"; message: string };

/* Module-level cache shared across all CitationHoverPreview instances —
   the same sourceId can appear many times in a chat. */
const cache = new Map<string, CacheState>();

const OPEN_DELAY_MS = 50;
const CLOSE_DELAY_MS = 100;

export function CitationHoverPreview({
  sourceId,
  children,
}: {
  sourceId: string;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    placement: "above" | "below";
  } | null>(null);
  const [snapshot, setSnapshot] = useState<CacheState>(
    () => cache.get(sourceId) ?? { state: "idle" },
  );

  const fetchSnippet = useCallback(async () => {
    if (cache.get(sourceId)?.state === "ready") return;
    if (cache.get(sourceId)?.state === "loading") return;
    cache.set(sourceId, { state: "loading" });
    setSnapshot({ state: "loading" });
    try {
      const res = await fetch(
        `/api/atlas/citations/${encodeURIComponent(sourceId)}/snippet`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const msg =
          res.status === 404 ? "Quelle nicht gefunden" : `Fehler ${res.status}`;
        cache.set(sourceId, { state: "error", message: msg });
        setSnapshot({ state: "error", message: msg });
        return;
      }
      const data = (await res.json()) as SnippetData;
      cache.set(sourceId, { state: "ready", data });
      setSnapshot({ state: "ready", data });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      cache.set(sourceId, { state: "error", message: msg });
      setSnapshot({ state: "error", message: msg });
    }
  }, [sourceId]);

  const computePosition = useCallback(() => {
    const trig = triggerRef.current;
    if (!trig) return;
    const r = trig.getBoundingClientRect();
    /* Popover is ~320px wide × 180px tall (estimated). Decide above/
       below based on viewport room. Defaults to above. */
    const viewportH = window.innerHeight;
    const placeBelow = r.top < 200 || viewportH - r.bottom > 220;
    setPos({
      top: placeBelow ? r.bottom + 8 : r.top - 8,
      left: Math.max(8, Math.min(window.innerWidth - 328, r.left)),
      placement: placeBelow ? "below" : "above",
    });
  }, []);

  const handleEnter = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openTimerRef.current !== null) return;
    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = null;
      computePosition();
      setOpen(true);
      void fetchSnippet();
    }, OPEN_DELAY_MS);
  }, [computePosition, fetchSnippet]);

  const handleLeave = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) return;
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  }, []);

  /* Re-position on scroll/resize when open (cheap — no expensive layout). */
  useEffect(() => {
    if (!open) return;
    const onChange = () => computePosition();
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
    };
  }, [open, computePosition]);

  /* Cleanup timers on unmount. */
  useEffect(() => {
    return () => {
      if (openTimerRef.current !== null)
        window.clearTimeout(openTimerRef.current);
      if (closeTimerRef.current !== null)
        window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="inline-block"
      >
        {children}
      </span>
      {open && pos && (
        <div
          ref={popoverRef}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          style={{
            position: "fixed",
            top: pos.placement === "above" ? pos.top - 8 : pos.top,
            left: pos.left,
            transform: pos.placement === "above" ? "translateY(-100%)" : "none",
            zIndex: 60,
          }}
          className="w-[320px] rounded-lg bg-atlas-bg-panel p-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] dark:ring-white/[0.08]"
          role="tooltip"
        >
          {snapshot.state === "loading" && (
            <div className="flex items-center gap-2 text-[12px] text-atlas-text-secondary">
              <Loader2 size={11} className="animate-spin" />
              Lädt Quelle…
            </div>
          )}
          {snapshot.state === "error" && (
            <div className="text-[12px] text-atlas-text-secondary">
              {snapshot.message}
            </div>
          )}
          {snapshot.state === "idle" && (
            <div className="text-[12px] text-atlas-text-secondary">Lädt…</div>
          )}
          {snapshot.state === "ready" && (
            <>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="text-[12.5px] font-medium text-atlas-text-primary leading-snug">
                  {snapshot.data.title}
                </div>
                <ValidityBadge badge={snapshot.data.badge} />
              </div>
              {snapshot.data.snippet && (
                <div className="mb-2 max-h-32 overflow-y-auto text-[11.5px] leading-relaxed text-atlas-text-secondary">
                  {snapshot.data.snippet}
                </div>
              )}
              <div className="flex items-center justify-between text-[10.5px] text-atlas-text-muted">
                <span className="font-mono">{sourceId}</span>
                {snapshot.data.sourceUrl ? (
                  <a
                    href={snapshot.data.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 hover:text-atlas-text-primary"
                  >
                    Quelle
                    <ExternalLink size={9} />
                  </a>
                ) : snapshot.data.lastVerified ? (
                  <span>
                    Verifiziert: {snapshot.data.lastVerified.slice(0, 10)}
                  </span>
                ) : null}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
