import Link from "next/link";
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import {
  ALL_LANDING_RIGHTS_PROFILES,
  ALL_CASE_STUDIES,
  ALL_CONDUCT_CONDITIONS,
  ALL_DEEP_DIVES,
  OPERATOR_MATRIX,
  type LandingRightsProfile,
  type CoverageDepth,
  type OperatorStatus,
  type RegimeType,
} from "@/data/landing-rights";
import {
  getNextDeadline,
  formatDaysUntil,
} from "@/data/landing-rights/calendar";
import { LandingRightsFilters } from "@/components/atlas/landing-rights/LandingRightsFilters";
import { LandingRightsList } from "@/components/atlas/landing-rights/LandingRightsList";

const EU_CODES = new Set([
  "DE",
  "FR",
  "UK",
  "IT",
  "LU",
  "NL",
  "BE",
  "ES",
  "NO",
  "SE",
  "FI",
  "DK",
  "AT",
  "CH",
  "PT",
  "IE",
  "GR",
  "CZ",
  "PL",
]);

type SearchParams = {
  region?: string;
  regime?: string;
  depth?: string;
  starlink?: string;
  kuiper?: string;
  oneweb?: string;
  security_review?: string;
  foreign_cap?: string;
};

function filterProfiles(
  all: LandingRightsProfile[],
  sp: SearchParams,
): LandingRightsProfile[] {
  return all.filter((p) => {
    if (sp.region === "eu" && !EU_CODES.has(p.jurisdiction)) return false;
    if (sp.region === "non-eu" && EU_CODES.has(p.jurisdiction)) return false;
    if (sp.regime && sp.regime !== "all") {
      if (p.overview.regime_type !== (sp.regime as RegimeType)) return false;
    }
    if (sp.depth && sp.depth !== "all") {
      if (p.depth !== (sp.depth as CoverageDepth)) return false;
    }
    if (sp.starlink && sp.starlink !== "all") {
      const s = p.operator_snapshots.starlink?.status;
      if (s !== (sp.starlink as OperatorStatus)) return false;
    }
    if (sp.kuiper && sp.kuiper !== "all") {
      const s = p.operator_snapshots.kuiper?.status;
      if (s !== (sp.kuiper as OperatorStatus)) return false;
    }
    if (sp.oneweb && sp.oneweb !== "all") {
      const s = p.operator_snapshots.oneweb?.status;
      if (s !== (sp.oneweb as OperatorStatus)) return false;
    }
    if (sp.security_review === "yes" && !p.security_review.required)
      return false;
    if (sp.security_review === "no" && p.security_review.required) return false;
    const hasCap =
      p.foreign_ownership.cap_percent !== null &&
      p.foreign_ownership.cap_percent !== undefined;
    if (sp.foreign_cap === "yes" && !hasCap) return false;
    if (sp.foreign_cap === "no" && hasCap) return false;
    return true;
  });
}

export const metadata = {
  title: "Landing Rights — Atlas",
  description:
    "National authorisations for satellite market access across 29 jurisdictions × 4 regulatory categories.",
};

export default async function LandingRightsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filtered = filterProfiles(ALL_LANDING_RIGHTS_PROFILES, params);

  const deepCount = ALL_LANDING_RIGHTS_PROFILES.filter(
    (p) => p.depth === "deep",
  ).length;
  const standardCount = ALL_LANDING_RIGHTS_PROFILES.filter(
    (p) => p.depth === "standard",
  ).length;
  const nextDeadline = getNextDeadline();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-[32px] font-light tracking-tight text-gray-900">
            Landing Rights
          </h1>
          <p className="mt-1 text-[13px] text-gray-600 max-w-2xl">
            National authorisations for satellite market access across{" "}
            {ALL_LANDING_RIGHTS_PROFILES.length} jurisdictions × 4 regulatory
            categories (market access, ITU coordination, earth station,
            re-entry).
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            label="Jurisdictions"
            value={ALL_LANDING_RIGHTS_PROFILES.length}
            sublabel={`${deepCount} deep · ${standardCount} standard`}
          />
          <StatCard
            label="Deep-dives"
            value={ALL_DEEP_DIVES.length}
            sublabel="across 4 categories"
          />
          <StatCard
            label="Case studies"
            value={ALL_CASE_STUDIES.length}
            sublabel="precedent narratives"
          />
          <StatCard
            label="Conduct conditions"
            value={ALL_CONDUCT_CONDITIONS.length}
            sublabel="non-fee obligations"
          />
          <StatCard
            label="Operators tracked"
            value={OPERATOR_MATRIX.length}
            sublabel="status matrix"
          />
        </div>
        {nextDeadline && (
          <Link
            href="/atlas/landing-rights/calendar"
            className="group flex items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white px-5 py-3 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CalendarIcon size={16} className="text-emerald-400" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-emerald-400/80">
                  Next deadline
                </span>
                <p className="text-[13px] font-medium truncate">
                  {nextDeadline.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[11px] text-gray-300">
                {formatDaysUntil(nextDeadline.date)}
              </span>
              <ArrowRight
                size={14}
                className="text-gray-400 group-hover:translate-x-0.5 transition-transform"
              />
            </div>
          </Link>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <LandingRightsFilters />
        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[14px] font-semibold text-gray-900">
              {filtered.length === ALL_LANDING_RIGHTS_PROFILES.length
                ? "All jurisdictions"
                : "Filtered results"}
            </h2>
            <span className="text-[11px] text-gray-500">
              {filtered.length} / {ALL_LANDING_RIGHTS_PROFILES.length}{" "}
              jurisdictions
            </span>
          </div>
          <LandingRightsList profiles={filtered} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-white border border-gray-100">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <span className="text-[24px] font-bold text-gray-900 leading-none">
        {value}
      </span>
      {sublabel && (
        <span className="text-[10px] text-gray-400 mt-0.5">{sublabel}</span>
      )}
    </div>
  );
}
