"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Scale,
  Gavel,
  Coins,
  AlertCircle,
  Link2,
} from "lucide-react";
import {
  getCaseById,
  getCasesApplyingSource,
  getTranslatedCase,
} from "@/data/legal-cases";
import { getLegalSourceById } from "@/data/legal-sources";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Atlas case-law detail page. Client component so it can consume
 * useLanguage(); data is static so the only round-trip is the initial
 * RSC payload. Mirrors the visual language of /atlas/sources/[id] but
 * tailored to litigation/enforcement records.
 *
 * Translation flow:
 *   - UI labels via t("atlas.case_*").
 *   - Case body content via getTranslatedCase(caseId, language). When
 *     a translation is present we use it; otherwise we fall back to the
 *     English source-of-truth fields. We never invent a translation.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AtlasCaseDetailPage({ params }: PageProps) {
  const { id: rawId } = use(params);
  const { t, language } = useLanguage();
  const id = decodeURIComponent(rawId);
  const c = getCaseById(id);
  if (!c) notFound();

  const tr = getTranslatedCase(c.id, language);

  // Field-level fallback: prefer translation, fall back to source-of-truth.
  const title = tr?.title ?? c.title;
  const forumName = tr?.forum_name ?? c.forum_name;
  const plaintiff = tr?.plaintiff ?? c.plaintiff;
  const defendant = tr?.defendant ?? c.defendant;
  const facts = tr?.facts ?? c.facts;
  const ruling = tr?.ruling_summary ?? c.ruling_summary;
  const holding = tr?.legal_holding ?? c.legal_holding;
  const significance = tr?.industry_significance ?? c.industry_significance;
  const nonMonetary = tr?.remedy_non_monetary ?? c.remedy?.non_monetary ?? [];
  const notes = tr?.notes ?? c.notes ?? [];

  // Cross-reference: peer cases that applied the same primary source.
  const peerCases =
    c.applied_sources.length > 0
      ? getCasesApplyingSource(c.applied_sources[0])
          .filter((p) => p.id !== c.id)
          .slice(0, 5)
      : [];

  const isDe = language === "de";

  // i18n micro-strings local to this page. The shared `t()` keys cover the
  // section headings; these one-shot phrases (editorial banner + per-section
  // "Editorial summary" badge) are inlined to keep the audit-close-out diff
  // small and avoid touching all four locale JSON files for a label that
  // only appears on this surface.
  const editorialBadge = isDe
    ? "Caelex-Zusammenfassung"
    : "Caelex editorial summary";

  return (
    <div className="min-h-screen bg-[var(--atlas-bg-base)] text-[var(--atlas-text-primary)]">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link
          href="/atlas"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)] mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Atlas
        </Link>

        {/* Editorial-content disclosure — pinned at top of every case page.
            Mirror of the listing-page banner for readers who deep-link
            directly to a case via [CASE-…] citation. Tells the lawyer
            that facts/ruling/holding/significance are Caelex summaries
            and that the official record link in the footer is the only
            citation-safe source. Audit close-out for finding #5. */}
        <div
          className="mb-6 rounded-md border border-amber-300 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-900/15 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900 dark:text-amber-200"
          role="note"
        >
          {isDe ? (
            <>
              <strong>Redaktioneller Hinweis.</strong> Sachverhalt,
              Urteilstenor, Leitsatz und Bewertung auf dieser Seite sind von
              Caelex erstellte Kurzfassungen — kein Originaltext der
              Entscheidung. Für Zitate ausschließlich die unten verlinkte
              Originalentscheidung verwenden.
            </>
          ) : (
            <>
              <strong>Editorial note.</strong> The facts, ruling, holding, and
              industry-significance commentary on this page are Caelex-authored
              summaries — not verbatim court text. For citation purposes use
              only the official record linked in the footer below.
            </>
          )}
        </div>

        {/* Header — case caption */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 text-[11px] uppercase tracking-wider font-mono text-[var(--atlas-text-muted)]">
            <span>{c.jurisdiction}</span>
            <span>·</span>
            <span>{forumName}</span>
            <span>·</span>
            <span>{c.date_decided}</span>
            <span>·</span>
            <span className="text-violet-600">{c.id}</span>
          </div>
          <h1 className="text-[28px] leading-tight font-semibold mb-3">
            {title}
          </h1>
          <p className="text-[14px] text-[var(--atlas-text-secondary)] mb-2">
            <span className="font-medium">{plaintiff}</span>
            <span className="mx-2 text-[var(--atlas-text-muted)]">v.</span>
            <span className="font-medium">{defendant}</span>
          </p>
          {c.citation && (
            <p className="text-[12px] font-mono text-[var(--atlas-text-muted)]">
              {c.citation}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-[var(--atlas-bg-inset)] border border-[var(--atlas-border)] text-[var(--atlas-text-secondary)]">
              {c.status.replace(/_/g, " ")}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/40 text-violet-700 dark:text-violet-300">
              {c.precedential_weight.replace(/_/g, " ")}
            </span>
            {c.compliance_areas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-300"
              >
                {area.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>

        {/* Facts */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
            <Scale className="w-3.5 h-3.5" />
            {t("atlas.case_facts")}
            <span className="ml-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40">
              {editorialBadge}
            </span>
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--atlas-text-primary)]">
            {facts}
          </p>
        </section>

        {/* Ruling */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
            <Gavel className="w-3.5 h-3.5" />
            {t("atlas.case_ruling")}
            <span className="ml-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40">
              {editorialBadge}
            </span>
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--atlas-text-primary)]">
            {ruling}
          </p>
        </section>

        {/* Legal holding (ratio decidendi — Caelex's distilled one-liner).
            Visually emphasised because this is the field most likely to be
            quoted in a brief, but exactly for that reason it carries the
            strongest editorial-summary badge: a court's holding distilled
            in one sentence is interpretive work, not transcription. */}
        <section className="mb-6 rounded-lg border border-[var(--atlas-border-strong)] bg-[var(--atlas-bg-inset)] p-4">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
            <AlertCircle className="w-3.5 h-3.5" />
            {t("atlas.case_legal_holding")}
            <span className="ml-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40">
              {editorialBadge}
            </span>
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--atlas-text-primary)]">
            {holding}
          </p>
          <p className="mt-3 text-[11px] italic text-[var(--atlas-text-muted)] border-t border-[var(--atlas-border)] pt-2">
            {isDe
              ? "Diese Ein-Satz-Fassung des Leitsatzes ist eine Caelex-Interpretation. Vor Verwendung in Schriftsätzen am Originaltext der Entscheidung verifizieren."
              : "This one-sentence rendering of the holding is a Caelex interpretation. Verify against the original decision before relying on it in pleadings."}
          </p>
        </section>

        {/* Remedy */}
        {c.remedy && (
          <section className="mb-6">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
              <Coins className="w-3.5 h-3.5" />
              {t("atlas.case_remedy")}
            </h2>
            <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-4 space-y-2">
              {c.remedy.monetary && c.remedy.amount_usd != null && (
                <p className="text-[14px]">
                  <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                    ${c.remedy.amount_usd.toLocaleString("en-US")}
                  </span>
                  {c.remedy.amount_local && (
                    <span className="text-[12px] text-[var(--atlas-text-muted)] ml-2">
                      ({c.remedy.amount_local.amount.toLocaleString()}{" "}
                      {c.remedy.amount_local.currency})
                    </span>
                  )}
                </p>
              )}
              {nonMonetary.length > 0 && (
                <ul className="text-[13px] text-[var(--atlas-text-secondary)] list-disc pl-5 space-y-1">
                  {nonMonetary.map((nm, i) => (
                    <li key={i}>{nm}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* Industry significance — the most editorial section: this is
            Caelex commentary on why the matter is operationally relevant.
            Carries the same editorial-summary badge as the holding so
            readers don't mistake it for an officially-recognised
            "significance" finding from the forum itself. */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
            {t("atlas.case_why_it_matters")}
            <span className="ml-1 px-1.5 py-0.5 rounded text-[9.5px] font-medium uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40">
              {editorialBadge}
            </span>
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--atlas-text-secondary)] italic">
            {significance}
          </p>
        </section>

        {/* Applied sources */}
        {c.applied_sources.length > 0 && (
          <section className="mb-6">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-3">
              <Link2 className="w-3.5 h-3.5" />
              {t("atlas.case_applied_sources")}
            </h2>
            <ul className="space-y-2">
              {c.applied_sources.map((sid) => {
                const src = getLegalSourceById(sid);
                return (
                  <li key={sid}>
                    <Link
                      href={`/atlas/sources/${encodeURIComponent(sid)}`}
                      className="block rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] hover:bg-[var(--atlas-bg-elevated)] hover:border-[var(--atlas-border-strong)] p-3 no-underline transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                          {sid}
                        </span>
                        {src && (
                          <span className="text-[10px] text-[var(--atlas-text-muted)] uppercase tracking-wider">
                            {src.jurisdiction} · {src.type.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-[var(--atlas-text-primary)]">
                        {src
                          ? src.title_en
                          : t("atlas.case_source_not_in_catalogue")}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Peer cases — same primary source */}
        {peerCases.length > 0 && (
          <section className="mb-6">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-3">
              {t("atlas.case_peer_cases_on_same_source")}{" "}
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {c.applied_sources[0]}
              </span>
            </h2>
            <ul className="space-y-2">
              {peerCases.map((p) => {
                const peerTr = getTranslatedCase(p.id, language);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/atlas/cases/${encodeURIComponent(p.id)}`}
                      className="block rounded-md border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] hover:bg-[var(--atlas-bg-elevated)] p-3 no-underline transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[11px] text-violet-600 dark:text-violet-400">
                          {p.id}
                        </span>
                        <span className="text-[10px] text-[var(--atlas-text-muted)]">
                          {p.date_decided}
                        </span>
                      </div>
                      <div className="text-[13px] text-[var(--atlas-text-primary)]">
                        {peerTr?.title ?? p.title}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Notes */}
        {notes.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
              {t("atlas.case_notes")}
            </h2>
            <ul className="text-[12.5px] text-[var(--atlas-text-secondary)] list-disc pl-5 space-y-1">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-[var(--atlas-border)] flex items-center justify-between text-[11px] text-[var(--atlas-text-muted)]">
          <a
            href={c.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[var(--atlas-text-primary)]"
          >
            {t("atlas.case_official_record")}
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>
            {t("atlas.case_last_verified")}: {c.last_verified}
          </span>
        </footer>
      </div>
    </div>
  );
}
