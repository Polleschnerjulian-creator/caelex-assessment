import Link from "next/link";
import { Map, ArrowRight } from "lucide-react";
import {
  ALL_SOURCES,
  ALL_AUTHORITIES,
  getLegalSourcesByJurisdiction,
  getAvailableJurisdictions,
} from "@/data/legal-sources";
import { JURISDICTION_DATA } from "@/data/national-space-laws";

/**
 * /atlas/coverage — data-driven inventory of what Atlas currently
 * indexes. All figures and rows are computed from the legal-source
 * barrel and the national-space-law map at build time. No hardcoded
 * counts, no roadmap rows, no editorial commentary.
 */

export const metadata = {
  title: "Coverage — Atlas",
  description:
    "Inventory of jurisdictions, legal sources, and competent authorities currently indexed in Atlas.",
};

interface JurisdictionEntry {
  code: string;
  name: string;
  sourceCount: number;
  hasSpaceAct: boolean;
}

function buildRows(): JurisdictionEntry[] {
  const tracked = new Set(getAvailableJurisdictions());
  const rows: JurisdictionEntry[] = [];
  for (const [code, data] of JURISDICTION_DATA) {
    if (!tracked.has(code)) continue;
    const sources = getLegalSourcesByJurisdiction(code);
    rows.push({
      code,
      name: data.countryName,
      sourceCount: sources.length,
      hasSpaceAct:
        data.legislation.status === "enacted" &&
        data.legislation.yearEnacted > 0,
    });
  }
  return rows.sort(
    (a, b) => b.sourceCount - a.sourceCount || a.name.localeCompare(b.name),
  );
}

function supranationalInstruments() {
  // INT = international instruments (UN treaties, COPUOS, ITU).
  // EU = EU-level regulations and directives.
  return ALL_SOURCES.filter(
    (s) => s.jurisdiction === "INT" || s.jurisdiction === "EU",
  ).sort((a, b) => {
    const dateA = a.date_enacted ?? a.date_in_force ?? "";
    const dateB = b.date_enacted ?? b.date_in_force ?? "";
    return dateB.localeCompare(dateA);
  });
}

export default function CoveragePage() {
  const rows = buildRows();
  const supra = supranationalInstruments();
  const nationalSourceCount = ALL_SOURCES.filter(
    (s) => s.jurisdiction !== "INT" && s.jurisdiction !== "EU",
  ).length;
  const intlCount = ALL_SOURCES.filter((s) => s.jurisdiction === "INT").length;
  const euCount = ALL_SOURCES.filter((s) => s.jurisdiction === "EU").length;
  const authorityCount = ALL_AUTHORITIES.length;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-3">
      <header className="flex items-center gap-3">
        <Map className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
        <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
          Coverage
        </h1>
        <span className="text-[11px] text-[var(--atlas-text-faint)]">
          Indexed at build time
        </span>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Jurisdictions" value={rows.length} />
        <Stat label="National sources" value={nationalSourceCount} />
        <Stat label="EU instruments" value={euCount} />
        <Stat label="International instruments" value={intlCount} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Competent authorities" value={authorityCount} />
        <Stat
          label="Jurisdictions with enacted space act"
          value={rows.filter((r) => r.hasSpaceAct).length}
        />
      </div>

      {/* National jurisdictions */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--atlas-border-subtle)]">
          <h2 className="text-[12px] font-semibold tracking-wider text-[var(--atlas-text-secondary)] uppercase">
            National jurisdictions
          </h2>
          <span className="text-[11px] text-[var(--atlas-text-muted)]">
            {rows.length} indexed
          </span>
        </div>
        <div className="divide-y divide-[var(--atlas-border-subtle)]">
          {rows.map((row) => (
            <Link
              key={row.code}
              href={`/atlas/jurisdictions/${row.code.toLowerCase()}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-[10px] font-mono text-[var(--atlas-text-faint)] w-8 flex-shrink-0">
                  {row.code}
                </span>
                <span className="text-[13px] font-medium text-[var(--atlas-text-primary)] truncate">
                  {row.name}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[11px] text-[var(--atlas-text-muted)]">
                  {row.sourceCount} source{row.sourceCount === 1 ? "" : "s"}
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 text-[var(--atlas-text-faint)]"
                  strokeWidth={1.5}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Supranational instruments */}
      <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--atlas-border-subtle)]">
          <h2 className="text-[12px] font-semibold tracking-wider text-[var(--atlas-text-secondary)] uppercase">
            Supranational instruments
          </h2>
          <span className="text-[11px] text-[var(--atlas-text-muted)]">
            {supra.length} indexed
          </span>
        </div>
        <div className="divide-y divide-[var(--atlas-border-subtle)]">
          {supra.map((s) => (
            <Link
              key={s.id}
              href={`/atlas/sources/${s.id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[var(--atlas-bg-surface-muted)] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[var(--atlas-text-faint)] w-8 flex-shrink-0">
                    {s.jurisdiction}
                  </span>
                  <span className="text-[13px] font-medium text-[var(--atlas-text-primary)] truncate">
                    {s.title_en}
                  </span>
                </div>
                {s.official_reference && (
                  <span className="text-[10px] text-[var(--atlas-text-faint)] ml-10">
                    {s.official_reference}
                  </span>
                )}
              </div>
              <ArrowRight
                className="h-3.5 w-3.5 text-[var(--atlas-text-faint)] flex-shrink-0"
                strokeWidth={1.5}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] p-3">
      <div className="text-[9px] font-semibold tracking-wider text-[var(--atlas-text-muted)] uppercase mb-1">
        {label}
      </div>
      <div className="text-[18px] font-semibold text-[var(--atlas-text-primary)] leading-tight">
        {value}
      </div>
    </div>
  );
}
