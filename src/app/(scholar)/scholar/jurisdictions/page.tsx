/**
 * /scholar/jurisdictions — Browse all jurisdictions in the corpus.
 *
 * Server Component — reads corpus server-side; zero corpus bytes reach
 * the client bundle.
 *
 * WCAG 2.2 AA:
 *   - <main> landmark provided by ScholarPage; real <h1> via PageHeader
 *   - Card links have visible focus ring (focus-visible:ring-2)
 *   - Text contrast: gray-700 on white ≥7.4:1 ✓; gray-600 on white ≥5.7:1 ✓
 *   - Interactive targets ≥44px (card min-h-[72px] ✓)
 *   - lang="de" on root element (ScholarPage)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { Globe2 } from "lucide-react";
import {
  getAvailableJurisdictions,
  getLegalSourceStats,
} from "@/data/legal-sources";
import { getCountryName } from "@/data/iso-3166-countries";
import { auth } from "@/lib/auth";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";
import { getScholarLocale } from "../_i18n/locale.server";
import { t, type ScholarLocale } from "../_i18n/core";
import { COMMON } from "../_i18n/common";
import { BROWSE } from "../_i18n/browse";

// Special jurisdiction display names not in ISO-3166 — localised via BROWSE.
function getJurisdictionLabel(code: string, locale: ScholarLocale): string {
  if (code === "INT") return t(locale, BROWSE, "jurisdictionINT");
  if (code === "EU") return t(locale, BROWSE, "jurisdictionEU");
  return getCountryName(code);
}

export default async function JurisdictionsPage() {
  const session = await auth();
  const locale = await getScholarLocale(session?.user?.id);

  const codes = getAvailableJurisdictions();
  const stats = getLegalSourceStats();

  // Sort: INT first, EU second, then alphabetical by display name
  const sorted = [...codes].sort((a, b) => {
    if (a === "INT") return -1;
    if (b === "INT") return 1;
    if (a === "EU") return -1;
    if (b === "EU") return 1;
    return getJurisdictionLabel(a, locale).localeCompare(
      getJurisdictionLabel(b, locale),
      locale,
    );
  });

  return (
    <ScholarPage>
      <PageHeader
        eyebrow="Caelex Scholar"
        title={t(locale, BROWSE, "jurisdictionsTitle")}
        subtitle={t(locale, BROWSE, "jurisdictionsSubtitle").replace(
          "{n}",
          String(sorted.length),
        )}
        icon={Globe2}
      />

      {/*
        Card grid — 2 cols on md, 3 on lg, 4 on xl.
        Each card links to /scholar/jurisdictions/<code>.
        WCAG 2.5.8: cards have min-h-[72px] ensuring ≥44px touch target height ✓
      */}
      <ul
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
        role="list"
      >
        {sorted.map((code) => {
          const sourceCount = stats[code]?.total ?? 0;
          const label = getJurisdictionLabel(code, locale);

          return (
            <li key={code}>
              <Link
                href={`/scholar/jurisdictions/${encodeURIComponent(code.toLowerCase())}`}
                className={[
                  "group flex flex-col justify-between min-h-[72px]",
                  "bg-white border border-gray-200/70 rounded-2xl p-5",
                  "hover:border-gray-300 hover:shadow-sm",
                  "motion-safe:transition-all motion-safe:duration-200",
                  // WCAG 2.4.7: visible focus ring
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]",
                ].join(" ")}
              >
                {/* Country code badge */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-400"
                    aria-hidden="true"
                  >
                    {code}
                  </span>
                  <span className="text-[11px] text-gray-500 tabular-nums flex-shrink-0">
                    {sourceCount}{" "}
                    {sourceCount === 1
                      ? t(locale, COMMON, "source")
                      : t(locale, COMMON, "sources")}
                  </span>
                </div>

                {/*
                  Country name — the card hero. WCAG 1.4.3: gray-900 on white ✓
                */}
                <span className="mt-3 text-[15px] font-semibold text-gray-900 leading-snug group-hover:text-black motion-safe:transition-colors">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-gray-100 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-600 tracking-[-0.01em]">
              Scholar
            </span>
            <span className="text-[9px] text-gray-600">
              {t(locale, BROWSE, "footerBy")}
            </span>
          </div>
          <span className="text-[9px] text-gray-600">
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}
