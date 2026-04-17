import {
  ALL_LANDING_RIGHTS_PROFILES,
  type LandingRightsProfile,
  type CoverageDepth,
} from "@/data/landing-rights";
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

function filterProfiles(
  all: LandingRightsProfile[],
  region: string | undefined,
  depth: string | undefined,
): LandingRightsProfile[] {
  return all.filter((p) => {
    if (region === "eu" && !EU_CODES.has(p.jurisdiction)) return false;
    if (region === "non-eu" && EU_CODES.has(p.jurisdiction)) return false;
    if (depth && depth !== "all" && p.depth !== (depth as CoverageDepth))
      return false;
    return true;
  });
}

export const metadata = {
  title: "Landing Rights — Atlas",
};

export default async function LandingRightsPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; depth?: string }>;
}) {
  const params = await searchParams;
  const filtered = filterProfiles(
    ALL_LANDING_RIGHTS_PROFILES,
    params.region,
    params.depth,
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      <LandingRightsFilters />
      <div>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-[28px] font-light tracking-tight text-gray-900">
            Landing Rights
          </h1>
          <span className="text-[11px] text-gray-500">
            {filtered.length} / {ALL_LANDING_RIGHTS_PROFILES.length}{" "}
            jurisdictions
          </span>
        </div>
        <LandingRightsList profiles={filtered} />
      </div>
    </div>
  );
}
