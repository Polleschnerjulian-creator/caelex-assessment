"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ScholarPlanspielScenario } from "@/data/scholar/planspiele/types";
import { SCHOLAR_TYPE } from "../../_components/scholar-type";
import type { ScholarLocale } from "../../_i18n/core";
import { PLANSPIELE_PLAY, playT } from "../../_i18n/planspiele-play";

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
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

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
      <div className="mt-6 rounded-2xl border border-gray-200/70 bg-white px-5 py-6">
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
  const freeText = isFreeText ? String(form.text ?? "") : "";
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

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Editor */}
      <div className="min-w-0">
        <h2 className={SCHOLAR_TYPE.sectionHeading}>{t(phase.titleKey)}</h2>
        <p className={`mt-2 ${SCHOLAR_TYPE.bodyMuted}`}>{t(phase.briefKey)}</p>

        {/* Deficiency notice (phase 4) */}
        {phase.artifact.kind === "deficiency_response" && (
          <div className="mt-4 rounded-xl border-l-2 border-gray-400 bg-gray-50 px-4 py-3">
            <p className={SCHOLAR_TYPE.metaLabel}>
              {playT(locale, "play.deficiencyNotice")}
            </p>
            <p className={`mt-1 ${SCHOLAR_TYPE.body}`}>{t(phase.briefKey)}</p>
          </div>
        )}

        <div className="mt-5 space-y-4 rounded-2xl border border-gray-200/70 bg-white px-5 py-5">
          <p className={SCHOLAR_TYPE.metaLabel}>
            {playT(locale, "play.yourWork")}
          </p>

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
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-900"
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
                onChange={(e) => set("text", e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-body-lg leading-relaxed text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
              />
              {minCites > 0 && (
                <p
                  className={`mt-1.5 ${SCHOLAR_TYPE.meta} ${citeCount >= minCites ? "text-gray-700" : "text-gray-500"}`}
                >
                  {playT(locale, "play.requiredCitation").replace(
                    "{n}",
                    String(minCites),
                  )}{" "}
                  ({citeCount}/{minCites})
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={onComplete}
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-subtitle font-medium text-white transition-colors hover:bg-black disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA]"
          >
            {pending
              ? `${playT(locale, "play.completePhase")} …`
              : playT(locale, "play.completePhase")}
          </button>
          {failed && (
            <span role="alert" className={SCHOLAR_TYPE.meta}>
              {playT(locale, "play.startFailed")}
            </span>
          )}
        </div>

        <p className={`mt-6 ${SCHOLAR_TYPE.meta}`}>
          {playT(locale, "play.aiDisclosure")}
        </p>
      </div>

      {/* Corpus rail (server-rendered, passed in) */}
      <div className="min-w-0">{corpusRail}</div>
    </div>
  );
}
