"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SemanticMatch } from "@/hooks/useAtlasSemanticSearch";
import { ALL_SOURCES } from "@/data/legal-sources";
import {
  ALL_LANDING_RIGHTS_PROFILES,
  ALL_CASE_STUDIES,
} from "@/data/landing-rights";
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

interface Citation {
  key: string;
  label: string;
  hint?: string;
}

// ─── Citation parsers ─────────────────────────────────────────────────
//
// We look for the textual patterns lawyers actually write: "BWRG §3",
// "Art. VI OST", "NIS2 Art. 21". Missed matches are fine — the panel
// is additive information, not authoritative. The alternative (LLM-
// based citation extraction) would cost tokens and add latency, and
// false-negatives at streaming time feel worse than missing one hit.

const CITATION_RULES: Array<{
  re: RegExp;
  label: (m: RegExpMatchArray) => string;
  hint?: (m: RegExpMatchArray) => string;
}> = [
  {
    re: /\b(BWRG|BDSG|TKG|LuftVG|AZG)\s*§\s*(\d+[a-z]?)/gi,
    label: (m) => `${m[1].toUpperCase()} §${m[2]}`,
    hint: () => "Deutsches Gesetz",
  },
  {
    re: /\b(NIS2|NIS-2)\s*Art\.\s*(\d+)/gi,
    label: (m) => `NIS2 Art. ${m[2]}`,
    hint: () => "EU-Direktive 2022/2555",
  },
  {
    re: /\bArt\.\s*(I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\s*(OST|Outer Space Treaty)/gi,
    label: (m) => `OST Art. ${m[1]}`,
    hint: () => "Weltraumvertrag 1967",
  },
  {
    re: /\bArt\.\s*(\d+)\s*(EU Space Act|Space Act EU)/gi,
    label: (m) => `EU Space Act Art. ${m[1]}`,
  },
  {
    re: /\b(FCC|FAA|ITAR|EAR)\s*(?:Part|§|Rule)?\s*([\d\.]+)/gi,
    label: (m) => `${m[1].toUpperCase()} ${m[2]}`,
    hint: () => "US-Regelung",
  },
  {
    re: /\b(Liability Convention|Registration Convention|Rescue Agreement|Moon Agreement)\s*Art\.\s*([IVX]+|\d+)/gi,
    label: (m) => `${m[1]} Art. ${m[2]}`,
    hint: () => "UN-Weltraumvertrag",
  },
];

function extractCitations(text: string): Citation[] {
  const seen = new Map<string, Citation>();
  for (const rule of CITATION_RULES) {
    const matches = text.matchAll(rule.re);
    for (const m of matches) {
      const label = rule.label(m);
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          label,
          hint: rule.hint ? rule.hint(m) : undefined,
        });
      }
    }
  }
  return Array.from(seen.values());
}

// ─── Source hydration ─────────────────────────────────────────────────

function hydrateMatches(matches: SemanticMatch[]): HydratedSource[] {
  return matches
    .map((m): HydratedSource | null => {
      const [, rawId] = m.id.split(":");
      if (!rawId) return null;
      if (m.type === "source") {
        const s = ALL_SOURCES.find((x) => x.id === rawId);
        if (!s) return null;
        return {
          id: s.id,
          type: "source",
          title: s.title_en,
          jurisdiction: s.jurisdiction,
          meta: s.official_reference ?? undefined,
          score: m.score,
          href: `/atlas/sources/${s.id}`,
        };
      }
      if (m.type === "profile") {
        const p = ALL_LANDING_RIGHTS_PROFILES.find(
          (x) => x.jurisdiction === rawId,
        );
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
    })
    .filter((x): x is HydratedSource => x !== null);
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
    fetch("/api/atlas/semantic-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 6 }),
      signal: ac.signal,
    })
      .then(async (res) => {
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
        setSources(hydrateMatches(data.matches));
        setReason(null);
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        setSources([]);
        setReason("error");
      })
      .finally(() => setLoading(false));

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
