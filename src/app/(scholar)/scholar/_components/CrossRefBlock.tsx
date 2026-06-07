/**
 * CrossRefBlock — the Scholar cross-reference graph (concept §2d).
 *
 * Turns a source-detail dead-end into navigation. Renders two labelled link
 * lists, each ONLY when its data is present:
 *   • "Verwandte Quellen" — related sources + the legal-basis chain
 *     (amends / implements / superseded_by), linking to /scholar/sources/{id},
 *     each with a small type eyebrow.
 *   • "Fälle, die diese Quelle anwenden" — the reverse case↔source lookup,
 *     linking to /scholar/cases/{id}.
 * If BOTH are empty the component renders null (no empty card).
 *
 * Server component: presentational only — no hooks, no "use client", no data
 * imports. The page resolves the data (via the widened ScholarSourceDetail DTO)
 * and hands it down already shaped.
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 * Type sizes come from the shared SCHOLAR_TYPE tokens + <Eyebrow> — never an
 * ad-hoc text-[Npx].
 *
 * WCAG 2.2 AA:
 *   - Each list is a <section> named by its own heading (aria-labelledby) so the
 *     two groups are programmatically distinct; headings are h2 to slot under
 *     the page h1 / alongside the other section h2s.
 *   - Links: gray-900 text (≈15:1) with a gray-700 type eyebrow; full
 *     focus-visible:ring-2 ring-gray-900 ring-offset-2 ring-offset-[#F7F8FA].
 *   - Targets ≥24px (py-1.5 + leading) (WCAG 2.5.8); hover/colour transitions
 *     gated behind motion-safe: (WCAG 2.3.x).
 */

import Link from "next/link";

import { DEFAULT_SCHOLAR_LOCALE, t, type ScholarLocale } from "../_i18n/core";
import { SOURCE } from "../_i18n/source";
import { SCHOLAR_TYPE } from "./scholar-type";
import { Eyebrow } from "./Eyebrow";

// ─── Source type → SOURCE-namespace eyebrow key ────────────────────────
// Mirrors the source-detail page's type mapping so a related-source chip reads
// in the same vocabulary as the page it links to. Anything unmapped is
// humanised + uppercased so the eyebrow never shows a raw snake_case enum.
const TYPE_LABEL_KEYS: Record<string, keyof (typeof SOURCE)["en"]> = {
  international_treaty: "typeTreaty",
  eu_regulation: "typeEuRegulation",
  eu_directive: "typeEuDirective",
  federal_law: "typeFederalLaw",
  federal_regulation: "typeFederalRegulation",
};

function typeLabel(type: string, locale: ScholarLocale): string {
  const key = TYPE_LABEL_KEYS[type];
  return key
    ? t(locale, SOURCE, key)
    : type.replace(/_/g, " ").trim().toUpperCase();
}

// Shared link affordance — identical focus ring + hover treatment for both
// lists. ≥24px target via py-1.5 + leading-snug.
const LINK_CLASS =
  "group block rounded-md px-2 py-1.5 -mx-2 " +
  "motion-safe:transition-colors motion-safe:duration-200 " +
  "hover:bg-gray-50 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]";

export interface CrossRefRelated {
  id: string;
  title: string;
  type: string;
}

export interface CrossRefCitingCase {
  id: string;
  title: string;
}

interface CrossRefBlockProps {
  related: CrossRefRelated[];
  citingCases: CrossRefCitingCase[];
  locale?: ScholarLocale;
}

export function CrossRefBlock({
  related,
  citingCases,
  locale = DEFAULT_SCHOLAR_LOCALE,
}: CrossRefBlockProps) {
  // Render nothing when there is no graph to show (concept §2d — block appears
  // only when something resolves).
  if (related.length === 0 && citingCases.length === 0) return null;

  return (
    <div className="space-y-8">
      {/* ─── Verwandte Quellen ─────────────────────────────────────── */}
      {related.length > 0 && (
        <section
          aria-labelledby="crossref-related-heading"
          className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-4"
        >
          <h2
            id="crossref-related-heading"
            className={SCHOLAR_TYPE.partHeading}
          >
            {t(locale, SOURCE, "relatedSources")}
          </h2>
          <ul className="flex flex-col gap-1" role="list">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={"/scholar/sources/" + encodeURIComponent(r.id)}
                  className={LINK_CLASS}
                >
                  <Eyebrow className="text-gray-600">
                    {typeLabel(r.type, locale)}
                  </Eyebrow>
                  <span
                    className={`block ${SCHOLAR_TYPE.body} group-hover:text-black motion-safe:transition-colors`}
                  >
                    {r.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ─── Fälle, die diese Quelle anwenden ──────────────────────── */}
      {citingCases.length > 0 && (
        <section
          aria-labelledby="crossref-cases-heading"
          className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm space-y-4"
        >
          <h2 id="crossref-cases-heading" className={SCHOLAR_TYPE.partHeading}>
            {t(locale, SOURCE, "citingCases")}
          </h2>
          <ul className="flex flex-col gap-1" role="list">
            {citingCases.map((c) => (
              <li key={c.id}>
                <Link
                  href={"/scholar/cases/" + encodeURIComponent(c.id)}
                  className={LINK_CLASS}
                >
                  <span
                    className={`block ${SCHOLAR_TYPE.body} group-hover:text-black motion-safe:transition-colors`}
                  >
                    {c.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
