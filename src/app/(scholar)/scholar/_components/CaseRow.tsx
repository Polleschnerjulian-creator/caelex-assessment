/**
 * CaseRow — shared row component for case law results.
 *
 * Presentational only: no hooks, no data imports.
 * Works in both server components and the client search page.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 * Type sizes come from the shared SCHOLAR_TYPE tokens (existing
 * tailwind.config.ts semantic scale) — never ad-hoc text-[Npx].
 * Status is rendered by the neutral <StatusPill> primitive.
 *
 * OVERLAP FIX: forum label is in a fixed-width `w-28 shrink-0` column,
 * title is in `flex-1 min-w-0` — they are structurally separated and
 * can never overlap regardless of content length or viewport width.
 *
 * WCAG 2.5.8: py-3.5 gives ≥44px height ✓
 * WCAG 2.4.7: focus-visible ring on the Link ✓
 * WCAG 1.4.3: gray-900 on white ≈ 15:1 ✓; gray-700 ≈ 8:1 ✓; gray-600 ≈ 5.7:1 ✓
 */

import Link from "next/link";

import { DEFAULT_SCHOLAR_LOCALE, t, type ScholarLocale } from "../_i18n/core";
import { SOURCE } from "../_i18n/source";
import { Eyebrow } from "./Eyebrow";
import { SCHOLAR_TYPE } from "./scholar-type";
import { StatusPill } from "./StatusPill";

// ─── Forum-type → SOURCE-namespace label key ────────────────────────
const FORUM_TYPE_KEYS: Record<string, keyof (typeof SOURCE)["en"]> = {
  court: "forumCourt",
  regulator_order: "forumRegulatorOrder",
  regulator_settlement: "forumRegulatorSettlement",
  criminal_settlement: "forumCriminalSettlement",
  civil_settlement: "forumCivilSettlement",
  treaty_award: "forumTreatyAward",
  administrative_appeal: "forumAdministrativeAppeal",
  arbitral_award: "forumArbitralAward",
};

export interface CaseRowData {
  id: string;
  jurisdiction: string;
  forum: string;
  forum_name: string;
  title: string;
  plaintiff: string;
  defendant: string;
  date_decided: string;
  status: string;
}

interface CaseRowProps {
  c: CaseRowData;
  locale?: ScholarLocale;
}

export function CaseRow({ c, locale = DEFAULT_SCHOLAR_LOCALE }: CaseRowProps) {
  const forumKey = FORUM_TYPE_KEYS[c.forum];
  const forumLabel = forumKey ? t(locale, SOURCE, forumKey) : c.forum;

  return (
    <Link
      href={"/scholar/cases/" + encodeURIComponent(c.id)}
      className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-white border border-transparent hover:border-gray-200/70 hover:shadow-sm motion-safe:transition-all motion-safe:duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
    >
      {/*
        OVERLAP FIX: fixed width + shrink-0 means this column NEVER grows
        into the title column. truncate prevents long labels from spilling.
      */}
      <Eyebrow className="w-28 shrink-0 truncate">{forumLabel}</Eyebrow>

      {/*
        flex-1 + min-w-0 ensures this column absorbs all available space
        but never overflows — truncate clips long titles cleanly.
      */}
      <div className="flex-1 min-w-0">
        <span
          className={`block truncate font-medium group-hover:text-black motion-safe:transition-colors ${SCHOLAR_TYPE.body}`}
        >
          {c.title}
        </span>
        <span className={`block truncate ${SCHOLAR_TYPE.meta}`}>
          {c.plaintiff} v. {c.defendant} · {c.forum_name}
        </span>
      </div>

      {/* Date */}
      <span
        className={`shrink-0 tabular-nums whitespace-nowrap ${SCHOLAR_TYPE.meta}`}
      >
        {c.date_decided}
      </span>

      {/* Status */}
      <StatusPill status={c.status} className="shrink-0" locale={locale} />

      {/* Jurisdiction */}
      <span className={`shrink-0 w-8 text-right ${SCHOLAR_TYPE.metaLabel}`}>
        {c.jurisdiction}
      </span>
    </Link>
  );
}
