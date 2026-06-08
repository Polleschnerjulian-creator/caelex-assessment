/**
 * /scholar/planspiele/[id]/run/[runId]/debrief — the debrief (pedagogical core).
 *
 * getRunForUser is the IDOR gate. For each phase the student submitted, the page
 * recomputes the two-track score server-side (scorePhaseEngine + the no-key
 * sim-coach fallback — zero external cost by default), renders a monochrome
 * ResultsPanel, and surfaces the governing corpus as deep-links. A reflective
 * write-up (client island) + a plain-text export round out the debrief.
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
  scorePhaseEngine,
  type RubricLine,
} from "@/lib/scholar/planspiele/scoring.server";
import { coachReviewArtifact } from "@/lib/scholar/planspiele/sim-coach.server";
import { ScholarPage } from "../../../../../_components/ScholarPage";
import { PageHeader } from "../../../../../_components/PageHeader";
import { BackLink } from "../../../../../_components/BackLink";
import { SCHOLAR_TYPE } from "../../../../../_components/scholar-type";
import { DownloadButton } from "../../../../../_components/DownloadButton";
import { t } from "../../../../../_i18n/core";
import { getScholarLocale } from "../../../../../_i18n/locale.server";
import { PLANSPIELE } from "../../../../../_i18n/planspiele";
import { PLANSPIELE_PLAY, playT } from "../../../../../_i18n/planspiele-play";
import {
  ResultsPanel,
  type ResultRow,
} from "../../../../_components/ResultsPanel";
import { CorpusRail } from "../../../../_components/CorpusRail";
import { ReflectionForm } from "../../../../_components/ReflectionForm";

interface PageProps {
  params: Promise<{ id: string; runId: string }>;
}

export default async function DebriefPage({ params }: PageProps) {
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

  const subByPhase = new Map<string, unknown>();
  for (const s of run.submissions) subByPhase.set(s.phaseKey, s.contentJson);

  const blocks: {
    phaseKey: string;
    phaseTitle: string;
    rows: ResultRow[];
    sourceIds: string[];
    caseIds: string[];
  }[] = [];
  for (const phase of phases) {
    const content = (subByPhase.get(phase.phaseKey) ?? {}) as Record<
      string,
      unknown
    >;
    const engineLines = scorePhaseEngine(scenario, phase, content);
    let aiLines: RubricLine[] = [];
    const isFree =
      phase.artifact.kind === "cover_letter" ||
      phase.artifact.kind === "deficiency_response";
    if (isFree) {
      const out = await coachReviewArtifact({
        scenario,
        phase,
        artifactText: String(content.text ?? ""),
      });
      aiLines = out.lines;
    }
    const rows: ResultRow[] = [...engineLines, ...aiLines].map((l) => {
      const crit = phase.rubric.find((r) => r.key === l.category);
      return {
        label: crit ? playT(locale, crit.labelKey) : l.category,
        note: l.note ? playT(locale, l.note) : "",
        earned: l.earned,
        weight: l.weight,
        correct: l.correct,
        track: crit?.track ?? "engine",
      };
    });
    blocks.push({
      phaseKey: phase.phaseKey,
      phaseTitle: playT(locale, phase.titleKey),
      rows,
      sourceIds: phase.citedSourceIds,
      caseIds: phase.citedCaseIds,
    });
  }

  // Latest reflection (append-only REFLECTION events).
  const reflectionEvent = [...run.events]
    .reverse()
    .find((e) => e.kind === "REFLECTION");
  const initialReflection = reflectionEvent
    ? String(
        (reflectionEvent.payload as unknown as Record<string, unknown>)?.text ??
          "",
      )
    : "";

  // Plain-text export.
  const exportLines: string[] = [
    `${playT(locale, scenario.titleKey)} — ${t(locale, PLANSPIELE_PLAY, "play.debrief")}`,
    "",
  ];
  for (const b of blocks) {
    exportLines.push(b.phaseTitle);
    for (const r of b.rows) {
      exportLines.push(
        `  - ${r.label}: ${r.earned}/${r.weight}${r.note ? ` — ${r.note}` : ""}`,
      );
    }
    exportLines.push("");
  }
  const exportText = exportLines.join("\n");

  return (
    <ScholarPage>
      <BackLink
        fallbackHref={`/scholar/planspiele/${scenario.id}/run/${run.id}`}
        fallbackLabel={t(locale, PLANSPIELE, "backToCatalog")}
      />

      <div className="mt-4">
        <PageHeader
          eyebrow={playT(locale, scenario.titleKey)}
          title={t(locale, PLANSPIELE_PLAY, "play.debrief")}
          subtitle={t(locale, PLANSPIELE_PLAY, "play.debriefIntro")}
        />
      </div>

      <div className="mt-4">
        <DownloadButton
          content={exportText}
          filename={`debrief-${scenario.id}.txt`}
          label={t(locale, PLANSPIELE_PLAY, "play.exportDebrief")}
        />
      </div>

      <div className="mt-6 space-y-5">
        {blocks.map((b) => (
          <div key={b.phaseKey}>
            <ResultsPanel
              phaseTitle={b.phaseTitle}
              rows={b.rows}
              locale={locale}
            />
            <div className="mt-2">
              <CorpusRail
                sourceIds={b.sourceIds}
                caseIds={b.caseIds}
                locale={locale}
              />
            </div>
          </div>
        ))}
      </div>

      <section className="mt-10" aria-labelledby="reflection-heading">
        <h2 id="reflection-heading" className={SCHOLAR_TYPE.sectionHeading}>
          {t(locale, PLANSPIELE_PLAY, "play.reflection")}
        </h2>
        <div className="mt-3">
          <ReflectionForm
            runId={run.id}
            initial={initialReflection}
            locale={locale}
          />
        </div>
      </section>

      <p className={`mt-8 ${SCHOLAR_TYPE.meta}`}>
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
