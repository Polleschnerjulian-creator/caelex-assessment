/**
 * /scholar/planspiele — the Planspiele catalog.
 *
 * Server Component. Lists the code-defined scenarios (listScenarios) and, for the
 * signed-in user, a per-scenario "past attempts" count (listRunsForUser, ownership-
 * scoped). Each card links to the brief page. Strictly MONOCHROME; every reading
 * size from SCHOLAR_TYPE. The route group layout already enforces getScholarAuth +
 * MFA + the SCHOLAR entitlement, so no gating code is needed here.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { Swords, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { listScenarios } from "@/data/scholar/planspiele/index";
import { listRunsForUser } from "@/lib/scholar/planspiele/runs.server";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";
import { SCHOLAR_TYPE } from "../_components/scholar-type";
import { t } from "../_i18n/core";
import { getScholarLocale } from "../_i18n/locale.server";
import { PLANSPIELE } from "../_i18n/planspiele";
import { PLANSPIELE_PLAY, playT } from "../_i18n/planspiele-play";

const CARD_CLS =
  "rounded-2xl bg-white border border-gray-200/70 shadow-sm hover:border-gray-300 hover:shadow-md motion-safe:transition-all motion-safe:duration-200";

export default async function PlanspieleCatalogPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const locale = await getScholarLocale(userId);

  const scenarios = listScenarios();

  // Per-scenario attempt counts. Tolerate a missing table (pre-db-push window).
  const attempts = new Map<string, number>();
  if (userId) {
    try {
      for (const run of await listRunsForUser(userId)) {
        attempts.set(run.scenarioId, (attempts.get(run.scenarioId) ?? 0) + 1);
      }
    } catch {
      // table not yet materialised — render the catalog without attempt counts.
    }
  }

  const difficultyLabel = (d: string) =>
    d === "INTRO"
      ? t(locale, PLANSPIELE, "difficultyIntro")
      : d === "ADVANCED"
        ? t(locale, PLANSPIELE, "difficultyAdvanced")
        : t(locale, PLANSPIELE, "difficultyIntermediate");

  return (
    <ScholarPage>
      <PageHeader
        eyebrow={t(locale, PLANSPIELE, "eyebrow")}
        title={t(locale, PLANSPIELE, "pageTitle")}
        subtitle={t(locale, PLANSPIELE, "pageSubtitle")}
        icon={Swords}
      />

      <div className="mt-8 flex items-center justify-end">
        <Link
          href="/scholar/planspiele/instructor"
          className={`${SCHOLAR_TYPE.meta} underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] rounded`}
        >
          {t(locale, PLANSPIELE, "instructorLink")}
        </Link>
      </div>

      {scenarios.length === 0 ? (
        <div className={`${CARD_CLS} mt-4 px-5 py-8`}>
          <p className={SCHOLAR_TYPE.bodyMuted}>
            {t(locale, PLANSPIELE, "empty")}
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3" role="list">
          {scenarios.map((s) => {
            const count = attempts.get(s.id) ?? 0;
            const studentRoleDef = s.roles.find(
              (r) => r.roleKey === s.studentRole,
            );
            return (
              <li key={s.id}>
                <Link
                  href={`/scholar/planspiele/${s.id}`}
                  className={`${CARD_CLS} group flex items-start gap-4 px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]`}
                >
                  <Swords
                    size={20}
                    strokeWidth={1.5}
                    className="mt-0.5 flex-shrink-0 text-gray-600"
                    aria-hidden={true}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={SCHOLAR_TYPE.eyebrow}>
                        {s.jurisdiction}
                      </span>
                      <span className="text-gray-300" aria-hidden={true}>
                        ·
                      </span>
                      <span className={SCHOLAR_TYPE.eyebrow}>
                        {difficultyLabel(s.difficulty)}
                      </span>
                      <span className="text-gray-300" aria-hidden={true}>
                        ·
                      </span>
                      <span className={SCHOLAR_TYPE.eyebrow}>
                        {s.estimatedMinutes} {t(locale, PLANSPIELE, "minutes")}
                      </span>
                    </div>
                    <h2
                      className={`mt-1.5 ${SCHOLAR_TYPE.provisionLabel} group-hover:text-black`}
                    >
                      {playT(locale, s.titleKey)}
                    </h2>
                    <p className={`mt-1 ${SCHOLAR_TYPE.bodyMuted}`}>
                      {playT(locale, s.summaryKey)}
                    </p>
                    <div
                      className={`mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 ${SCHOLAR_TYPE.meta}`}
                    >
                      <span>
                        {t(locale, PLANSPIELE, "roleLabel")}:{" "}
                        {studentRoleDef
                          ? playT(locale, studentRoleDef.nameKey)
                          : s.studentRole}
                      </span>
                      <span>
                        {t(locale, PLANSPIELE, "attemptsLabel")}:{" "}
                        {count > 0
                          ? count
                          : t(locale, PLANSPIELE, "attemptsNone")}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    strokeWidth={1.5}
                    className="mt-1 flex-shrink-0 text-gray-400 group-hover:text-gray-700 motion-safe:transition-colors"
                    aria-hidden={true}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {/* AI transparency — consistent with the search page's EU-AI-Act framing */}
      <p className={`mt-6 ${SCHOLAR_TYPE.meta}`}>
        {t(locale, PLANSPIELE_PLAY, "play.aiDisclosure")}
      </p>

      <footer className="mt-20 pt-8 border-t border-gray-200 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-micro font-semibold uppercase tracking-[0.08em] text-gray-600">
              Scholar
            </span>
            <span className="text-caption text-gray-600">by Caelex</span>
          </div>
          <span className="text-caption text-gray-600">
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}
