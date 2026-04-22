import Link from "next/link";
import { Share2, ExternalLink, ArrowLeft } from "lucide-react";
import {
  getLegalSourcesByJurisdiction,
  getLegalSourceById,
  getAvailableJurisdictions,
  type LegalSource,
  type ComplianceArea,
} from "@/data/legal-sources";
import { getLinkStatusMap } from "@/lib/atlas/link-status";
import { LinkStatusBadge } from "../_components/LinkStatusBadge";
import { CitationButton } from "../_components/CitationButton";
import { ShareLinkCopier } from "../_components/ShareLinkCopier";

export const dynamic = "force-dynamic";

/** C7: searchParams values can be string | string[] | undefined when the
 *  same key appears multiple times (`?country=DE&country=FR`). The prior
 *  typing as `string` crashed with TypeError on split(). */
interface Props {
  searchParams: Promise<{
    country?: string | string[];
    area?: string | string[];
    ids?: string | string[];
    title?: string | string[];
  }>;
}

/** Flatten string | string[] | undefined and split each entry on commas. */
function parseCsvParam(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.flatMap((x) => x.split(",")).filter(Boolean);
}

/** Take the first string value from a potentially-repeated param. */
function firstString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

const VALID_AREAS: ComplianceArea[] = [
  "licensing",
  "registration",
  "liability",
  "insurance",
  "cybersecurity",
  "export_control",
  "data_security",
  "frequency_spectrum",
  "environmental",
  "debris_mitigation",
  "space_traffic_management",
  "human_spaceflight",
  "military_dual_use",
];

function resolveSources(
  countries: string[],
  areas: ComplianceArea[],
  ids: string[],
): LegalSource[] {
  const seen = new Map<string, LegalSource>();

  // 1. explicit IDs
  for (const id of ids) {
    const src = getLegalSourceById(id);
    if (src) seen.set(src.id, src);
  }

  // 2. country-scoped lookups
  if (countries.length > 0) {
    for (const code of countries) {
      for (const s of getLegalSourcesByJurisdiction(code)) {
        if (!seen.has(s.id)) seen.set(s.id, s);
      }
    }
  }

  // 3. optional area filter
  const all = Array.from(seen.values());
  if (areas.length === 0) return all;
  return all.filter((s) => s.compliance_areas.some((a) => areas.includes(a)));
}

export default async function SharePage({ searchParams }: Props) {
  const params = await searchParams;
  const countries = parseCsvParam(params.country)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const areas = parseCsvParam(params.area)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .filter((a): a is ComplianceArea =>
      VALID_AREAS.includes(a as ComplianceArea),
    );
  const ids = parseCsvParam(params.ids)
    .map((s) => s.trim())
    .filter(Boolean);
  const titleParam = firstString(params.title);

  // Guard against unknown country codes
  const knownJurisdictions = new Set(getAvailableJurisdictions());
  const validCountries = countries.filter((c) => knownJurisdictions.has(c));

  const sources = resolveSources(validCountries, areas, ids);
  const linkStatus = await getLinkStatusMap(sources.map((s) => s.id));

  const title =
    titleParam?.trim() ||
    (validCountries.length > 0
      ? `Regulatory stack — ${validCountries.join(", ")}`
      : "Shared Atlas selection");

  return (
    <div className="min-h-screen bg-[var(--atlas-bg-page)] px-8 lg:px-16 py-10">
      <header className="mb-8 max-w-3xl">
        <div className="inline-flex items-center gap-2 mb-3 text-[10px] font-semibold uppercase tracking-wider text-gray-700 bg-gray-100 border border-gray-200 rounded-md px-2 py-1">
          <Share2 size={12} />
          Shared selection
        </div>
        <h1 className="text-[28px] font-light tracking-tight text-gray-900">
          {title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
          {validCountries.length > 0 && (
            <span>
              Countries:{" "}
              <strong className="font-semibold text-gray-700">
                {validCountries.join(", ")}
              </strong>
            </span>
          )}
          {areas.length > 0 && (
            <span>
              Compliance areas:{" "}
              <strong className="font-semibold text-gray-700">
                {areas.join(", ")}
              </strong>
            </span>
          )}
          <span>•</span>
          <span>
            <strong className="font-semibold text-gray-700">
              {sources.length}
            </strong>{" "}
            source{sources.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4">
          <ShareLinkCopier />
        </div>
      </header>

      {sources.length === 0 ? (
        <div className="max-w-xl rounded-xl bg-white border border-gray-100 p-8 text-center">
          <p className="text-[13px] text-gray-600">
            No sources match this selection. Adjust the{" "}
            <code className="text-[11px] bg-gray-50 border border-gray-100 rounded px-1">
              country
            </code>
            ,{" "}
            <code className="text-[11px] bg-gray-50 border border-gray-100 rounded px-1">
              area
            </code>
            , or{" "}
            <code className="text-[11px] bg-gray-50 border border-gray-100 rounded px-1">
              ids
            </code>{" "}
            query parameters.
          </p>
        </div>
      ) : (
        <section className="space-y-3 max-w-4xl">
          {sources.map((s) => (
            <article
              key={s.id}
              id={s.id}
              className="flex flex-col gap-3 p-5 rounded-xl bg-white border border-gray-100 scroll-mt-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">
                    {s.title_en}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-500">
                    <span className="font-mono">{s.id}</span>
                    <span>{s.jurisdiction}</span>
                    {s.date_in_force && (
                      <span>In force: {s.date_in_force}</span>
                    )}
                    {s.official_reference && (
                      <span>{s.official_reference}</span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <LinkStatusBadge
                    status={linkStatus[s.id]}
                    lastVerified={s.last_verified}
                  />
                  <CitationButton source={s} />
                  {s.source_url && (
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-emerald-700"
                    >
                      Official text <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
              {s.scope_description && (
                <p className="text-[12px] text-gray-700 leading-relaxed">
                  {s.scope_description}
                </p>
              )}
            </article>
          ))}
        </section>
      )}

      <footer className="mt-12 pt-6 border-t border-gray-200 max-w-3xl">
        <Link
          href="/atlas"
          className="inline-flex items-center gap-2 text-[13px] text-gray-700 hover:text-gray-900 font-medium"
        >
          <ArrowLeft size={14} /> Back to Atlas
        </Link>
      </footer>
    </div>
  );
}
