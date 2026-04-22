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
      className="group flex flex-col gap-3 p-5 rounded-xl bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border-subtle)] hover:border-[var(--atlas-border-strong)] hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-[26px] font-bold text-[var(--atlas-text-primary)] leading-none">
            {profile.jurisdiction}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--atlas-text-faint)]">
            {REGIME_LABELS[profile.overview.regime_type] ??
              profile.overview.regime_type}
          </span>
        </div>
        <DepthBadge depth={profile.depth} />
      </div>

      <p className="text-[12px] text-[var(--atlas-text-secondary)] line-clamp-3 leading-relaxed">
        {profile.overview.summary}
      </p>

      <div className="flex flex-wrap gap-3 text-[10px] text-[var(--atlas-text-muted)]">
        <span className="inline-flex items-center gap-1">
          <Clock size={10} className="text-[var(--atlas-text-faint)]" />
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

      <div className="flex items-center justify-between pt-3 border-t border-[var(--atlas-border-subtle)]">
        <span className="text-[11px] font-semibold text-[var(--atlas-text-secondary)]">
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
            className="text-[var(--atlas-text-faint)] group-hover:text-[var(--atlas-text-primary)] group-hover:translate-x-0.5 transition-all"
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
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--atlas-text-secondary)]"
    >
      <span className="text-[9px] text-[var(--atlas-text-faint)]">{label}</span>
      <LandingRightsStatusBadge status={(status ?? "not_entered") as never} />
    </span>
  );
}
