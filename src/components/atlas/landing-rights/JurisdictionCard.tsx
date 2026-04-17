"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LandingRightsProfile } from "@/data/landing-rights";
import { LandingRightsStatusBadge } from "./LandingRightsStatusBadge";
import { DepthBadge } from "./DepthBadge";
import { LastVerifiedStamp } from "./LastVerifiedStamp";

export function JurisdictionCard({
  profile,
}: {
  profile: LandingRightsProfile;
}) {
  const primary = profile.regulators.find((r) => r.role === "primary");
  return (
    <Link
      href={`/atlas/landing-rights/${profile.jurisdiction.toLowerCase()}`}
      className="group flex flex-col gap-3 p-5 rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <span className="text-[22px] font-bold text-gray-900">
          {profile.jurisdiction}
        </span>
        <DepthBadge depth={profile.depth} />
      </div>
      <p className="text-[13px] text-gray-600 line-clamp-3 leading-relaxed">
        {profile.overview.summary}
      </p>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-[11px] font-medium text-gray-500">
          {primary?.abbreviation ?? "—"}
        </span>
        <div className="flex items-center gap-3">
          {profile.operator_snapshots.starlink && (
            <LandingRightsStatusBadge
              status={profile.operator_snapshots.starlink.status}
            />
          )}
          <ArrowRight
            size={14}
            className="text-gray-400 group-hover:text-gray-900 transition-colors"
          />
        </div>
      </div>
      <LastVerifiedStamp date={profile.last_verified} />
    </Link>
  );
}
