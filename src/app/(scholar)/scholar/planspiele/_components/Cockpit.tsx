"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Dot } from "lucide-react";
import type { ScholarPlanspielScenario } from "@/data/scholar/planspiele/types";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import type { ScholarLocale } from "../../_i18n/core";
import { playT } from "../../_i18n/planspiele-play";
import { RequirementChecklist } from "./RequirementChecklist";
import {
  derivePhaseObjective,
  deriveRequirements,
  resolveRequirementLabel,
  FREE_TEXT_ANSWER_KEY,
} from "./scaffold";

interface RunData {
  id: string;
  scenarioId: string;
  currentPhase: string;
  status: string;
  version: number;
  roleAssignments: {
    id: string;
    roleKey: string;
    assignedUserId: string | null;
    isAI: boolean;
  }[];
}

type ActionResult = { ok: boolean };

/** Client-side citation counter for the live cover-letter hint (mirrors sim-coach). */
function countCites(text: string): number {
  const m = text.match(/\b(art\.?|article|§|law)\s*[\dA-Za-z/.-]+/gi) ?? [];
  return new Set(m.map((x) => x.toLowerCase().replace(/\s+/g, " "))).size;
}

const TERMINAL = new Set(["completed", "abandoned"]);

export function Cockpit({
  scenario,
  run,
  locale,
  corpusRail,
  submitAction,
  advanceAction,
}: {
  scenario: ScholarPlanspielScenario;
  run: RunData;
  locale: ScholarLocale;
  corpusRail: ReactNode;
  submitAction: (
    runId: string,
    roleAssignmentId: string,
    phaseKey: string,
    content: unknown,
  ) => Promise<ActionResult>;
  advanceAction: (
    runId: string,
    toPhase: string,
    expectedVersion: number,
    completed: boolean,
  ) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [dossierOpen, setDossierOpen] = useState(false);

  const t = (key: string): string => playT(locale, key);

  const phases = [...scenario.phases].sort((a, b) => a.order - b.order);
  const idx = phases.findIndex((p) => p.phaseKey === run.currentPhase);
  const phase = idx >= 0 ? phases[idx] : null;
  const isLast = idx === phases.length - 1;
  const nextPhase = isLast
    ? "completed"
    : (phases[idx + 1]?.phaseKey ?? "completed");

  const studentAssignment = run.roleAssignments.find(
    (ra) => ra.roleKey === scenario.studentRole,
  );

  // Terminal run → completion banner + link to debrief.
  if (TERMINAL.has(run.status) || !phase) {
    return (
      <div className="mt-6 rounded-2xl border border-gray-200/70 bg-white px-5 py-6 shadow-sm">
        <p className={SCHOLAR_TYPE.provisionLabel}>
          {t("play.completeBanner")}
        </p>
        <a
          href={`/scholar/planspiele/${scenario.id}/run/${run.id}/debrief`}
          className="mt-3 inline-flex items-center rounded-lg bg-gray-900 px-5 py-2.5 text-subtitle font-medium text-white hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
        >
          {t("play.debrief")}
        </a>
      </div>
    );
  }

  const fields = phase.artifact.fields ?? [];
  const isFreeText =
    phase.artifact.kind === "cover_letter" ||
    phase.artifact.kind === "deficiency_response";
  const minCites = phase.artifact.minCitations ?? 0;
  const freeText = isFreeText ? String(form[FREE_TEXT_ANSWER_KEY] ?? "") : "";
  const citeCount = isFreeText ? countCites(freeText) : 0;

  const set = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  function onComplete() {
    if (!studentAssignment) {
      setFailed(true);
      return;
    }
    startTransition(async () => {
      setFailed(false);
      const content = { ...form };
      const submitted = await submitAction(
        run.id,
        studentAssignment.id,
        phase!.phaseKey,
        content,
      );
      if (!submitted.ok) {
        setFailed(true);
        return;
      }
      const advanced = await advanceAction(
        run.id,
        nextPhase,
        run.version,
        isLast,
      );
      if (!advanced.ok) {
        setFailed(true);
        return;
      }
      router.refresh();
    });
  }

  // ── Derived learning scaffolding (pure; presence-only, no correctness leak) ──
  const objective = derivePhaseObjective(phase);
  const requirementItems = deriveRequirements(phase, form).map((i) => ({
    label: resolveRequirementLabel(i, (k) => t(k)),
    met: i.met,
    detail: i.detail,
  }));

  // Role identity for the left rail (student plays studentRole).
  const studentRoleDef = scenario.roles.find(
    (r) => r.roleKey === scenario.studentRole,
  );
  const roleName = studentRoleDef ? t(studentRoleDef.nameKey) : "";

  // Phase-change cross-fade: the page keys this component by currentPhase, so a
  // phase advance remounts the cockpit — the mount transition reads as a fade.
  const fade = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[248px_minmax(0,1fr)_320px]">
      {/* ── LEFT — context rail: role identity · dossier · graded-on ───────── */}
      <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
          {/* Role identity */}
          <p className={SCHOLAR_TYPE.eyebrow}>{t("play.youAre")}</p>
          <p className={`mt-1 ${SCHOLAR_TYPE.sectionHeading}`}>{roleName}</p>

          {/* "Your dossier" — collapsible role-private brief */}
          {studentRoleDef && (
            <div className="mt-4 border-t border-gray-200/70 pt-4">
              <button
                type="button"
                aria-expanded={dossierOpen}
                onClick={() => setDossierOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
              >
                <span className={SCHOLAR_TYPE.metaLabel}>
                  {t("play.yourDossier")}
                </span>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  aria-hidden={true}
                  className={`flex-shrink-0 text-gray-500 transition-transform motion-reduce:transition-none ${
                    dossierOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {dossierOpen && (
                <p className={`mt-2.5 ${SCHOLAR_TYPE.body} text-gray-700`}>
                  {t(studentRoleDef.privateBriefKey)}
                </p>
              )}
            </div>
          )}

          {/* "Graded on" — the phase's rubric criteria (scaffolding, not the key) */}
          {objective.gradedOn.length > 0 && (
            <div className="mt-4 border-t border-gray-200/70 pt-4">
              <p className={SCHOLAR_TYPE.metaLabel}>{t("play.gradedOn")}</p>
              <ul className="mt-2.5 space-y-1.5" role="list">
                {objective.gradedOn.map((labelKey) => (
                  <li key={labelKey} className="flex items-start gap-1.5">
                    <Dot
                      size={18}
                      strokeWidth={2.5}
                      aria-hidden={true}
                      className="-ml-1 mt-px flex-shrink-0 text-gray-400"
                    />
                    <span className="text-small leading-snug text-gray-700">
                      {t(labelKey)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      {/* ── CENTER — the artifact editor (field logic preserved) ───────────── */}
      <motion.div key={phase.phaseKey} className="min-w-0" {...fade}>
        <h2 className={SCHOLAR_TYPE.partHeading}>{t(phase.titleKey)}</h2>
        <p className={`mt-2 ${SCHOLAR_TYPE.bodyMuted}`}>{t(phase.briefKey)}</p>

        {/* Deficiency notice (phase 4) */}
        {phase.artifact.kind === "deficiency_response" && (
          <div className="mt-4 rounded-xl border-l-2 border-gray-900 bg-gray-50 px-4 py-3">
            <p className={SCHOLAR_TYPE.metaLabel}>
              {t("play.deficiencyNotice")}
            </p>
            <p className={`mt-1 ${SCHOLAR_TYPE.body}`}>{t(phase.briefKey)}</p>
          </div>
        )}

        <div className="mt-5 space-y-4 rounded-2xl border border-gray-200/70 bg-white px-5 py-5 shadow-sm">
          <p className={SCHOLAR_TYPE.metaLabel}>{t("play.yourWork")}</p>

          {fields.map((field) => {
            if (field.type === "boolean") {
              return (
                <label
                  key={field.key}
                  className="flex cursor-pointer items-center gap-3"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.key])}
                    onChange={(e) => set(field.key, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
                  />
                  <span className={SCHOLAR_TYPE.body}>{t(field.labelKey)}</span>
                </label>
              );
            }
            if (field.type === "select") {
              return (
                <div key={field.key}>
                  <label className={`block ${SCHOLAR_TYPE.metaLabel}`}>
                    {t(field.labelKey)}
                  </label>
                  <select
                    value={String(form[field.key] ?? "")}
                    onChange={(e) => set(field.key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-body-lg text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                  >
                    <option value="">—</option>
                    {field.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            // text field
            return (
              <div key={field.key}>
                <label className={`block ${SCHOLAR_TYPE.metaLabel}`}>
                  {t(field.labelKey)}
                </label>
                <textarea
                  value={String(form[field.key] ?? "")}
                  onChange={(e) => set(field.key, e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-body-lg text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
                />
              </div>
            );
          })}

          {isFreeText && (
            <div>
              <textarea
                value={freeText}
                onChange={(e) => set(FREE_TEXT_ANSWER_KEY, e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-body-lg leading-relaxed text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
              />
              {minCites > 0 && (
                <p
                  className={`mt-1.5 ${SCHOLAR_TYPE.meta} ${citeCount >= minCites ? "text-gray-700" : "text-gray-500"}`}
                >
                  {t("play.requiredCitation").replace("{n}", String(minCites))}{" "}
                  ({citeCount}/{minCites})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Live requirement checklist — presence-only, ticks as the form fills */}
        {requirementItems.length > 0 && (
          <div className="mt-5 rounded-2xl border border-gray-200/70 bg-white px-5 py-4 shadow-sm">
            <RequirementChecklist
              items={requirementItems}
              locale={locale}
              title={t("play.objective")}
            />
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onComplete}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-subtitle font-medium text-white transition-colors hover:bg-black disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
          >
            {pending ? `${t("play.completePhase")} …` : t("play.completePhase")}
          </button>
          {failed && (
            <span role="alert" className={SCHOLAR_TYPE.meta}>
              {t("play.startFailed")}
            </span>
          )}
        </div>

        <p className={`mt-6 ${SCHOLAR_TYPE.meta}`}>{t("play.aiDisclosure")}</p>
      </motion.div>

      {/* ── RIGHT — corpus rail (server-rendered, passed in) ───────────────── */}
      <div className="min-w-0">{corpusRail}</div>
    </div>
  );
}
