/**
 * /scholar/planspiele/[id]/run/[runId] — the cockpit (server shell).
 *
 * getRunForUser(userId, runId) is the IDOR gate: a run owned by another user
 * resolves to null → notFound(). The server fetches run + scenario, renders the
 * corpus rail for the current phase (READ-ONLY), and hands everything to the
 * client Cockpit (RSC→Client: server actions passed as props). Keyed by
 * currentPhase so the editor remounts with clean state each phase.
 *
 * Next.js 15: params is a Promise — await it. Strictly MONOCHROME.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getRunForUser } from "@/lib/scholar/planspiele/runs.server";
import { getScenarioById } from "@/data/scholar/planspiele/index";
import {
  submitArtifactAction,
  advancePhaseAction,
} from "@/lib/scholar/planspiele/planspiele-actions";
import { ScholarPage } from "../../../../_components/ScholarPage";
import { BackLink } from "../../../../_components/BackLink";
import { SCHOLAR_TYPE } from "../../../../_components/scholar-type";
import { t } from "../../../../_i18n/core";
import { getScholarLocale } from "../../../../_i18n/locale.server";
import { PLANSPIELE } from "../../../../_i18n/planspiele";
import { PLANSPIELE_PLAY, playT } from "../../../../_i18n/planspiele-play";
import { Cockpit } from "../../../_components/Cockpit";
import { CorpusRail } from "../../../_components/CorpusRail";
import { PhaseStepper } from "../../../_components/PhaseStepper";

interface PageProps {
  params: Promise<{ id: string; runId: string }>;
}

export default async function RunPage({ params }: PageProps) {
  const { runId } = await params;

  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (!userId) notFound();

  const run = await getRunForUser(userId, runId);
  if (!run) notFound();

  const scenario = getScenarioById(run.scenarioId);
  if (!scenario) notFound();

  const locale = await getScholarLocale(userId);

  const phases = [...scenario.phases].sort((a, b) => a.order - b.order);
  const currentIndex = phases.findIndex((p) => p.phaseKey === run.currentPhase);
  const currentPhase = currentIndex >= 0 ? phases[currentIndex] : null;

  // PhaseStepper steps: label pre-resolved via playT; state by order vs the
  // current phase's order (before → done, == → current, after → upcoming).
  // A terminal/unknown phase (currentIndex < 0) marks every step done.
  const currentOrder = currentPhase?.order ?? Number.POSITIVE_INFINITY;
  const stepperSteps = phases.map((p) => ({
    label: playT(locale, p.titleKey),
    state: (p.order < currentOrder
      ? "done"
      : p.order === currentOrder
        ? "current"
        : "upcoming") as "done" | "current" | "upcoming",
  }));

  const runData = {
    id: run.id,
    scenarioId: run.scenarioId,
    currentPhase: run.currentPhase,
    status: run.status,
    version: run.version,
    roleAssignments: run.roleAssignments.map((ra) => ({
      id: ra.id,
      roleKey: ra.roleKey,
      assignedUserId: ra.assignedUserId,
      isAI: ra.isAI,
    })),
  };

  return (
    <ScholarPage>
      <BackLink
        fallbackHref="/scholar/planspiele"
        fallbackLabel={t(locale, PLANSPIELE, "backToCatalog")}
      />

      <div className="mt-4">
        <p className={SCHOLAR_TYPE.eyebrow}>
          {playT(locale, scenario.titleKey)}
        </p>
        <h1 className={`mt-1 ${SCHOLAR_TYPE.docTitle}`}>
          {currentPhase
            ? playT(locale, currentPhase.titleKey)
            : t(locale, PLANSPIELE_PLAY, "play.results")}
        </h1>
      </div>

      <div className="mt-6">
        <PhaseStepper steps={stepperSteps} locale={locale} />
      </div>

      <Cockpit
        key={run.currentPhase}
        scenario={scenario}
        run={runData}
        locale={locale}
        corpusRail={
          currentPhase ? (
            <CorpusRail
              sourceIds={currentPhase.citedSourceIds}
              caseIds={currentPhase.citedCaseIds}
              locale={locale}
            />
          ) : null
        }
        submitAction={submitArtifactAction}
        advanceAction={advancePhaseAction}
      />

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
