"use client";

import { useState, useMemo } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";
import type { JurisdictionLaw } from "@/lib/space-law-types";
import { ChevronUp, ChevronDown, ArrowRight } from "lucide-react";

// ─── Types ───

interface JurisdictionTableProps {
  onCountryClick: (countryCode: string) => void;
}

type SortField =
  | "country"
  | "legislation"
  | "year"
  | "status"
  | "authority"
  | "liability";

type SortDirection = "asc" | "desc";

// ─── Tier ranking for default sort ───
// Champions League: comprehensive space law, well-established
// Tier 2: enacted but newer or narrower
// Tier 3: no comprehensive law / interim

function getTier(law: JurisdictionLaw): number {
  if (law.legislation.status === "none") return 3;
  if (
    law.legislation.status === "draft" ||
    law.legislation.status === "pending"
  )
    return 2;
  // Enacted — rank by maturity
  const year = law.legislation.yearEnacted;
  if (year <= 2010) return 0; // Champions League: FR, NL, BE, DE(SatDSiG)
  if (year <= 2020) return 1; // Established: UK, AT, DK, LU, NO, FI, SE, PT
  return 1; // Recent enacted: IT, ES, PL, GR, CZ
}

// ─── Status badge ───

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "enacted":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Enacted
        </span>
      );
    case "draft":
    case "pending":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {status === "draft" ? "Draft" : "Pending"}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--atlas-bg-inset)] border border-[var(--atlas-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--atlas-text-muted)] uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          None
        </span>
      );
  }
}

// ─── Liability badge ───

function LiabilityBadge({ regime }: { regime: string }) {
  const styles: Record<string, string> = {
    capped: "text-emerald-700 bg-emerald-50",
    tiered: "text-blue-700 bg-blue-50",
    negotiable: "text-amber-700 bg-amber-50",
    unlimited: "text-red-700 bg-red-50",
  };
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${styles[regime] || "text-[var(--atlas-text-secondary)] bg-[var(--atlas-bg-surface-muted)]"}`}
    >
      {regime}
    </span>
  );
}

// ─── Sort header ───

function SortHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
  className = "",
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-secondary)] transition-colors ${className}`}
    >
      {label}
      {isActive ? (
        currentDirection === "asc" ? (
          <ChevronUp className="h-3 w-3 text-[var(--atlas-text-secondary)]" />
        ) : (
          <ChevronDown className="h-3 w-3 text-[var(--atlas-text-secondary)]" />
        )
      ) : (
        <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-30" />
      )}
    </button>
  );
}

// ─── Main Component ───

export default function JurisdictionTable({
  onCountryClick,
}: JurisdictionTableProps) {
  const [sortField, setSortField] = useState<SortField>("country");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const jurisdictions = useMemo(() => {
    const entries: JurisdictionLaw[] = [];
    JURISDICTION_DATA.forEach((law) => entries.push(law));
    return entries;
  }, []);

  const sorted = useMemo(() => {
    const arr = [...jurisdictions];

    arr.sort((a, b) => {
      let cmp = 0;

      switch (sortField) {
        case "country":
          // Default sort: tier first, then alphabetical
          cmp = getTier(a) - getTier(b);
          if (cmp === 0) cmp = a.countryName.localeCompare(b.countryName);
          break;
        case "legislation":
          cmp = a.legislation.name.localeCompare(b.legislation.name);
          break;
        case "year":
          cmp =
            (a.legislation.yearEnacted || 0) - (b.legislation.yearEnacted || 0);
          break;
        case "status": {
          const statusOrder: Record<string, number> = {
            enacted: 0,
            draft: 1,
            pending: 2,
            none: 3,
          };
          cmp =
            (statusOrder[a.legislation.status] ?? 4) -
            (statusOrder[b.legislation.status] ?? 4);
          break;
        }
        case "authority":
          cmp = a.licensingAuthority.name.localeCompare(
            b.licensingAuthority.name,
          );
          break;
        case "liability": {
          const liabilityOrder: Record<string, number> = {
            capped: 0,
            tiered: 1,
            negotiable: 2,
            unlimited: 3,
          };
          cmp =
            (liabilityOrder[a.insuranceLiability.liabilityRegime] ?? 4) -
            (liabilityOrder[b.insuranceLiability.liabilityRegime] ?? 4);
          break;
        }
      }

      return sortDirection === "asc" ? cmp : -cmp;
    });

    return arr;
  }, [jurisdictions, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--atlas-border-subtle)]">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-[var(--atlas-text-secondary)] uppercase tracking-wider">
            Jurisdiction Overview
          </h3>
          <span className="text-[10px] text-[var(--atlas-text-faint)] ">
            {jurisdictions.length} tracked
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-[var(--atlas-text-faint)]">
              Enacted
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[10px] text-[var(--atlas-text-faint)]">
              Draft
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span className="text-[10px] text-[var(--atlas-text-faint)]">
              None
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-[var(--atlas-bg-surface-muted)]/95 backdrop-blur-sm z-10">
            <tr className="border-b border-[var(--atlas-border-subtle)]">
              <th className="px-4 py-2.5 w-[180px]">
                <SortHeader
                  label="Jurisdiction"
                  field="country"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-2.5">
                <SortHeader
                  label="Legislation"
                  field="legislation"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-2.5 w-[70px]">
                <SortHeader
                  label="Year"
                  field="year"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-2.5 w-[90px]">
                <SortHeader
                  label="Status"
                  field="status"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-2.5 hidden xl:table-cell">
                <SortHeader
                  label="Authority"
                  field="authority"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-2.5 w-[90px]">
                <SortHeader
                  label="Liability"
                  field="liability"
                  currentField={sortField}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                />
              </th>
              <th className="px-3 py-2.5 w-[40px]" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((law) => (
              <tr
                key={law.countryCode}
                onClick={() => onCountryClick(law.countryCode)}
                className="border-b border-gray-50 hover:bg-[var(--atlas-bg-surface-muted)]/70 cursor-pointer transition-colors group"
              >
                {/* Country */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">
                      {law.flagEmoji}
                    </span>
                    <div>
                      <div className="text-[13px] font-medium text-[var(--atlas-text-primary)] leading-tight">
                        {law.countryName}
                      </div>
                      <div className="text-[10px]  text-[var(--atlas-text-faint)]">
                        {law.countryCode}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Legislation */}
                <td className="px-3 py-2.5">
                  <span className="text-[12px] text-[var(--atlas-text-secondary)] leading-tight line-clamp-1">
                    {law.legislation.name}
                  </span>
                </td>

                {/* Year */}
                <td className="px-3 py-2.5">
                  <span className="text-[12px]  text-[var(--atlas-text-muted)]">
                    {law.legislation.yearEnacted > 0
                      ? law.legislation.yearEnacted
                      : "\u2014"}
                  </span>
                </td>

                {/* Status */}
                <td className="px-3 py-2.5">
                  <StatusBadge status={law.legislation.status} />
                </td>

                {/* Authority */}
                <td className="px-3 py-2.5 hidden xl:table-cell">
                  <span className="text-[11px] text-[var(--atlas-text-muted)] leading-tight line-clamp-1">
                    {law.licensingAuthority.name.length > 50
                      ? law.licensingAuthority.name.slice(0, 50) + "..."
                      : law.licensingAuthority.name}
                  </span>
                </td>

                {/* Liability */}
                <td className="px-3 py-2.5">
                  <LiabilityBadge
                    regime={law.insuranceLiability.liabilityRegime}
                  />
                </td>

                {/* Arrow */}
                <td className="px-3 py-2.5">
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--atlas-text-faint)] group-hover:text-emerald-500 transition-colors" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
