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
 * Server Component. Strictly monochrome.
 */
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
      className="rounded-2xl border border-gray-200/70 bg-white p-4 lg:sticky lg:top-6"
    >
      <h3 className={SCHOLAR_TYPE.metaLabel}>
        {t(locale, PLANSPIELE_PLAY, "play.legalSources")}
      </h3>
      <ul className="mt-3 space-y-2" role="list">
        {sources.map((s) => (
          <li key={s.id}>
            <Link
              href={`/scholar/sources/${s.id}`}
              className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
            >
              <FileText
                size={15}
                strokeWidth={1.5}
                className="mt-0.5 flex-shrink-0 text-gray-500"
                aria-hidden={true}
              />
              <span
                className={`flex-1 ${SCHOLAR_TYPE.body} group-hover:text-black`}
              >
                {s.title_local ?? s.title_en}
              </span>
              <ExternalLink
                size={13}
                className="mt-1 flex-shrink-0 text-gray-400"
                aria-hidden={true}
              />
            </Link>
          </li>
        ))}
        {cases.map((c) => (
          <li key={c.id}>
            <Link
              href={`/scholar/cases/${c.id}`}
              className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
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
