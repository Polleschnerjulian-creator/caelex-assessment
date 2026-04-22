import Link from "next/link";
import { Globe2, ExternalLink, ArrowRight } from "lucide-react";
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

// H14: Incremental Static Regeneration (30 min). The legal-source data
// is static at build-time; the only dynamic input is the per-source
// link-status from Prisma, which updates at most once per day via the
// atlas-source-check cron. 30-minute cache saves ~99 % of Neon queries
// without serving stale data beyond the cron cadence.
export const revalidate = 1800;

export const metadata = {
  title: "International Treaties — Atlas",
  description:
    "UN Space Treaties, ITU Constitution, and other international instruments binding on space-faring nations. Canonical single source with full list of Parties.",
};

export default async function InternationalPage() {
  const sources = getLegalSourcesByJurisdiction("INT");
  const authorities = getAuthoritiesByJurisdiction("INT");
  const linkStatus = await getLinkStatusMap(sources.map((s) => s.id));

  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-10">
      <SchemaOrgLegislation
        sources={sources}
        authorities={authorities}
        pageUrl="https://caelex.io/atlas/international"
      />
      <header className="mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 mb-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1">
          <Globe2 size={12} />
          International
        </div>
        <h1 className="text-[36px] font-light tracking-tight text-[var(--atlas-text-primary)]">
          International Space Treaties
        </h1>
        <p className="mt-3 text-[14px] text-[var(--atlas-text-secondary)] leading-relaxed">
          UN space treaties, ITU Constitution, and other multilateral
          instruments that apply to all Parties. Each entry lists the full
          ratification status across Atlas-tracked jurisdictions.
        </p>
      </header>

      {/* Treaties list */}
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
                  {s.un_reference && <span>{s.un_reference}</span>}
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wider ${s.status === "in_force" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border)] text-[var(--atlas-text-secondary)]"}`}
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
                    subtitle: `${s.jurisdiction} · ${s.official_reference ?? s.un_reference ?? s.id}`,
                    href: `/atlas/international#${s.id}`,
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
                    Official text <ExternalLink size={10} />
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
                      Parties
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
                        className="text-[10px] font-bold text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-inset)] hover:bg-emerald-100 hover:text-emerald-800 rounded px-2 py-1 transition-colors"
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

      {/* Authorities */}
      {authorities.length > 0 && (
        <section className="max-w-4xl">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--atlas-text-muted)] mb-3">
            Administering bodies ({authorities.length})
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
          href="/atlas/eu"
          className="inline-flex items-center gap-2 text-[13px] text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)] font-medium"
        >
          European Union instruments
          <ArrowRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
