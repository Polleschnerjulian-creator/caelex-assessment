"use client";

import Link from "next/link";
import { ArrowRight, Clock, Shield } from "lucide-react";
import type { LandingRightsProfile } from "@/data/landing-rights";
import { LandingRightsStatusBadge } from "./LandingRightsStatusBadge";
import { DepthBadge } from "./DepthBadge";
import { LastVerifiedStamp } from "./LastVerifiedStamp";

const REGIME_LABELS: Record<string, string> = {
  two_track: "Two-track",
  telecoms_only: "Telecoms-only",
  space_act_only: "Space-act only",
  emerging: "Emerging",
};

export function JurisdictionCard({
  profile,
}: {
  profile: LandingRightsProfile;
}) {
  const primary = profile.regulators.find((r) => r.role === "primary");
  const { min: tMin, max: tMax } = profile.timeline.typical_duration_months;
  const foreignCap = profile.foreign_ownership.cap_percent;
  return (
    <Link
      href={`/atlas/landing-rights/${profile.jurisdiction.toLowerCase()}`}
      className="group flex flex-col gap-3 p-5 rounded-xl bg-white border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-[26px] font-bold text-gray-900 leading-none">
            {profile.jurisdiction}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
            {REGIME_LABELS[profile.overview.regime_type] ??
              profile.overview.regime_type}
          </span>
        </div>
        <DepthBadge depth={profile.depth} />
      </div>

      <p className="text-[12px] text-gray-600 line-clamp-3 leading-relaxed">
        {profile.overview.summary}
      </p>

      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
        <span className="inline-flex items-center gap-1">
          <Clock size={10} className="text-gray-400" />
          {tMin}–{tMax} mo
        </span>
        {profile.security_review.required && (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <Shield size={10} />
            Security review
          </span>
        )}
        {foreignCap != null && foreignCap !== undefined && (
          <span className="inline-flex items-center gap-1">
            Foreign cap {foreignCap}%
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-[11px] font-semibold text-gray-700">
          {primary?.abbreviation ?? "—"}
        </span>
        <div className="flex items-center gap-2">
          <OperatorDot
            label="S"
            title={`Starlink: ${profile.operator_snapshots.starlink?.status ?? "not entered"}`}
            status={profile.operator_snapshots.starlink?.status}
          />
          <OperatorDot
            label="K"
            title={`Kuiper: ${profile.operator_snapshots.kuiper?.status ?? "not entered"}`}
            status={profile.operator_snapshots.kuiper?.status}
          />
          <OperatorDot
            label="O"
            title={`OneWeb: ${profile.operator_snapshots.oneweb?.status ?? "not entered"}`}
            status={profile.operator_snapshots.oneweb?.status}
          />
          <ArrowRight
            size={14}
            className="text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </div>

      <LastVerifiedStamp date={profile.last_verified} />
    </Link>
  );
}

function OperatorDot({
  label,
  title,
  status,
}: {
  label: string;
  title: string;
  status: string | undefined;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600"
    >
      <span className="text-[9px] text-gray-400">{label}</span>
      <LandingRightsStatusBadge status={(status ?? "not_entered") as never} />
    </span>
  );
}
