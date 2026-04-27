import Link from "next/link";
import {
  Landmark,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  ScrollText,
  ArrowRight,
} from "lucide-react";
import {
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
} from "@/data/legal-sources";
import { getLinkStatusMap } from "@/lib/atlas/link-status";
import { LinkStatusBadge } from "../_components/LinkStatusBadge";
import { CitationButton } from "../_components/CitationButton";
import { AmendmentHistory } from "../_components/AmendmentHistory";
import { SchemaOrgLegislation } from "../_components/SchemaOrgLegislation";
import { BookmarkButton } from "../_components/BookmarkButton";

// H14: Incremental Static Regeneration (30 min). See /atlas/international
// for rationale — this page has the same characteristics.
export const revalidate = 1800;

export const metadata = {
  title: "European Union Instruments — Atlas",
  description:
    "EU Regulations, Directives, and policy instruments applicable to space operators in the Union. Canonical single source with Member State coverage.",
};

export default async function EUPage() {
  const sources = getLegalSourcesByJurisdiction("EU");
  const authorities = getAuthoritiesByJurisdiction("EU");
  const linkStatus = await getLinkStatusMap(sources.map((s) => s.id));

  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-10">
      <SchemaOrgLegislation
        sources={sources}
        authorities={authorities}
        pageUrl="https://caelex.io/atlas/eu"
      />
      <header className="mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 mb-3 text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-1">
          <Landmark size={12} />
          European Union
        </div>
        <h1 className="text-[36px] font-light tracking-tight text-[var(--atlas-text-primary)]">
          EU Regulations & Directives
        </h1>
        <p className="mt-3 text-[14px] text-[var(--atlas-text-secondary)] leading-relaxed">
          EU-level instruments directly applicable in Member States: EU Space
          Act proposal, NIS2 Directive, Cyber Resilience Act, DORA, Space
          Programme Regulation. Each entry lists the Member State coverage.
        </p>
      </header>

      {/* Featured chapter deep-dives — link the curated /atlas/eu-space-act
          (proposed regulation chapter overview) and /atlas/cra (Cyber
          Resilience Act chapter structure + key dates) cards. These two
          pages were previously orphaned (no inbound link from anywhere),
          so the curated chapter content was effectively invisible. */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mb-10">
        <Link
          href="/atlas/eu-space-act"
          className="group flex flex-col gap-2 p-5 rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] hover:border-blue-300 hover:shadow transition"
        >
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)]">
              Featured deep-dive
            </span>
          </div>
          <h3 className="text-[16px] font-semibold text-[var(--atlas-text-primary)]">
            EU Space Act — chapter overview
          </h3>
          <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
            COM(2025) 335 chapter structure (I–VII), article ranges, and
            draft-vs-final status flags. The fastest way to orient yourself in
            the proposed regulation.
          </p>
          <span className="inline-flex items-center gap-1 mt-1 text-[12px] font-medium text-blue-700 group-hover:gap-2 transition-all">
            Open <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          </span>
        </Link>

        <Link
          href="/atlas/cra"
          className="group flex flex-col gap-2 p-5 rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] hover:border-emerald-300 hover:shadow transition"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck
              className="h-4 w-4 text-emerald-600"
              strokeWidth={1.5}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)]">
              Featured deep-dive
            </span>
          </div>
          <h3 className="text-[16px] font-semibold text-[var(--atlas-text-primary)]">
            Cyber Resilience Act — chapter overview
          </h3>
          <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
            Regulation (EU) 2024/2847 — chapter structure (I–VIII) and the
            Article 71 application timeline. Sourced from the official
            consolidated text.
          </p>
          <span className="inline-flex items-center gap-1 mt-1 text-[12px] font-medium text-emerald-700 group-hover:gap-2 transition-all">
            Open <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          </span>
        </Link>
      </section>

      <section className="space-y-3 max-w-4xl mb-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-muted)] mb-3">
          Instruments ({sources.length})
        </h2>
        {sources.map((s) => (
          <article
            key={s.id}
            id={s.id}
            className="flex flex-col gap-3 p-5 rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] hover:border-[var(--atlas-border-strong)] hover:shadow-sm transition scroll-mt-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-[var(--atlas-text-primary)] leading-snug">
                  {s.title_en}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[var(--atlas-text-muted)]">
                  {s.date_in_force && <span>In force: {s.date_in_force}</span>}
                  {s.date_published && !s.date_in_force && (
                    <span>Published: {s.date_published}</span>
                  )}
                  {s.official_reference && <span>{s.official_reference}</span>}
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wider ${s.status === "in_force" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : s.status === "proposed" || s.status === "draft" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border)] text-[var(--atlas-text-secondary)]"}`}
                  >
                    {s.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <LinkStatusBadge
                  status={linkStatus[s.id]}
                  lastVerified={s.last_verified}
                />
                <BookmarkButton
                  item={{
                    id: s.id,
                    type: "source",
                    title: s.title_en,
                    subtitle: `${s.jurisdiction} · ${s.official_reference ?? s.id}`,
                    href: `/atlas/eu#${s.id}`,
                  }}
                />
                <CitationButton source={s} />
                {s.source_url && (
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--atlas-text-muted)] hover:text-emerald-700"
                  >
                    EUR-Lex <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>

            {s.scope_description && (
              <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed line-clamp-2">
                {s.scope_description}
              </p>
            )}

            <AmendmentHistory
              amendments={s.amendments}
              dateEnacted={s.date_enacted}
            />

            {s.applies_to_jurisdictions &&
              s.applies_to_jurisdictions.length > 0 && (
                <div className="pt-3 border-t border-[var(--atlas-border-subtle)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--atlas-text-muted)]">
                      Member State coverage
                    </span>
                    <span className="text-[10px] text-[var(--atlas-text-faint)]">
                      ({s.applies_to_jurisdictions.length} tracked
                      jurisdictions)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.applies_to_jurisdictions.map((code) => (
                      <Link
                        key={code}
                        href={`/atlas/jurisdictions/${code.toLowerCase()}`}
                        className="text-[10px] font-bold text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-inset)] hover:bg-blue-100 hover:text-blue-800 rounded px-2 py-1 transition-colors"
                      >
                        {code}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
          </article>
        ))}
      </section>

      {authorities.length > 0 && (
        <section className="max-w-4xl">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-muted)] mb-3">
            EU Institutions ({authorities.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {authorities.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 p-5 rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-[var(--atlas-text-primary)] bg-[var(--atlas-bg-inset)] rounded-md px-2 py-1">
                    {a.abbreviation}
                  </span>
                  <span className="text-[13px] font-semibold text-[var(--atlas-text-primary)]">
                    {a.name_en}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--atlas-text-secondary)] leading-relaxed">
                  {a.space_mandate}
                </p>
                {a.website && (
                  <a
                    href={a.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-medium"
                  >
                    {a.website.replace(/^https?:\/\//, "")}
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-12 pt-6 border-t border-[var(--atlas-border)] max-w-3xl">
        <Link
          href="/atlas/international"
          className="inline-flex items-center gap-2 text-[13px] text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)] font-medium"
        >
          <ArrowLeft size={14} />
          International Treaties
        </Link>
      </footer>
    </div>
  );
}
