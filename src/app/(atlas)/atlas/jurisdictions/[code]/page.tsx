"use client";

import { useState, useCallback, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  Scale,
  Building2,
  Globe2,
  FileText,
  Download,
} from "lucide-react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import {
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
  getTranslatedSource,
  getTranslatedAuthority,
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
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getTypeLabels,
  getStatusLabels,
  getAreaLabels,
  getLegislationStatusLabels,
  getSourceGroupTitles,
} from "../../i18n-labels";

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

const RELEVANCE_STYLES: Record<RelevanceLevel, string> = {
  fundamental: "text-gray-900 bg-gray-100 border-gray-300",
  critical: "text-red-700 bg-red-50 border-red-200",
  high: "text-amber-700 bg-amber-50 border-amber-200",
  medium: "text-gray-500 bg-gray-50 border-gray-200",
  low: "text-gray-500 bg-gray-50 border-gray-100",
};

const STATUS_COLORS: Record<LegalSourceStatus, { bg: string; text: string }> = {
  in_force: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  draft: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  proposed: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  superseded: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500" },
  planned: {
    bg: "bg-violet-50 border-violet-200",
    text: "text-violet-700",
  },
  not_ratified: {
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
  },
  expired: { bg: "bg-red-50 border-red-200", text: "text-red-500" },
};

const LEGISLATION_STATUS_COLORS: Record<string, { bg: string; text: string }> =
  {
    enacted: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-700",
    },
    draft: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
    pending: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
    none: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500" },
  };

// ─── Source group definitions ───────────────────────────────────────

interface SourceGroup {
  key: string;
  icon: typeof Scale;
  filter: (s: LegalSource) => boolean;
}

const SOURCE_GROUPS: SourceGroup[] = [
  {
    key: "treaties",
    icon: Globe2,
    filter: (s) => s.type === "international_treaty",
  },
  {
    key: "national",
    icon: Scale,
    filter: (s) => s.type === "federal_law" || s.type === "federal_regulation",
  },
  {
    key: "standards",
    icon: FileText,
    filter: (s) => s.type === "technical_standard",
  },
  {
    key: "eu",
    icon: Building2,
    filter: (s) =>
      s.type === "eu_regulation" ||
      s.type === "eu_directive" ||
      s.type === "draft_legislation",
  },
  {
    key: "policy",
    icon: FileText,
    filter: (s) => s.type === "policy_document",
  },
];

// ─── Expandable provisions component ────────────────────────────────

function KeyProvisionsToggle({
  provisions,
  source,
}: {
  provisions: KeyProvision[];
  source: LegalSource;
}) {
  const [open, setOpen] = useState(false);
  const { language, t } = useLanguage();

  if (provisions.length === 0) return null;

  const translatedSource = getTranslatedSource(source, language);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-600 transition-colors duration-150"
      >
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
        {provisions.length}{" "}
        {provisions.length !== 1
          ? t("atlas.key_provision_plural")
          : t("atlas.key_provision")}
      </button>
      {open && (
        <div className="mt-2 ml-4 space-y-2">
          {provisions.map((p, i) => {
            const tp = translatedSource.getProvisionTranslation(p.section);
            return (
              <div key={i} className="border-l-2 border-gray-200 pl-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px]  text-gray-500 flex-shrink-0">
                    {p.section}
                  </span>
                  <span className="text-[12px] font-medium text-gray-700">
                    {tp?.title ?? p.title}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
                  {tp?.summary ?? p.summary}
                </p>
                {(tp?.complianceImplication ?? p.complianceImplication) && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    {tp?.complianceImplication ?? p.complianceImplication}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Single source entry ────────────────────────────────────────────

function SourceEntry({ source }: { source: LegalSource }) {
  const { language, t } = useLanguage();
  const typeStyle = TYPE_STYLES[source.type];
  const statusColor = STATUS_COLORS[source.status];
  const relevanceStyle = RELEVANCE_STYLES[source.relevance_level];
  const translated = getTranslatedSource(source, language);
  const TYPE_LABELS = getTypeLabels(t);
  const statusLabels = getStatusLabels(t);

  return (
    <div className="rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm px-5 py-4 transition-all duration-200 group">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${typeStyle.bg} ${typeStyle.text}`}
        >
          {TYPE_LABELS[source.type]}
        </span>
        <span
          className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor.bg} ${statusColor.text}`}
        >
          {statusLabels[source.status] || source.status}
        </span>
        {source.official_reference && (
          <span className="text-[10px] text-gray-400 ml-auto">
            {source.official_reference}
          </span>
        )}
      </div>

      <Link href={`/atlas/sources/${source.id}`} className="block">
        <h4 className="text-[14px] font-semibold text-gray-900 leading-snug group-hover:text-gray-700 transition-colors">
          {translated.title}
        </h4>
      </Link>

      {language === "en" && source.title_local && (
        <p className="text-[11px] text-gray-400 mt-0.5">{source.title_local}</p>
      )}
      {language !== "en" && source.title_en !== translated.title && (
        <p className="text-[11px] text-gray-400 mt-0.5">{source.title_en}</p>
      )}

      <div className="flex items-center gap-3 mt-2">
        {(source.date_enacted ||
          source.date_in_force ||
          source.date_published) && (
          <span className="text-[10px] text-gray-400">
            {source.date_enacted ||
              source.date_in_force ||
              source.date_published}
          </span>
        )}
        {source.source_url && (
          <a
            href={source.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
          >
            {t("atlas.view_source")}{" "}
            <span className="sr-only">(opens in new window)</span>
          </a>
        )}
      </div>

      {source.scope_description && (
        <p className="text-[11px] text-gray-500 leading-relaxed mt-2 line-clamp-3">
          {translated.scopeDescription ?? source.scope_description}
        </p>
      )}

      <KeyProvisionsToggle provisions={source.key_provisions} source={source} />
    </div>
  );
}

// ─── Authority card ─────────────────────────────────────────────────

function AuthorityCard({ authority }: { authority: Authority }) {
  const { language, t } = useLanguage();
  const translated = getTranslatedAuthority(authority, language);
  const AREA_LABELS = getAreaLabels(t);
  return (
    <div className="py-5 px-5 rounded-xl bg-white border border-gray-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[18px] font-bold text-gray-900  tracking-tight">
            {authority.abbreviation}
          </span>
          <h4 className="text-[13px] font-medium text-gray-700 mt-1">
            {translated.name}
          </h4>
          {language === "en" && authority.name_local !== authority.name_en && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              {authority.name_local}
            </p>
          )}
          {language !== "en" && authority.name_en !== translated.name && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              {authority.name_en}
            </p>
          )}
        </div>
        {authority.website && (
          <a
            href={authority.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0 mt-1"
          >
            <ExternalLink size={10} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">
              {authority.abbreviation} website (opens in new window)
            </span>
          </a>
        )}
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed mt-3">
        {translated.mandate}
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
  const { language, t } = useLanguage();

  // Shared translated labels
  const legislationStatusLabels = getLegislationStatusLabels(t);
  const sourceGroupTitles = getSourceGroupTitles(t);

  // Fetch data
  const jurisdiction = JURISDICTION_DATA.get(displayCode as any);
  const legalSources = getLegalSourcesByJurisdiction(displayCode);
  const authorities = getAuthoritiesByJurisdiction(displayCode);

  const handleExportBriefing = useCallback(() => {
    window.print();
  }, []);

  const hasDetailedSources = legalSources.length > 0;

  // Group sources
  const groupedSources = SOURCE_GROUPS.map((group) => ({
    ...group,
    title: sourceGroupTitles[group.key] ?? group.key,
    sources: legalSources.filter(group.filter),
  })).filter((g) => g.sources.length > 0);

  if (!jurisdiction) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] px-6 py-8 lg:px-12">
        <nav aria-label="Breadcrumb">
          <Link
            href="/atlas"
            className="inline-flex items-center gap-2 text-[12px] text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
            {t("atlas.back_to_atlas")}
          </Link>
        </nav>
        <div className="mt-20 text-center">
          <span className="text-[72px]  font-bold text-gray-100">
            {displayCode}
          </span>
          <p className="text-[13px] text-gray-500 mt-4">
            {t("atlas.jurisdiction_not_found")}
          </p>
        </div>
      </div>
    );
  }

  const legStatusColor =
    LEGISLATION_STATUS_COLORS[jurisdiction.legislation.status] ??
    LEGISLATION_STATUS_COLORS.none;
  const legStatusLabel =
    legislationStatusLabels[jurisdiction.legislation.status] ??
    jurisdiction.legislation.status;

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* ─── Screen content (hidden during print) ─── */}
      <div className="print-screen-content px-6 py-8 lg:px-12">
        {/* ─── Header ─── */}
        <header>
          <nav aria-label="Breadcrumb">
            <Link
              href="/atlas"
              className="inline-flex items-center gap-2 text-[12px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
              {t("atlas.back_to_atlas")}
            </Link>
          </nav>

          <div className="mt-6 flex items-baseline gap-4">
            <span className="text-[36px]  font-bold text-gray-200 leading-none tracking-tight">
              {displayCode}
            </span>
            <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight leading-none">
              {jurisdiction.countryName}
            </h1>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border ${legStatusColor.bg} ${legStatusColor.text}`}
            >
              {legStatusLabel}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-[14px] text-gray-500">
              {jurisdiction.legislation.name}
              {jurisdiction.legislation.yearEnacted
                ? ` (${jurisdiction.legislation.yearEnacted}${jurisdiction.legislation.yearAmended ? `, ${t("atlas.amended", { year: String(jurisdiction.legislation.yearAmended) })}` : ""})`
                : ""}
            </p>
            {hasDetailedSources && (
              <button
                onClick={handleExportBriefing}
                className="print:hidden flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-[12px] font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-all duration-150"
              >
                <Download size={14} strokeWidth={1.5} aria-hidden="true" />
                {t("atlas.briefing_export")}
              </button>
            )}
          </div>
        </header>

        {/* ─── Key Facts Grid ─── */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">
              {t("atlas.label_authority")}
            </span>
            <span className="text-[13px] font-semibold text-gray-900 block leading-snug">
              {jurisdiction.licensingAuthority.name}
            </span>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">
              {t("atlas.label_liability")}
            </span>
            <span className="text-[13px] font-semibold text-gray-900 block">
              {jurisdiction.insuranceLiability.liabilityRegime
                .charAt(0)
                .toUpperCase() +
                jurisdiction.insuranceLiability.liabilityRegime.slice(1)}
            </span>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">
              {t("atlas.label_processing")}
            </span>
            <span className="text-[13px] font-semibold text-gray-900 block">
              {t("atlas.processing_weeks", {
                min: String(jurisdiction.timeline.typicalProcessingWeeks.min),
                max: String(jurisdiction.timeline.typicalProcessingWeeks.max),
              })}
            </span>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">
              {t("atlas.label_insurance")}
            </span>
            <span className="text-[13px] font-semibold text-gray-900 block">
              {jurisdiction.insuranceLiability.mandatoryInsurance
                ? jurisdiction.insuranceLiability.minimumCoverage ||
                  t("atlas.required")
                : t("atlas.not_required")}
            </span>
          </div>
          <div className="rounded-xl bg-white border border-gray-100 px-4 py-3.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-1">
              {t("atlas.label_status")}
            </span>
            <span className="text-[13px] font-semibold text-gray-900 block">
              {legStatusLabel}
              {jurisdiction.legislation.yearEnacted
                ? ` (${jurisdiction.legislation.yearEnacted})`
                : ""}
            </span>
          </div>
        </div>

        {/* ─── Legal Sources Section ─── */}
        {hasDetailedSources ? (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-6">
              <Scale
                size={16}
                className="text-gray-500"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="text-[12px] font-semibold text-gray-500 tracking-[0.15em] uppercase">
                {t("atlas.legal_sources")}
              </h2>
              <span className="text-[12px] text-gray-500">
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
                        className="text-gray-500"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <h3 className="text-[11px] font-semibold text-gray-500 tracking-[0.12em] uppercase">
                        {group.title}
                      </h3>
                      <span className="text-[11px] text-gray-500">
                        {group.sources.length}
                      </span>
                    </div>

                    <div className="space-y-2">
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
              <Scale
                size={16}
                className="text-gray-500"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="text-[12px] font-semibold text-gray-500 tracking-[0.15em] uppercase">
                {t("atlas.legal_sources")}
              </h2>
            </div>

            {/* Fallback: show national-space-laws data */}
            <div className="rounded-xl bg-white border border-gray-100 p-6">
              <p className="text-[11px] text-amber-600 font-medium mb-4">
                {t("atlas.detailed_sources_coming_soon")}
              </p>

              <div className="space-y-4">
                <FallbackRow
                  label={t("atlas.legislation")}
                  value={`${jurisdiction.legislation.name} (${jurisdiction.legislation.yearEnacted})`}
                />
                <FallbackRow
                  label={t("atlas.label_local_name")}
                  value={jurisdiction.legislation.nameLocal}
                />
                {jurisdiction.legislation.officialUrl && (
                  <div className="flex items-start gap-4">
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider w-28 flex-shrink-0 pt-0.5">
                      {t("atlas.label_official_url")}
                    </span>
                    <a
                      href={jurisdiction.legislation.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-2"
                    >
                      {jurisdiction.legislation.officialUrl}
                      <span className="sr-only">(opens in new window)</span>
                    </a>
                  </div>
                )}
                <FallbackRow
                  label={t("atlas.key_articles")}
                  value={jurisdiction.legislation.keyArticles ?? "N/A"}
                />
                <FallbackRow
                  label={t("atlas.label_debris_mitigation")}
                  value={
                    jurisdiction.debrisMitigation.deorbitRequirement
                      ? `${t("atlas.required")} — ${jurisdiction.debrisMitigation.deorbitTimeline ?? t("atlas.required_see_legislation")}`
                      : t("atlas.not_required")
                  }
                />
                <FallbackRow
                  label={t("atlas.label_registration")}
                  value={
                    jurisdiction.registration.nationalRegistryExists
                      ? `${jurisdiction.registration.registryName ?? t("atlas.national_registry")}`
                      : t("atlas.no_national_registry")
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
              <Building2
                size={16}
                className="text-gray-500"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="text-[12px] font-semibold text-gray-500 tracking-[0.15em] uppercase">
                {t("atlas.competent_authorities")}
              </h2>
              <span className="text-[12px] text-gray-500">
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
            <h2 className="text-[11px] font-semibold text-gray-500 tracking-[0.15em] uppercase mb-3">
              {t("atlas.notes")}
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
          <p className="text-[10px] text-gray-500 leading-relaxed max-w-3xl">
            {t("atlas.data_disclaimer_footer", {
              date: jurisdiction.lastUpdated,
            })}
          </p>
        </footer>
      </div>
      {/* end print-screen-content */}

      {/* ─── Print Briefing (hidden on screen, shown on print) ─── */}
      {hasDetailedSources && (
        <BriefingPrint
          code={displayCode}
          jurisdiction={jurisdiction}
          legalSources={legalSources}
          authorities={authorities}
          groupedSources={groupedSources}
          language={language}
          t={t}
        />
      )}
    </div>
  );
}

// ─── Print-only Briefing Component ─────────────────────────────────

function BriefingPrint({
  code,
  jurisdiction,
  legalSources,
  authorities,
  groupedSources,
  language,
  t,
}: {
  code: string;
  jurisdiction: NonNullable<ReturnType<typeof JURISDICTION_DATA.get>>;
  legalSources: LegalSource[];
  authorities: Authority[];
  groupedSources: Array<{
    key: string;
    title: string;
    sources: LegalSource[];
  }>;
  language: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Fetch firm branding from organization API
  const [firmLogo, setFirmLogo] = useState<string | null>(null);
  const [firmName, setFirmName] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/atlas/settings/firm")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setFirmName(data.name || null);
          setFirmLogo(data.logoUrl || null);
        }
      })
      .catch(() => {
        // Silently fail — export works without branding
      });
  }, []);

  const brandLine = firmName
    ? `${firmName} — powered by ATLAS / Caelex`
    : "ATLAS Space Law Database — Caelex";

  return (
    <div className="hidden print:block print-export-container">
      {/* Cover / Header */}
      <div style={{ marginBottom: "24pt" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "6pt",
          }}
        >
          <div
            style={{
              fontSize: "8pt",
              color: "#999",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            {brandLine}
          </div>
          {firmLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firmLogo}
              alt=""
              style={{
                maxHeight: "28pt",
                maxWidth: "120pt",
                objectFit: "contain",
              }}
            />
          )}
        </div>
        <div
          style={{
            fontSize: "22pt",
            fontWeight: 700,
            color: "#111",
            lineHeight: 1.2,
          }}
        >
          {jurisdiction.countryName} ({code})
        </div>
        <div
          style={{
            fontSize: "11pt",
            color: "#666",
            marginTop: "4pt",
          }}
        >
          {t("atlas.briefing_subtitle")}
        </div>
        <div
          style={{
            fontSize: "9pt",
            color: "#999",
            marginTop: "8pt",
          }}
        >
          {t("atlas.export_date")} {today} &middot;{" "}
          {t("atlas.legal_sources_count", {
            count: String(legalSources.length),
          })}{" "}
          &middot;{" "}
          {t("atlas.authorities_count", {
            count: String(authorities.length),
          })}
        </div>
        <div
          style={{
            borderBottom: "2pt solid #111",
            marginTop: "12pt",
            paddingBottom: "0",
          }}
        />
      </div>

      {/* Key Facts */}
      <div style={{ marginBottom: "18pt" }}>
        <div
          style={{
            fontSize: "9pt",
            fontWeight: 700,
            color: "#111",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "8pt",
          }}
        >
          {t("atlas.key_facts")}
        </div>
        <table
          style={{
            width: "100%",
            fontSize: "9pt",
            borderCollapse: "collapse",
          }}
        >
          <tbody>
            {[
              [
                t("atlas.legislation"),
                `${jurisdiction.legislation.name} (${jurisdiction.legislation.yearEnacted || "N/A"})`,
              ],
              [
                t("atlas.status"),
                jurisdiction.legislation.status.toUpperCase(),
              ],
              [
                t("atlas.licensing_authority"),
                jurisdiction.licensingAuthority.name,
              ],
              [
                t("atlas.liability_regime"),
                jurisdiction.insuranceLiability.liabilityRegime,
              ],
              [
                t("atlas.mandatory_insurance"),
                jurisdiction.insuranceLiability.mandatoryInsurance
                  ? `${t("atlas.yes")}${jurisdiction.insuranceLiability.minimumCoverage ? ` / ${jurisdiction.insuranceLiability.minimumCoverage}` : ""}`
                  : t("atlas.no"),
              ],
              [
                t("atlas.processing_time"),
                t("atlas.processing_weeks", {
                  min: String(jurisdiction.timeline.typicalProcessingWeeks.min),
                  max: String(jurisdiction.timeline.typicalProcessingWeeks.max),
                }),
              ],
            ].map(([label, value]) => (
              <tr key={label}>
                <td
                  style={{
                    padding: "4pt 12pt 4pt 0",
                    color: "#999",
                    fontWeight: 600,
                    width: "35%",
                    verticalAlign: "top",
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "4pt 0",
                    color: "#333",
                    verticalAlign: "top",
                  }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legal Sources */}
      {groupedSources.map((group) => (
        <div
          key={group.key}
          style={{ marginBottom: "16pt", pageBreakInside: "avoid" }}
        >
          <div
            style={{
              fontSize: "9pt",
              fontWeight: 700,
              color: "#111",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "6pt",
              borderBottom: "0.5pt solid #ddd",
              paddingBottom: "4pt",
            }}
          >
            {group.title} ({group.sources.length})
          </div>
          {group.sources.map((source) => {
            const translated = getTranslatedSource(source, language);
            return (
              <div
                key={source.id}
                style={{
                  marginBottom: "10pt",
                  paddingLeft: "8pt",
                  borderLeft: "2pt solid #eee",
                  pageBreakInside: "avoid",
                }}
              >
                <div
                  style={{
                    fontSize: "10pt",
                    fontWeight: 600,
                    color: "#111",
                    lineHeight: 1.3,
                  }}
                >
                  {translated.title}
                </div>
                <div
                  style={{
                    fontSize: "8pt",
                    color: "#999",
                    marginTop: "2pt",
                  }}
                >
                  {[
                    source.official_reference,
                    source.date_enacted || source.date_in_force,
                    source.status.replace(/_/g, " ").toUpperCase(),
                    source.relevance_level.toUpperCase(),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {source.scope_description && (
                  <div
                    style={{
                      fontSize: "8.5pt",
                      color: "#555",
                      marginTop: "4pt",
                      lineHeight: 1.5,
                    }}
                  >
                    {translated.scopeDescription ?? source.scope_description}
                  </div>
                )}
                {source.key_provisions.length > 0 && (
                  <div style={{ marginTop: "4pt" }}>
                    {source.key_provisions.slice(0, 3).map((p, i) => {
                      const tp = translated.getProvisionTranslation(p.section);
                      return (
                        <div
                          key={i}
                          style={{
                            fontSize: "8pt",
                            color: "#666",
                            marginTop: "3pt",
                            lineHeight: 1.4,
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "#444" }}>
                            {p.section}:
                          </span>{" "}
                          {tp?.summary ?? p.summary}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Authorities */}
      {authorities.length > 0 && (
        <div style={{ marginTop: "12pt" }}>
          <div
            style={{
              fontSize: "9pt",
              fontWeight: 700,
              color: "#111",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: "8pt",
              borderBottom: "0.5pt solid #ddd",
              paddingBottom: "4pt",
            }}
          >
            {t("atlas.competent_authorities")} ({authorities.length})
          </div>
          <table
            style={{
              width: "100%",
              fontSize: "8.5pt",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "3pt 6pt 3pt 0",
                    borderBottom: "0.5pt solid #ccc",
                    color: "#999",
                    fontWeight: 600,
                    width: "12%",
                  }}
                >
                  {t("atlas.abbr")}
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "3pt 6pt",
                    borderBottom: "0.5pt solid #ccc",
                    color: "#999",
                    fontWeight: 600,
                    width: "28%",
                  }}
                >
                  {t("atlas.name")}
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "3pt 0 3pt 6pt",
                    borderBottom: "0.5pt solid #ccc",
                    color: "#999",
                    fontWeight: 600,
                    width: "60%",
                  }}
                >
                  {t("atlas.mandate")}
                </th>
              </tr>
            </thead>
            <tbody>
              {authorities.map((auth) => {
                const ta = getTranslatedAuthority(auth, language);
                return (
                  <tr key={auth.id}>
                    <td
                      style={{
                        padding: "4pt 6pt 4pt 0",
                        fontWeight: 700,

                        color: "#333",
                        verticalAlign: "top",
                      }}
                    >
                      {auth.abbreviation}
                    </td>
                    <td
                      style={{
                        padding: "4pt 6pt",
                        color: "#333",
                        verticalAlign: "top",
                      }}
                    >
                      {ta.name}
                    </td>
                    <td
                      style={{
                        padding: "4pt 0 4pt 6pt",
                        color: "#555",
                        lineHeight: 1.4,
                        verticalAlign: "top",
                      }}
                    >
                      {ta.mandate.length > 200
                        ? ta.mandate.slice(0, 200) + "..."
                        : ta.mandate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Disclaimer */}
      <div
        style={{
          marginTop: "24pt",
          paddingTop: "8pt",
          borderTop: "0.5pt solid #ddd",
          fontSize: "7pt",
          color: "#bbb",
          lineHeight: 1.5,
        }}
      >
        {brandLine}.{" "}
        {t("atlas.data_disclaimer_footer", {
          date: jurisdiction.lastUpdated,
        })}
      </div>
    </div>
  );
}

// ─── Helper components ──────────────────────────────────────────────

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[13px] font-medium text-gray-800">{value}</span>
    </div>
  );
}

function FallbackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider w-28 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-[12px] text-gray-700">{value}</span>
    </div>
  );
}
