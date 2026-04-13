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

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-6 py-8 lg:px-12">
      {/* ─── Header ─── */}
      <header>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-[12px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back
        </button>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Type badge */}
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border ${typeStyle.bg} ${typeStyle.text}`}
          >
            {TYPE_LABELS[source.type]}
          </span>

          {/* Status badge */}
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border ${statusStyle.bg} ${statusStyle.text}`}
          >
            {statusStyle.label}
          </span>

          {/* Relevance badge */}
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border ${relevanceStyle}`}
          >
            {source.relevance_level}
          </span>
        </div>

        <h1 className="text-[26px] lg:text-[32px] font-semibold text-gray-900 tracking-tight leading-tight mt-4 max-w-4xl">
          {source.title_en}
        </h1>

        {source.title_local && (
          <p className="text-[14px] text-gray-400 mt-1.5 max-w-4xl leading-relaxed">
            {source.title_local}
          </p>
        )}
      </header>

      {/* ─── Metadata Row ─── */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 py-4 border-y border-gray-200">
        {/* Jurisdiction */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-semibold text-gray-400">
            {jurisdictionFlag}
          </span>
          <span className="text-[12px] text-gray-600">{jurisdictionName}</span>
        </div>

        {/* Date enacted / in force */}
        {(source.date_enacted || source.date_in_force) && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              {source.date_enacted ? "Enacted" : "In Force"}
            </span>
            <span className="text-[12px] text-gray-600">
              {source.date_enacted ?? source.date_in_force}
            </span>
          </div>
        )}

        {/* Official reference */}
        {source.official_reference && (
          <span className="text-[11px] font-mono text-gray-400">
            {source.official_reference}
          </span>
        )}

        {/* Issuing body */}
        <span className="text-[12px] text-gray-500">{source.issuing_body}</span>

        {/* View official text */}
        {source.source_url && (
          <a
            href={source.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
          >
            View official text
            <ExternalLink size={11} strokeWidth={1.5} />
          </a>
        )}
      </div>

      {/* ─── Key Provisions (main content) ─── */}
      {source.key_provisions.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={16} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Key Provisions
            </h2>
            <span className="text-[12px] text-gray-300">
              {source.key_provisions.length}
            </span>
          </div>

          <div className="space-y-0">
            {source.key_provisions.map((provision, i) => (
              <div
                key={i}
                className={`py-5 ${i !== source.key_provisions.length - 1 ? "border-b border-gray-100" : ""}`}
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-[13px] font-mono font-bold text-gray-900 flex-shrink-0">
                    {provision.section}
                  </span>
                  <h3 className="text-[15px] font-semibold text-gray-800">
                    {provision.title}
                  </h3>
                </div>

                <p className="text-[13px] text-gray-600 leading-[1.7] mt-2 max-w-3xl">
                  {provision.summary}
                </p>

                {provision.complianceImplication && (
                  <div className="mt-3 px-4 py-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <p className="text-[12px] text-emerald-800 leading-[1.6]">
                      <span className="font-semibold">
                        Compliance Implication:
                      </span>{" "}
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
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Scope
            </h2>
          </div>
          <p className="text-[13px] text-gray-600 leading-[1.7] max-w-3xl">
            {source.scope_description}
          </p>
        </section>
      )}

      {/* ─── Competent Authorities ─── */}
      {authorities.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={16} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Competent Authorities
            </h2>
            <span className="text-[12px] text-gray-300">
              {authorities.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {authorities.map((auth) => (
              <Link
                key={auth.id}
                href={`/atlas/jurisdictions/${auth.jurisdiction}`}
                className="block py-5 px-5 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-150 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[18px] font-bold text-gray-900 font-mono tracking-tight group-hover:text-emerald-700 transition-colors">
                      {auth.abbreviation}
                    </span>
                    <h4 className="text-[13px] font-medium text-gray-700 mt-1">
                      {auth.name_en}
                    </h4>
                    {auth.name_local !== auth.name_en && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {auth.name_local}
                      </p>
                    )}
                  </div>
                  <ExternalLink
                    size={12}
                    className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 mt-1"
                    strokeWidth={1.5}
                  />
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed mt-3">
                  {auth.space_mandate}
                </p>

                {auth.applicable_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {auth.applicable_areas.map((area) => (
                      <span
                        key={area}
                        className="text-[9px] font-medium uppercase tracking-wider text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5"
                      >
                        {AREA_LABELS[area] ?? area}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Related Sources ─── */}
      {(related.length > 0 ||
        amendsSource ||
        amendedBySources.length > 0 ||
        implementsSource ||
        supersededBySource) && (
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-5">
            <Link2 size={16} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Related Sources
            </h2>
          </div>

          {/* Amendment / implementation links */}
          {(amendsSource ||
            amendedBySources.length > 0 ||
            implementsSource ||
            supersededBySource) && (
            <div className="space-y-2 mb-5">
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

          {/* Related source cards */}
          {related.length > 0 && (
            <div className="space-y-1">
              {related.map((rel) => {
                const relTypeStyle = TYPE_STYLES[rel.type];
                const relRelevanceStyle = RELEVANCE_STYLES[rel.relevance_level];
                return (
                  <Link
                    key={rel.id}
                    href={`/atlas/sources/${rel.id}`}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white hover:shadow-sm transition-all duration-150 group"
                  >
                    <span
                      className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 w-14 text-center ${relTypeStyle.bg} ${relTypeStyle.text}`}
                    >
                      {TYPE_LABELS[rel.type]}
                    </span>

                    <div className="flex-1 min-w-0">
                      <span className="text-[14px] font-medium text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                        {rel.title_en}
                      </span>
                      {rel.official_reference && (
                        <span className="text-[11px] text-gray-400 font-mono ml-2">
                          {rel.official_reference}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-mono text-gray-400 flex-shrink-0">
                      {JURISDICTION_FLAGS[rel.jurisdiction] ?? rel.jurisdiction}
                    </span>

                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${relRelevanceStyle}`}
                    >
                      {rel.relevance_level}
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
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Info size={16} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Notes
            </h2>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-3">
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
        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={16} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Caelex Integration
            </h2>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-3">
            {source.caelex_engine_mapping &&
              source.caelex_engine_mapping.length > 0 && (
                <div className="flex items-start gap-4">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider w-24 flex-shrink-0 pt-0.5">
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
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider w-24 flex-shrink-0 pt-0.5">
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
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider w-24 flex-shrink-0 pt-0.5">
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
      <footer className="mt-20 pt-6 border-t border-gray-200">
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
