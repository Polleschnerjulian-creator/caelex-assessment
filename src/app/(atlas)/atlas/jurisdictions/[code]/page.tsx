"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  Scale,
  Building2,
  Globe2,
  FileText,
} from "lucide-react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import {
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
} from "@/data/legal-sources";
import type {
  LegalSource,
  LegalSourceType,
  LegalSourceStatus,
  RelevanceLevel,
  KeyProvision,
  Authority,
  ComplianceArea,
} from "@/data/legal-sources";

// ─── Style maps (matching the search page) ──────────────────────────

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

const LEGISLATION_STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  enacted: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    label: "Enacted",
  },
  draft: {
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    label: "Draft",
  },
  pending: {
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    label: "Pending",
  },
  none: {
    bg: "bg-gray-50 border-gray-200",
    text: "text-gray-500",
    label: "None",
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

// ─── Source group definitions ───────────────────────────────────────

interface SourceGroup {
  key: string;
  title: string;
  icon: typeof Scale;
  filter: (s: LegalSource) => boolean;
}

const SOURCE_GROUPS: SourceGroup[] = [
  {
    key: "treaties",
    title: "International Treaties",
    icon: Globe2,
    filter: (s) => s.type === "international_treaty",
  },
  {
    key: "national",
    title: "National Laws",
    icon: Scale,
    filter: (s) => s.type === "federal_law" || s.type === "federal_regulation",
  },
  {
    key: "standards",
    title: "Technical Standards",
    icon: FileText,
    filter: (s) => s.type === "technical_standard",
  },
  {
    key: "eu",
    title: "EU Law",
    icon: Building2,
    filter: (s) =>
      s.type === "eu_regulation" ||
      s.type === "eu_directive" ||
      s.type === "draft_legislation",
  },
  {
    key: "policy",
    title: "Policy Documents",
    icon: FileText,
    filter: (s) => s.type === "policy_document",
  },
];

// ─── Expandable provisions component ────────────────────────────────

function KeyProvisionsToggle({ provisions }: { provisions: KeyProvision[] }) {
  const [open, setOpen] = useState(false);

  if (provisions.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors duration-150"
      >
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          className={`transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
        {provisions.length} key provision{provisions.length !== 1 ? "s" : ""}
      </button>
      {open && (
        <div className="mt-2 ml-4 space-y-2">
          {provisions.map((p, i) => (
            <div key={i} className="border-l-2 border-gray-200 pl-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                  {p.section}
                </span>
                <span className="text-[12px] font-medium text-gray-700">
                  {p.title}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
                {p.summary}
              </p>
              {p.complianceImplication && (
                <p className="text-[10px] text-amber-600 mt-1">
                  {p.complianceImplication}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single source entry ────────────────────────────────────────────

function SourceEntry({ source }: { source: LegalSource }) {
  const typeStyle = TYPE_STYLES[source.type];
  const statusStyle = STATUS_STYLES[source.status];
  const relevanceStyle = RELEVANCE_STYLES[source.relevance_level];

  return (
    <div className="py-4 group">
      <div className="flex items-start gap-3">
        {/* Type badge */}
        <span
          className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border flex-shrink-0 w-14 text-center mt-0.5 ${typeStyle.bg} ${typeStyle.text}`}
        >
          {TYPE_LABELS[source.type]}
        </span>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-[14px] font-medium text-gray-900 leading-snug">
            {source.title_en}
          </h4>

          {/* Local title */}
          {source.title_local && (
            <p className="text-[12px] text-gray-400 mt-0.5">
              {source.title_local}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            {/* Official reference */}
            {source.official_reference && (
              <span className="text-[11px] font-mono text-gray-400">
                {source.official_reference}
              </span>
            )}

            {/* Date */}
            {(source.date_enacted ||
              source.date_in_force ||
              source.date_published) && (
              <span className="text-[11px] text-gray-400">
                {source.date_enacted ||
                  source.date_in_force ||
                  source.date_published}
              </span>
            )}

            {/* Status badge */}
            <span
              className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusStyle.label}
            </span>

            {/* Relevance badge */}
            <span
              className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${relevanceStyle}`}
            >
              {source.relevance_level}
            </span>
          </div>

          {/* Scope description */}
          {source.scope_description && (
            <p className="text-[11px] text-gray-500 leading-relaxed mt-2">
              {source.scope_description}
            </p>
          )}

          {/* Source URL */}
          {source.source_url && (
            <a
              href={source.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 transition-colors mt-2"
            >
              View source
              <ArrowLeft
                size={10}
                strokeWidth={1.5}
                className="rotate-[135deg]"
              />
            </a>
          )}

          {/* Key provisions */}
          <KeyProvisionsToggle provisions={source.key_provisions} />
        </div>
      </div>
    </div>
  );
}

// ─── Authority card ─────────────────────────────────────────────────

function AuthorityCard({ authority }: { authority: Authority }) {
  return (
    <div className="py-5 px-5 rounded-xl bg-white border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[18px] font-bold text-gray-900 font-mono tracking-tight">
            {authority.abbreviation}
          </span>
          <h4 className="text-[13px] font-medium text-gray-700 mt-1">
            {authority.name_en}
          </h4>
          {authority.name_local !== authority.name_en && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {authority.name_local}
            </p>
          )}
        </div>
        {authority.website && (
          <a
            href={authority.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 mt-1"
          >
            <ExternalLink size={10} strokeWidth={1.5} />
          </a>
        )}
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed mt-3">
        {authority.space_mandate}
      </p>

      {authority.applicable_areas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {authority.applicable_areas.map((area) => (
            <span
              key={area}
              className="text-[9px] font-medium uppercase tracking-wider text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5"
            >
              {AREA_LABELS[area] ?? area}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page component ─────────────────────────────────────────────────

interface JurisdictionDetailPageProps {
  params: Promise<{ code: string }>;
}

export default function JurisdictionDetailPage({
  params,
}: JurisdictionDetailPageProps) {
  const { code } = use(params);
  const displayCode = code.toUpperCase();

  // Fetch data
  const jurisdiction = JURISDICTION_DATA.get(displayCode as any);
  const legalSources = getLegalSourcesByJurisdiction(displayCode);
  const authorities = getAuthoritiesByJurisdiction(displayCode);

  const hasDetailedSources = legalSources.length > 0;

  // Group sources
  const groupedSources = SOURCE_GROUPS.map((group) => ({
    ...group,
    sources: legalSources.filter(group.filter),
  })).filter((g) => g.sources.length > 0);

  if (!jurisdiction) {
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
          <span className="text-[72px] font-mono font-bold text-gray-100">
            {displayCode}
          </span>
          <p className="text-[13px] text-gray-400 mt-4">
            Jurisdiction not found in the database.
          </p>
        </div>
      </div>
    );
  }

  const legStatus =
    LEGISLATION_STATUS_STYLES[jurisdiction.legislation.status] ??
    LEGISLATION_STATUS_STYLES.none;

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-6 py-8 lg:px-12">
      {/* ─── Header ─── */}
      <header>
        <Link
          href="/atlas"
          className="inline-flex items-center gap-2 text-[12px] text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Back to ATLAS
        </Link>

        <div className="mt-6 flex items-baseline gap-4">
          <span className="text-[36px] font-mono font-bold text-gray-200 leading-none tracking-tight">
            {displayCode}
          </span>
          <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight leading-none">
            {jurisdiction.countryName}
          </h1>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border ${legStatus.bg} ${legStatus.text}`}
          >
            {legStatus.label}
          </span>
        </div>

        <p className="text-[14px] text-gray-500 mt-2">
          {jurisdiction.legislation.name}
          {jurisdiction.legislation.yearEnacted
            ? ` (${jurisdiction.legislation.yearEnacted}${jurisdiction.legislation.yearAmended ? `, amended ${jurisdiction.legislation.yearAmended}` : ""})`
            : ""}
        </p>
      </header>

      {/* ─── Key Facts Row ─── */}
      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 py-5 border-y border-gray-200">
        <Fact label="Authority" value={jurisdiction.licensingAuthority.name} />
        <Fact
          label="Liability Regime"
          value={
            jurisdiction.insuranceLiability.liabilityRegime
              .charAt(0)
              .toUpperCase() +
            jurisdiction.insuranceLiability.liabilityRegime.slice(1)
          }
        />
        <Fact
          label="Processing Time"
          value={`${jurisdiction.timeline.typicalProcessingWeeks.min}–${jurisdiction.timeline.typicalProcessingWeeks.max} weeks`}
        />
        <Fact
          label="Mandatory Insurance"
          value={
            jurisdiction.insuranceLiability.mandatoryInsurance
              ? `Yes${jurisdiction.insuranceLiability.minimumCoverage ? ` / ${jurisdiction.insuranceLiability.minimumCoverage}` : ""}`
              : "No"
          }
        />
        <Fact
          label="Status"
          value={`${legStatus.label}${jurisdiction.legislation.yearEnacted ? ` (${jurisdiction.legislation.yearEnacted})` : ""}`}
        />
      </div>

      {/* ─── Legal Sources Section ─── */}
      {hasDetailedSources ? (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-6">
            <Scale size={16} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Legal Sources
            </h2>
            <span className="text-[12px] text-gray-300">
              {legalSources.length}
            </span>
          </div>

          <div className="space-y-10">
            {groupedSources.map((group) => {
              const Icon = group.icon;
              return (
                <section key={group.key}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      size={14}
                      className="text-gray-300"
                      strokeWidth={1.5}
                    />
                    <h3 className="text-[11px] font-semibold text-gray-500 tracking-[0.12em] uppercase">
                      {group.title}
                    </h3>
                    <span className="text-[11px] text-gray-300">
                      {group.sources.length}
                    </span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {group.sources.map((source) => (
                      <SourceEntry key={source.id} source={source} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Scale size={16} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Legal Sources
            </h2>
          </div>

          {/* Fallback: show national-space-laws data */}
          <div className="rounded-xl bg-white border border-gray-100 p-6">
            <p className="text-[11px] text-amber-600 font-medium mb-4">
              Detailed legal sources coming soon. Showing summary data.
            </p>

            <div className="space-y-4">
              <FallbackRow
                label="Legislation"
                value={`${jurisdiction.legislation.name} (${jurisdiction.legislation.yearEnacted})`}
              />
              <FallbackRow
                label="Local Name"
                value={jurisdiction.legislation.nameLocal}
              />
              {jurisdiction.legislation.officialUrl && (
                <div className="flex items-start gap-4">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider w-28 flex-shrink-0 pt-0.5">
                    Official URL
                  </span>
                  <a
                    href={jurisdiction.legislation.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-2"
                  >
                    {jurisdiction.legislation.officialUrl}
                  </a>
                </div>
              )}
              <FallbackRow
                label="Key Articles"
                value={jurisdiction.legislation.keyArticles ?? "N/A"}
              />
              <FallbackRow
                label="Debris Mitigation"
                value={
                  jurisdiction.debrisMitigation.deorbitRequirement
                    ? `Required — ${jurisdiction.debrisMitigation.deorbitTimeline ?? "see legislation"}`
                    : "Not required"
                }
              />
              <FallbackRow
                label="Registration"
                value={
                  jurisdiction.registration.nationalRegistryExists
                    ? `${jurisdiction.registration.registryName ?? "National registry"}`
                    : "No national registry"
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Authorities Section ─── */}
      {authorities.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={16} className="text-gray-400" strokeWidth={1.5} />
            <h2 className="text-[12px] font-semibold text-gray-400 tracking-[0.15em] uppercase">
              Authorities
            </h2>
            <span className="text-[12px] text-gray-300">
              {authorities.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {authorities.map((auth) => (
              <AuthorityCard key={auth.id} authority={auth} />
            ))}
          </div>
        </div>
      )}

      {/* ─── Notes ─── */}
      {jurisdiction.notes && jurisdiction.notes.length > 0 && (
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-[11px] font-semibold text-gray-400 tracking-[0.15em] uppercase mb-3">
            Notes
          </h2>
          <ul className="space-y-2">
            {jurisdiction.notes.map((note, i) => (
              <li
                key={i}
                className="text-[12px] text-gray-500 leading-relaxed pl-4 border-l-2 border-gray-200"
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Footer ─── */}
      <footer className="mt-20 pt-6 border-t border-gray-200">
        <p className="text-[10px] text-gray-300 leading-relaxed max-w-3xl">
          Data last updated: {jurisdiction.lastUpdated}. This information is for
          research and reference purposes only. It does not constitute legal
          advice. Verify all information with official sources and qualified
          legal counsel before making compliance decisions.
        </p>
      </footer>
    </div>
  );
}

// ─── Helper components ──────────────────────────────────────────────

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[13px] font-medium text-gray-800">{value}</span>
    </div>
  );
}

function FallbackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider w-28 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-[12px] text-gray-700">{value}</span>
    </div>
  );
}
