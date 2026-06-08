/**
 * /scholar/planspiele/[id] — the pre-brief + role overview for one scenario.
 *
 * Server Component. Recomposed (UI redesign §4.2) as a confident "mission
 * briefing": the student's ROLE identity leads, a derived objectives list lays
 * out the mission as numbered phase steps + the dimensions it is graded on, the
 * safe-to-fail fiction contract reads as "rules of engagement", and the start
 * control (client island → starts a SOLO run → routes into the cockpit) is the
 * prominent CTA. The role roster stays — asymmetric: the student sees the
 * PRIVATE brief only for the role they will play.
 *
 * Scaffolding is DERIVED (derivePhaseObjective over the scenario's own phases +
 * rubric metadata) — no scenario data is authored here. Strictly MONOCHROME.
 * Motion is CSS-only (`motion-safe:` transitions) so this stays a pure server
 * component; framer-motion is reserved for the client islands.
 *
 * Next.js 15: params is a Promise — await it. The group layout already gates auth.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { Target, ScrollText, Users, Shield } from "lucide-react";
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
import { derivePhaseObjective } from "../_components/scaffold";
import { StartRunButton } from "../_components/StartRunButton";

// Monochrome elevation vocabulary (mirrors the catalog card vocabulary).
const CARD_CLS = "rounded-2xl bg-white border border-gray-200/70 shadow-sm";
const CARD_INTERACTIVE =
  "motion-safe:transition-all motion-safe:duration-200 hover:border-gray-300 hover:shadow-md";

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

  // The role the solo student plays — the identity that leads the briefing.
  const studentRoleDef = scenario.roles.find(
    (r) => r.roleKey === scenario.studentRole,
  );
  const studentRoleName = studentRoleDef
    ? playT(locale, studentRoleDef.nameKey)
    : scenario.studentRole;

  // ── Derived objectives — phases ordered into numbered mission steps, plus
  // the deduped union of every phase's graded-on rubric labels. Pure
  // scaffolding over the scenario's OWN phases (derivePhaseObjective) — no
  // scenario data authored here.
  const orderedPhases = [...scenario.phases].sort((a, b) => a.order - b.order);
  const objectives = orderedPhases.map((phase) => derivePhaseObjective(phase));

  const gradedOnLabels: string[] = [];
  const seenGraded = new Set<string>();
  for (const obj of objectives) {
    for (const key of obj.gradedOn) {
      if (seenGraded.has(key)) continue;
      seenGraded.add(key);
      gradedOnLabels.push(playT(locale, key));
    }
  }

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

      {/* Mission card — the student's ROLE identity leads the briefing. */}
      <section
        aria-labelledby="mission-heading"
        className={`${CARD_CLS} mt-8 overflow-hidden`}
      >
        <div className="border-l-[3px] border-gray-900 px-6 py-6">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white"
              aria-hidden={true}
            >
              <Target size={18} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={SCHOLAR_TYPE.eyebrow}>
                {t(locale, PLANSPIELE_PLAY, "play.youAre")}
              </p>
              <h2
                id="mission-heading"
                className={`mt-1 ${SCHOLAR_TYPE.docTitle}`}
              >
                {studentRoleName}
              </h2>
              {studentRoleDef && (
                <p className={`mt-2 max-w-2xl ${SCHOLAR_TYPE.body}`}>
                  {playT(locale, studentRoleDef.goalKey)}
                </p>
              )}
              <span className="mt-3 inline-flex items-center rounded-full border border-gray-900 bg-gray-900 px-2.5 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-white">
                {t(locale, PLANSPIELE, "roleLabel")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Objectives — derived numbered mission steps + what's graded. */}
      {orderedPhases.length > 0 && (
        <section aria-labelledby="objective-heading" className="mt-8">
          <div className="flex items-center gap-2">
            <Target
              size={16}
              strokeWidth={1.75}
              className="text-gray-600"
              aria-hidden={true}
            />
            <h2 id="objective-heading" className={SCHOLAR_TYPE.sectionHeading}>
              {t(locale, PLANSPIELE_PLAY, "play.objective")}
            </h2>
          </div>

          <ol className="mt-3 space-y-2.5" role="list">
            {orderedPhases.map((phase, i) => (
              <li
                key={phase.phaseKey}
                className={`${CARD_CLS} ${CARD_INTERACTIVE} group flex items-start gap-3.5 px-5 py-4`}
              >
                <span
                  className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-gray-300 text-caption font-semibold text-gray-700 motion-safe:transition-colors group-hover:border-gray-900 group-hover:bg-gray-900 group-hover:text-white"
                  aria-hidden={true}
                >
                  {i + 1}
                </span>
                <p className={`pt-0.5 ${SCHOLAR_TYPE.body}`}>
                  {playT(locale, phase.titleKey)}
                </p>
              </li>
            ))}
          </ol>

          {gradedOnLabels.length > 0 && (
            <div className="mt-4">
              <p className={SCHOLAR_TYPE.metaLabel}>
                {t(locale, PLANSPIELE_PLAY, "play.gradedOn")}
              </p>
              <ul className="mt-2 flex flex-wrap gap-2" role="list">
                {gradedOnLabels.map((label, i) => (
                  <li
                    key={i}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-small text-gray-700"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Roles — the full roster (public brief); the student's role also shows
          the PRIVATE brief (the asymmetry). The student's card is emphasised. */}
      <section aria-labelledby="roles-heading" className="mt-8">
        <div className="flex items-center gap-2">
          <Users
            size={16}
            strokeWidth={1.75}
            className="text-gray-600"
            aria-hidden={true}
          />
          <h2 id="roles-heading" className={SCHOLAR_TYPE.sectionHeading}>
            {t(locale, PLANSPIELE, "rolesHeading")}
          </h2>
        </div>
        <ul className="mt-3 space-y-3" role="list">
          {scenario.roles.map((role) => {
            const isStudent = role.roleKey === scenario.studentRole;
            return (
              <li
                key={role.roleKey}
                className={`${CARD_CLS} ${CARD_INTERACTIVE} px-5 py-4 ${
                  isStudent ? "border-gray-900 shadow-md" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={SCHOLAR_TYPE.provisionLabel}>
                    {playT(locale, role.nameKey)}
                  </h3>
                  {isStudent && (
                    <span className="inline-flex items-center rounded-full border border-gray-900 bg-gray-900 px-2 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-white">
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
                  <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className={SCHOLAR_TYPE.eyebrow}>
                      {t(locale, PLANSPIELE_PLAY, "play.yourDossier")}
                    </p>
                    <p className={`mt-1 ${SCHOLAR_TYPE.bodyMuted}`}>
                      {playT(locale, role.privateBriefKey)}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Rules of engagement — the safe-to-fail fiction contract. */}
      <section
        className={`${CARD_CLS} mt-8 px-5 py-5`}
        aria-labelledby="contract-heading"
      >
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-700"
            aria-hidden={true}
          >
            <Shield size={16} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="contract-heading" className={SCHOLAR_TYPE.sectionHeading}>
              {t(locale, PLANSPIELE, "fictionContractTitle")}
            </h2>
            <p className={`mt-2 ${SCHOLAR_TYPE.bodyMuted}`}>
              {t(locale, PLANSPIELE, "fictionContract")}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <AiDisclosure
          label={t(locale, PLANSPIELE_PLAY, "play.aiDisclosure")}
          text={t(locale, PLANSPIELE, "aiPlaysCounterpart")}
        />
      </div>

      {/* Start — the prominent CTA. Mission framing alongside the action. */}
      <section
        className={`${CARD_CLS} mt-6 px-6 py-6`}
        aria-label={studentRoleName}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ScrollText
              size={18}
              strokeWidth={1.75}
              className="mt-0.5 flex-shrink-0 text-gray-600"
              aria-hidden={true}
            />
            <div>
              <p className={SCHOLAR_TYPE.provisionLabel}>
                {playT(locale, scenario.titleKey)}
              </p>
              <p className={`mt-0.5 ${SCHOLAR_TYPE.meta}`}>
                {studentRoleName} · {difficultyLabel} ·{" "}
                {scenario.estimatedMinutes} {t(locale, PLANSPIELE, "minutes")}
              </p>
            </div>
          </div>
          <StartRunButton
            scenarioId={scenario.id}
            label={t(locale, PLANSPIELE, "startCta")}
            errorLabel={t(locale, PLANSPIELE_PLAY, "play.startFailed")}
          />
        </div>
      </section>

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
