"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function LastVerifiedStamp({ date }: { date: string }) {
  const { t } = useLanguage();
  const age = daysSince(date);
  const color =
    age > 180 ? "text-red-600" : age > 90 ? "text-amber-600" : "text-gray-500";
  return (
    <span className={`text-[10px] font-medium ${color}`}>
      {t("atlas.landing_rights_last_verified")}: {date}
    </span>
  );
}
