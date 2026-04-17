"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export function LandingRightsDisclaimer() {
  const { t } = useLanguage();
  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3">
      <p className="text-[11px] leading-relaxed text-amber-900">
        <span className="font-semibold uppercase tracking-wider">
          {t("atlas.disclaimer_no_legal_advice")}.
        </span>{" "}
        {t("atlas.landing_rights_disclaimer_extra")}
      </p>
    </div>
  );
}
