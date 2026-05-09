"use client";

/**
 * Atlas Lawyer-UX-Audit F-LAND-3 — Conduct Conditions browse UI.
 *
 * The /atlas/landing-rights/conduct page already mounts this table, but
 * before this refactor it dumped the full ALL_CONDUCT_CONDITIONS list
 * with no filters — Marie scrolled through 50+ rows to find the
 * data-localization rule for India. Now the table is a client island
 * with three filters that match the same vocabulary as the cases-list
 * (jurisdiction, type, search) so users learn one filter pattern and
 * apply it across surfaces.
 *
 * The table itself is unchanged — same columns, same density. The
 * filter bar lives above it, and an empty-state message renders when
 * the filters select zero rows.
 */

import { useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import {
  ALL_CONDUCT_CONDITIONS,
  type ConductCondition,
  type ConductType,
} from "@/data/landing-rights";

const TYPE_LABEL: Record<ConductType, string> = {
  data_localization: "Data localisation",
  lawful_intercept: "Lawful intercept",
  geo_fencing: "Geo-fencing",
  indigenization: "Indigenisation",
  suspension_capability: "Suspension capability",
  local_content: "Local content",
  other: "Other",
};

/* Render order — most-frequently-asked-about types first, "other" last
   so the menu reads as a frequency-ranked decision tree rather than
   alphabetic noise. */
const TYPE_ORDER: ConductType[] = [
  "data_localization",
  "lawful_intercept",
  "geo_fencing",
  "indigenization",
  "suspension_capability",
  "local_content",
  "other",
];

export function ConductTable() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ConductType | "all">("all");
  const [jurisdiction, setJurisdiction] = useState<string>("all");

  /* Pre-compute jurisdictions and per-type counts once. The dataset is
     module-loaded constant, so memoization here is purely for stable
     reference equality (no perf gain). */
  const allJurisdictions = useMemo(() => {
    const set = new Set<string>(
      ALL_CONDUCT_CONDITIONS.map((c) => c.jurisdiction),
    );
    return Array.from(set).sort();
  }, []);

  const typeCounts = useMemo(() => {
    const counts: Record<ConductType, number> = {
      data_localization: 0,
      lawful_intercept: 0,
      geo_fencing: 0,
      indigenization: 0,
      suspension_capability: 0,
      local_content: 0,
      other: 0,
    };
    for (const c of ALL_CONDUCT_CONDITIONS) counts[c.type] += 1;
    return counts;
  }, []);

  const filtered: ConductCondition[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_CONDUCT_CONDITIONS.filter((c) => {
      if (type !== "all" && c.type !== type) return false;
      if (jurisdiction !== "all" && c.jurisdiction !== jurisdiction)
        return false;
      if (!q) return true;
      const haystack = [c.title, c.requirement, c.id, c.jurisdiction, c.type]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    }).sort((a, b) => {
      // Group by jurisdiction first (matches the natural reading
      // order); within a jurisdiction, alphabetic by title.
      if (a.jurisdiction !== b.jurisdiction)
        return a.jurisdiction.localeCompare(b.jurisdiction);
      return a.title.localeCompare(b.title);
    });
  }, [query, type, jurisdiction]);

  const hasFilter =
    query.trim().length > 0 || type !== "all" || jurisdiction !== "all";

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar — same shape and behavior as the /atlas/cases bar
          shipped in bundle 4 + 5, so the user only learns one filter
          vocabulary across the platform. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 shadow-sm flex-1 min-w-[240px] max-w-md">
          <Search
            className="h-3.5 w-3.5 text-[var(--atlas-text-faint)] flex-shrink-0"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, requirement, jurisdiction…"
            aria-label="Search conduct conditions"
            className="bg-transparent text-[12px] text-[var(--atlas-text-primary)] flex-1 outline-none placeholder:text-[var(--atlas-text-faint)]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-[var(--atlas-text-faint)] hover:text-[var(--atlas-text-primary)]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value as ConductType | "all")}
          aria-label="Filter by condition type"
          className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] shadow-sm outline-none cursor-pointer"
        >
          <option value="all">All types</option>
          {TYPE_ORDER.filter((tt) => typeCounts[tt] > 0).map((tt) => (
            <option key={tt} value={tt}>
              {TYPE_LABEL[tt]} ({typeCounts[tt]})
            </option>
          ))}
        </select>

        <select
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
          aria-label="Filter by jurisdiction"
          className="rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[12px] text-[var(--atlas-text-primary)] shadow-sm outline-none cursor-pointer"
        >
          <option value="all">All jurisdictions</option>
          {allJurisdictions.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>

        {hasFilter && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setType("all");
              setJurisdiction("all");
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-primary)]"
          >
            <Filter className="h-3 w-3" strokeWidth={1.5} />
            Reset filters
          </button>
        )}

        <span className="ml-auto text-[11px] text-[var(--atlas-text-faint)]">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
          {hasFilter && (
            <span className="ml-1 text-[var(--atlas-text-faint)]">
              of {ALL_CONDUCT_CONDITIONS.length}
            </span>
          )}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--atlas-border-subtle)] bg-[var(--atlas-bg-surface)] px-4 py-12 text-center text-[12px] text-[var(--atlas-text-muted)]">
          No conduct conditions match the current filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)]">
          <table className="min-w-full text-[13px]">
            <thead className="bg-[var(--atlas-bg-surface-muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
                  Jurisdiction
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
                  Title
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
                  Requirement
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[var(--atlas-text-secondary)]">
                  Applies to
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-[var(--atlas-border-subtle)] align-top hover:bg-[var(--atlas-bg-surface-muted)]"
                >
                  <td className="px-4 py-3 font-semibold text-[var(--atlas-text-primary)]">
                    {c.jurisdiction}
                  </td>
                  <td className="px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--atlas-text-secondary)]">
                    {TYPE_LABEL[c.type]}
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--atlas-text-primary)]">
                    {c.title}
                  </td>
                  <td className="px-4 py-3 text-[var(--atlas-text-secondary)] leading-relaxed max-w-md">
                    {c.requirement}
                  </td>
                  <td className="px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--atlas-text-muted)]">
                    {c.applies_to.replace("_", " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
