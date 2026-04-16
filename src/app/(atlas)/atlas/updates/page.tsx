"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface Update {
  id: string;
  title: string;
  description: string;
  jurisdiction: string | null;
  sourceId: string | null;
  category: string;
  publishedAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  NEW_LAW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  AMENDMENT: "bg-blue-50 text-blue-700 border-blue-200",
  RATIFICATION: "bg-purple-50 text-purple-700 border-purple-200",
  DRAFT: "bg-amber-50 text-amber-700 border-amber-200",
  INSTITUTIONAL: "bg-teal-50 text-teal-700 border-teal-200",
  NIS2: "bg-red-50 text-red-700 border-red-200",
  EU_SPACE_ACT: "bg-violet-50 text-violet-700 border-violet-200",
  DATA_UPDATE: "bg-gray-50 text-gray-600 border-gray-200",
};

function getCategoryLabels(t: (key: string) => string): Record<string, string> {
  return {
    NEW_LAW: t("atlas.category_new_law"),
    AMENDMENT: t("atlas.category_amendment"),
    RATIFICATION: t("atlas.category_ratification"),
    DRAFT: t("atlas.category_draft"),
    INSTITUTIONAL: t("atlas.category_institutional"),
    NIS2: t("atlas.category_nis2"),
    EU_SPACE_ACT: t("atlas.category_eu_space_act"),
    DATA_UPDATE: t("atlas.category_database"),
  };
}

export default function UpdatesPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, language } = useLanguage();
  const CATEGORY_LABELS_MAP = getCategoryLabels(t);

  useEffect(() => {
    fetch("/api/atlas/updates")
      .then((r) => r.json())
      .then((data) => setUpdates(data.updates || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === "de" ? "de-DE" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Group by month
  const grouped = updates.reduce<Record<string, Update[]>>((acc, u) => {
    const d = new Date(u.publishedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});

  const monthLabel = (key: string) => {
    const [year, month] = key.split("-");
    const d = new Date(Number(year), Number(month) - 1);
    return d.toLocaleDateString(language === "de" ? "de-DE" : "en-GB", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] px-6 lg:px-12 py-10">
      <div className="max-w-3xl">
        {/* Header */}
        <h1 className="text-[24px] font-semibold tracking-tight text-gray-900 mb-1">
          {t("atlas.regulatory_updates")}
        </h1>
        <p className="text-[13px] text-gray-500 mb-10">
          {t("atlas.regulatory_updates_desc")}
        </p>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[14px] text-gray-400">{t("atlas.no_updates")}</p>
            <p className="text-[12px] text-gray-300 mt-1">
              {t("atlas.no_updates_detail")}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />

            {Object.entries(grouped).map(([monthKey, monthUpdates]) => (
              <div key={monthKey} className="mb-8">
                {/* Month label */}
                <div className="flex items-center gap-3 mb-4 relative">
                  <div className="h-[7px] w-[7px] rounded-full bg-gray-400 ring-4 ring-[#F7F8FA] z-10 flex-shrink-0 ml-[8px]" />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {monthLabel(monthKey)}
                  </span>
                </div>

                {/* Updates in this month */}
                <div className="space-y-3 ml-8">
                  {monthUpdates.map((update) => {
                    const catColor =
                      CATEGORY_COLORS[update.category] ||
                      CATEGORY_COLORS.DATA_UPDATE;
                    const catLabel =
                      CATEGORY_LABELS_MAP[update.category] ||
                      CATEGORY_LABELS_MAP.DATA_UPDATE;
                    return (
                      <div
                        key={update.id}
                        className="rounded-xl bg-white border border-gray-100 px-5 py-4 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
                      >
                        {/* Top: category + jurisdiction + date */}
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${catColor}`}
                          >
                            {catLabel}
                          </span>
                          {update.jurisdiction && (
                            <Link
                              href={`/atlas/jurisdictions/${update.jurisdiction.toLowerCase()}`}
                              className="text-[10px] font-bold text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              {update.jurisdiction}
                            </Link>
                          )}
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {formatDate(update.publishedAt)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-[14px] font-semibold text-gray-900 leading-snug">
                          {update.title}
                        </h3>

                        {/* Description */}
                        <p className="text-[12px] text-gray-500 leading-relaxed mt-1.5">
                          {update.description}
                        </p>

                        {/* Source link */}
                        {update.sourceId && (
                          <Link
                            href={`/atlas/sources/${update.sourceId}`}
                            className="inline-block text-[11px] text-gray-400 hover:text-gray-700 mt-2 transition-colors"
                          >
                            {t("atlas.view_source")}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
