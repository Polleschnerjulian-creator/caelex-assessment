import Link from "next/link";
import { Landmark, ExternalLink, ArrowLeft } from "lucide-react";
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
    <div className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-10">
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
        <h1 className="text-[36px] font-light tracking-tight text-gray-900">
          EU Regulations & Directives
        </h1>
        <p className="mt-3 text-[14px] text-gray-600 leading-relaxed">
          EU-level instruments directly applicable in Member States: EU Space
          Act proposal, NIS2 Directive, Cyber Resilience Act, DORA, Space
          Programme Regulation. Each entry lists the Member State coverage.
        </p>
      </header>

      <section className="space-y-3 max-w-4xl mb-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
          Instruments ({sources.length})
        </h2>
        {sources.map((s) => (
          <article
            key={s.id}
            id={s.id}
            className="flex flex-col gap-3 p-5 rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm transition scroll-mt-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {s.title_en}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                  {s.date_in_force && <span>In force: {s.date_in_force}</span>}
                  {s.date_published && !s.date_in_force && (
                    <span>Published: {s.date_published}</span>
                  )}
                  {s.official_reference && <span>{s.official_reference}</span>}
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold uppercase tracking-wider ${s.status === "in_force" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : s.status === "proposed" || s.status === "draft" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-600"}`}
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
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-emerald-700"
                  >
                    EUR-Lex <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>

            {s.scope_description && (
              <p className="text-[12px] text-gray-700 leading-relaxed line-clamp-2">
                {s.scope_description}
              </p>
            )}

            <AmendmentHistory
              amendments={s.amendments}
              dateEnacted={s.date_enacted}
            />

            {s.applies_to_jurisdictions &&
              s.applies_to_jurisdictions.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Member State coverage
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({s.applies_to_jurisdictions.length} tracked
                      jurisdictions)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.applies_to_jurisdictions.map((code) => (
                      <Link
                        key={code}
                        href={`/atlas/jurisdictions/${code.toLowerCase()}`}
                        className="text-[10px] font-bold text-gray-700 bg-gray-100 hover:bg-blue-100 hover:text-blue-800 rounded px-2 py-1 transition-colors"
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
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">
            EU Institutions ({authorities.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {authorities.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 p-5 rounded-xl bg-white border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-gray-900 bg-gray-100 rounded-md px-2 py-1">
                    {a.abbreviation}
                  </span>
                  <span className="text-[13px] font-semibold text-gray-900">
                    {a.name_en}
                  </span>
                </div>
                <p className="text-[12px] text-gray-700 leading-relaxed">
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

      <footer className="mt-12 pt-6 border-t border-gray-200 max-w-3xl">
        <Link
          href="/atlas/international"
          className="inline-flex items-center gap-2 text-[13px] text-gray-700 hover:text-gray-900 font-medium"
        >
          <ArrowLeft size={14} />
          International Treaties
        </Link>
      </footer>
    </div>
  );
}
