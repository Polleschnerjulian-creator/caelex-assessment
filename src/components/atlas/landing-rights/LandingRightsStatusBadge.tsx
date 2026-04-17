"use client";

import type { OperatorStatus } from "@/data/landing-rights";
import { useLanguage } from "@/components/providers/LanguageProvider";

const STATUS_COLORS: Record<OperatorStatus, string> = {
  licensed: "bg-emerald-500",
  pending: "bg-amber-500",
  denied: "bg-red-500",
  sector_limited: "bg-blue-500",
  not_entered: "bg-gray-300",
  unknown: "bg-gray-200",
};

export function LandingRightsStatusBadge({
  status,
  label,
}: {
  status: OperatorStatus;
  label?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        role="img"
        className={`h-2 w-2 rounded-full flex-shrink-0 ${STATUS_COLORS[status]}`}
        aria-label={t(`atlas.landing_rights_status_${status}`)}
      />
      {label && (
        <span className="text-[11px] text-gray-600">
          {t(`atlas.landing_rights_status_${status}`)}
        </span>
      )}
    </span>
  );
}
