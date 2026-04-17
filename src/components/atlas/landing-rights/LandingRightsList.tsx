import type { LandingRightsProfile } from "@/data/landing-rights";
import { JurisdictionCard } from "./JurisdictionCard";

export function LandingRightsList({
  profiles,
}: {
  profiles: LandingRightsProfile[];
}) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-xl bg-white border border-gray-100 p-12 text-center text-gray-500">
        No jurisdictions match the current filters.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {profiles.map((p) => (
        <JurisdictionCard key={p.jurisdiction} profile={p} />
      ))}
    </div>
  );
}
