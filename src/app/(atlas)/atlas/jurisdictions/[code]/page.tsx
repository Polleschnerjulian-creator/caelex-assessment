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
import { getProfile, type JurisdictionCode } from "@/data/landing-rights";
import { JurisdictionProfileView } from "@/components/atlas/landing-rights/JurisdictionProfileView";
import JurisdictionExport from "@/components/atlas/JurisdictionExport";
import { BookmarkButton } from "../../_components/BookmarkButton";
import { WatchButton } from "@/components/atlas/WatchButton";

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
    bg: "bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border)]",
    text: "text-[var(--atlas-text-secondary)]",
  },
  draft_legislation: {
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
  },
};

const RELEVANCE_STYLES: Record<RelevanceLevel, string> = {
  fundamental:
    "text-[var(--atlas-text-primary)] bg-[var(--atlas-bg-inset)] border-[var(--atlas-border-strong)]",
  critical: "text-red-700 bg-red-50 border-red-200",
  high: "text-amber-700 bg-amber-50 border-amber-200",
  medium:
    "text-[var(--atlas-text-muted)] bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border)]",
  low: "text-[var(--atlas-text-muted)] bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border-subtle)]",
};

const STATUS_COLORS: Record<LegalSourceStatus, { bg: string; text: string }> = {
  in_force: {
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  draft: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  proposed: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  superseded: {
    bg: "bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border)]",
    text: "text-[var(--atlas-text-muted)]",
  },
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
    none: {
      bg: "bg-[var(--atlas-bg-surface-muted)] border-[var(--atlas-border)]",
      text: "text-[var(--atlas-text-muted)]",
    },
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
        className="flex items-center gap-1.5 text-[11px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] transition-colors duration-150"
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
              <div
                key={i}
                className="border-l-2 border-[var(--atlas-border)] pl-3"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-[10px]  text-[var(--atlas-text-muted)] flex-shrink-0">
                    {p.section}
                  </span>
                  <span className="text-[12px] font-medium text-[var(--atlas-text-secondary)]">
                    {tp?.title ?? p.title}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--atlas-text-muted)] leading-relaxed mt-0.5">
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
    <div className="rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] hover:border-[var(--atlas-border)] hover:shadow-sm px-5 py-4 transition-all duration-200 group">
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
          <span className="text-[10px] text-[var(--atlas-text-faint)] ml-auto">
            {source.official_reference}
          </span>
        )}
      </div>

      <Link href={`/atlas/sources/${source.id}`} className="block">
        <h4 className="text-[14px] font-semibold text-[var(--atlas-text-primary)] leading-snug group-hover:text-[var(--atlas-text-secondary)] transition-colors">
          {translated.title}
        </h4>
      </Link>

      {language === "en" && source.title_local && (
        <p className="text-[11px] text-[var(--atlas-text-faint)] mt-0.5">
          {source.title_local}
        </p>
      )}
      {language !== "en" && source.title_en !== translated.title && (
        <p className="text-[11px] text-[var(--atlas-text-faint)] mt-0.5">
          {source.title_en}
        </p>
      )}

      <div className="flex items-center gap-3 mt-2">
        {(source.date_enacted ||
          source.date_in_force ||
          source.date_published) && (
          <span className="text-[10px] text-[var(--atlas-text-faint)]">
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
            className="text-[10px] text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-secondary)] transition-colors"
          >
            {t("atlas.view_source")}{" "}
            <span className="sr-only">(opens in new window)</span>
          </a>
        )}
      </div>

      {source.scope_description && (
        <p className="text-[11px] text-[var(--atlas-text-muted)] leading-relaxed mt-2 line-clamp-3">
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
    <div className="py-5 px-5 rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[18px] font-bold text-[var(--atlas-text-primary)]  tracking-tight">
            {authority.abbreviation}
          </span>
          <h4 className="text-[13px] font-medium text-[var(--atlas-text-secondary)] mt-1">
            {translated.name}
          </h4>
          {language === "en" && authority.name_local !== authority.name_en && (
            <p className="text-[11px] text-[var(--atlas-text-muted)] mt-0.5">
              {authority.name_local}
            </p>
          )}
          {language !== "en" && authority.name_en !== translated.name && (
            <p className="text-[11px] text-[var(--atlas-text-muted)] mt-0.5">
              {authority.name_en}
            </p>
          )}
        </div>
        {authority.website && (
          <a
            href={authority.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] transition-colors flex-shrink-0 mt-1"
          >
            <ExternalLink size={10} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">
              {authority.abbreviation} website (opens in new window)
            </span>
          </a>
        )}
      </div>

      <p className="text-[11px] text-[var(--atlas-text-muted)] leading-relaxed mt-3">
        {translated.mandate}
      </p>

      {authority.applicable_areas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {authority.applicable_areas.map((area) => (
            <span
              key={area}
              className="text-[9px] font-medium uppercase tracking-wider text-[var(--atlas-text-muted)] bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] rounded px-1.5 py-0.5"
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
      <div className="min-h-screen bg-[var(--atlas-bg-page)] px-6 py-8 lg:px-12">
        <nav aria-label="Breadcrumb">
          <Link
            href="/atlas"
            className="inline-flex items-center gap-2 text-[12px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
            {t("atlas.back_to_atlas")}
          </Link>
        </nav>
        <div className="mt-20 text-center">
          <span className="text-[72px]  font-bold text-gray-100">
            {displayCode}
          </span>
          <p className="text-[13px] text-[var(--atlas-text-muted)] mt-4">
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
    <div className="min-h-screen bg-[var(--atlas-bg-page)]">
      {/* ─── Screen content (hidden during print) ─── */}
      <div className="print-screen-content px-6 py-8 lg:px-12">
        {/* ─── Header ─── */}
        <header>
          <nav aria-label="Breadcrumb">
            <Link
              href="/atlas"
              className="inline-flex items-center gap-2 text-[12px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] transition-colors"
            >
              <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
              {t("atlas.back_to_atlas")}
            </Link>
          </nav>

          <div className="mt-6 flex items-baseline gap-4">
            <span className="text-[36px]  font-bold text-gray-200 leading-none tracking-tight">
              {displayCode}
            </span>
            <h1 className="text-[28px] font-semibold text-[var(--atlas-text-primary)] tracking-tight leading-none">
              {jurisdiction.countryName}
            </h1>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded border ${legStatusColor.bg} ${legStatusColor.text}`}
            >
              {legStatusLabel}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-[14px] text-[var(--atlas-text-muted)]">
              {jurisdiction.legislation.name}
              {jurisdiction.legislation.yearEnacted
                ? ` (${jurisdiction.legislation.yearEnacted}${jurisdiction.legislation.yearAmended ? `, ${t("atlas.amended", { year: String(jurisdiction.legislation.yearAmended) })}` : ""})`
                : ""}
            </p>
            <div className="flex items-center gap-2">
              {/* Watch this jurisdiction — opt into amendment alerts
                  when an admin reviews a change to any source under
                  this country code. See /atlas/alerts for the feed. */}
              <WatchButton
                targetType="JURISDICTION"
                targetId={displayCode}
                size="sm"
              />
              <BookmarkButton
                item={{
                  id: `jurisdiction:${displayCode}`,
                  type: "jurisdiction",
                  title: jurisdiction.countryName,
                  subtitle: jurisdiction.legislation.name,
                  href: `/atlas/jurisdictions/${displayCode.toLowerCase()}`,
                }}
              />
              {hasDetailedSources && (
                <button
                  onClick={handleExportBriefing}
                  className="print:hidden flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] text-[12px] font-medium text-[var(--atlas-text-secondary)] hover:border-[var(--atlas-border-strong)] hover:text-[var(--atlas-text-primary)] transition-all duration-150"
                >
                  <Download size={14} strokeWidth={1.5} aria-hidden="true" />
                  {t("atlas.briefing_export")}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ─── Key Facts Grid ─── */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] px-4 py-3.5">
            <span className="text-[10px] font-medium text-[var(--atlas-text-faint)] uppercase tracking-wider block mb-1">
              {t("atlas.label_authority")}
            </span>
            <span className="text-[13px] font-semibold text-[var(--atlas-text-primary)] block leading-snug">
              {jurisdiction.licensingAuthority.name}
            </span>
          </div>
          <div className="rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] px-4 py-3.5">
            <span className="text-[10px] font-medium text-[var(--atlas-text-faint)] uppercase tracking-wider block mb-1">
              {t("atlas.label_liability")}
            </span>
            <span className="text-[13px] font-semibold text-[var(--atlas-text-primary)] block">
              {jurisdiction.insuranceLiability.liabilityRegime
                .charAt(0)
                .toUpperCase() +
                jurisdiction.insuranceLiability.liabilityRegime.slice(1)}
            </span>
          </div>
          <div className="rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] px-4 py-3.5">
            <span className="text-[10px] font-medium text-[var(--atlas-text-faint)] uppercase tracking-wider block mb-1">
              {t("atlas.label_processing")}
            </span>
            <span className="text-[13px] font-semibold text-[var(--atlas-text-primary)] block">
              {t("atlas.processing_weeks", {
                min: String(jurisdiction.timeline.typicalProcessingWeeks.min),
                max: String(jurisdiction.timeline.typicalProcessingWeeks.max),
              })}
            </span>
          </div>
          <div className="rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] px-4 py-3.5">
            <span className="text-[10px] font-medium text-[var(--atlas-text-faint)] uppercase tracking-wider block mb-1">
              {t("atlas.label_insurance")}
            </span>
            <span className="text-[13px] font-semibold text-[var(--atlas-text-primary)] block">
              {jurisdiction.insuranceLiability.mandatoryInsurance
                ? jurisdiction.insuranceLiability.minimumCoverage ||
                  t("atlas.required")
                : t("atlas.not_required")}
            </span>
          </div>
          <div className="rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] px-4 py-3.5">
            <span className="text-[10px] font-medium text-[var(--atlas-text-faint)] uppercase tracking-wider block mb-1">
              {t("atlas.label_status")}
            </span>
            <span className="text-[13px] font-semibold text-[var(--atlas-text-primary)] block">
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
                className="text-[var(--atlas-text-muted)]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.15em] uppercase">
                {t("atlas.legal_sources")}
              </h2>
              <span className="text-[12px] text-[var(--atlas-text-muted)]">
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
                        className="text-[var(--atlas-text-muted)]"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <h3 className="text-[11px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.12em] uppercase">
                        {group.title}
                      </h3>
                      <span className="text-[11px] text-[var(--atlas-text-muted)]">
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
                className="text-[var(--atlas-text-muted)]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.15em] uppercase">
                {t("atlas.legal_sources")}
              </h2>
            </div>

            {/* Fallback: show national-space-laws data */}
            <div className="rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] p-6">
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
                    <span className="text-[10px] font-medium text-[var(--atlas-text-muted)] uppercase tracking-wider w-28 flex-shrink-0 pt-0.5">
                      {t("atlas.label_official_url")}
                    </span>
                    <a
                      href={jurisdiction.legislation.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] transition-colors underline underline-offset-2"
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
                className="text-[var(--atlas-text-muted)]"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <h2 className="text-[12px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.15em] uppercase">
                {t("atlas.competent_authorities")}
              </h2>
              <span className="text-[12px] text-[var(--atlas-text-muted)]">
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
          <div className="mt-12 pt-8 border-t border-[var(--atlas-border)]">
            <h2 className="text-[11px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.15em] uppercase mb-3">
              {t("atlas.notes")}
            </h2>
            <ul className="space-y-2">
              {jurisdiction.notes.map((note, i) => (
                <li
                  key={i}
                  className="text-[12px] text-[var(--atlas-text-muted)] leading-relaxed pl-4 border-l-2 border-[var(--atlas-border)]"
                >
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(() => {
          const lrProfile = getProfile(displayCode as JurisdictionCode);
          if (!lrProfile) return null;
          return (
            <section className="mt-10 pt-8 border-t border-[var(--atlas-border-subtle)]">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-[18px] font-semibold text-[var(--atlas-text-primary)]">
                  Landing Rights
                </h2>
                <Link
                  href={`/atlas/landing-rights/${displayCode.toLowerCase()}`}
                  className="text-[12px] text-emerald-600 hover:text-emerald-700"
                >
                  Full view →
                </Link>
              </div>
              <JurisdictionProfileView profile={lrProfile} embed />
            </section>
          );
        })()}

        {/* ─── Footer ─── */}
        <footer className="mt-20 pt-6 border-t border-[var(--atlas-border)]">
          <p className="text-[10px] text-[var(--atlas-text-muted)] leading-relaxed max-w-3xl">
            {t("atlas.data_disclaimer_footer", {
              date: jurisdiction.lastUpdated,
            })}
          </p>
        </footer>
      </div>
      {/* end print-screen-content */}

      {/* ─── Print Briefing (hidden on screen, shown on print) ─── */}
      {hasDetailedSources && (
        <JurisdictionExport
          code={displayCode}
          jurisdiction={jurisdiction}
          legalSources={legalSources}
          authorities={authorities}
          groupedSources={groupedSources}
          language={language}
        />
      )}
    </div>
  );
}

function FallbackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-[10px] font-medium text-[var(--atlas-text-muted)] uppercase tracking-wider w-28 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-[12px] text-[var(--atlas-text-secondary)]">
        {value}
      </span>
    </div>
  );
}
