"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Scale,
  Building2,
  FileText,
  AlertCircle,
  BookOpen,
  Link2,
  Info,
  Cpu,
} from "lucide-react";
import {
  getLegalSourceById,
  getAuthorityById,
  getRelatedSources,
} from "@/data/legal-sources";
import type {
  LegalSource,
  LegalSourceType,
  LegalSourceStatus,
  RelevanceLevel,
  Authority,
  ComplianceArea,
} from "@/data/legal-sources";

// ─── Style maps ─────────────────────────────────────────────────────

const TYPE_STYLES: Record<LegalSourceType, { bg: string; text: string }> = {
  international_treaty: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
  },
  federal_law: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  federal_regulation: {
    bg: "bg-teal-50 border-teal-200",
    text: "text-teal-700",
  },
  technical_standard: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
  },
  eu_regulation: {
    bg: "bg-purple-50 border-purple-200",
    text: "text-purple-700",
  },
  eu_directive: {
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
  },
  policy_document: {
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-600",
  },
  draft_legislation: {
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
  },
};

const TYPE_LABELS: Record<LegalSourceType, string> = {
  international_treaty: "Treaty",
  federal_law: "Law",
  federal_regulation: "Regulation",
  technical_standard: "Standard",
  eu_regulation: "EU Reg",
  eu_directive: "EU Dir",
  policy_document: "Policy",
  draft_legislation: "Draft",
};

const RELEVANCE_STYLES: Record<RelevanceLevel, string> = {
  fundamental: "text-gray-900 bg-gray-100 border-gray-300",
  critical: "text-red-700 bg-red-50 border-red-200",
  high: "text-amber-700 bg-amber-50 border-amber-200",
  medium: "text-gray-500 bg-gray-50 border-gray-200",
  low: "text-gray-400 bg-gray-50 border-gray-100",
};

const STATUS_STYLES: Record<
  LegalSourceStatus,
  { bg: string; text: string; label: string }
> = {
  in_force: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    label: "In Force",
  },
  draft: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    label: "Draft",
  },
  proposed: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    label: "Proposed",
  },
  superseded: {
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-500",
    label: "Superseded",
  },
  planned: {
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
    label: "Planned",
  },
  not_ratified: {
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
    label: "Not Ratified",
  },
  expired: {
    bg: "bg-red-50 border-red-200",
    text: "text-red-500",
    label: "Expired",
  },
};

const AREA_LABELS: Record<ComplianceArea, string> = {
  licensing: "Licensing",
  registration: "Registration",
  liability: "Liability",
  insurance: "Insurance",
  cybersecurity: "Cybersecurity",
  export_control: "Export Control",
  data_security: "Data Security",
  frequency_spectrum: "Spectrum",
  environmental: "Environmental",
  debris_mitigation: "Debris",
  space_traffic_management: "STM",
  human_spaceflight: "Human Spaceflight",
  military_dual_use: "Dual-Use",
};

const JURISDICTION_NAMES: Record<string, string> = {
  DE: "Germany",
  FR: "France",
  UK: "United Kingdom",
  IT: "Italy",
  INT: "International",
  EU: "European Union",
};

const JURISDICTION_FLAGS: Record<string, string> = {
  DE: "DE",
  FR: "FR",
  UK: "UK",
  IT: "IT",
  INT: "INT",
  EU: "EU",
};

// ─── Linked source helper ───────────────────────────────────────────

function LinkedSource({ id, label }: { id: string; label: string }) {
  const source = getLegalSourceById(id);
  if (!source) return null;

  const typeStyle = TYPE_STYLES[source.type];

  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="text-gray-400 flex-shrink-0">{label}</span>
      <Link
        href={`/atlas/sources/${source.id}`}
        className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors group"
      >
        <span
          className={`text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeStyle.bg} ${typeStyle.text}`}
        >
          {TYPE_LABELS[source.type]}
        </span>
        <span className="group-hover:underline underline-offset-2">
          {source.title_en}
        </span>
      </Link>
    </div>
  );
}

// ─── Page component ─────────────────────────────────────────────────

interface SourceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SourceDetailPage({ params }: SourceDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const source = getLegalSourceById(id);
  const related = getRelatedSources(id);

  // ── Not found ──
  if (!source) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] px-6 py-8 lg:px-12">
        <Link
          href="/atlas"
          className="inline-flex items-center gap-2 text-[12px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to ATLAS
        </Link>
        <div className="mt-20 text-center">
          <AlertCircle
            size={48}
            className="mx-auto text-gray-200 mb-4"
            strokeWidth={1}
          />
          <p className="text-[20px] font-medium text-gray-400">
            Source not found
          </p>
          <p className="text-[13px] text-gray-300 mt-2 font-mono">{id}</p>
          <button
            onClick={() => router.back()}
            className="mt-6 text-[12px] text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-4"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const typeStyle = TYPE_STYLES[source.type];
  const statusStyle = STATUS_STYLES[source.status];
  const relevanceStyle = RELEVANCE_STYLES[source.relevance_level];

  // Resolve authorities
  const authorities: Authority[] = source.competent_authorities
    .map((authId) => getAuthorityById(authId))
    .filter((a): a is Authority => a !== undefined);

  // Resolve amendment/implementation links
  const amendsSource = source.amends
    ? getLegalSourceById(source.amends)
    : undefined;
  const amendedBySources = (source.amended_by ?? [])
    .map((sid) => getLegalSourceById(sid))
    .filter((s): s is LegalSource => s !== undefined);
  const implementsSource = source.implements
    ? getLegalSourceById(source.implements)
    : undefined;
  const supersededBySource = source.superseded_by
    ? getLegalSourceById(source.superseded_by)
    : undefined;

  const jurisdictionName =
    JURISDICTION_NAMES[source.jurisdiction] ?? source.jurisdiction;
  const jurisdictionFlag =
    JURISDICTION_FLAGS[source.jurisdiction] ?? source.jurisdiction;

  // Counts for table of contents
  const provisionCount = source.key_provisions.length;
  const authorityCount = authorities.length;
  const hasRelated =
    related.length > 0 ||
    amendsSource ||
    amendedBySources.length > 0 ||
    implementsSource ||
    supersededBySource;
  const relatedCount =
    related.length +
    (amendsSource ? 1 : 0) +
    amendedBySources.length +
    (implementsSource ? 1 : 0) +
    (supersededBySource ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-6 py-6 lg:px-12">
      {/* ─── Breadcrumb line ─── */}
      <nav className="flex items-center gap-2 text-[12px] text-gray-400">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={1.5} />
          Back
        </button>
        <span className="text-gray-300">·</span>
        <span className={`font-medium ${typeStyle.text}`}>
          {TYPE_LABELS[source.type]}
        </span>
        <span className="text-gray-300">·</span>
        <span>{jurisdictionName}</span>
      </nav>

      {/* ─── Title block ─── */}
      <header className="mt-4 max-w-4xl">
        <h1 className="text-[24px] lg:text-[28px] font-semibold text-gray-900 tracking-tight leading-[1.25]">
          {source.title_en}
        </h1>
        {source.title_local && (
          <p className="text-[13px] text-gray-400 mt-1 leading-snug">
            {source.title_local}
          </p>
        )}

        {/* ─── View official text — prominent action ─── */}
        {source.source_url && (
          <a
            href={source.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-[13px] text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
          >
            View official text
            <ExternalLink size={13} strokeWidth={2} />
          </a>
        )}
      </header>

      {/* ─── Metadata grid ─── */}
      <div className="mt-5 py-4 border-y border-gray-200 max-w-2xl">
        <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2.5 text-[13px]">
          <dt className="text-gray-400">Jurisdiction</dt>
          <dd className="text-gray-800">
            <span className="font-mono text-gray-500 text-[12px]">
              {jurisdictionFlag}
            </span>{" "}
            · {jurisdictionName}
          </dd>

          <dt className="text-gray-400">Status</dt>
          <dd>
            <span
              className={`inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusStyle.label}
            </span>
          </dd>

          {(source.date_enacted || source.date_in_force) && (
            <>
              <dt className="text-gray-400">
                {source.date_enacted ? "Enacted" : "In Force"}
              </dt>
              <dd className="text-gray-800">
                {source.date_enacted ?? source.date_in_force}
              </dd>
            </>
          )}

          {source.official_reference && (
            <>
              <dt className="text-gray-400">Reference</dt>
              <dd className="font-mono text-[12px] text-gray-600">
                {source.official_reference}
              </dd>
            </>
          )}

          <dt className="text-gray-400">Issuing Body</dt>
          <dd className="text-gray-800">{source.issuing_body}</dd>

          <dt className="text-gray-400">Relevance</dt>
          <dd>
            <span
              className={`inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${relevanceStyle}`}
            >
              {source.relevance_level}
            </span>
          </dd>
        </dl>
      </div>

      {/* ─── Table of contents ─── */}
      {(provisionCount > 0 || authorityCount > 0 || hasRelated) && (
        <nav className="mt-4 flex items-center gap-4 text-[12px] text-gray-400">
          {provisionCount > 0 && (
            <a
              href="#provisions"
              className="hover:text-gray-700 transition-colors"
            >
              {provisionCount} Key Provision{provisionCount !== 1 ? "s" : ""}
            </a>
          )}
          {provisionCount > 0 && authorityCount > 0 && (
            <span className="text-gray-300">·</span>
          )}
          {authorityCount > 0 && (
            <a
              href="#authorities"
              className="hover:text-gray-700 transition-colors"
            >
              {authorityCount} Authorit{authorityCount !== 1 ? "ies" : "y"}
            </a>
          )}
          {(provisionCount > 0 || authorityCount > 0) && hasRelated && (
            <span className="text-gray-300">·</span>
          )}
          {hasRelated && (
            <a
              href="#related"
              className="hover:text-gray-700 transition-colors"
            >
              {relatedCount} Related Source{relatedCount !== 1 ? "s" : ""}
            </a>
          )}
        </nav>
      )}

      {/* ─── Key Provisions ─── */}
      {source.key_provisions.length > 0 && (
        <section id="provisions" className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={15} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Key Provisions
            </h2>
          </div>

          <div className="space-y-0 max-w-3xl">
            {source.key_provisions.map((provision, i) => (
              <div
                key={i}
                className={`py-4 pl-4 border-l-2 border-emerald-300 ${i !== source.key_provisions.length - 1 ? "border-b border-b-gray-100" : ""}`}
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-[11px] text-gray-400 font-mono flex-shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[15px] font-mono font-bold text-gray-900 flex-shrink-0">
                    {provision.section}
                  </span>
                  <h3 className="text-[14px] font-semibold text-gray-700">
                    {provision.title}
                  </h3>
                </div>

                <p className="text-[13px] text-gray-600 leading-[1.75] mt-1.5 ml-[52px]">
                  {provision.summary}
                </p>

                {provision.complianceImplication && (
                  <div className="mt-2.5 ml-[52px] max-w-2xl border-l-2 border-emerald-400 bg-emerald-50/50 pl-4 py-2">
                    <p className="text-[12px] text-emerald-800 leading-[1.6]">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-600">
                        Compliance Implication
                      </span>
                      <br />
                      {provision.complianceImplication}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Scope Description ─── */}
      {source.scope_description && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={15} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Scope
            </h2>
          </div>
          <p className="text-[13px] text-gray-600 leading-[1.75] max-w-3xl">
            {source.scope_description}
          </p>
        </section>
      )}

      {/* ─── Competent Authorities ─── */}
      {authorities.length > 0 && (
        <section id="authorities" className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={15} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Competent Authorities
            </h2>
          </div>

          <div className="space-y-1 max-w-3xl">
            {authorities.map((auth) => (
              <Link
                key={auth.id}
                href={`/atlas/jurisdictions/${auth.jurisdiction}`}
                className="flex items-start gap-4 py-3 px-4 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-150 group"
              >
                <span className="text-[16px] font-bold text-gray-900 font-mono tracking-tight flex-shrink-0 w-16 group-hover:text-emerald-700 transition-colors">
                  {auth.abbreviation}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-medium text-gray-700">
                      {auth.name_en}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {JURISDICTION_FLAGS[auth.jurisdiction] ??
                        auth.jurisdiction}
                    </span>
                  </div>
                  <p className="text-[12px] text-gray-500 leading-relaxed mt-0.5 truncate">
                    {auth.space_mandate.length > 80
                      ? auth.space_mandate.slice(0, 80) + "..."
                      : auth.space_mandate}
                  </p>
                </div>
                <ExternalLink
                  size={12}
                  className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 mt-1"
                  strokeWidth={1.5}
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Related Sources ─── */}
      {hasRelated && (
        <section id="related" className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Link2 size={15} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Related Sources
            </h2>
          </div>

          {/* Amendment / implementation links */}
          {(amendsSource ||
            amendedBySources.length > 0 ||
            implementsSource ||
            supersededBySource) && (
            <div className="space-y-1.5 mb-4">
              {amendsSource && (
                <LinkedSource id={amendsSource.id} label="Amends:" />
              )}
              {amendedBySources.map((s) => (
                <LinkedSource key={s.id} id={s.id} label="Amended by:" />
              ))}
              {implementsSource && (
                <LinkedSource id={implementsSource.id} label="Implements:" />
              )}
              {supersededBySource && (
                <LinkedSource
                  id={supersededBySource.id}
                  label="Superseded by:"
                />
              )}
            </div>
          )}

          {/* Related source list — compact reference links */}
          {related.length > 0 && (
            <div className="space-y-0 max-w-3xl">
              {related.map((rel) => {
                const relTypeStyle = TYPE_STYLES[rel.type];
                return (
                  <Link
                    key={rel.id}
                    href={`/atlas/sources/${rel.id}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white hover:shadow-sm transition-all duration-150 group"
                  >
                    <span
                      className={`text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${relTypeStyle.bg} ${relTypeStyle.text}`}
                    >
                      {TYPE_LABELS[rel.type]}
                    </span>

                    <span className="text-[13px] text-gray-800 truncate group-hover:text-emerald-700 transition-colors flex-1 min-w-0">
                      {rel.title_en}
                    </span>

                    <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">
                      {JURISDICTION_FLAGS[rel.jurisdiction] ?? rel.jurisdiction}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ─── Notes ─── */}
      {source.notes && source.notes.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Notes
            </h2>
          </div>
          <div className="space-y-2 max-w-3xl">
            {source.notes.map((note, i) => (
              <p
                key={i}
                className="text-[12px] text-gray-500 leading-relaxed pl-4 border-l-2 border-gray-200"
              >
                {note}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* ─── Caelex Integration ─── */}
      {(source.caelex_engine_mapping?.length ||
        source.caelex_data_file_mapping?.length) && (
        <section className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={15} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Caelex Integration
            </h2>
          </div>
          <div className="max-w-2xl space-y-2">
            {source.caelex_engine_mapping &&
              source.caelex_engine_mapping.length > 0 && (
                <div className="flex items-start gap-4">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider w-20 flex-shrink-0 pt-0.5">
                    Engines
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {source.caelex_engine_mapping.map((engine) => (
                      <span
                        key={engine}
                        className="text-[10px] font-mono text-gray-600 bg-white border border-gray-200 rounded px-2 py-0.5"
                      >
                        {engine}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {source.caelex_data_file_mapping &&
              source.caelex_data_file_mapping.length > 0 && (
                <div className="flex items-start gap-4">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider w-20 flex-shrink-0 pt-0.5">
                    Data Files
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {source.caelex_data_file_mapping.map((file) => (
                      <span
                        key={file}
                        className="text-[10px] font-mono text-gray-600 bg-white border border-gray-200 rounded px-2 py-0.5"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            <div className="flex items-start gap-4">
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider w-20 flex-shrink-0 pt-0.5">
                Verified
              </span>
              <span className="text-[11px] text-gray-500">
                {source.last_verified}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ─── Footer ─── */}
      <footer className="mt-12 pt-4 border-t border-gray-200">
        <p className="text-[10px] text-gray-300 leading-relaxed max-w-3xl">
          Last verified: {source.last_verified}. This information is for
          research and reference purposes only. It does not constitute legal
          advice. Verify all information with official sources and qualified
          legal counsel before making compliance decisions.
        </p>
      </footer>
    </div>
  );
}
