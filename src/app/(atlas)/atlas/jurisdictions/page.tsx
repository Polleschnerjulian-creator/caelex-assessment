"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import {
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
  getAvailableJurisdictions,
} from "@/data/legal-sources";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ArrowRight, Filter, Check } from "lucide-react";

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
  const router = useRouter();
  const { language } = useLanguage();
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
    { key: "all", label: language === "de" ? "Alle" : "All" },
    {
      key: "hasAct",
      label: language === "de" ? "Mit Weltraumgesetz" : "Has Space Act",
    },
    { key: "noAct", label: language === "de" ? "Ohne Gesetz" : "No Space Act" },
    {
      key: "mandatory",
      label: language === "de" ? "Pflichtversicherung" : "Mandatory Insurance",
    },
    {
      key: "moon",
      label: language === "de" ? "Mondvertrag" : "Moon Agreement",
    },
  ];

  const sorts: { key: SortKey; label: string }[] = [
    { key: "sources", label: "Sources" },
    { key: "country", label: language === "de" ? "Land" : "Country" },
    { key: "year", label: language === "de" ? "Jahr" : "Year" },
    {
      key: "insurance",
      label: language === "de" ? "Versicherung" : "Insurance",
    },
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
          {language === "de" ? "Jurisdiktionen" : "Jurisdictions"}
        </h1>
        <p className="text-[13px] text-gray-500">
          {language === "de"
            ? `${ALL.length} Länder · ${WITH_SOURCES.length} mit Rechtsquellen · ${withAct} mit Weltraumgesetz`
            : `${ALL.length} countries · ${WITH_SOURCES.length} with legal sources · ${withAct} with space acts`}
        </p>
      </div>

      {/* ─── Quick Stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          {
            n: WITH_SOURCES.length,
            label:
              language === "de" ? "Mit Rechtsquellen" : "With Legal Sources",
            sub: `${ALL.reduce((a, j) => a + j.sourceCount, 0)} total`,
          },
          {
            n: withAct,
            label: language === "de" ? "Weltraumgesetz" : "Space Act Enacted",
            sub: `${ALL.length - withAct} ${language === "de" ? "ohne" : "without"}`,
          },
          {
            n: withMandatory,
            label:
              language === "de" ? "Pflichtversicherung" : "Mandatory Insurance",
            sub: language === "de" ? "€2M–€60M Spanne" : "€2M–€60M range",
          },
          {
            n: withMoon,
            label: language === "de" ? "Mondvertrag" : "Moon Agreement",
            sub: language === "de" ? "von ~18 weltweit" : "of ~18 globally",
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
        <span className="text-[10px] text-gray-500">
          {language === "de" ? "Sortieren:" : "Sort:"}
        </span>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 mb-16">
        {filtered.map((j) => (
          <button
            key={j.code}
            onClick={() =>
              router.push(`/atlas/jurisdictions/${j.code.toLowerCase()}`)
            }
            className="text-left rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-md px-5 py-4 transition-all duration-200 group"
          >
            {/* Top row: code + country + arrow */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-[20px] font-bold text-gray-300 group-hover:text-gray-500 transition-colors">
                  {j.code}
                </span>
                <span className="text-[15px] font-semibold text-gray-900">
                  {j.country}
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
                : j.actName ||
                  (language === "de" ? "Kein Weltraumgesetz" : "No space act")}
            </p>

            {/* Compliance indicators */}
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              <Indicator
                active={j.hasSpaceAct}
                label={language === "de" ? "Gesetz" : "Act"}
              />
              <Indicator
                active={j.mandatoryInsurance}
                label={language === "de" ? "Versicherung" : "Insurance"}
              />
              <Indicator active={j.hasRegistry} label="Registry" />
              <Indicator active={j.hasDebrisRules} label="Debris" />
              <Indicator active={j.sourceCount > 0} label="Sources" />
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
                  {j.sourceCount} sources · {j.authorityCount} auth.
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* ─── Treaty Ratification Matrix ─── */}
      <section className="mb-10">
        <h2 className="text-[12px] font-semibold text-gray-500 tracking-[0.15em] uppercase mb-4">
          {language === "de"
            ? "Vertragsratifizierungsmatrix"
            : "Treaty Ratification Matrix"}
        </h2>
        <div className="rounded-xl bg-white border border-gray-100 overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-[100px]">
                  Country
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  OST
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  Liability
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  Registration
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  Moon
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  Artemis
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  {language === "de" ? "Gesetz" : "Act"}
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-gray-500">
                  {language === "de" ? "Versicherung" : "Insurance"}
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
                      {j.country}
                    </span>
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.ost} />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.liability_conv} />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.registration_conv} />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.moon} color="amber" />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.artemis} />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.hasSpaceAct} />
                  </td>
                  <td className="text-center px-2 py-2">
                    <Dot active={j.mandatoryInsurance} />
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
}: {
  active: boolean;
  color?: "emerald" | "amber";
}) {
  if (!active)
    return <span className="inline-block h-2 w-2 rounded-full bg-gray-200" />;
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color === "amber" ? "bg-amber-400" : "bg-emerald-500"}`}
    />
  );
}
