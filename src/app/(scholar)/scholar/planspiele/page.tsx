/**
 * /scholar/planspiele — the Planspiele catalog, read as an 8-module curriculum.
 *
 * Server Component. Lists the code-defined scenarios (listScenarios), GROUPED
 * under monochrome module headers so the surface reads as a curriculum, not a
 * flat list. For the signed-in user it derives, from listRunsForUser
 * (ownership-scoped), both a per-scenario "past attempts" count AND a per-
 * scenario progress status (completed / in_progress / not_started) shown as a
 * ProgressBadge. Each card links to the brief page. Strictly MONOCHROME; every
 * reading size from SCHOLAR_TYPE. The route-group layout already enforces
 * getScholarAuth + MFA + the SCHOLAR entitlement, so no gating code is needed.
 *
 * Motion: the card list fades/rises in with a reduced-motion-safe stagger via
 * the thin <CatalogList> client island (the only client boundary). All data +
 * i18n is resolved here on the server and handed over as finished nodes.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { Swords, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  listScenarios,
  type ScholarPlanspielScenario,
} from "@/data/scholar/planspiele/index";
import { listRunsForUser } from "@/lib/scholar/planspiele/runs.server";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";
import { SCHOLAR_TYPE } from "../_components/scholar-type";
import { t, type ScholarLocale } from "../_i18n/core";
import { getScholarLocale } from "../_i18n/locale.server";
import { PLANSPIELE } from "../_i18n/planspiele";
import { PLANSPIELE_PLAY, playT } from "../_i18n/planspiele-play";
import { ProgressBadge } from "./_components/ProgressBadge";
import { CatalogList } from "./_components/CatalogList";

const CARD_CLS =
  "rounded-2xl bg-white border border-gray-200/70 shadow-sm hover:border-gray-300 hover:shadow-md motion-safe:transition-all motion-safe:duration-200";

/** Per-scenario derived progress, from the user's own runs. */
type ScenarioStatus = "not_started" | "in_progress" | "completed";

/** Runs in a terminal state — mirrors Cockpit.TERMINAL. "abandoned" is terminal
 * but does NOT count as completed (and so never as in_progress either). */
const TERMINAL = new Set(["completed", "abandoned"]);

/** Map a module slug (e.g. "export-control") to a display label ("Export
 * Control"). Pure presentation over the stable, code-defined module string —
 * no scenario-data change, no new i18n surface. */
function humanizeModule(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** A monochrome 1–3 difficulty meter. Filled gray-900 pips = level; the rest
 * gray-300. The visible label still names the difficulty (the pips reinforce,
 * they are not the sole cue); an sr-only string announces the level. */
function DifficultyMeter({
  difficulty,
  label,
}: {
  difficulty: ScholarPlanspielScenario["difficulty"];
  label: string;
}) {
  const level = difficulty === "INTRO" ? 1 : difficulty === "ADVANCED" ? 3 : 2;
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <span className="flex items-end gap-0.5" aria-hidden={true}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`block w-1 rounded-sm ${
              i < level ? "bg-gray-900" : "bg-gray-300"
            }`}
            style={{ height: `${6 + i * 3}px` }}
          />
        ))}
      </span>
      <span className={SCHOLAR_TYPE.eyebrow}>{label}</span>
    </span>
  );
}

/** One scenario card. SERVER component — renders the full card markup including
 * the server-only ProgressBadge; the parent hands the finished node to the
 * <CatalogList> client island for the stagger. */
function CatalogCard({
  scenario,
  status,
  attempts,
  locale,
}: {
  scenario: ScholarPlanspielScenario;
  status: ScenarioStatus;
  attempts: number;
  locale: ScholarLocale;
}) {
  const difficultyLabel =
    scenario.difficulty === "INTRO"
      ? t(locale, PLANSPIELE, "difficultyIntro")
      : scenario.difficulty === "ADVANCED"
        ? t(locale, PLANSPIELE, "difficultyAdvanced")
        : t(locale, PLANSPIELE, "difficultyIntermediate");

  const studentRoleDef = scenario.roles.find(
    (r) => r.roleKey === scenario.studentRole,
  );

  return (
    <Link
      href={`/scholar/planspiele/${scenario.id}`}
      className={`${CARD_CLS} group flex items-start gap-4 px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]`}
    >
      <Swords
        size={20}
        strokeWidth={1.5}
        className="mt-0.5 flex-shrink-0 text-gray-600 group-hover:text-gray-900 motion-safe:transition-colors"
        aria-hidden={true}
      />
      <div className="min-w-0 flex-1">
        {/* Top row: module chip · difficulty meter · duration ───── status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className="rounded-full border border-gray-300 px-2 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-gray-700">
              {humanizeModule(scenario.module)}
            </span>
            <span className="text-gray-300" aria-hidden={true}>
              ·
            </span>
            <DifficultyMeter
              difficulty={scenario.difficulty}
              label={difficultyLabel}
            />
            <span className="text-gray-300" aria-hidden={true}>
              ·
            </span>
            <span className={SCHOLAR_TYPE.eyebrow}>
              {scenario.estimatedMinutes} {t(locale, PLANSPIELE, "minutes")}
            </span>
          </div>
          <span className="flex-shrink-0">
            <ProgressBadge status={status} locale={locale} />
          </span>
        </div>

        <h2
          className={`mt-2 ${SCHOLAR_TYPE.provisionLabel} group-hover:text-black`}
        >
          {playT(locale, scenario.titleKey)}
        </h2>
        <p className={`mt-1 ${SCHOLAR_TYPE.bodyMuted}`}>
          {playT(locale, scenario.summaryKey)}
        </p>
        <div
          className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 ${SCHOLAR_TYPE.meta}`}
        >
          <span>
            {t(locale, PLANSPIELE, "roleLabel")}:{" "}
            {studentRoleDef
              ? playT(locale, studentRoleDef.nameKey)
              : scenario.studentRole}
          </span>
          <span>
            {t(locale, PLANSPIELE, "attemptsLabel")}:{" "}
            {attempts > 0 ? attempts : t(locale, PLANSPIELE, "attemptsNone")}
          </span>
        </div>
      </div>
      <ArrowRight
        size={18}
        strokeWidth={1.5}
        className="mt-1 flex-shrink-0 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 motion-safe:transition-all"
        aria-hidden={true}
      />
    </Link>
  );
}

export default async function PlanspieleCatalogPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const locale = await getScholarLocale(userId);

  const scenarios = listScenarios();

  // Per-scenario attempt counts + progress status, derived from the user's own
  // runs in a single pass. Tolerate a missing table (pre-db-push window).
  const attempts = new Map<string, number>();
  const completedSet = new Set<string>(); // any run completed
  const activeSet = new Set<string>(); // any non-terminal run
  if (userId) {
    try {
      for (const run of await listRunsForUser(userId)) {
        attempts.set(run.scenarioId, (attempts.get(run.scenarioId) ?? 0) + 1);
        if (run.status === "completed") {
          completedSet.add(run.scenarioId);
        } else if (!TERMINAL.has(run.status)) {
          activeSet.add(run.scenarioId);
        }
      }
    } catch {
      // table not yet materialised — render the catalog without run-derived data.
    }
  }

  const statusFor = (scenarioId: string): ScenarioStatus =>
    completedSet.has(scenarioId)
      ? "completed"
      : activeSet.has(scenarioId)
        ? "in_progress"
        : "not_started";

  // Group scenarios by module, preserving the order modules first appear in
  // listScenarios() (the stable, code-defined order). Reads as a curriculum.
  const groupOrder: string[] = [];
  const byModule = new Map<string, ScholarPlanspielScenario[]>();
  for (const s of scenarios) {
    if (!byModule.has(s.module)) {
      byModule.set(s.module, []);
      groupOrder.push(s.module);
    }
    byModule.get(s.module)!.push(s);
  }

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
        <div className="mt-4 space-y-10">
          {groupOrder.map((moduleSlug) => {
            const group = byModule.get(moduleSlug)!;
            return (
              <section key={moduleSlug} aria-label={humanizeModule(moduleSlug)}>
                {/* Monochrome module header — the curriculum spine. */}
                <div className="flex items-baseline gap-3">
                  <h2 className={SCHOLAR_TYPE.eyebrow}>
                    {humanizeModule(moduleSlug)}
                  </h2>
                  <span
                    className="h-px flex-1 bg-gray-200"
                    aria-hidden={true}
                  />
                  <span
                    className={`${SCHOLAR_TYPE.meta} tabular-nums`}
                    aria-hidden={true}
                  >
                    {group.length}
                  </span>
                </div>

                <div className="mt-3">
                  <CatalogList
                    items={group.map((s) => (
                      <CatalogCard
                        key={s.id}
                        scenario={s}
                        status={statusFor(s.id)}
                        attempts={attempts.get(s.id) ?? 0}
                        locale={locale}
                      />
                    ))}
                  />
                </div>
              </section>
            );
          })}
        </div>
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
