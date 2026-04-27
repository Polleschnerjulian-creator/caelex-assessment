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
import { getCaseById, getCasesApplyingSource } from "@/data/legal-cases";
import { getLegalSourceById } from "@/data/legal-sources";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Atlas case-law detail page. Server-rendered: data is static, no
 * fetch/loading state needed. Mirrors the visual language of
 * /atlas/sources/[id] but tailored to litigation/enforcement records:
 *   - Caption: plaintiff v. defendant
 *   - Forum + date + status badges
 *   - Facts → Ruling → Legal holding → Industry significance
 *   - Remedy box (monetary + non-monetary)
 *   - Applied sources (cross-link into legal-sources catalogue)
 *   - Peer cases (same primary applied_source)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AtlasCaseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const c = getCaseById(decodeURIComponent(id));
  if (!c) notFound();

  // Cross-reference: peer cases that applied the same primary source.
  const peerCases =
    c.applied_sources.length > 0
      ? getCasesApplyingSource(c.applied_sources[0])
          .filter((p) => p.id !== c.id)
          .slice(0, 5)
      : [];

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

        {/* Header — case caption */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 text-[11px] uppercase tracking-wider font-mono text-[var(--atlas-text-muted)]">
            <span>{c.jurisdiction}</span>
            <span>·</span>
            <span>{c.forum.replace(/_/g, " ")}</span>
            <span>·</span>
            <span>{c.date_decided}</span>
            <span>·</span>
            <span className="text-violet-600">{c.id}</span>
          </div>
          <h1 className="text-[28px] leading-tight font-semibold mb-3">
            {c.title}
          </h1>
          <p className="text-[14px] text-[var(--atlas-text-secondary)] mb-2">
            <span className="font-medium">{c.plaintiff}</span>
            <span className="mx-2 text-[var(--atlas-text-muted)]">v.</span>
            <span className="font-medium">{c.defendant}</span>
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
            Facts
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--atlas-text-primary)]">
            {c.facts}
          </p>
        </section>

        {/* Ruling */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
            <Gavel className="w-3.5 h-3.5" />
            Ruling
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--atlas-text-primary)]">
            {c.ruling_summary}
          </p>
        </section>

        {/* Legal holding */}
        <section className="mb-6 rounded-lg border border-[var(--atlas-border-strong)] bg-[var(--atlas-bg-inset)] p-4">
          <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Legal holding
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--atlas-text-primary)]">
            {c.legal_holding}
          </p>
        </section>

        {/* Remedy */}
        {c.remedy && (
          <section className="mb-6">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
              <Coins className="w-3.5 h-3.5" />
              Remedy
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
              {c.remedy.non_monetary && c.remedy.non_monetary.length > 0 && (
                <ul className="text-[13px] text-[var(--atlas-text-secondary)] list-disc pl-5 space-y-1">
                  {c.remedy.non_monetary.map((nm, i) => (
                    <li key={i}>{nm}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* Industry significance */}
        <section className="mb-6">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
            Why it matters
          </h2>
          <p className="text-[14px] leading-relaxed text-[var(--atlas-text-secondary)] italic">
            {c.industry_significance}
          </p>
        </section>

        {/* Applied sources */}
        {c.applied_sources.length > 0 && (
          <section className="mb-6">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-3">
              <Link2 className="w-3.5 h-3.5" />
              Applied sources
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
                        {src ? src.title_en : "(not in current catalogue)"}
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
              Other cases on{" "}
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {c.applied_sources[0]}
              </span>
            </h2>
            <ul className="space-y-2">
              {peerCases.map((p) => (
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
                      {p.title}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Notes */}
        {c.notes && c.notes.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)] mb-2">
              Notes
            </h2>
            <ul className="text-[12.5px] text-[var(--atlas-text-secondary)] list-disc pl-5 space-y-1">
              {c.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer — source URL + last verified */}
        <footer className="mt-8 pt-6 border-t border-[var(--atlas-border)] flex items-center justify-between text-[11px] text-[var(--atlas-text-muted)]">
          <a
            href={c.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[var(--atlas-text-primary)]"
          >
            Official record
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>Last verified: {c.last_verified}</span>
        </footer>
      </div>
    </div>
  );
}
