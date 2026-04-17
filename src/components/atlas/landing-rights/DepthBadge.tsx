"use client";

import type { CoverageDepth } from "@/data/landing-rights";
import { useLanguage } from "@/components/providers/LanguageProvider";

const DEPTH_STYLES: Record<CoverageDepth, string> = {
  deep: "bg-emerald-50 text-emerald-700 border-emerald-200",
  standard: "bg-gray-50 text-gray-700 border-gray-200",
  stub: "bg-amber-50 text-amber-800 border-amber-200",
};

export function DepthBadge({ depth }: { depth: CoverageDepth }) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-medium uppercase tracking-wider ${DEPTH_STYLES[depth]}`}
      title={
        depth === "stub" ? t("atlas.landing_rights_depth_stub_note") : undefined
      }
    >
      {t(`atlas.landing_rights_depth_${depth}`)}
    </span>
  );
}
