"use client";

/**
 * CheckYourAnswers — the mandatory review step before any verdict
 * (spec §4 Q10.1, GOV.UK check-your-answers pattern; plan Task 2.3).
 *
 * Contract:
 *  - EVERY answer the verdict will be computed from is listed, including
 *    explicit "I'm not sure" answers — with a per-item Change link.
 *  - The accuracy-responsibility statement renders here (it also ships in
 *    the exportable record, Task 3.4) — the user confirms the answers, the
 *    tool owns the legal mapping.
 *  - Contradictions from `detectContradictions` BLOCK submission with the
 *    named question pair (honesty: contradictory answers are never silently
 *    accepted into a verdict; the server re-checks at calculate time).
 *
 * Purely presentational: all data is derived by SpineWizard from the SAME
 * graph evaluator the server enforces with.
 */

import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Pencil } from "lucide-react";
import type { Contradiction } from "@/lib/assessment/graph-evaluator";

/** One reviewed answer row (derived in SpineWizard via answerLabelFor). */
export interface ReviewEntry {
  questionId: string;
  title: string;
  answerLabel: string;
  state: "answered" | "unsure";
  /** Wizard screen key to jump back to via the Change link. */
  screenKey: string;
}

export const ACCURACY_STATEMENT =
  "These answers are your assessment record: the verdict is computed from exactly what is listed above, and the answers travel with the exportable report so it can be verified line by line. By continuing you confirm they are accurate and complete to the best of your knowledge. “I’m not sure” is a valid answer — unknowns are treated conservatively and listed for you to resolve.";

interface CheckYourAnswersProps {
  entries: ReviewEntry[];
  contradictions: Contradiction[];
  /** Question titles by id — used to name the contradiction pair. */
  questionTitles: Record<string, string>;
  onChange: (screenKey: string) => void;
  onConfirm: () => void;
  submitting: boolean;
  submitErrors: string[];
}

export default function CheckYourAnswers({
  entries,
  contradictions,
  questionTitles,
  onChange,
  onConfirm,
  submitting,
  submitErrors,
}: CheckYourAnswersProps) {
  const blocked = contradictions.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="mb-10 text-center">
        <span className="text-caption uppercase tracking-[0.2em] text-black/45 block mb-4">
          Final step
        </span>
        <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-light tracking-[-0.02em] text-[#1d1d1f] mb-4">
          Check your answers
        </h2>
        <p className="text-subtitle text-black/70 leading-relaxed">
          {
            "Your verdict is computed from exactly these answers — change anything that looks wrong before continuing."
          }
        </p>
      </div>

      {/* Contradictions BLOCK submission — named pair, never silently accepted */}
      {blocked && (
        <div
          role="alert"
          className="mb-8 rounded-xl bg-red-50 border border-red-200 p-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={18}
              className="text-red-600 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-3">
              <p className="text-body-lg text-red-600 font-medium">
                Your answers contradict each other
              </p>
              {contradictions.map((contradiction, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-body text-black/70 leading-relaxed">
                    {contradiction.message}
                  </p>
                  <p className="text-small text-black/45">
                    Affected questions:{" "}
                    {contradiction.questionIds
                      .map((id) => questionTitles[id] ?? id)
                      .join(" · ")}
                  </p>
                </div>
              ))}
              <p className="text-small text-black/45">
                Resolve the contradiction with the Change links below to
                continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Answer list */}
      <dl className="space-y-2 mb-8">
        {entries.map((entry) => (
          <div
            key={entry.questionId}
            className="flex items-start gap-4 rounded-xl bg-white backdrop-blur-[10px] border border-black/[0.08] p-4"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex-1 min-w-0">
              <dt className="text-small text-black/45 leading-relaxed mb-1">
                {entry.title}
              </dt>
              <dd
                className={`text-body-lg ${
                  entry.state === "unsure"
                    ? "text-black/70 italic"
                    : "text-[#1d1d1f]"
                }`}
              >
                {entry.answerLabel}
              </dd>
            </div>
            <button
              type="button"
              onClick={() => onChange(entry.screenKey)}
              aria-label={`Change: ${entry.title}`}
              className="flex items-center gap-1.5 text-small text-black/45 hover:text-[#1d1d1f] transition-colors flex-shrink-0 mt-0.5"
            >
              <Pencil size={12} aria-hidden="true" />
              <span>Change</span>
            </button>
          </div>
        ))}
      </dl>

      {/* Accuracy-responsibility statement (also ships in the exportable record) */}
      <p className="text-small text-black/45 leading-relaxed mb-8 rounded-xl border border-black/[0.08] bg-white p-4">
        {ACCURACY_STATEMENT}
      </p>

      {/* Server-side validation errors (422 names the questions — never a verdict) */}
      {submitErrors.length > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4"
        >
          <p className="text-body-lg text-red-600 font-medium mb-1">
            {"We couldn’t compute your verdict"}
          </p>
          <ul className="space-y-1">
            {submitErrors.map((message, index) => (
              <li
                key={index}
                className="text-body text-black/70 leading-relaxed"
              >
                {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onConfirm}
          disabled={blocked || submitting}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-full text-body-lg font-medium transition-all ${
            blocked || submitting
              ? "bg-black/[0.06] text-black/45 cursor-not-allowed"
              : "bg-[#1d1d1f] text-white hover:bg-black hover:shadow-[0_4px_14px_rgba(0,0,0,0.18)] cursor-pointer"
          }`}
        >
          {submitting ? "Computing your verdict…" : "See my results"}
          {!submitting && <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </div>
    </motion.div>
  );
}
