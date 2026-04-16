"use client";

import { useState, useCallback, useMemo } from "react";
import { Download } from "lucide-react";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import CountrySelector from "@/components/atlas/CountrySelector";
import ComparisonTable from "@/components/atlas/ComparisonTable";
import ComparatorExport from "@/components/atlas/ComparatorExport";
import { useLanguage } from "@/components/providers/LanguageProvider";

const DEFAULT_COUNTRIES: SpaceLawCountryCode[] = ["FR", "DE", "UK"];

export default function ComparatorPage() {
  const [selected, setSelected] =
    useState<SpaceLawCountryCode[]>(DEFAULT_COUNTRIES);
  const [dimension, setDimension] = useState<string>("all");
  const { t } = useLanguage();

  // ─── Dimension tabs (translated) ───
  const dimensions = useMemo(
    () => [
      { key: "all", label: t("atlas.all_dimensions") },
      { key: "authorization", label: t("atlas.authorization_licensing") },
      { key: "liability", label: t("atlas.liability_insurance") },
      { key: "debris", label: t("atlas.debris_mitigation") },
      { key: "registration", label: t("atlas.registration") },
      { key: "timeline", label: t("atlas.timeline_costs") },
      { key: "eu_readiness", label: t("atlas.eu_space_act_readiness") },
    ],
    [t],
  );

  const handleExport = useCallback(() => {
    window.print();
  }, []);

  return (
    <>
      <div className="flex flex-col h-full min-h-screen bg-[#F7F8FA] p-4 gap-3 print:hidden">
        {/* ─── Header ─── */}
        <header className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
              {t("atlas.comparator")}
            </h1>
            <span className="text-[10px]  text-gray-500 tracking-wide">
              {t("atlas.jurisdictions_count", { count: 19 })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] text-gray-500 ">
              <span>
                {selected.length} {t("atlas.selected")}
              </span>
              <span className="text-gray-300">|</span>
              <span>
                {dimensions.find((d) => d.key === dimension)?.label ||
                  t("atlas.all_dimensions")}
              </span>
            </div>
            {selected.length > 0 && (
              <button
                onClick={handleExport}
                className="
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                  text-[11px] font-medium text-gray-500
                  hover:text-gray-900 hover:bg-gray-100
                  transition-colors duration-150
                "
              >
                <Download
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                  strokeWidth={1.5}
                />
                <span>{t("atlas.export_pdf_btn")}</span>
              </button>
            )}
          </div>
        </header>

        {/* ─── Country Selector Bar ─── */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">
              {t("atlas.jurisdictions")}
            </span>
          </div>
          <CountrySelector selected={selected} onChange={setSelected} />
        </div>

        {/* ─── Dimension Tabs ─── */}
        <div
          role="tablist"
          className="flex items-center gap-4 overflow-x-auto pb-0.5 -mx-1 px-1 border-b border-gray-200"
        >
          {dimensions.map((dim) => (
            <button
              key={dim.key}
              role="tab"
              aria-selected={dimension === dim.key}
              onClick={() => setDimension(dim.key)}
              className={`
                flex-shrink-0 pb-2 text-[11px] font-medium
                transition-all duration-150 border-b-2 -mb-[1px]
                ${
                  dimension === dim.key
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-600"
                }
              `}
            >
              {dim.label}
            </button>
          ))}
        </div>

        {/* ─── Comparison Table ─── */}
        <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <ComparisonTable countries={selected} dimension={dimension} />
        </div>
      </div>

      {/* ─── Print-only export view ─── */}
      <ComparatorExport countries={selected} dimension={dimension} />
    </>
  );
}
