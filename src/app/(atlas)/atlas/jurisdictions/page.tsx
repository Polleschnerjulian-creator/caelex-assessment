"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import {
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
  getAvailableJurisdictions,
} from "@/data/legal-sources";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getJurisdictionNames } from "../i18n-labels";
import { ArrowRight, Filter, Check, FileDown } from "lucide-react";
import { BookmarkButton } from "../_components/BookmarkButton";

// ─── Build enriched jurisdiction data ──────────────────────────────

const SOURCES_SET = new Set(getAvailableJurisdictions());

interface Jurisdiction {
  code: string;
  country: string;
  hasSpaceAct: boolean;
  actName: string;
  actYear: number;
  status: "enacted" | "draft" | "pending" | "none";
  insurance: string;
  mandatoryInsurance: boolean;
  liability: string;
  hasRegistry: boolean;
  hasDebrisRules: boolean;
  sourceCount: number;
  authorityCount: number;
  // Treaty flags
  ost: boolean;
  liability_conv: boolean;
  registration_conv: boolean;
  moon: boolean;
  artemis: boolean;
}

function buildJurisdictions(): Jurisdiction[] {
  const result: Jurisdiction[] = [];
  for (const [code, data] of JURISDICTION_DATA) {
    const hasSources = SOURCES_SET.has(code);
    const sources = hasSources ? getLegalSourcesByJurisdiction(code) : [];
    const authorities = hasSources ? getAuthoritiesByJurisdiction(code) : [];

    // Detect treaty ratification from sources
    const hasOST = sources.some(
      (s) => s.id.includes("OST") && s.status === "in_force",
    );
    const hasLiabilityConv = sources.some(
      (s) =>
        s.id.includes("LIABILITY") &&
        s.type === "international_treaty" &&
        s.status === "in_force",
    );
    const hasRegConv = sources.some(
      (s) =>
        s.id.includes("REGISTRATION") &&
        s.type === "international_treaty" &&
        s.status === "in_force",
    );
    const hasMoon = sources.some(
      (s) => s.id.includes("MOON") && s.status === "in_force",
    );
    const hasArtemis = sources.some(
      (s) => s.id.includes("ARTEMIS") && s.status === "in_force",
    );

    const hasSpaceAct =
      data.legislation.status === "enacted" && data.legislation.yearEnacted > 0;

    result.push({
      code,
      country: data.countryName,
      hasSpaceAct,
      actName: data.legislation.name,
      actYear: data.legislation.yearEnacted,
      status: data.legislation.status,
      insurance: data.insuranceLiability.minimumCoverage || "None",
      mandatoryInsurance: data.insuranceLiability.mandatoryInsurance,
      liability: data.insuranceLiability.liabilityRegime,
      hasRegistry: data.registration.nationalRegistryExists,
      hasDebrisRules: data.debrisMitigation.deorbitRequirement,
      sourceCount: sources.length,
      authorityCount: authorities.length,
      ost: hasOST,
      liability_conv: hasLiabilityConv,
      registration_conv: hasRegConv,
      moon: hasMoon,
      artemis: hasArtemis,
    });
  }
  return result.sort(
    (a, b) =>
      b.sourceCount - a.sourceCount || a.country.localeCompare(b.country),
  );
}

const ALL = buildJurisdictions();
const WITH_SOURCES = ALL.filter((j) => j.sourceCount > 0);

type SortKey = "sources" | "country" | "insurance" | "year";
type FilterKey = "all" | "hasAct" | "noAct" | "mandatory" | "moon";

// ─── Page ──────────────────────────────────────────────────────────

export default function JurisdictionsPage() {
  const { t } = useLanguage();
  const JURISDICTION_NAMES = getJurisdictionNames(t);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("sources");

  const filtered = useMemo(() => {
    let list = [...ALL];
    if (filter === "hasAct") list = list.filter((j) => j.hasSpaceAct);
    if (filter === "noAct") list = list.filter((j) => !j.hasSpaceAct);
    if (filter === "mandatory") list = list.filter((j) => j.mandatoryInsurance);
    if (filter === "moon") list = list.filter((j) => j.moon);

    if (sort === "sources") list.sort((a, b) => b.sourceCount - a.sourceCount);
    if (sort === "country")
      list.sort((a, b) => a.country.localeCompare(b.country));
    if (sort === "year")
      list.sort((a, b) => (b.actYear || 0) - (a.actYear || 0));
    if (sort === "insurance")
      list.sort(
        (a, b) =>
          (b.mandatoryInsurance ? 1 : 0) - (a.mandatoryInsurance ? 1 : 0),
      );

    return list;
  }, [filter, sort]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("atlas.filter_all") },
    { key: "hasAct", label: t("atlas.filter_has_space_act") },
    { key: "noAct", label: t("atlas.filter_no_space_act") },
    { key: "mandatory", label: t("atlas.filter_mandatory_insurance") },
    { key: "moon", label: t("atlas.filter_moon_agreement") },
  ];

  const sorts: { key: SortKey; label: string }[] = [
    { key: "sources", label: t("atlas.sort_sources") },
    { key: "country", label: t("atlas.sort_country") },
    { key: "year", label: t("atlas.sort_year") },
    { key: "insurance", label: t("atlas.sort_insurance") },
  ];

  // Stats
  const withAct = ALL.filter((j) => j.hasSpaceAct).length;
  const withMoon = ALL.filter((j) => j.moon).length;
  const withMandatory = ALL.filter((j) => j.mandatoryInsurance).length;

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-6 lg:px-12 py-10">
      {/* ─── Header ─── */}
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold tracking-tight text-gray-900 mb-1">
          {t("atlas.jurisdictions")}
        </h1>
        <p className="text-[13px] text-gray-500">
          {t("atlas.countries_stats", {
            total: ALL.length,
            withSources: WITH_SOURCES.length,
            withAct,
          })}
        </p>
      </div>

      {/* ─── Quick Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          {
            n: WITH_SOURCES.length,
            label: t("atlas.with_legal_sources"),
            sub: t("atlas.total_sources", {
              count: ALL.reduce((a, j) => a + j.sourceCount, 0),
            }),
          },
          {
            n: withAct,
            label: t("atlas.space_act_enacted"),
            sub: t("atlas.without_act", { count: ALL.length - withAct }),
          },
          {
            n: withMandatory,
            label: t("atlas.filter_mandatory_insurance"),
            sub: t("atlas.insurance_range"),
          },
          {
            n: withMoon,
            label: t("atlas.filter_moon_agreement"),
            sub: t("atlas.moon_globally"),
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-white border border-gray-100 px-5 py-4"
          >
            <span className="text-[28px] font-bold text-gray-900 block leading-none">
              {s.n}
            </span>
            <span className="text-[12px] font-medium text-gray-600 block mt-1">
              {s.label}
            </span>
            <span className="text-[10px] text-gray-400 block mt-0.5">
              {s.sub}
            </span>
          </div>
        ))}
      </div>

      {/* ─── Filters + Sort ─── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter size={14} className="text-gray-400" aria-hidden="true" />
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 ${filter === f.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-[10px] text-gray-300 mx-2">|</span>
        <span className="text-[10px] text-gray-500">{t("atlas.sort")}</span>
        {sorts.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${sort === s.key ? "text-gray-900 underline underline-offset-2" : "text-gray-400 hover:text-gray-600"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ─── Jurisdiction Cards ─── */}
      {/*
        H11 fix: outer card is now a <Link> (produces a real href for
          crawlers + supports right-click open-in-new-tab + prefetching).
        H12 fix: the PDF download lives in a sibling element outside the
          Link so we no longer nest <a>-in-<button>-in-<a> (invalid HTML).
        */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mb-16">
        {filtered.map((j) => (
          <article
            key={j.code}
            className="relative rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-200 group"
          >
            <Link
              href={`/atlas/jurisdictions/${j.code.toLowerCase()}`}
              className="block px-5 py-4"
            >
              {/* Top row: code + country + arrow */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[20px] font-bold text-gray-300 group-hover:text-gray-500 transition-colors">
                    {j.code}
                  </span>
                  <span className="text-[15px] font-semibold text-gray-900">
                    {JURISDICTION_NAMES[j.code] || j.country}
                  </span>
                </div>
                <ArrowRight
                  size={14}
                  className="text-gray-300 group-hover:text-gray-900 transition-colors"
                  aria-hidden="true"
                />
              </div>

              {/* Legislation line */}
              <p className="text-[11px] text-gray-500 truncate mb-3">
                {j.hasSpaceAct
                  ? `${j.actName} (${j.actYear})`
                  : j.actName || t("atlas.no_comprehensive_law")}
              </p>

              {/* Compliance indicators */}
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                <Indicator
                  active={j.hasSpaceAct}
                  label={t("atlas.indicator_act")}
                />
                <Indicator
                  active={j.mandatoryInsurance}
                  label={t("atlas.indicator_insurance")}
                />
                <Indicator
                  active={j.hasRegistry}
                  label={t("atlas.indicator_registry")}
                />
                <Indicator
                  active={j.hasDebrisRules}
                  label={t("atlas.debris_indicator")}
                />
                <Indicator
                  active={j.sourceCount > 0}
                  label={t("atlas.indicator_sources")}
                />
              </div>

              {/* Bottom row: insurance + liability + sources count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {j.mandatoryInsurance && (
                    <span className="text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-0.5">
                      {j.insurance}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-400 capitalize">
                    {j.liability}
                  </span>
                </div>
                {j.sourceCount > 0 && (
                  <span className="text-[10px] font-medium text-gray-500">
                    {t("atlas.sources_auth", {
                      sources: j.sourceCount,
                      auth: j.authorityCount,
                    })}
                  </span>
                )}
              </div>
            </Link>

            {j.sourceCount > 0 && (
              // Absolutely-positioned so it overlays the card's top-right
              // without nesting inside the outer <Link>. This keeps HTML
              // valid while preserving the single-card UX.
              <a
                href={`/api/atlas/country-memo/${j.code}`}
                download
                title="Download PDF country memo"
                className="absolute top-3 right-10 z-10 inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 hover:text-emerald-700 bg-white border border-gray-200 hover:border-emerald-300 rounded-full px-2 py-0.5 transition-colors"
              >
                <FileDown size={10} strokeWidth={2} aria-hidden="true" />
                PDF
              </a>
            )}
            <div className="absolute bottom-3 right-3 z-10">
              <BookmarkButton
                item={{
                  id: `jurisdiction:${j.code}`,
                  type: "jurisdiction",
                  title: JURISDICTION_NAMES[j.code] || j.country,
                  subtitle: j.hasSpaceAct
                    ? `${j.actName} (${j.actYear})`
                    : j.actName || t("atlas.no_comprehensive_law"),
                  href: `/atlas/jurisdictions/${j.code.toLowerCase()}`,
                }}
              />
            </div>
          </article>
        ))}
      </div>

      {/* ─── Treaty Ratification Matrix ─── */}
      <section className="mb-10">
        <h2 className="text-[12px] font-semibold text-gray-500 tracking-[0.15em] uppercase mb-4">
          {t("atlas.treaty_matrix")}
        </h2>
        <div className="rounded-xl bg-white border border-gray-100 overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-[100px]">
                  {t("atlas.sort_country")}
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  {t("atlas.treaty_ost")}
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  {t("atlas.treaty_liability")}
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  {t("atlas.treaty_registration")}
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  {t("atlas.treaty_moon")}
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  {t("atlas.treaty_artemis")}
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  {t("atlas.indicator_act")}
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  {t("atlas.indicator_insurance")}
                </th>
              </tr>
            </thead>
            <tbody>
              {WITH_SOURCES.map((j) => (
                <tr
                  key={j.code}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-2 font-semibold text-gray-900">
                    {j.code}{" "}
                    <span className="font-normal text-gray-400">
                      {JURISDICTION_NAMES[j.code] || j.country}
                    </span>
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.ost} label="Outer Space Treaty" />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot
                      active={j.liability_conv}
                      label="Liability Convention"
                    />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot
                      active={j.registration_conv}
                      label="Registration Convention"
                    />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.moon} color="amber" label="Moon Agreement" />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.artemis} label="Artemis Accords" />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.hasSpaceAct} label="National space act" />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot
                      active={j.mandatoryInsurance}
                      label="Mandatory insurance"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────────

function Indicator({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={`flex flex-col items-center gap-1 py-1.5 rounded-lg ${active ? "bg-emerald-50" : "bg-gray-50"}`}
    >
      {active ? (
        <Check
          size={12}
          strokeWidth={3}
          className="text-emerald-500"
          aria-hidden="true"
        />
      ) : (
        <span className="text-[10px] text-gray-300" aria-hidden="true">
          —
        </span>
      )}
      <span
        className={`text-[8px] font-medium ${active ? "text-emerald-700" : "text-gray-400"}`}
      >
        {label}
      </span>
    </div>
  );
}

function Dot({
  active,
  color = "emerald",
  label,
}: {
  active: boolean;
  color?: "emerald" | "amber";
  /** Optional semantic label so screen readers announce status. */
  label?: string;
}) {
  // M5: non-active state needs ≥ 3:1 contrast on white for WCAG 2.1 AA
  // "Non-Text Contrast" (SC 1.4.11). bg-gray-200 on white is ~1.3:1 —
  // bumped to bg-gray-400 which is ~3.5:1.
  if (!active)
    return (
      <span
        className="inline-block h-2 w-2 rounded-full bg-gray-400 ring-1 ring-gray-100"
        aria-label={label ? `${label}: not ratified` : "not ratified"}
        role="img"
      />
    );
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color === "amber" ? "bg-amber-500" : "bg-emerald-500"}`}
      aria-label={label ? `${label}: ratified` : "ratified"}
      role="img"
    />
  );
}
