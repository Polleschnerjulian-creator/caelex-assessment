"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Gavel,
  Search,
  Filter,
  X,
  ArrowRight,
  Scale,
  Coins,
  Building2,
} from "lucide-react";
import {
  ATLAS_CASES,
  ATLAS_CASES_COUNT,
  getTranslatedCase,
  type CaseForum,
  type CaseStatus,
  type LegalCase,
  type PrecedentialWeight,
} from "@/data/legal-cases";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { CaseCitationButton } from "./CaseCitationButton";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /atlas/cases — case law index. Browseable surface for the 28-case
 * case law database that was previously reachable only via source-detail
 * backlinks or Astra `[CASE-…]` citation pills.
 *
 * Filters:
 *   - Free-text search across title, parties, citation, jurisdiction
 *     (locale-aware via getTranslatedCase fallback)
 *   - Forum (court / regulator order / settlement / treaty award / …)
 *   - Jurisdiction (multi-select)
 *   - Compliance area
 *
 * Visual language matches /atlas/sources index but uses violet accents
 * (the same hue as `[CASE-…]` citation pills) to read as adjudication
 * outcomes rather than statutory text.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const FORUM_LABEL: Record<
  CaseForum,
  { en: string; de: string; weight: number }
> = {
  court: { en: "Court", de: "Gericht", weight: 0 },
  regulator_order: {
    en: "Regulator order",
    de: "Behördenanordnung",
    weight: 1,
  },
  regulator_settlement: {
    en: "Regulator settlement",
    de: "Behördenvergleich",
    weight: 2,
  },
  criminal_settlement: {
    en: "Criminal settlement",
    de: "Strafrechtlicher Vergleich",
    weight: 3,
  },
  civil_settlement: {
    en: "Civil settlement",
    de: "Zivilrechtlicher Vergleich",
    weight: 4,
  },
  treaty_award: { en: "Treaty award", de: "Vertragsentscheidung", weight: 5 },
  administrative_appeal: {
    en: "Administrative appeal",
    de: "Verwaltungsklage",
    weight: 6,
  },
  arbitral_award: { en: "Arbitral award", de: "Schiedsspruch", weight: 7 },
};

/* Atlas Lawyer-UX-Audit F-CASES-1: outcome (status) filter labels.
   Marie searches for precedent (e.g. "denied authorisation in UK") and
   wants to drop the 28 cases down to the handful that ended in the
   outcome she's interested in — without re-reading every record.
   Order is intentional (most-decisive first). */
const STATUS_LABEL: Record<CaseStatus, { en: string; de: string }> = {
  decided: { en: "Decided", de: "Entschieden" },
  settled: { en: "Settled", de: "Vergleich" },
  vacated: { en: "Vacated", de: "Aufgehoben" },
  appeal_pending: { en: "On appeal", de: "Berufung anhängig" },
  pending: { en: "Pending", de: "Anhängig" },
  withdrawn: { en: "Withdrawn", de: "Zurückgezogen" },
};

/* Render order — keep "decided" + "settled" at the top because those
   are the buckets lawyers want most often. */
const STATUS_ORDER: CaseStatus[] = [
  "decided",
  "settled",
  "vacated",
  "appeal_pending",
  "pending",
  "withdrawn",
];

const WEIGHT_BADGE: Record<
  PrecedentialWeight,
  { label_en: string; label_de: string; tone: string }
> = {
  binding: {
    label_en: "Binding",
    label_de: "Bindend",
    tone: "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300",
  },
  persuasive: {
    label_en: "Persuasive",
    label_de: "Überzeugend",
    tone: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
  },
  settled_facts: {
    label_en: "Settled facts",
    label_de: "Vergleich",
    tone: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  },
  non_precedential: {
    label_en: "No precedent",
    label_de: "Kein Präzedenz",
    tone: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  },
  treaty_only: {
    label_en: "Treaty",
    label_de: "Vertrag",
    tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
};

function formatAmount(c: LegalCase): string | null {
  const r = c.remedy;
  if (!r) return null;
  if (!r.monetary) return null;
  if (r.amount_usd) {
    const m = r.amount_usd / 1_000_000;
    if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
    if (m >= 1) return `$${m.toFixed(0)}M`;
    return `$${(r.amount_usd / 1000).toFixed(0)}K`;
  }
  if (r.amount_local) {
    return `${r.amount_local.amount.toLocaleString()} ${r.amount_local.currency}`;
  }
  return null;
}

function CasesIndexInner() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [forum, setForum] = useState<CaseForum | "all">("all");
  const [jurisdiction, setJurisdiction] = useState<string>("all");
  /* F-CASES-1: outcome-filter state. */
  const [status, setStatus] = useState<CaseStatus | "all">("all");

  /* F-CASES-3 stage-2: deep-link-driven source filter.
     The `?source=ID` param arrives from the +N more link rendered by
     the RelatedCasesSection on /atlas/compare-articles. We read it
     into state on mount + sync any subsequent clears back to the URL
     so a partner can share the filtered link. We also keep this as
     a separate state from the regular filter dropdowns because the
     audience for it is "drill-through from a specific source" —
     surfacing it via a banner instead of a permanent dropdown keeps
     the filter chrome honest for users who arrive directly. */
  const initialSource = searchParams.get("source");
  const [sourceFilter, setSourceFilter] = useState<string | null>(
    initialSource && initialSource.length > 0 ? initialSource : null,
  );
  useEffect(() => {
    /* If the URL changes (browser back/forward) sync our state. */
    const next = searchParams.get("source");
    setSourceFilter(next && next.length > 0 ? next : null);
  }, [searchParams]);
  const clearSourceFilter = () => {
    setSourceFilter(null);
    /* Strip the param from the URL but preserve any others (we use
       `replace` not `push` so the back-button still goes to the
       referrer, e.g. /atlas/compare-articles, not to a stale
       filtered state). */
    const params = new URLSearchParams(searchParams.toString());
    params.delete("source");
    const qs = params.toString();
    router.replace(qs.length > 0 ? `?${qs}` : "?", { scroll: false });
  };

  const allJurisdictions = useMemo(() => {
    const set = new Set(ATLAS_CASES.map((c) => c.jurisdiction));
    return Array.from(set).sort();
  }, []);

  /* Status counts so the dropdown can hide buckets that have zero
     matching cases — keeps the menu honest. */
  const statusCounts = useMemo(() => {
    const counts: Record<CaseStatus, number> = {
      decided: 0,
      settled: 0,
      pending: 0,
      withdrawn: 0,
      vacated: 0,
      appeal_pending: 0,
    };
    for (const c of ATLAS_CASES) counts[c.status] += 1;
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ATLAS_CASES.filter((c) => {
      if (forum !== "all" && c.forum !== forum) return false;
      if (jurisdiction !== "all" && c.jurisdiction !== jurisdiction)
        return false;
      if (status !== "all" && c.status !== status) return false;
      /* F-CASES-3 stage-2: source-id deep-link filter. Matches if the
         case carries the source id in its `applied_sources` array —
         same join column the RelatedCasesSection uses, so the link
         from compare-articles lands on exactly the cases the user saw
         on that page. */
      if (sourceFilter && !c.applied_sources.includes(sourceFilter))
        return false;
      if (!q) return true;
      const tr = getTranslatedCase(c.id, language);
      const haystack = [
        tr?.title ?? c.title,
        tr?.plaintiff ?? c.plaintiff,
        tr?.defendant ?? c.defendant,
        tr?.forum_name ?? c.forum_name,
        c.citation ?? "",
        c.id,
        c.jurisdiction,
        ...c.compliance_areas,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    }).sort(
      (a, b) =>
        new Date(b.date_decided).getTime() - new Date(a.date_decided).getTime(),
    );
  }, [query, forum, jurisdiction, status, sourceFilter, language]);

  const isDe = language === "de";

  return (
    <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-3">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Gavel className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            {isDe ? "Rechtsprechung" : "Case law"}
          </h1>
          <span className="text-[11px] text-[var(--atlas-text-faint)]">
            {ATLAS_CASES_COUNT}{" "}
            {isDe
              ? "Entscheidungen, Settlements und Behördenanordnungen"
              : "decisions, settlements, and regulator orders"}
          </span>
        </div>
      </header>

      {/* Intro */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm p-4">
        <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed max-w-3xl">
          {isDe ? (
            <>
              Wie Rechtsquellen tatsächlich angewendet werden — Gerichtsurteile,
              Behörden-Settlements, zivilrechtliche Vergleiche, Schiedssprüche
              und Vertragsentscheidungen, jeweils mit Verknüpfung auf die
              angewendeten Statuten. Cases sind das praxisorientierte Gegenstück
              zur Statuten-Datenbank — wer die Sources kennt, weiß was
              geschrieben steht; wer die Cases kennt, weiß was passiert wenn es
              geprüft wird.
            </>
          ) : (
            <>
              How legal sources are actually applied — court rulings, regulator
              settlements, civil judgments, arbitral awards, and treaty
              dispositions, each linked back to the statutes it interpreted.
              Cases are the practice-oriented counterpart to the statutory
              corpus: knowing the sources tells you what's written; knowing the
              cases tells you what happens when they're tested.
            </>
          )}
        </p>
      </div>

      {/* Editorial-content disclosure
          Case law entries below are Caelex-curated editorial summaries (facts,
          ruling, holding, industry significance), NOT verbatim court text.
          The detail page links to the official record on every entry — that
          remains the only authoritative citation source. Audit close-out
          for finding #5 (Case law editorial-banner). */}
      <div
        className="rounded-md border border-amber-300 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-900/15 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900 dark:text-amber-200"
        role="note"
      >
        {isDe ? (
          <>
            <strong>Redaktioneller Hinweis.</strong> Die untenstehenden
            Sachverhalte, Urteilstenore, Leitsätze und Bewertungen sind von
            Caelex erstellte Kurzfassungen — sie ersetzen nicht den Originaltext
            der Entscheidung. Für Zitate verwenden Sie bitte ausschließlich den
            offiziellen Volltext, verlinkt auf jeder Detailseite
            („Originalentscheidung").
          </>
        ) : (
          <>
            <strong>Editorial note.</strong> The facts, rulings, holdings, and
            industry-significance commentary below are Caelex-authored summaries
            — they are not verbatim court text. For citation purposes use only
            the official decision, linked from every detail page (&quot;Official
            record&quot;).
          </>
        )}
      </div>

      {/* GDPR Art. 6(1)(f) balancing disclosure for case law party names.
          Internal LIA at docs/legal-templates/caselaw-lia.md. Audit
          close-out for finding #16 (LIA review note). */}
      <div
        className="rounded-md border border-slate-200 dark:border-slate-700/50 bg-slate-50/70 dark:bg-slate-900/30 px-3 py-2 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300"
        role="note"
      >
        {isDe ? (
          <>
            Personenbezogene Parteienangaben werden auf Grundlage von Art. 6
            Abs. 1 lit. f DSGVO verarbeitet (berechtigtes Interesse an
            regulatorischer Transparenz). Quellenmaterial entstammt amtlichen
            Veröffentlichungskanälen. Betroffenenrechte (Auskunft, Löschung,
            Widerspruch) können unter{" "}
            <a
              href="mailto:privacy@caelex.eu"
              className="underline hover:text-emerald-700 dark:hover:text-emerald-400"
            >
              privacy@caelex.eu
            </a>{" "}
            geltend gemacht werden.
          </>
        ) : (
          <>
            Personal-data fields (party names) are processed under Art. 6(1)(f)
            GDPR (legitimate interest in regulatory transparency). Source
            material is drawn from official publication channels. Data-subject
            rights (access, erasure, objection) may be exercised via{" "}
            <a
              href="mailto:privacy@caelex.eu"
              className="underline hover:text-emerald-700 dark:hover:text-emerald-400"
            >
              privacy@caelex.eu
            </a>
            .
          </>
        )}
      </div>

      {/* F-CASES-3 stage-2: source-filter deep-link banner. Renders
          ONLY when `?source=ID` is in the URL (e.g. arrived from the
          "+N more" link on a Compare-Articles RelatedCases section).
          The filter sits *above* the regular dropdowns because it's a
          contextual scope-narrowing — the user is here because they
          clicked a specific source, not because they're browsing
          generally. The clear-button strips the param so the user can
          widen back to the full list without navigating away. */}
      {sourceFilter && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 dark:border-violet-500/40 dark:bg-violet-500/10 px-3 py-2"
          role="status"
        >
          <Scale
            className="h-3.5 w-3.5 text-violet-700 dark:text-violet-300 flex-shrink-0"
            strokeWidth={1.7}
          />
          <span className="text-[12px] text-violet-900 dark:text-violet-100">
            {isDe ? "Gefiltert auf Cases die" : "Filtered to cases applying"}{" "}
            <Link
              href={`/atlas/sources/${encodeURIComponent(sourceFilter)}`}
              className="font-mono font-semibold underline underline-offset-2 hover:text-violet-950 dark:hover:text-white"
            >
              {sourceFilter}
            </Link>{" "}
            {isDe ? "anwenden." : "."}
            <span className="ml-1 text-violet-700/80 dark:text-violet-200/70">
              {filtered.length}{" "}
              {isDe
                ? filtered.length === 1
                  ? "Treffer"
                  : "Treffer"
                : filtered.length === 1
                  ? "match"
                  : "matches"}
              {(query ||
                forum !== "all" ||
                jurisdiction !== "all" ||
                status !== "all") &&
                ` (${isDe ? "+ weitere Filter" : "+ further filters"})`}
              .
            </span>
          </span>
          <button
            type="button"
            onClick={clearSourceFilter}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-violet-800 dark:text-violet-200 hover:text-violet-950 dark:hover:text-white"
          >
            <X className="h-3 w-3" strokeWidth={1.8} />
            {isDe ? "Filter aufheben" : "Clear filter"}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 shadow-sm flex-1 min-w-[240px] max-w-md">
          <Search
            className="h-3.5 w-3.5 text-[var(--atlas-text-faint)] flex-shrink-0"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isDe
                ? "Nach Caption, Partei, Aktenzeichen suchen…"
                : "Search caption, party, citation…"
            }
            className="bg-transparent text-[12px] text-[var(--atlas-text-primary)] flex-1 outline-none placeholder:text-[var(--atlas-text-faint)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-primary)]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <select
          value={forum}
          onChange={(e) => setForum(e.target.value as CaseForum | "all")}
          className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] shadow-sm outline-none cursor-pointer"
        >
          <option value="all">{isDe ? "Alle Foren" : "All forums"}</option>
          {(Object.keys(FORUM_LABEL) as CaseForum[]).map((f) => (
            <option key={f} value={f}>
              {isDe ? FORUM_LABEL[f].de : FORUM_LABEL[f].en}
            </option>
          ))}
        </select>

        <select
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
          className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] shadow-sm outline-none cursor-pointer"
        >
          <option value="all">
            {isDe ? "Alle Jurisdiktionen" : "All jurisdictions"}
          </option>
          {allJurisdictions.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>

        {/* F-CASES-1: outcome (status) filter. Buckets with 0 matches
            are hidden so the menu doesn't bait the user with dead
            options. The label includes the count to set expectations. */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CaseStatus | "all")}
          className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] shadow-sm outline-none cursor-pointer"
          aria-label={isDe ? "Nach Ausgang filtern" : "Filter by outcome"}
        >
          <option value="all">{isDe ? "Alle Ausgänge" : "All outcomes"}</option>
          {STATUS_ORDER.filter((s) => statusCounts[s] > 0).map((s) => (
            <option key={s} value={s}>
              {(isDe ? STATUS_LABEL[s].de : STATUS_LABEL[s].en) +
                ` (${statusCounts[s]})`}
            </option>
          ))}
        </select>

        {(query ||
          forum !== "all" ||
          jurisdiction !== "all" ||
          status !== "all") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setForum("all");
              setJurisdiction("all");
              setStatus("all");
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]"
          >
            <Filter className="h-3 w-3" strokeWidth={1.5} />
            {isDe ? "Filter zurücksetzen" : "Reset filters"}
          </button>
        )}

        <span className="ml-auto text-[11px] text-[var(--atlas-text-faint)]">
          {filtered.length} {isDe ? "Treffer" : "results"}
        </span>
      </div>

      {/* Result list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-8 text-center">
          <p className="text-[12px] text-[var(--atlas-text-muted)]">
            {isDe
              ? "Keine Entscheidungen für diese Filter."
              : "No matters match the current filters."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const tr = getTranslatedCase(c.id, language);
            const title = tr?.title ?? c.title;
            const plaintiff = tr?.plaintiff ?? c.plaintiff;
            const defendant = tr?.defendant ?? c.defendant;
            const forumName = tr?.forum_name ?? c.forum_name;
            const significance =
              tr?.industry_significance ?? c.industry_significance;
            const amount = formatAmount(c);
            const wb = WEIGHT_BADGE[c.precedential_weight];
            return (
              <li
                key={c.id}
                className="group rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] hover:bg-[var(--atlas-bg-surface-muted)] shadow-sm hover:shadow transition-all"
              >
                <Link
                  href={`/atlas/cases/${encodeURIComponent(c.id)}`}
                  className="block p-4"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono text-[var(--atlas-text-muted)]">
                      <span>{c.jurisdiction}</span>
                      <span>·</span>
                      <span>{c.date_decided.slice(0, 4)}</span>
                      <span>·</span>
                      <span className="text-violet-600 dark:text-violet-400">
                        {c.id}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${wb.tone}`}
                    >
                      {isDe ? wb.label_de : wb.label_en}
                    </span>
                  </div>

                  <h3 className="text-[14px] font-semibold text-[var(--atlas-text-primary)] mb-1 leading-snug line-clamp-2">
                    {title}
                  </h3>

                  <p className="text-[11px] text-[var(--atlas-text-secondary)] mb-2">
                    <span className="font-medium">{plaintiff}</span>
                    <span className="mx-1.5 text-[var(--atlas-text-faint)]">
                      v.
                    </span>
                    <span className="font-medium">{defendant}</span>
                  </p>

                  <p className="text-[11px] text-[var(--atlas-text-muted)] line-clamp-2 mb-3">
                    {significance}
                  </p>

                  <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[var(--atlas-border-subtle)]">
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--atlas-text-muted)]">
                      <Scale className="h-3 w-3" strokeWidth={1.5} />
                      {forumName}
                    </span>
                    {amount && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                        <Coins className="h-3 w-3" strokeWidth={1.5} />
                        {amount}
                      </span>
                    )}
                    {c.parties_mentioned && c.parties_mentioned.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[var(--atlas-text-muted)]">
                        <Building2 className="h-3 w-3" strokeWidth={1.5} />
                        {c.parties_mentioned.slice(0, 2).join(", ")}
                        {c.parties_mentioned.length > 2 &&
                          ` +${c.parties_mentioned.length - 2}`}
                      </span>
                    )}
                    {/* Atlas Lawyer-UX Audit F-CASES-2 (Quick-Win):
                        copy-citation button on the list-card itself
                        so Marie can cite without opening the detail.
                        stopPropagation handled inside the button. */}
                    <CaseCitationButton
                      plaintiff={plaintiff}
                      defendant={defendant}
                      citation={c.citation}
                      forumName={forumName}
                      dateDecided={c.date_decided}
                      language={language as "de" | "en" | "fr"}
                    />
                    <ArrowRight
                      className="h-3 w-3 ml-auto text-[var(--atlas-text-faint)] group-hover:text-violet-600 transition-colors"
                      strokeWidth={1.5}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* F-CASES-3 stage-2: Suspense wrapper required because the inner
   component reads `useSearchParams()`. Without this, Next 15 throws
   on the deep-link page transition. The fallback is intentionally
   tiny (header skeleton only) — the cases list is dataset-static, so
   first-paint should be sub-100ms. */
export default function CasesIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-3">
          <div className="h-6 w-48 rounded bg-[var(--atlas-bg-inset)] animate-pulse" />
          <div className="h-32 rounded-xl bg-[var(--atlas-bg-inset)] animate-pulse" />
        </div>
      }
    >
      <CasesIndexInner />
    </Suspense>
  );
}
