"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Columns,
  ExternalLink,
  Plus,
  X,
  Search,
  Quote,
  AlertCircle,
  Gavel,
} from "lucide-react";
import {
  ALL_SOURCES,
  getLegalSourceById,
  getTranslatedSource,
  type LegalSource,
  type KeyProvision,
} from "@/data/legal-sources";
import {
  getCasesApplyingSource,
  getTranslatedCase,
  type LegalCase,
} from "@/data/legal-cases";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getVerbatimAttribution } from "@/lib/atlas/verbatim-attribution";

/**
 * /atlas/compare-articles — side-by-side article reader.
 *
 * Lawyers in cross-border drafting need to read the actual provisions
 * of FR-LOS Art. 4 next to UK SIA s.7 next to DE-BWRG §3 — full text,
 * scrollable, side-by-side. The Comparator (table-shaped) gives a
 * cell-per-criterion view; this gives the law's own words.
 *
 * State is fully URL-driven (`?refs=ID-A:section,ID-B:section,...`)
 * so a partner can paste the link to their team and everyone lands
 * on the exact same passage layout.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

interface ArticleRef {
  sourceId: string;
  section: string;
}

function parseRefs(raw: string | null): ArticleRef[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const idx = token.indexOf(":");
      if (idx === -1) return null;
      return {
        sourceId: token.slice(0, idx).trim(),
        section: decodeURIComponent(token.slice(idx + 1).trim()),
      };
    })
    .filter((r): r is ArticleRef => r !== null && r.sourceId.length > 0)
    .slice(0, 4); // Cap 4 columns — wider than that becomes unreadable.
}

function buildRefsParam(refs: ArticleRef[]): string {
  return refs
    .map((r) => `${r.sourceId}:${encodeURIComponent(r.section)}`)
    .join(",");
}

interface ResolvedRef {
  source: LegalSource;
  provision: KeyProvision | undefined;
  ref: ArticleRef;
}

function resolveRef(ref: ArticleRef): ResolvedRef | null {
  const source = getLegalSourceById(ref.sourceId);
  if (!source) return null;
  const provision = source.key_provisions.find(
    (p) => p.section === ref.section,
  );
  return { source, provision, ref };
}

// ───────────────────────────────────────────────────────────────────────
// AddArticleSearch — small inline search to add a 2nd/3rd/4th column
// ───────────────────────────────────────────────────────────────────────

function AddArticleSearch({
  onAdd,
  excludeKeys,
}: {
  onAdd: (ref: ArticleRef) => void;
  excludeKeys: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const isDe = language === "de";

  // Build a flat (source × provision) catalogue of every provision
  // with paragraph_text — the side-by-side reader is most valuable
  // when verbatim text is available, so we surface those first.
  const catalogue = useMemo(() => {
    const items: Array<{
      sourceId: string;
      section: string;
      titleEn: string;
      provisionTitle: string;
      jurisdiction: string;
      hasVerbatim: boolean;
    }> = [];
    for (const s of ALL_SOURCES) {
      for (const p of s.key_provisions) {
        items.push({
          sourceId: s.id,
          section: p.section,
          titleEn: s.title_en,
          provisionTitle: p.title,
          jurisdiction: s.jurisdiction,
          hasVerbatim: !!p.paragraph_text,
        });
      }
    }
    // Verbatim-bearing entries first; alphabetical-by-source within tier.
    items.sort((a, b) => {
      if (a.hasVerbatim !== b.hasVerbatim) return a.hasVerbatim ? -1 : 1;
      return a.sourceId.localeCompare(b.sourceId);
    });
    return items;
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return catalogue
      .filter((c) => {
        const key = `${c.sourceId}:${c.section}`;
        if (excludeKeys.has(key)) return false;
        const haystack =
          `${c.sourceId} ${c.section} ${c.titleEn} ${c.provisionTitle} ${c.jurisdiction}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 30);
  }, [query, catalogue, excludeKeys]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-4 py-2 text-[12px] font-medium text-[var(--atlas-text-muted)] hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
        {isDe ? "Artikel hinzufügen" : "Add article"}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-[420px] rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-lg overflow-hidden">
          <div className="flex items-center gap-1.5 border-b border-[var(--atlas-border)] px-3 py-2">
            <Search
              className="h-3.5 w-3.5 text-[var(--atlas-text-faint)]"
              strokeWidth={1.5}
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isDe
                  ? "Artikel oder Quelle suchen…"
                  : "Search article or source…"
              }
              className="flex-1 bg-transparent text-[12px] text-[var(--atlas-text-primary)] outline-none placeholder:text-[var(--atlas-text-faint)]"
            />
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {query.trim().length < 2 ? (
              <p className="p-4 text-[11.5px] text-[var(--atlas-text-muted)]">
                {isDe
                  ? "Mindestens 2 Zeichen — Treffer mit Original-Wortlaut werden zuerst angezeigt."
                  : "Type 2+ characters — entries with verbatim text appear first."}
              </p>
            ) : matches.length === 0 ? (
              <p className="p-4 text-[11.5px] text-[var(--atlas-text-muted)]">
                {isDe ? "Keine Treffer." : "No matches."}
              </p>
            ) : (
              matches.map((m) => (
                <button
                  key={`${m.sourceId}:${m.section}`}
                  type="button"
                  onClick={() => {
                    onAdd({ sourceId: m.sourceId, section: m.section });
                    setOpen(false);
                    setQuery("");
                  }}
                  className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
                >
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                        {m.sourceId}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--atlas-text-muted)]">
                        {m.section}
                      </span>
                      {m.hasVerbatim && (
                        <span className="text-[9px] uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1 py-0.5 rounded">
                          Verbatim
                        </span>
                      )}
                    </div>
                    <span className="text-[11.5px] text-[var(--atlas-text-primary)] truncate w-full">
                      {m.provisionTitle}
                    </span>
                    <span className="text-[10.5px] text-[var(--atlas-text-muted)] truncate w-full">
                      {m.titleEn}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// CompareArticlesView — main component
// ───────────────────────────────────────────────────────────────────────

function CompareArticlesView() {
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const isDe = language === "de";

  // Sync state with URL on mount + writes back on change.
  const initial = useMemo(
    () => parseRefs(searchParams.get("refs")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [refs, setRefs] = useState<ArticleRef[]>(initial);

  useEffect(() => {
    const newQs = buildRefsParam(refs);
    const url = newQs
      ? `/atlas/compare-articles?refs=${newQs}`
      : `/atlas/compare-articles`;
    window.history.replaceState({}, "", url);
  }, [refs]);

  const resolved = useMemo(
    () => refs.map(resolveRef).filter((r): r is ResolvedRef => r !== null),
    [refs],
  );

  const excludeKeys = useMemo(
    () => new Set(refs.map((r) => `${r.sourceId}:${r.section}`)),
    [refs],
  );

  const addRef = (ref: ArticleRef) => {
    if (refs.length >= 4) return;
    setRefs((prev) => [...prev, ref]);
  };

  const removeRef = (idx: number) => {
    setRefs((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-4">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Columns className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            {isDe ? "Artikel-Vergleich" : "Side-by-side articles"}
          </h1>
          <span className="text-[11px] text-[var(--atlas-text-faint)]">
            {isDe
              ? "Original-Wortlaut nebeneinander — bis zu 4 Spalten"
              : "Verbatim text side-by-side — up to 4 columns"}
          </span>
        </div>
      </header>

      <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
        {isDe ? (
          <>
            Die tiefe Recherche-Geste in jeder grenzüberschreitenden Mandate:
            den tatsächlichen Wortlaut zweier oder mehrerer Statuten
            nebeneinander lesen. Spalten lassen sich live aus jedem Atlas-Korpus
            hinzufügen; URL-State ist teilbar, damit Co-Counsel auf der gleichen
            Passage-Seite landet.
          </>
        ) : (
          <>
            The deep-research gesture in every cross-border matter: read the
            actual statutory wording of two or more provisions next to each
            other. Add columns live from any Atlas source; the URL state is
            shareable so co-counsel lands on the same passage layout.
          </>
        )}
      </p>

      {/* Empty state — onboarding examples */}
      {resolved.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-8 text-center">
          <Columns
            className="h-8 w-8 text-[var(--atlas-text-faint)] mx-auto mb-3"
            strokeWidth={1.2}
          />
          <p className="text-[13px] font-medium text-[var(--atlas-text-primary)] mb-1">
            {isDe
              ? "Wähle 2-4 Artikel zum Vergleich"
              : "Pick 2-4 articles to compare"}
          </p>
          <p className="text-[11.5px] text-[var(--atlas-text-muted)] mb-4 max-w-md mx-auto">
            {isDe
              ? "Tipp: Vergleiche fundamentale Verträge nebeneinander, um Kongruenz und Abweichung zwischen Regimen zu sehen."
              : "Tip: place foundational treaties side-by-side to see how regimes converge and diverge."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <Link
              href="/atlas/compare-articles?refs=INT-OST-1967:Art.%20VI,INT-LIABILITY-1972:Art.%20II,INT-REGISTRATION-1975:Art.%20II"
              className="rounded-full border border-violet-200 dark:border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300 transition-colors"
            >
              {isDe
                ? "OST Art. VI · Liability Art. II · Registration Art. II"
                : "OST Art. VI · Liability Art. II · Registration Art. II"}
            </Link>
            <Link
              href="/atlas/compare-articles?refs=INT-OST-1967:Art.%20I,INT-OST-1967:Art.%20II"
              className="rounded-full border border-violet-200 dark:border-violet-500/30 hover:bg-violet-50 dark:hover:bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300 transition-colors"
            >
              {isDe
                ? "OST Art. I · Art. II (Freiheit · Nicht-Aneignung)"
                : "OST Art. I · Art. II (freedom · non-appropriation)"}
            </Link>
          </div>
          <div className="mt-6">
            <AddArticleSearch onAdd={addRef} excludeKeys={excludeKeys} />
          </div>
        </div>
      )}

      {/* Side-by-side columns */}
      {resolved.length > 0 && (
        <>
          <div
            className={`grid gap-3 flex-1 min-h-0 ${
              resolved.length === 1
                ? "grid-cols-1"
                : resolved.length === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : resolved.length === 3
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {resolved.map((r, idx) => (
              <ArticleColumn
                key={`${r.ref.sourceId}:${r.ref.section}:${idx}`}
                resolved={r}
                language={language}
                onRemove={() => removeRef(idx)}
              />
            ))}
          </div>

          <div className="flex items-center justify-start">
            {refs.length < 4 && (
              <AddArticleSearch onAdd={addRef} excludeKeys={excludeKeys} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   F-CASES-3 — Doctrine Cross-Reference
   ──────────────────────────────────────────────────────────────────
   Lawyers comparing statutory provisions side-by-side want to know
   *how those provisions have been applied* — which decisions cite
   them, with what outcome. The cases dataset already tags each
   record with `applied_sources: string[]`, so the reverse-index is
   trivially `getCasesApplyingSource(source.id)`. We surface up to
   five hits per column so the column doesn't grow into a wall of
   text; the "all related cases" link drops straight into the cases
   list pre-filtered. */

const STATUS_TONE: Record<LegalCase["status"], string> = {
  decided:
    "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
  settled:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  vacated: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  appeal_pending:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  pending:
    "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  withdrawn:
    "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

const STATUS_LABEL: Record<LegalCase["status"], { en: string; de: string }> = {
  decided: { en: "Decided", de: "Entschieden" },
  settled: { en: "Settled", de: "Vergleich" },
  vacated: { en: "Vacated", de: "Aufgehoben" },
  appeal_pending: { en: "On appeal", de: "Berufung anhängig" },
  pending: { en: "Pending", de: "Anhängig" },
  withdrawn: { en: "Withdrawn", de: "Zurückgezogen" },
};

function RelatedCasesSection({
  sourceId,
  language,
}: {
  sourceId: string;
  language: ReturnType<typeof useLanguage>["language"];
}) {
  const isDe = language === "de";
  /* `getCasesApplyingSource` walks ATLAS_CASES once per render, but the
     dataset is module-loaded constant data (28 cases × ~5 sources each)
     so the cost is negligible — useMemo here would just add an
     allocation. Sort by date so the most-recent cases lead. */
  const cases = getCasesApplyingSource(sourceId).sort(
    (a, b) =>
      new Date(b.date_decided).getTime() - new Date(a.date_decided).getTime(),
  );
  if (cases.length === 0) return null;

  const visible = cases.slice(0, 5);
  const remaining = cases.length - visible.length;

  return (
    <div className="mt-5 pt-4 border-t border-[var(--atlas-border-subtle)]">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Gavel
          className="h-3 w-3 text-violet-600 dark:text-violet-400"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span className="text-[10px] uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300 font-semibold">
          {isDe
            ? `Anwendungsfälle (${cases.length})`
            : `Cases applying this (${cases.length})`}
        </span>
      </div>
      <ul className="space-y-1">
        {visible.map((c) => {
          const tr = getTranslatedCase(c.id, language);
          const title = tr?.title ?? c.title;
          const year = c.date_decided.slice(0, 4);
          const statusLabel = isDe
            ? STATUS_LABEL[c.status].de
            : STATUS_LABEL[c.status].en;
          return (
            <li key={c.id}>
              <Link
                href={`/atlas/cases/${encodeURIComponent(c.id)}`}
                className="group flex items-start gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-[var(--atlas-text-secondary)] hover:bg-[var(--atlas-bg-hover)] hover:text-[var(--atlas-text-primary)] transition-colors"
              >
                <span className="font-mono text-[10px] text-[var(--atlas-text-faint)] shrink-0 mt-0.5 w-9">
                  {year}
                </span>
                <span className="flex-1 min-w-0 leading-snug line-clamp-2 group-hover:text-[var(--atlas-text-primary)]">
                  {title}
                </span>
                <span
                  className={`shrink-0 self-start mt-0.5 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${STATUS_TONE[c.status]}`}
                >
                  {statusLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {remaining > 0 && (
        /* +N hint links to the cases index — the user can use the
           recently-shipped status / forum / jurisdiction filters to
           narrow further. We can't pre-filter via query-param yet
           (cases page reads filters from local state, not URL) so the
           link points at the index; the visible 5 already covered
           the most-recent cases, and the rest are older context. */
        <Link
          href="/atlas/cases"
          className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-violet-700 dark:text-violet-400 hover:underline"
        >
          {isDe ? `+${remaining} weitere` : `+${remaining} more`}
          <ExternalLink className="h-2.5 w-2.5" strokeWidth={1.5} />
        </Link>
      )}
    </div>
  );
}

function ArticleColumn({
  resolved,
  language,
  onRemove,
}: {
  resolved: ResolvedRef;
  language: ReturnType<typeof useLanguage>["language"];
  onRemove: () => void;
}) {
  const isDe = language === "de";
  const { source, provision } = resolved;
  const tr = getTranslatedSource(source, language);
  const verbatim = provision?.paragraph_text;
  const url = provision?.paragraph_url || source.source_url;

  return (
    <article className="flex flex-col rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden min-h-0">
      <header className="flex items-start justify-between gap-2 border-b border-[var(--atlas-border)] px-4 py-3 sticky top-0 bg-[var(--atlas-bg-surface)] z-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono text-[var(--atlas-text-muted)] mb-1">
            <span>{source.jurisdiction}</span>
            <span>·</span>
            <Link
              href={`/atlas/sources/${encodeURIComponent(source.id)}`}
              className="text-emerald-600 dark:text-emerald-400 hover:underline truncate max-w-[160px]"
            >
              {source.id}
            </Link>
            <span>·</span>
            <span className="font-bold">{resolved.ref.section}</span>
          </div>
          <h2 className="text-[13px] font-semibold text-[var(--atlas-text-primary)] leading-tight truncate">
            {tr.title}
          </h2>
          {provision && (
            <p className="text-[11px] text-[var(--atlas-text-muted)] mt-0.5 truncate">
              {provision.title}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={isDe ? "Spalte entfernen" : "Remove column"}
          className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded text-[var(--atlas-text-faint)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {!provision ? (
          <div className="flex items-start gap-2 text-[11.5px] text-amber-700 dark:text-amber-300">
            <AlertCircle
              className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
              strokeWidth={1.8}
            />
            <p>
              {isDe
                ? `Sektion „${resolved.ref.section}" wurde in dieser Quelle nicht gefunden — bitte Schreibweise prüfen oder eine andere Sektion wählen.`
                : `Section "${resolved.ref.section}" not found in this source — check spelling or pick another.`}
            </p>
          </div>
        ) : verbatim ? (
          <>
            <div className="flex items-center gap-1 mb-2">
              <Quote className="h-3 w-3 text-emerald-600" strokeWidth={1.5} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300 font-semibold">
                {isDe ? "Original-Wortlaut" : "Verbatim text"}
              </span>
            </div>
            <blockquote
              className="text-[13px] text-[var(--atlas-text-primary)] leading-[1.7] whitespace-pre-line"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {verbatim}
            </blockquote>
            {/* Per-jurisdiction attribution — same source-of-truth helper
                as VerbatimProvisionText (lib/atlas/verbatim-attribution.ts).
                Inline render here because the column-card has its own
                visual chassis distinct from the source-detail-page
                disclosure, so we mirror the wording but adapt the layout
                to the narrow column context. */}
            {(() => {
              const attribution = getVerbatimAttribution(source.jurisdiction);
              return (
                <div
                  className="mt-3 pt-2 border-t border-[var(--atlas-border-subtle)] text-[10px] leading-[1.55] text-[var(--atlas-text-muted)]"
                  role="note"
                >
                  <p className="mb-0.5">
                    <span className="font-semibold text-[var(--atlas-text-secondary)]">
                      {isDe ? "Quelle: " : "Source: "}
                    </span>
                    {attribution.publisher}
                    {source.last_verified && (
                      <span className="text-[var(--atlas-text-faint)]">
                        {" · "}
                        {isDe
                          ? `Caelex-Stand: ${source.last_verified}`
                          : `Caelex retrieval: ${source.last_verified}`}
                      </span>
                    )}
                  </p>
                  <p className="italic">
                    {isDe
                      ? attribution.licenseClause.de
                      : attribution.licenseClause.en}
                  </p>
                </div>
              );
            })()}
            {provision.summary && (
              <div className="mt-4 pt-3 border-t border-[var(--atlas-border-subtle)]">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--atlas-text-muted)] font-semibold mb-1">
                  {isDe ? "Caelex-Zusammenfassung" : "Caelex summary"}
                </p>
                <p className="text-[11.5px] text-[var(--atlas-text-secondary)] leading-relaxed">
                  {provision.summary}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--atlas-text-muted)] font-semibold">
                {isDe ? "Caelex-Zusammenfassung" : "Caelex summary"}
              </span>
            </div>
            <p className="text-[13px] text-[var(--atlas-text-primary)] leading-relaxed">
              {provision.summary}
            </p>
            {/* Atlas Lawyer-UX Audit F-COMP-2: turn the editorial
                disclaimer from a faint italicized footer into a banner
                that senior partners actually notice. Bar-license risk
                if a lawyer relies on backfilled text without verifying. */}
            <div
              className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10"
              role="note"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                />
              </svg>
              <p className="text-[11.5px] text-amber-800 dark:text-amber-200 leading-relaxed">
                <strong>
                  {isDe
                    ? "Wörtlicher Wortlaut wird nachgepflegt"
                    : "Verbatim text is being backfilled"}
                </strong>
                {" — "}
                {isDe
                  ? "bitte beim offiziellen Text verifizieren bevor Sie zitieren oder Mandanten beraten."
                  : "please verify against the official text before citing or advising clients."}
              </p>
            </div>
          </>
        )}

        {/* F-CASES-3: doctrine cross-reference. Renders nothing if zero
            cases cite this source — keeps short articles uncluttered.
            Lives below the verbatim/summary so the law's words always
            beat the case-list to the user's eye. */}
        <RelatedCasesSection sourceId={source.id} language={language} />
      </div>

      {(url || provision?.complianceImplication) && (
        <footer className="border-t border-[var(--atlas-border-subtle)] px-4 py-2.5 bg-[var(--atlas-bg-surface-muted)]">
          {provision?.complianceImplication && (
            <p className="text-[10.5px] text-emerald-800 dark:text-emerald-200 leading-relaxed mb-2">
              <span className="font-semibold">
                {isDe ? "Implikation:" : "Implication:"}
              </span>{" "}
              {provision.complianceImplication}
            </p>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
              {isDe ? "Offizieller Text" : "Official text"}
            </a>
          )}
        </footer>
      )}
    </article>
  );
}

export default function CompareArticlesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--atlas-bg-page)] p-4 animate-pulse">
          <div className="h-6 w-32 bg-[var(--atlas-bg-inset)] rounded mb-3" />
          <div className="h-32 bg-[var(--atlas-bg-inset)] rounded-xl" />
        </div>
      }
    >
      <CompareArticlesView />
    </Suspense>
  );
}
