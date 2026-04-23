"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * useAtlasSemanticSearch — client hook wrapping the `/api/atlas/
 * semantic-search` endpoint. Debounces the query, cancels in-flight
 * requests when the user types again, and exposes a simple state
 * surface for the Atlas command-centre UI.
 *
 * State shape mirrors the ergonomics of the existing performSearch
 * path so the page can render "Exact" and "Ähnliche Konzepte" side
 * by side without special-case plumbing.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";

export interface SemanticMatch {
  id: string;
  type: "source" | "authority" | "profile" | "case-study" | "conduct";
  score: number;
}

export type SemanticStatus =
  | "idle"
  | "loading"
  | "ready"
  | "not_indexed"
  | "rate_limited"
  | "error";

export interface UseAtlasSemanticSearchResult {
  matches: SemanticMatch[];
  status: SemanticStatus;
  tookMs: number | null;
}

interface Options {
  /** Minimum query length before the hook fires. Matches the server's
   *  z.min(2) but most natural queries start producing useful semantic
   *  matches from 4+ characters, so we default to that. */
  minQueryLength?: number;
  /** Debounce in ms. Longer than the exact-match debounce so users get
   *  instant string-match feedback and semantic results arrive on the
   *  second breath. */
  debounceMs?: number;
  /** Cap results. Server caps at 40 regardless. */
  limit?: number;
  /** Feature flag — when false the hook stays idle. Lets the page
   *  gate semantic search via an env flag without removing the hook. */
  enabled?: boolean;
}

export function useAtlasSemanticSearch(
  rawQuery: string,
  options: Options = {},
): UseAtlasSemanticSearchResult {
  const {
    minQueryLength = 4,
    debounceMs = 300,
    limit = 12,
    enabled = true,
  } = options;

  const [matches, setMatches] = useState<SemanticMatch[]>([]);
  const [status, setStatus] = useState<SemanticStatus>("idle");
  const [tookMs, setTookMs] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = rawQuery.trim();
    if (!enabled || trimmed.length < minQueryLength) {
      setMatches([]);
      setStatus("idle");
      setTookMs(null);
      abortRef.current?.abort();
      return;
    }

    const timer = setTimeout(async () => {
      // Cancel any in-flight request. A user still typing doesn't
      // care about the old vector and we save the gateway a call.
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setStatus("loading");
      try {
        const res = await fetch("/api/atlas/semantic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, limit }),
          signal: ac.signal,
        });

        if (ac.signal.aborted) return;

        if (res.status === 429) {
          setStatus("rate_limited");
          setMatches([]);
          setTookMs(null);
          return;
        }

        if (!res.ok) {
          setStatus("error");
          setMatches([]);
          setTookMs(null);
          return;
        }

        const data = (await res.json()) as {
          matches: SemanticMatch[];
          corpus: number;
          reason?: "not_indexed" | "embedding_failed";
          tookMs: number;
        };

        if (ac.signal.aborted) return;

        if (data.reason === "not_indexed") {
          // Corpus never ran through npm run atlas:embed (e.g. on a
          // branch where the JSON isn't committed yet). Silently
          // disable the section — UI already has the exact-match path.
          setStatus("not_indexed");
          setMatches([]);
          setTookMs(null);
          return;
        }

        if (data.reason === "embedding_failed") {
          setStatus("error");
          setMatches([]);
          setTookMs(null);
          return;
        }

        setMatches(data.matches);
        setTookMs(data.tookMs);
        setStatus("ready");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
        setMatches([]);
        setTookMs(null);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [rawQuery, enabled, minQueryLength, debounceMs, limit]);

  return { matches, status, tookMs };
}
