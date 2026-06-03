"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * ContextPanel — right-side transparency window for Atlas AI Mode.
 *
 * Solves the "blackbox problem" that kills legal-AI trust: lawyers need
 * to see what Atlas is drawing on, not just what it says. While Claude
 * streams the answer, this panel shows —
 *
 *   1. The current query the user asked
 *   2. Which Atlas corpus items are semantically nearest to that query
 *      (real semantic-search results, each deep-linkable to its source
 *      detail page)
 *   3. Which § / Article references appear in Claude's answer as it
 *      streams (regex-parsed client-side)
 *   4. Model + live token-usage for audit trail
 *
 * No chatter: the panel is silent until the user has sent a prompt.
 * That keeps the idle mode focused on the singularity.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { SemanticMatch } from "@/hooks/useAtlasSemanticSearch";
import {
  ALL_LANDING_RIGHTS_PROFILES,
  ALL_CASE_STUDIES,
} from "@/data/landing-rights";
import { extractCitations } from "@/lib/atlas/citations";
import styles from "./ai-mode.module.css";

interface ContextPanelProps {
  /** The most recent user query, or null if none yet. */
  query: string | null;
  /** The assistant's text as it streams in — used for citation parsing. */
  assistantText: string;
}

interface HydratedSource {
  id: string;
  type: SemanticMatch["type"];
  title: string;
  jurisdiction: string;
  meta?: string;
  score: number;
  href: string;
}

// Citation parsing now lives in @/lib/atlas/citations so the same
// rule-set drives both this side-panel chip list AND the inline
// citation chips that AtlasMarkdown renders within message bodies
// (Phase 3 — Citations Highlighter). One source of truth.

// ─── Source hydration ─────────────────────────────────────────────────
//
// Non-"source" types (profile, case-study) are resolved synchronously
// from their respective small in-memory datasets — those are not the
// 3 MB corpus. Only "source" type is resolved via on-demand API fetch.
//
// Response shape from GET /api/atlas/source-preview/[id]:
//   { title, scope_description, jurisdiction, type, status,
//     verbatim_section, verbatim_snippet, verbatim_url }
//
// `official_reference` is not exposed by that route; we fall back to
// `scope_description` for the `meta` field (similar descriptive role).

interface SourcePreviewResponse {
  title: string;
  scope_description: string;
  jurisdiction: string;
  type: string;
  status: string;
  verbatim_section: string | null;
  verbatim_snippet: string | null;
  verbatim_url: string | null;
}

/** Resolve a raw match that does NOT require an API call (profile / case-study). */
function hydrateNonSourceMatch(m: SemanticMatch): HydratedSource | null {
  const [, rawId] = m.id.split(":");
  if (!rawId) return null;

  if (m.type === "profile") {
    const p = ALL_LANDING_RIGHTS_PROFILES.find((x) => x.jurisdiction === rawId);
    if (!p) return null;
    return {
      id: p.jurisdiction,
      type: "profile",
      title: `Landing Rights · ${p.jurisdiction}`,
      jurisdiction: p.jurisdiction,
      meta: p.overview.regime_type,
      score: m.score,
      href: `/atlas/landing-rights/${p.jurisdiction.toLowerCase()}`,
    };
  }

  if (m.type === "case-study") {
    const c = ALL_CASE_STUDIES.find((x) => x.id === rawId);
    if (!c) return null;
    return {
      id: c.id,
      type: "case-study",
      title: c.title,
      jurisdiction: c.jurisdiction,
      meta: c.operator,
      score: m.score,
      href: `/atlas/landing-rights/case-studies/${c.id}`,
    };
  }

  return null;
}

// ─── Live semantic fetch ──────────────────────────────────────────────

function useSemanticSources(query: string | null): {
  sources: HydratedSource[];
  loading: boolean;
  reason: string | null;
} {
  const [sources, setSources] = useState<HydratedSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  // Cache resolved source records so we don't re-fetch on re-renders.
  const sourceCache = useRef<Map<string, HydratedSource | null>>(new Map());

  useEffect(() => {
    if (!query || query.length < 3) {
      setSources([]);
      setLoading(false);
      setReason(null);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setReason(null);

    (async () => {
      try {
        const res = await fetch("/api/atlas/semantic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, limit: 6 }),
          signal: ac.signal,
        });

        if (!res.ok) {
          setSources([]);
          setReason(res.status === 429 ? "rate_limited" : "error");
          return;
        }

        const data = (await res.json()) as {
          matches: SemanticMatch[];
          reason?: string;
        };

        if (data.reason === "not_indexed") {
          setSources([]);
          setReason("not_indexed");
          return;
        }

        // Resolve all matches. Non-source types are synchronous; source
        // type is fetched on-demand (one request per unique source id,
        // with a session-level cache).
        const resolved = await Promise.all(
          data.matches.map(async (m): Promise<HydratedSource | null> => {
            if (m.type !== "source") return hydrateNonSourceMatch(m);

            const [, rawId] = m.id.split(":");
            if (!rawId) return null;

            // Return from cache if already fetched.
            if (sourceCache.current.has(rawId)) {
              const cached = sourceCache.current.get(rawId)!;
              if (!cached) return null;
              // Update score (can vary per query).
              return { ...cached, score: m.score };
            }

            // Fetch the single source record on-demand.
            try {
              const sRes = await fetch(
                `/api/atlas/source-preview/${encodeURIComponent(rawId)}`,
                { signal: ac.signal },
              );
              if (!sRes.ok) {
                sourceCache.current.set(rawId, null);
                return null;
              }
              const s = (await sRes.json()) as SourcePreviewResponse;
              const hydrated: HydratedSource = {
                id: rawId,
                type: "source",
                title: s.title,
                jurisdiction: s.jurisdiction,
                // official_reference not in source-preview API; use
                // scope_description as the descriptive meta fallback.
                meta: s.scope_description ?? undefined,
                score: m.score,
                href: `/atlas/sources/${rawId}`,
              };
              sourceCache.current.set(rawId, hydrated);
              return hydrated;
            } catch (err) {
              if ((err as Error).name === "AbortError") throw err;
              sourceCache.current.set(rawId, null);
              return null;
            }
          }),
        );

        if (ac.signal.aborted) return;
        setSources(resolved.filter((x): x is HydratedSource => x !== null));
        setReason(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSources([]);
        setReason("error");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [query]);

  return { sources, loading, reason };
}

// ─── Component ────────────────────────────────────────────────────────

export function ContextPanel({ query, assistantText }: ContextPanelProps) {
  const { sources, loading, reason } = useSemanticSources(query);
  const citations = useMemo(
    () => extractCitations(assistantText),
    [assistantText],
  );

  const empty = !query;

  return (
    <aside
      className={styles.contextPanel}
      aria-label="Atlas transparency context"
    >
      <div className={styles.contextHeader}>
        <span className={styles.contextTag}>Kontext</span>
        <span className={styles.contextSub}>Atlas-Transparenz</span>
      </div>

      {empty && (
        <div className={styles.contextEmpty}>
          Sobald du Atlas etwas fragst, siehst du hier die zugrunde liegenden
          Quellen, Zitate und Modell-Details.
        </div>
      )}

      {!empty && (
        <>
          <ContextSection title="Aktive Anfrage">
            <p className={styles.contextQuery}>
              „{(query ?? "").slice(0, 180)}
              {(query ?? "").length > 180 ? "…" : ""}"
            </p>
          </ContextSection>

          <ContextSection
            title={`Gefundene Quellen${sources.length ? ` · ${sources.length}` : ""}`}
            right={loading ? "sucht…" : undefined}
          >
            {reason === "not_indexed" && (
              <p className={styles.contextMuted}>
                Corpus nicht indiziert. Sobald <code>npm run atlas:embed</code>{" "}
                lief, erscheinen hier die passenden Paragraphen aus unserer
                Datenbank.
              </p>
            )}
            {reason === "error" && (
              <p className={styles.contextMuted}>
                Quellen-Suche gerade nicht erreichbar.
              </p>
            )}
            {!reason && sources.length === 0 && !loading && (
              <p className={styles.contextMuted}>
                Keine direkten Treffer im Corpus — Atlas antwortet aus seinem
                allgemeinen Rechtswissen.
              </p>
            )}
            {sources.length > 0 && (
              <ul className={styles.contextList}>
                {sources.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={s.href}
                      className={styles.contextSource}
                      target="_blank"
                    >
                      <div className={styles.contextSourceHead}>
                        <span className={styles.contextJuris}>
                          {s.jurisdiction}
                        </span>
                        <span className={styles.contextScore}>
                          {Math.round(s.score * 100)}%
                        </span>
                      </div>
                      <div className={styles.contextSourceTitle}>{s.title}</div>
                      {s.meta && (
                        <div className={styles.contextSourceMeta}>{s.meta}</div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ContextSection>

          {citations.length > 0 && (
            <ContextSection title={`Zitiert · ${citations.length}`}>
              <div className={styles.contextChips}>
                {citations.map((c) => (
                  <span
                    key={c.key}
                    className={styles.contextChip}
                    title={c.hint}
                  >
                    {c.label}
                  </span>
                ))}
              </div>
            </ContextSection>
          )}
        </>
      )}
    </aside>
  );
}

function ContextSection({
  title,
  right,
  children,
}: {
  title: string;
  right?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.contextSection}>
      <div className={styles.contextSectionHead}>
        <span className={styles.contextSectionTitle}>{title}</span>
        {right && <span className={styles.contextSectionRight}>{right}</span>}
      </div>
      <div>{children}</div>
    </section>
  );
}
