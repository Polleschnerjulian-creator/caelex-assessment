"use client";

import { useRouter } from "next/navigation";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import {
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
  getAvailableJurisdictions,
  getTranslatedAuthority,
} from "@/data/legal-sources";
import { useLanguage } from "@/components/providers/LanguageProvider";

// ─── Build jurisdiction rows from real data ─────────────────────────

const JURISDICTIONS_WITH_SOURCES = new Set(getAvailableJurisdictions());

interface JurisdictionRow {
  code: string;
  country: string;
  legislation: string;
  year: number;
  status: "enacted" | "draft" | "pending" | "none";
  authority: string;
  sourceCount: number;
  group: "sources" | "enacted" | "none";
}

function buildRows(): JurisdictionRow[] {
  const rows: JurisdictionRow[] = [];

  for (const [code, data] of JURISDICTION_DATA) {
    const hasSources = JURISDICTIONS_WITH_SOURCES.has(code);
    const sourceCount = hasSources
      ? getLegalSourcesByJurisdiction(code).length
      : 0;
    const authorities = getAuthoritiesByJurisdiction(code);

    let group: JurisdictionRow["group"];
    if (hasSources) {
      group = "sources";
    } else if (data.legislation.status === "enacted") {
      group = "enacted";
    } else {
      group = "none";
    }

    rows.push({
      code,
      country: data.countryName,
      legislation: data.legislation.name,
      year: data.legislation.yearEnacted,
      status: data.legislation.status,
      authority:
        authorities.length > 0
          ? authorities[0].name
          : data.licensingAuthority.name,
      sourceCount,
      group,
    });
  }

  return rows;
}

const ALL_ROWS = buildRows();

const GROUP_ORDER: JurisdictionRow["group"][] = ["sources", "enacted", "none"];

const GROUP_LABELS: Record<JurisdictionRow["group"], string> = {
  sources: "With Legal Sources",
  enacted: "Enacted Legislation",
  none: "No Comprehensive Law",
};

function groupAndSort(rows: JurisdictionRow[]) {
  return GROUP_ORDER.map((groupKey) => ({
    key: groupKey,
    label: GROUP_LABELS[groupKey],
    rows: rows
      .filter((r) => r.group === groupKey)
      .sort((a, b) => a.country.localeCompare(b.country)),
  })).filter((g) => g.rows.length > 0);
}

const GROUPED = groupAndSort(ALL_ROWS);

// ─── Status badge ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: JurisdictionRow["status"] }) {
  if (status === "enacted") {
    return (
      <span className="inline-block text-[10px] font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded tracking-wide">
        Enacted
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-block text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded tracking-wide">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-block text-[10px] font-medium text-gray-500 tracking-wide">
      None
    </span>
  );
}

// ─── Table header ───────────────────────────────────────────────────

const COLUMNS = [
  { key: "code", label: "Code", width: "w-[60px]" },
  { key: "country", label: "Country", width: "w-[140px]" },
  { key: "legislation", label: "Legislation", width: "flex-1 min-w-[200px]" },
  { key: "year", label: "Year", width: "w-[60px]" },
  { key: "status", label: "Status", width: "w-[80px]" },
  { key: "authority", label: "Authority", width: "flex-1 min-w-[160px]" },
  { key: "sources", label: "Sources", width: "w-[64px]" },
  { key: "arrow", label: "", width: "w-[32px]" },
] as const;

// ─── Page ───────────────────────────────────────────────────────────

export default function JurisdictionsPage() {
  const router = useRouter();
  const { language } = useLanguage();

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F7F8FA] p-4 gap-4">
      {/* Header */}
      <header className="flex items-center gap-3">
        <h1 className="text-[18px] font-semibold tracking-tight text-gray-900">
          Jurisdictions
        </h1>
        <span className="text-[11px] font-mono text-gray-500">
          {ALL_ROWS.length} tracked
        </span>
      </header>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-0 px-4 py-2.5 border-b border-gray-100">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className={`${col.width} text-[10px] text-gray-500 uppercase tracking-[0.15em] font-medium ${
                col.key === "sources" || col.key === "year" ? "text-right" : ""
              } ${col.key === "arrow" ? "" : ""}`}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Groups */}
        {GROUPED.map((group) => (
          <div key={group.key}>
            {/* Group label */}
            <div className="px-4 py-2 bg-[#F7F8FA] border-b border-gray-100">
              <span className="text-[10px] font-semibold tracking-[0.15em] text-gray-500 uppercase">
                {group.label}
              </span>
              <span className="text-[10px] font-mono text-gray-500 ml-2">
                {group.rows.length}
              </span>
            </div>

            {/* Rows */}
            {group.rows.map((row) => (
              <div
                key={row.code}
                role="button"
                tabIndex={0}
                onClick={() =>
                  router.push(`/atlas/jurisdictions/${row.code.toLowerCase()}`)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(
                      `/atlas/jurisdictions/${row.code.toLowerCase()}`,
                    );
                  }
                }}
                className="flex items-center gap-0 px-4 py-2.5 border-b border-gray-100 cursor-pointer transition-all duration-150 hover:bg-white hover:shadow-[0_1px_4px_rgba(0,0,0,0.06)] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
              >
                {/* Code */}
                <div className="w-[60px]">
                  <span className="text-[13px] font-mono font-bold text-gray-900 tracking-wider">
                    {row.code}
                  </span>
                </div>

                {/* Country */}
                <div className="w-[140px]">
                  <span className="text-[13px] text-gray-900">
                    {row.country}
                  </span>
                </div>

                {/* Legislation */}
                <div className="flex-1 min-w-[200px] pr-3">
                  <span className="text-[13px] text-gray-600 truncate block">
                    {row.legislation}
                  </span>
                </div>

                {/* Year */}
                <div className="w-[60px] text-right">
                  <span className="text-[13px] font-mono text-gray-900">
                    {row.year > 0 ? row.year : "\u2014"}
                  </span>
                </div>

                {/* Status */}
                <div className="w-[80px] flex justify-center">
                  <StatusBadge status={row.status} />
                </div>

                {/* Authority */}
                <div className="flex-1 min-w-[160px] pr-3">
                  <span className="text-[13px] text-gray-600 truncate block">
                    {row.authority}
                  </span>
                </div>

                {/* Sources */}
                <div className="w-[64px] text-right">
                  <span className="text-[13px] font-mono text-gray-900">
                    {row.sourceCount > 0 ? row.sourceCount : "\u2014"}
                  </span>
                </div>

                {/* Arrow */}
                <div className="w-[32px] flex justify-end">
                  <span
                    className="text-gray-500 text-[13px]"
                    aria-hidden="true"
                  >
                    &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
