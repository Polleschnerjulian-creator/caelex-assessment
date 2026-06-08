/**
 * /scholar/planspiele/instructor — the thin instructor cohort view.
 *
 * Gated by getScholarAuth() (the route group already enforces the SCHOLAR
 * entitlement + MFA). Instructor tier = org role OWNER/ADMIN/MANAGER; everyone
 * else gets a "students see their own runs" notice. For the MVP the cohort is the
 * SSO-gated org: the instructor sees runs owned by org members (read-only scores;
 * grade-override is Phase 2). Strictly MONOCHROME.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getScholarAuth } from "@/lib/scholar/scholar-auth";
import { listScenarios } from "@/data/scholar/planspiele/index";
import {
  listOrgRunsForInstructor,
  type InstructorRunRow,
} from "@/lib/scholar/planspiele/runs.server";
import { ScholarPage } from "../../_components/ScholarPage";
import { PageHeader } from "../../_components/PageHeader";
import { BackLink } from "../../_components/BackLink";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { t } from "../../_i18n/core";
import { getScholarLocale } from "../../_i18n/locale.server";
import { PLANSPIELE } from "../../_i18n/planspiele";
import { playT } from "../../_i18n/planspiele-play";

const INSTRUCTOR_ROLES = ["OWNER", "ADMIN", "MANAGER"];
const CARD_CLS = "rounded-2xl bg-white border border-gray-200/70 shadow-sm";

export default async function PlanspieleInstructorPage() {
  const ctx = await getScholarAuth();
  const locale = await getScholarLocale(ctx?.userId ?? null);

  const isInstructor = ctx
    ? INSTRUCTOR_ROLES.includes(ctx.role as string)
    : false;

  return (
    <ScholarPage>
      <BackLink
        fallbackHref="/scholar/planspiele"
        fallbackLabel={t(locale, PLANSPIELE, "backToCatalog")}
      />

      <div className="mt-4">
        <PageHeader
          eyebrow={t(locale, PLANSPIELE, "eyebrow")}
          title={t(locale, PLANSPIELE, "instructorTitle")}
          subtitle={t(locale, PLANSPIELE, "instructorSubtitle")}
        />
      </div>

      {!isInstructor || !ctx ? (
        <div className={`${CARD_CLS} mt-4 px-5 py-8`}>
          <p className={SCHOLAR_TYPE.bodyMuted}>
            {t(locale, PLANSPIELE, "studentsOnly")}
          </p>
        </div>
      ) : (
        <InstructorBody organizationId={ctx.organizationId} locale={locale} />
      )}

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

async function InstructorBody({
  organizationId,
  locale,
}: {
  organizationId: string;
  locale: Awaited<ReturnType<typeof getScholarLocale>>;
}) {
  const scenarios = listScenarios();
  const titleByScenario = new Map(scenarios.map((s) => [s.id, s.titleKey]));

  let runs: InstructorRunRow[] = [];
  try {
    runs = await listOrgRunsForInstructor(organizationId);
  } catch {
    runs = [];
  }

  return (
    <>
      {/* Assignable scenarios */}
      <section aria-labelledby="assign-heading" className="mt-8">
        <h2 id="assign-heading" className={SCHOLAR_TYPE.sectionHeading}>
          {t(locale, PLANSPIELE, "assignHeading")}
        </h2>
        <ul className="mt-3 space-y-2" role="list">
          {scenarios.map((s) => (
            <li key={s.id}>
              <Link
                href={`/scholar/planspiele/${s.id}`}
                className={`${CARD_CLS} group flex items-center justify-between gap-3 px-5 py-3.5 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]`}
              >
                <span className={SCHOLAR_TYPE.body}>
                  {playT(locale, s.titleKey)}
                </span>
                <span className="inline-flex items-center gap-1 text-gray-500 group-hover:text-gray-800">
                  <span className={SCHOLAR_TYPE.meta}>
                    {t(locale, PLANSPIELE, "openBrief")}
                  </span>
                  <ArrowRight size={15} strokeWidth={1.5} aria-hidden={true} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Submissions */}
      <section aria-labelledby="subs-heading" className="mt-10">
        <h2 id="subs-heading" className={SCHOLAR_TYPE.sectionHeading}>
          {t(locale, PLANSPIELE, "submissionsHeading")}
        </h2>

        {runs.length === 0 ? (
          <div className={`${CARD_CLS} mt-3 px-5 py-8`}>
            <p className={SCHOLAR_TYPE.bodyMuted}>
              {t(locale, PLANSPIELE, "noSubmissions")}
            </p>
          </div>
        ) : (
          <div className={`${CARD_CLS} mt-3 overflow-x-auto`}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className={`px-5 py-3 ${SCHOLAR_TYPE.metaLabel}`}>
                    {t(locale, PLANSPIELE, "colStudent")}
                  </th>
                  <th className={`px-5 py-3 ${SCHOLAR_TYPE.metaLabel}`}>
                    {t(locale, PLANSPIELE, "colScenario")}
                  </th>
                  <th className={`px-5 py-3 ${SCHOLAR_TYPE.metaLabel}`}>
                    {t(locale, PLANSPIELE, "colStatus")}
                  </th>
                  <th className={`px-5 py-3 ${SCHOLAR_TYPE.metaLabel}`}>
                    {t(locale, PLANSPIELE, "colPhase")}
                  </th>
                  <th className={`px-5 py-3 ${SCHOLAR_TYPE.metaLabel}`}>
                    {t(locale, PLANSPIELE, "colStarted")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className={`px-5 py-3 ${SCHOLAR_TYPE.body}`}>
                      {r.studentName}
                    </td>
                    <td className={`px-5 py-3 ${SCHOLAR_TYPE.bodyMuted}`}>
                      {playT(
                        locale,
                        titleByScenario.get(r.scenarioId) ?? r.scenarioId,
                      )}
                    </td>
                    <td className={`px-5 py-3 ${SCHOLAR_TYPE.meta}`}>
                      {r.status}
                    </td>
                    <td className={`px-5 py-3 ${SCHOLAR_TYPE.meta}`}>
                      {r.currentPhase}
                    </td>
                    <td className={`px-5 py-3 ${SCHOLAR_TYPE.meta}`}>
                      {new Date(r.startedAt).toLocaleDateString(locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
