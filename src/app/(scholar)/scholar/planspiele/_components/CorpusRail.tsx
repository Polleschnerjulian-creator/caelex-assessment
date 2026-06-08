import Link from "next/link";
import { ExternalLink, FileText, Scale } from "lucide-react";
import { getLegalSourceById } from "@/data/legal-sources";
import { getCaseById } from "@/data/legal-cases";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { t, type ScholarLocale } from "../../_i18n/core";
import { PLANSPIELE_PLAY } from "../../_i18n/planspiele-play";

/**
 * The in-cockpit research rail: the governing sources + cases for the current
 * phase, READ-ONLY from the frozen corpus, deep-linking to the full Scholar
 * reading pages — so students draft with the law open beside them.
 *
 * Upgraded for the redesign: each cited SOURCE now renders as a richer
 * `ProvisionCard`-style excerpt (title + official reference + a short first-
 * provision snippet, capped ~160 chars) instead of a bare link, so the law is
 * legible in-context without leaving the cockpit. CASES keep the compact link
 * form (case bodies are long-form and live behind their reading page).
 *
 * Server Component. Strictly monochrome. The corpus is read-only — this only
 * READS via getLegalSourceById / getCaseById and never mutates.
 */

/** Cap a snippet to ~160 chars on a word boundary, with an ellipsis. */
function snippet(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function CorpusRail({
  sourceIds,
  caseIds,
  locale,
}: {
  sourceIds: string[];
  caseIds: string[];
  locale: ScholarLocale;
}) {
  const sources = sourceIds.flatMap((id) => {
    const s = getLegalSourceById(id);
    return s ? [s] : [];
  });
  const cases = caseIds.flatMap((id) => {
    const c = getCaseById(id);
    return c ? [c] : [];
  });

  if (sources.length === 0 && cases.length === 0) return null;

  return (
    <aside
      aria-label={t(locale, PLANSPIELE_PLAY, "play.legalSources")}
      className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm lg:sticky lg:top-6"
    >
      <h3 className={SCHOLAR_TYPE.eyebrow}>
        {t(locale, PLANSPIELE_PLAY, "play.legalSources")}
      </h3>

      <ul className="mt-3 space-y-2.5" role="list">
        {sources.map((s) => {
          const title = s.title_local ?? s.title_en;
          // First structured provision (already normalized by the index) gives
          // the reading snippet; fall back to the scope description.
          const firstProvision = s.key_provisions[0];
          const body =
            firstProvision?.summary ||
            firstProvision?.title ||
            s.scope_description ||
            "";
          return (
            <li key={s.id}>
              <Link
                href={`/scholar/sources/${s.id}`}
                className="group block rounded-xl border border-gray-200/70 px-3 py-2.5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md motion-safe:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
              >
                <div className="flex items-start gap-2">
                  <FileText
                    size={15}
                    strokeWidth={1.5}
                    className="mt-0.5 flex-shrink-0 text-gray-500"
                    aria-hidden={true}
                  />
                  <span
                    className={`flex-1 text-small font-semibold leading-snug text-gray-900`}
                  >
                    {title}
                  </span>
                  <ExternalLink
                    size={13}
                    className="mt-0.5 flex-shrink-0 text-gray-400 transition-colors group-hover:text-gray-600"
                    aria-hidden={true}
                  />
                </div>

                {s.official_reference && (
                  <p className={`mt-1.5 pl-[23px] ${SCHOLAR_TYPE.mono}`}>
                    {s.official_reference}
                  </p>
                )}

                {body && (
                  <p className="mt-1.5 pl-[23px] text-caption leading-relaxed text-gray-600">
                    {snippet(body)}
                  </p>
                )}
              </Link>
            </li>
          );
        })}

        {cases.map((c) => (
          <li key={c.id}>
            <Link
              href={`/scholar/cases/${c.id}`}
              className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
            >
              <Scale
                size={15}
                strokeWidth={1.5}
                className="mt-0.5 flex-shrink-0 text-gray-500"
                aria-hidden={true}
              />
              <span
                className={`flex-1 ${SCHOLAR_TYPE.body} group-hover:text-black`}
              >
                {c.title}
              </span>
              <ExternalLink
                size={13}
                className="mt-1 flex-shrink-0 text-gray-400"
                aria-hidden={true}
              />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
