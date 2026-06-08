/**
 * /scholar/planspiele/[id] — the pre-brief + role overview for one scenario.
 *
 * Server Component. Renders the public brief + the role roster (asymmetric: the
 * student sees the PRIVATE brief only for the role they will play), the
 * safe-to-fail fiction contract, an AI-counterpart disclosure, and the start
 * control (client island → starts a SOLO run → routes into the cockpit).
 *
 * Next.js 15: params is a Promise — await it. The group layout already gates auth.
 * Strictly MONOCHROME.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getScenarioById } from "@/data/scholar/planspiele/index";
import { ScholarPage } from "../../_components/ScholarPage";
import { PageHeader } from "../../_components/PageHeader";
import { BackLink } from "../../_components/BackLink";
import { MetadataStrip } from "../../_components/MetadataStrip";
import { AiDisclosure } from "../../_components/AiDisclosure";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import { t } from "../../_i18n/core";
import { getScholarLocale } from "../../_i18n/locale.server";
import { PLANSPIELE } from "../../_i18n/planspiele";
import { PLANSPIELE_PLAY, playT } from "../../_i18n/planspiele-play";
import { StartRunButton } from "../_components/StartRunButton";

const CARD_CLS = "rounded-2xl bg-white border border-gray-200/70 shadow-sm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PlanspielBriefPage({ params }: PageProps) {
  const { id } = await params;
  const scenario = getScenarioById(id);
  if (!scenario) notFound();

  const session = await auth();
  const locale = await getScholarLocale(session?.user?.id ?? null);

  const difficultyLabel =
    scenario.difficulty === "INTRO"
      ? t(locale, PLANSPIELE, "difficultyIntro")
      : scenario.difficulty === "ADVANCED"
        ? t(locale, PLANSPIELE, "difficultyAdvanced")
        : t(locale, PLANSPIELE, "difficultyIntermediate");

  return (
    <ScholarPage>
      <BackLink
        fallbackHref="/scholar/planspiele"
        fallbackLabel={t(locale, PLANSPIELE, "backToCatalog")}
      />

      <div className="mt-4">
        <PageHeader
          eyebrow={scenario.jurisdiction}
          title={playT(locale, scenario.titleKey)}
          subtitle={playT(locale, scenario.summaryKey)}
        />
      </div>

      <div className="mt-4">
        <MetadataStrip
          locale={locale}
          items={[
            { label: t(locale, PLANSPIELE, "eyebrow"), value: difficultyLabel },
            {
              label: t(locale, PLANSPIELE, "minutes"),
              value: String(scenario.estimatedMinutes),
            },
            { label: "Module", value: scenario.module },
          ]}
        />
      </div>

      {/* Roles */}
      <section aria-labelledby="roles-heading" className="mt-10">
        <h2 id="roles-heading" className={SCHOLAR_TYPE.sectionHeading}>
          {t(locale, PLANSPIELE, "rolesHeading")}
        </h2>
        <ul className="mt-3 space-y-3" role="list">
          {scenario.roles.map((role) => {
            const isStudent = role.roleKey === scenario.studentRole;
            return (
              <li key={role.roleKey} className={`${CARD_CLS} px-5 py-4`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={SCHOLAR_TYPE.provisionLabel}>
                    {playT(locale, role.nameKey)}
                  </h3>
                  {isStudent && (
                    <span className="rounded-full border border-gray-300 px-2 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-gray-700">
                      {t(locale, PLANSPIELE, "roleLabel")}
                    </span>
                  )}
                </div>
                <p className={`mt-1.5 ${SCHOLAR_TYPE.bodyMuted}`}>
                  {playT(locale, role.goalKey)}
                </p>
                <p className={`mt-2 ${SCHOLAR_TYPE.body}`}>
                  {playT(locale, role.briefKey)}
                </p>
                {isStudent && (
                  <p
                    className={`mt-2 border-l-2 border-gray-300 pl-3 ${SCHOLAR_TYPE.bodyMuted}`}
                  >
                    {playT(locale, role.privateBriefKey)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Fiction contract */}
      <section
        className={`${CARD_CLS} mt-8 px-5 py-5`}
        aria-labelledby="contract-heading"
      >
        <h2 id="contract-heading" className={SCHOLAR_TYPE.sectionHeading}>
          {t(locale, PLANSPIELE, "fictionContractTitle")}
        </h2>
        <p className={`mt-2 ${SCHOLAR_TYPE.bodyMuted}`}>
          {t(locale, PLANSPIELE, "fictionContract")}
        </p>
      </section>

      <div className="mt-8">
        <AiDisclosure
          label={t(locale, PLANSPIELE_PLAY, "play.aiDisclosure")}
          text={t(locale, PLANSPIELE, "aiPlaysCounterpart")}
        />
      </div>

      <div className="mt-6">
        <StartRunButton
          scenarioId={scenario.id}
          label={t(locale, PLANSPIELE, "startCta")}
          errorLabel={t(locale, PLANSPIELE_PLAY, "play.startFailed")}
        />
      </div>

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
