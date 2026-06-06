/**
 * /scholar/jurisdictions — Browse all jurisdictions in the corpus.
 *
 * Server Component — reads corpus server-side; zero corpus bytes reach
 * the client bundle.
 *
 * WCAG 2.2 AA:
 *   - <main> landmark + real <h1>
 *   - Card links have visible focus ring (focus-visible:ring-2)
 *   - Text contrast: gray-700 on white ≥7.4:1 ✓; gray-600 on white ≥5.7:1 ✓
 *   - Interactive targets ≥44px (card min-h-[72px] ✓)
 *   - lang="de" on root element
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

// Special jurisdiction display names not in ISO-3166
const SPECIAL_NAMES: Record<string, string> = {
  INT: "International",
  EU: "European Union",
};

function getJurisdictionLabel(code: string): string {
  return SPECIAL_NAMES[code] ?? getCountryName(code);
}

export default function JurisdictionsPage() {
  const codes = getAvailableJurisdictions();
  const stats = getLegalSourceStats();

  // Sort: INT first, EU second, then alphabetical by display name
  const sorted = [...codes].sort((a, b) => {
    if (a === "INT") return -1;
    if (b === "INT") return 1;
    if (a === "EU") return -1;
    if (b === "EU") return 1;
    return getJurisdictionLabel(a).localeCompare(getJurisdictionLabel(b), "de");
  });

  return (
    <main lang="de" className="min-h-screen bg-[#F7F8FA] px-8 lg:px-16 py-12">
      {/* Page heading */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Globe2
            size={15}
            className="text-gray-500"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="text-[10px] font-semibold text-gray-600 tracking-[0.2em] uppercase">
            Caelex Scholar
          </span>
        </div>
        {/*
          WCAG 1.3.1 / 2.4.6: visible h1 — contrast gray-900 on #F7F8FA ≥15:1 ✓
        */}
        <h1 className="text-[32px] font-light text-gray-900 tracking-[-0.02em] leading-tight">
          Jurisdiktionen
        </h1>
        <p className="mt-2 text-[13px] text-gray-600 leading-relaxed">
          {sorted.length} Jurisdiktionen mit Weltraumrecht-Quellen
        </p>
      </div>

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
          const label = getJurisdictionLabel(code);

          return (
            <li key={code}>
              <Link
                href={`/scholar/jurisdictions/${encodeURIComponent(code.toLowerCase())}`}
                className={[
                  "group flex flex-col justify-between min-h-[72px]",
                  "bg-white border border-gray-100 rounded-xl p-4",
                  "hover:border-gray-300 hover:shadow-sm",
                  "motion-safe:transition-all motion-safe:duration-200",
                  // WCAG 2.4.7: visible focus ring
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]",
                ].join(" ")}
              >
                {/* Country code badge */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="text-[10px] font-bold tracking-widest text-gray-500 uppercase"
                    aria-hidden="true"
                  >
                    {code}
                  </span>
                  <span className="text-[9px] text-gray-500 tabular-nums flex-shrink-0">
                    {sourceCount} {sourceCount === 1 ? "Quelle" : "Quellen"}
                  </span>
                </div>

                {/*
                  Country name — WCAG 1.4.3: gray-800 on white = 8.6:1 ✓
                */}
                <span className="mt-2 text-[13px] font-medium text-gray-800 leading-snug group-hover:text-black motion-safe:transition-colors">
                  {/* Screen reader gets full accessible name from the combined
                      text content of the link; no aria-label needed here */}
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
            <span className="text-[10px] font-semibold text-gray-600 tracking-wider">
              SCHOLAR
            </span>
            <span className="text-[9px] text-gray-600">by Caelex</span>
          </div>
          <span className="text-[9px] text-gray-600">
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </main>
  );
}
