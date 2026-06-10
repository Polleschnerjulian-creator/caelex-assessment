"use client";

/**
 * SpineWizard — the ONE branching operator assessment wizard on the question
 * graph (plan: docs/superpowers/plans/2026-06-10-ultimate-assessment-rebuild.md,
 * Task 2.3; full-tier wiring lands in Task 3.1 via the `tier` prop).
 *
 * Honesty contract (binding — see the plan header invariants):
 *  - Visibility comes from `visibleQuestions(graph, tier, answers)` — the SAME
 *    pure evaluator the calculate routes enforce with server-side. The client
 *    evaluation here is DISPLAY-ONLY; the server re-validates every submission
 *    (invariant 3), so nothing in this file is a gate.
 *  - "I'm not sure" is UI sugar over `unsureMode: "option"`: selecting it
 *    stores `{state:"unsure"}` — NEVER an answered `"unsure"` value (Task 1.3
 *    binding convention). The sentinel option value used for rendering never
 *    leaves this component.
 *  - Branch-skipped questions are recorded EXPLICITLY as `{state:"not_asked"}`
 *    at submit time (`finalizeAnswers`), and answers that a branch change has
 *    hidden are converted to `not_asked` immediately (no smuggling answers
 *    past branches).
 *  - The forming counter is sourced from interim quick-calculate responses
 *    only — never invented client-side (see FormingCounter).
 *  - Persistence is the profile API (PATCH per answer) — server-side, no
 *    localStorage.
 *  - Check-your-answers is a MANDATORY step before submit (Q10.1);
 *    contradictions block submission with the named pair.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  QUESTION_GRAPH,
  BATTERY_ITEM_STATUSES,
  type BatteryItemStatus,
} from "@/data/assessment/question-graph";
import type {
  QuestionNode,
  QuestionOption,
  SectionId,
} from "@/data/assessment/question-graph-types";
import {
  visibleQuestions,
  detectContradictions,
} from "@/lib/assessment/graph-evaluator";
import {
  triStateAnswerSchema,
  type AnswerMap,
  type TriStateAnswer,
} from "@/lib/assessment/answers";
import type { Question as LegacyQuestion } from "@/lib/questions";
import { csrfHeaders } from "@/lib/csrf-client";
import { rememberUtmSource } from "@/lib/assessment/utm-client";

import ProgressBar from "@/components/assessment/ProgressBar";
import QuestionStep from "@/components/assessment/QuestionStep";
import MultiSelectQuestionStep from "@/components/assessment/MultiSelectQuestionStep";
import OptionCard from "@/components/assessment/OptionCard";
import DisclaimerBanner from "@/components/ui/disclaimer-banner";
import WhyPanel from "./WhyPanel";
import CheckYourAnswers, { type ReviewEntry } from "./CheckYourAnswers";
import FormingCounter, { extractFormingCount } from "./FormingCounter";

// ─── UI-only sentinels (NEVER stored — see the Task 1.3 binding convention) ──

/** Rendered "I'm not sure" choice. Selecting it stores `{state:"unsure"}`. */
export const UNSURE_SENTINEL = "__unsure__";
/** Boolean-kind rendering sentinels — stored as `true`/`false`. */
export const BOOL_YES = "__bool_yes__";
export const BOOL_NO = "__bool_no__";

const UNSURE_LABEL = "I’m not sure";
const UNSURE_DESCRIPTION =
  "An honest answer. Unknowns are treated conservatively — they can only add obligations or lower confidence, never remove anything.";

export const SECTION_LABELS: Record<SectionId, string> = {
  identity_role: "Identity & role",
  activity_assets: "Activity & assets",
  orbit_mission: "Orbit & mission",
  jurisdiction_market: "Jurisdiction & market",
  lifecycle: "Lifecycle",
  nis2_gateway: "Cybersecurity & NIS2",
  debris_environment: "Debris & environment",
  insurance_liability: "Insurance & liability",
  spectrum_export: "Spectrum & export control",
  review: "Review",
};

// ─── Pure helpers (exported for tests; display-only — server re-enforces) ────

export interface WizardScreen {
  key: string;
  section: SectionId;
  nodes: QuestionNode[];
}

/**
 * Group visible nodes into wizard screens: nodes sharing a `screenGroup`
 * collapse to ONE screen (Task 1.4 rendering hint — `q1_5_headcount` +
 * `q1_5_turnover` render together). Mirrors `countScreens` arithmetic:
 * `groupIntoScreens(nodes).length === countScreens(nodes)`.
 */
export function groupIntoScreens(
  nodes: readonly QuestionNode[],
): WizardScreen[] {
  const screens: WizardScreen[] = [];
  const byGroup = new Map<string, WizardScreen>();
  for (const node of nodes) {
    if (node.screenGroup !== undefined) {
      const existing = byGroup.get(node.screenGroup);
      if (existing !== undefined) {
        existing.nodes.push(node);
        continue;
      }
      const screen: WizardScreen = {
        key: node.screenGroup,
        section: node.section,
        nodes: [node],
      };
      byGroup.set(node.screenGroup, screen);
      screens.push(screen);
    } else {
      screens.push({ key: node.id, section: node.section, nodes: [node] });
    }
  }
  return screens;
}

/** Effective rendering spec for a node in a tier (quick may use the coarse variant). */
export function effectiveNodeSpec(
  node: QuestionNode,
  tier: "quick" | "full",
): { kind: QuestionNode["kind"]; options?: QuestionOption[] } {
  if (tier === "quick" && node.quickVariant !== undefined) {
    return {
      kind: node.quickVariant.kind,
      options: node.quickVariant.options ?? node.options,
    };
  }
  return { kind: node.kind, options: node.options };
}

/** A screen is complete when every node carries an answered or unsure state. */
export function screenComplete(
  screen: WizardScreen,
  answers: AnswerMap,
): boolean {
  return screen.nodes.every((node) => {
    const answer = answers[node.id];
    return (
      answer !== undefined &&
      (answer.state === "answered" || answer.state === "unsure")
    );
  });
}

/**
 * The submission map for this tier: every tier-eligible question is present —
 * visible ones with the user's answer, branch-skipped ones recorded EXPLICITLY
 * as `{state:"not_asked"}`. Stored answers belonging to the OTHER tier are
 * deliberately omitted (they are not part of this tier's submission and must
 * survive untouched on the profile for carry-forward).
 */
export function finalizeAnswers(
  graph: readonly QuestionNode[],
  tier: "quick" | "full",
  answers: AnswerMap,
): AnswerMap {
  const visibleIds = new Set(
    visibleQuestions(graph, tier, answers).map((n) => n.id),
  );
  const out: AnswerMap = {};
  for (const node of graph) {
    if (node.tier !== "both" && node.tier !== tier) continue;
    if (visibleIds.has(node.id)) {
      const answer = answers[node.id];
      if (answer !== undefined) out[node.id] = answer;
    } else {
      out[node.id] = { state: "not_asked" };
    }
  }
  return out;
}

/** Human label for a stored answer (check-your-answers rendering). */
export function answerLabelFor(
  node: QuestionNode,
  tier: "quick" | "full",
  answer: TriStateAnswer,
): string {
  if (answer.state === "not_asked") return "Not asked";
  if (answer.state === "unsure") return UNSURE_LABEL;
  const spec = effectiveNodeSpec(node, tier);
  const value = answer.value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (value.length === 0) return "None provided";
    return value
      .map((v) => spec.options?.find((o) => o.value === v)?.label ?? v)
      .join("; ");
  }
  return (
    spec.options?.find((o) => o.value === String(value))?.label ?? String(value)
  );
}

/** Defensive parse of profile answers from the API (unknown ids / shapes dropped). */
export function sanitizeAnswers(
  raw: unknown,
  graph: readonly QuestionNode[],
): AnswerMap {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const knownIds = new Set(graph.map((n) => n.id));
  const out: AnswerMap = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!knownIds.has(id)) continue;
    const parsed = triStateAnswerSchema.safeParse(value);
    if (parsed.success) out[id] = parsed.data;
  }
  return out;
}

// ─── Internal rendering helpers (top-level — never defined inside render) ────

function toLegacyQuestion(
  node: QuestionNode,
  tier: "quick" | "full",
  step: number,
): LegacyQuestion {
  const spec = effectiveNodeSpec(node, tier);
  const options: LegacyQuestion["options"] = [];
  if (spec.kind === "boolean") {
    options.push(
      { id: BOOL_YES, value: BOOL_YES, label: "Yes", description: "" },
      { id: BOOL_NO, value: BOOL_NO, label: "No", description: "" },
    );
  } else {
    for (const option of spec.options ?? []) {
      options.push({
        id: option.value,
        value: option.value,
        label: option.label,
        description: option.description ?? "",
      });
    }
  }
  if (node.unsureMode === "option" && spec.kind !== "multi") {
    // UI sugar only: selecting this stores {state:"unsure"} — the sentinel
    // value never reaches the profile API (Task 1.3 binding convention).
    // NEVER appended to multi-select option lists: a checkbox sentinel could
    // be toggled into an answered array — multi questions get a separate
    // unsure button instead (SoloScreen).
    options.push({
      id: UNSURE_SENTINEL,
      value: UNSURE_SENTINEL,
      label: UNSURE_LABEL,
      description: UNSURE_DESCRIPTION,
    });
  }
  return {
    id: node.id,
    step,
    title: node.title,
    options,
    isMultiSelect: spec.kind === "multi",
    maxSelections: spec.kind === "multi" ? options.length : undefined,
  };
}

function selectedValueFor(answer: TriStateAnswer | undefined): string | null {
  if (answer === undefined) return null;
  if (answer.state === "unsure") return UNSURE_SENTINEL;
  if (answer.state !== "answered") return null;
  if (typeof answer.value === "boolean")
    return answer.value ? BOOL_YES : BOOL_NO;
  return typeof answer.value === "string" ? answer.value : null;
}

function decodeSelection(
  kind: QuestionNode["kind"],
  raw: string | boolean | number,
): TriStateAnswer {
  if (raw === UNSURE_SENTINEL) return { state: "unsure" };
  if (kind === "boolean") return { state: "answered", value: raw === BOOL_YES };
  return { state: "answered", value: String(raw) };
}

/** Inline option list for multi-node (screenGroup) screens — no auto-advance. */
function GroupOptionBlock({
  node,
  tier,
  answer,
  onAnswer,
}: {
  node: QuestionNode;
  tier: "quick" | "full";
  answer: TriStateAnswer | undefined;
  onAnswer: (answer: TriStateAnswer) => void;
}) {
  const spec = effectiveNodeSpec(node, tier);
  const selected = selectedValueFor(answer);
  return (
    <div className="mb-10">
      <h3 className="text-title font-medium text-[#1d1d1f] text-center mb-2">
        {node.title}
      </h3>
      <WhyPanel why={node.why} citations={node.citation} />
      <div
        role="radiogroup"
        aria-label={node.title}
        className="space-y-3 max-w-2xl mx-auto mt-4"
      >
        {(spec.options ?? []).map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            description={option.description ?? ""}
            isSelected={selected === option.value}
            onClick={() => onAnswer({ state: "answered", value: option.value })}
          />
        ))}
        {node.unsureMode === "option" && (
          <OptionCard
            label={UNSURE_LABEL}
            description={UNSURE_DESCRIPTION}
            isSelected={answer?.state === "unsure"}
            onClick={() => onAnswer({ state: "unsure" })}
          />
        )}
      </div>
    </div>
  );
}

/** Free-text / country-list entry (full-tier kinds; minimal but functional). */
function TextEntryBlock({
  node,
  tier,
  answer,
  onCommit,
}: {
  node: QuestionNode;
  tier: "quick" | "full";
  answer: TriStateAnswer | undefined;
  onCommit: (answer: TriStateAnswer) => void;
}) {
  const spec = effectiveNodeSpec(node, tier);
  const initial =
    answer?.state === "answered"
      ? Array.isArray(answer.value)
        ? answer.value.join(", ")
        : String(answer.value)
      : "";
  const [text, setText] = useState(initial);

  function commit() {
    const trimmed = text.trim();
    if (spec.kind === "country_multi") {
      const list = trimmed
        .split(/[,;\s]+/)
        .map((c) => c.trim().toLowerCase())
        .filter((c) => c.length > 0);
      onCommit({ state: "answered", value: list });
      return;
    }
    if (trimmed.length === 0) return;
    onCommit({ state: "answered", value: trimmed });
  }

  return (
    <div className="mb-10 max-w-2xl mx-auto">
      <h3 className="text-title font-medium text-[#1d1d1f] text-center mb-2">
        {node.title}
      </h3>
      <WhyPanel why={node.why} citations={node.citation} />
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label={node.title}
        placeholder={
          spec.kind === "country_multi"
            ? "Country codes, comma-separated (e.g. de, fr, lu)"
            : "Type your answer"
        }
        className="mt-4 w-full rounded-xl bg-white border border-black/[0.08] px-4 py-3 text-body-lg text-[#1d1d1f] placeholder:text-black/30 focus:border-black/[0.35] focus:outline-none"
      />
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={commit}
          className="flex items-center gap-2 px-8 py-3 rounded-full text-body-lg font-medium bg-[#1d1d1f] text-white hover:bg-black transition-all"
        >
          Continue
          <ArrowRight size={16} aria-hidden="true" />
        </button>
        {node.unsureMode === "option" && (
          <button
            type="button"
            onClick={() => onCommit({ state: "unsure" })}
            className="px-6 py-3 rounded-full text-body-lg bg-black/[0.04] border border-black/[0.12] text-black/70 hover:bg-black/[0.05] hover:text-[#1d1d1f] transition-all"
          >
            {UNSURE_LABEL}
          </button>
        )}
      </div>
    </div>
  );
}

const BATTERY_STATUS_LABELS: Record<BatteryItemStatus, string> = {
  evidenced: "Evidenced",
  undocumented: "Undocumented",
  partial: "Partial",
  missing: "Missing",
  unsure: "Not sure",
};

/** Per-item status battery (Q6.6 pattern; full tier). Stored "itemId:status". */
function BatteryBlock({
  node,
  answer,
  onCommit,
}: {
  node: QuestionNode;
  answer: TriStateAnswer | undefined;
  onCommit: (answer: TriStateAnswer) => void;
}) {
  const items = node.items ?? [];
  const [statuses, setStatuses] = useState<Record<string, BatteryItemStatus>>(
    () => {
      const initial: Record<string, BatteryItemStatus> = {};
      if (answer?.state === "answered" && Array.isArray(answer.value)) {
        for (const entry of answer.value) {
          const [itemId, status] = String(entry).split(":");
          if (
            items.some((item) => item.id === itemId) &&
            (BATTERY_ITEM_STATUSES as readonly string[]).includes(status)
          ) {
            initial[itemId] = status as BatteryItemStatus;
          }
        }
      }
      return initial;
    },
  );
  const complete = items.every((item) => statuses[item.id] !== undefined);

  return (
    <div className="mb-10 max-w-2xl mx-auto">
      <h3 className="text-title font-medium text-[#1d1d1f] text-center mb-2">
        {node.title}
      </h3>
      <WhyPanel why={node.why} citations={node.citation} />
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl bg-white border border-black/[0.08] p-4"
          >
            <p className="text-body-lg text-[#1d1d1f] mb-3">{item.label}</p>
            <div
              role="radiogroup"
              aria-label={item.label}
              className="flex flex-wrap gap-2"
            >
              {BATTERY_ITEM_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="radio"
                  aria-checked={statuses[item.id] === status}
                  onClick={() =>
                    setStatuses((prev) => ({ ...prev, [item.id]: status }))
                  }
                  className={`px-3 py-1.5 rounded-full text-small transition-all ${
                    statuses[item.id] === status
                      ? "bg-black/[0.06] border border-black text-[#1d1d1f]"
                      : "bg-black/[0.03] border border-black/[0.08] text-black/60 hover:text-[#1d1d1f]"
                  }`}
                >
                  {BATTERY_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() =>
            onCommit({
              state: "answered",
              value: items.map((item) => `${item.id}:${statuses[item.id]}`),
            })
          }
          disabled={!complete}
          className={`flex items-center gap-2 px-8 py-3 rounded-full text-body-lg font-medium transition-all ${
            complete
              ? "bg-[#1d1d1f] text-white hover:bg-black"
              : "bg-black/[0.06] text-black/45 cursor-not-allowed"
          }`}
        >
          Continue
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── The wizard ───────────────────────────────────────────────────────────────

export interface SpineWizardProps {
  tier?: "quick" | "full";
  /** Injectable for tests; defaults to the real question graph. */
  graph?: readonly QuestionNode[];
  profileEndpoint?: string;
  calculateEndpoint?: string;
  resultsPath?: string;
  headline?: string;
}

type WizardPhase = "loading" | "wizard" | "review";

export default function SpineWizard({
  tier = "quick",
  graph = QUESTION_GRAPH,
  profileEndpoint = "/api/assessment/v2/profile",
  calculateEndpoint = "/api/assessment/v2/quick",
  resultsPath = "/assessment/quick/results",
  headline = "Quick Compliance Check",
}: SpineWizardProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<WizardPhase>("loading");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [screenKey, setScreenKey] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const [formingCount, setFormingCount] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Anti-bot timing: startedAt is REQUIRED by the quick endpoint (Task 2.2).
  const startedAtRef = useRef<number>(Date.now());
  const lastInterimRef = useRef<string | null>(null);

  // Derived during render — same evaluator the server enforces with.
  const visible = useMemo(
    () => visibleQuestions(graph, tier, answers),
    [graph, tier, answers],
  );
  const screens = useMemo(() => groupIntoScreens(visible), [visible]);
  const contradictions = useMemo(
    () => detectContradictions(answers),
    [answers],
  );
  const questionTitles = useMemo(() => {
    const titles: Record<string, string> = {};
    for (const node of graph) titles[node.id] = node.title;
    return titles;
  }, [graph]);

  const resolvedIndex =
    screenKey === null
      ? 0
      : Math.max(
          0,
          screens.findIndex((screen) => screen.key === screenKey),
        );
  const currentScreen = screens[resolvedIndex] ?? null;
  const totalSteps = screens.length + 1; // + the mandatory check-your-answers step
  const currentStep = phase === "review" ? totalSteps : resolvedIndex + 1;

  const reviewEntries = useMemo<ReviewEntry[]>(() => {
    const entries: ReviewEntry[] = [];
    for (const screen of screens) {
      for (const node of screen.nodes) {
        const answer = answers[node.id];
        if (
          answer === undefined ||
          (answer.state !== "answered" && answer.state !== "unsure")
        ) {
          continue;
        }
        entries.push({
          questionId: node.id,
          title: node.title,
          answerLabel: answerLabelFor(node, tier, answer),
          state: answer.state,
          screenKey: screen.key,
        });
      }
    }
    return entries;
  }, [screens, answers, tier]);

  // ─── Profile bootstrap: GET resume → POST create (cookie carry-forward) ───
  useEffect(() => {
    // Lead attribution: remember ?utm_source=… (e.g. the ILA QR) so the
    // email gate on the RESULTS page can stamp it onto the lead row.
    rememberUtmSource();
    let cancelled = false;
    (async () => {
      let resumed: AnswerMap = {};
      try {
        const res = await fetch(profileEndpoint, { method: "GET" });
        if (res.ok) {
          const json: unknown = await res.json().catch(() => null);
          const profile =
            json !== null && typeof json === "object" && "profile" in json
              ? (json as { profile: unknown }).profile
              : json;
          if (profile !== null && typeof profile === "object") {
            resumed = sanitizeAnswers(
              (profile as { answers?: unknown }).answers,
              graph,
            );
          }
        } else {
          await fetch(profileEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...csrfHeaders() },
            body: "{}",
          }).catch(() => null);
        }
      } catch {
        // Profile persistence is best-effort on the client; the wizard stays
        // usable — the calculate endpoint persists the submission server-side.
      }
      if (cancelled) return;
      setAnswers(resumed);
      const resumedScreens = groupIntoScreens(
        visibleQuestions(graph, tier, resumed),
      );
      const firstIncomplete = resumedScreens.find(
        (screen) => !screenComplete(screen, resumed),
      );
      if (firstIncomplete !== undefined) {
        setScreenKey(firstIncomplete.key);
        setPhase("wizard");
      } else if (resumedScreens.length > 0 && Object.keys(resumed).length > 0) {
        // Everything already answered (resume after completion) → review.
        setPhase("review");
      } else {
        setScreenKey(resumedScreens[0]?.key ?? null);
        setPhase("wizard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [graph, tier, profileEndpoint]);

  // ─── Persistence (server-side, no localStorage) ───
  async function persistPatch(patch: AnswerMap, section: SectionId) {
    try {
      const res = await fetch(profileEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ answers: patch, currentSection: section }),
      });
      if (!res.ok) {
        setSaveError(
          "We couldn’t save your last answer to the server. You can keep going — we’ll retry with your next answer.",
        );
      }
    } catch {
      setSaveError(
        "We couldn’t save your last answer to the server. You can keep going — we’ll retry with your next answer.",
      );
    }
  }

  // ─── Forming counter: interim quick-calculate at section boundaries ───
  function maybeInterimCalculate(
    nextAnswers: AnswerMap,
    fromSection: SectionId | null,
    toSection: SectionId | "review",
  ) {
    if (tier !== "quick") return;
    if (fromSection === null || fromSection === toSection) return;
    const body = JSON.stringify({
      answers: finalizeAnswers(graph, tier, nextAnswers),
      startedAt: startedAtRef.current,
      interim: true,
    });
    if (lastInterimRef.current === body) return;
    lastInterimRef.current = body;
    void (async () => {
      try {
        const res = await fetch(calculateEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body,
        });
        if (!res.ok) return; // the counter never invents a number
        const count = extractFormingCount(await res.json().catch(() => null));
        if (count !== null) setFormingCount(count);
      } catch {
        // Silently keep the previous server-confirmed count (or none).
      }
    })();
  }

  // ─── Answer commit: store, clean hidden branches, persist, advance ───
  function commitAnswer(
    node: QuestionNode,
    answer: TriStateAnswer,
    options: { advance: boolean },
  ) {
    const next: AnswerMap = { ...answers, [node.id]: answer };
    const patch: AnswerMap = { [node.id]: answer };

    // A branch change may hide previously-answered questions of THIS tier —
    // convert them to explicit not_asked (no answer smuggling past branches).
    // Other-tier answers are never touched (carry-forward).
    const visibleAfter = new Set(
      visibleQuestions(graph, tier, next).map((n) => n.id),
    );
    for (const other of graph) {
      if (other.tier !== "both" && other.tier !== tier) continue;
      if (other.id === node.id || visibleAfter.has(other.id)) continue;
      const existing = next[other.id];
      if (
        existing !== undefined &&
        (existing.state === "answered" || existing.state === "unsure")
      ) {
        next[other.id] = { state: "not_asked" };
        patch[other.id] = { state: "not_asked" };
      }
    }

    setAnswers(next);
    setSaveError(null);
    void persistPatch(patch, node.section);
    if (options.advance) advanceFrom(next);
  }

  function advanceFrom(nextAnswers: AnswerMap) {
    const nextScreens = groupIntoScreens(
      visibleQuestions(graph, tier, nextAnswers),
    );
    const fromIdx =
      screenKey === null
        ? 0
        : Math.max(
            0,
            nextScreens.findIndex((screen) => screen.key === screenKey),
          );
    const fromSection = nextScreens[fromIdx]?.section ?? null;
    const after = nextScreens
      .slice(fromIdx + 1)
      .find((screen) => !screenComplete(screen, nextAnswers));
    const target =
      after ??
      nextScreens.find((screen) => !screenComplete(screen, nextAnswers));

    setDirection(1);
    if (target === undefined) {
      setPhase("review");
      maybeInterimCalculate(nextAnswers, fromSection, "review");
    } else {
      setPhase("wizard");
      setScreenKey(target.key);
      maybeInterimCalculate(nextAnswers, fromSection, target.section);
    }
  }

  function handleBack() {
    setDirection(-1);
    if (phase === "review") {
      setPhase("wizard");
      setScreenKey(screens[screens.length - 1]?.key ?? null);
      return;
    }
    if (resolvedIndex > 0) {
      setScreenKey(screens[resolvedIndex - 1].key);
    }
  }

  function handleChangeFromReview(targetKey: string) {
    setDirection(-1);
    setSubmitErrors([]);
    setPhase("wizard");
    setScreenKey(targetKey);
  }

  // ─── Final submit: server-enforced calculate (Task 2.2 contract) ───
  async function handleSubmit() {
    if (contradictions.length > 0 || submitting) return;
    setSubmitting(true);
    setSubmitErrors([]);
    try {
      const res = await fetch(calculateEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          answers: finalizeAnswers(graph, tier, answers),
          startedAt: startedAtRef.current,
        }),
      });
      if (res.ok) {
        router.push(resultsPath);
        return;
      }
      if (res.status === 429) {
        // Honest, actionable copy instead of the raw "Too Many Requests" —
        // answers are persisted server-side, so retrying later loses nothing.
        setSubmitErrors([
          "Too many checks from your connection in the last hour. Your answers are saved — please wait a few minutes, then press “See my results” again.",
        ]);
        return;
      }
      const data: unknown = await res.json().catch(() => null);
      const messages: string[] = [];
      if (data !== null && typeof data === "object") {
        const payload = data as {
          errors?: unknown;
          contradictions?: unknown;
          error?: unknown;
        };
        if (Array.isArray(payload.errors)) {
          for (const item of payload.errors) {
            if (typeof item === "string") messages.push(item);
            else if (
              item !== null &&
              typeof item === "object" &&
              typeof (item as { message?: unknown }).message === "string"
            ) {
              messages.push((item as { message: string }).message);
            }
          }
        }
        if (Array.isArray(payload.contradictions)) {
          for (const item of payload.contradictions) {
            if (
              item !== null &&
              typeof item === "object" &&
              typeof (item as { message?: unknown }).message === "string"
            ) {
              messages.push((item as { message: string }).message);
            }
          }
        }
        if (messages.length === 0 && typeof payload.error === "string") {
          messages.push(payload.error);
        }
      }
      if (messages.length === 0) {
        messages.push(
          `The assessment service rejected the submission (HTTP ${res.status}). Please try again.`,
        );
      }
      setSubmitErrors(messages);
    } catch {
      setSubmitErrors([
        "Could not reach the assessment service. Please check your connection and try again.",
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div
        className="landing-page min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="w-10 h-10 border-2 border-black/[0.15] border-t-[#1d1d1f] rounded-full animate-spin mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-body text-black/45">Preparing your assessment…</p>
        </div>
      </div>
    );
  }

  const sectionLabel =
    phase === "review"
      ? SECTION_LABELS.review
      : currentScreen !== null
        ? SECTION_LABELS[currentScreen.section]
        : "";

  return (
    <div className="landing-page min-h-screen bg-[#f5f5f7] text-[#1d1d1f] py-12 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          {phase === "review" || resolvedIndex > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-body text-black/45 hover:text-[#1d1d1f] transition-colors"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Back</span>
            </button>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2 text-body text-black/45 hover:text-[#1d1d1f] transition-colors"
            >
              <Home size={14} aria-hidden="true" />
              <span>Home</span>
            </Link>
          )}
          <span className="text-caption font-medium text-black/40 uppercase tracking-[0.2em]">
            {headline}
          </span>
        </div>

        {/* Legal disclaimer on the first screen */}
        {phase === "wizard" && resolvedIndex === 0 && (
          <div className="mb-6">
            <DisclaimerBanner variant="banner" theme="light" />
          </div>
        )}

        {/* Progress (screens + the review step) + section label */}
        <div className="mb-6">
          <div className="max-w-2xl mx-auto mb-2 flex items-center justify-between">
            <span className="text-caption uppercase tracking-[0.15em] text-black/45">
              {sectionLabel}
            </span>
            <FormingCounter count={formingCount} />
          </div>
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </div>

        {/* Save-failure notice (persistence is best-effort; honesty: say so) */}
        {saveError !== null && (
          <div className="max-w-2xl mx-auto mb-6">
            <p
              role="alert"
              className="text-small text-black/70 bg-black/[0.04] border border-black/[0.15] rounded-lg px-4 py-2.5"
            >
              {saveError}
            </p>
          </div>
        )}

        <div className="mt-10">
          {phase === "review" ? (
            <CheckYourAnswers
              entries={reviewEntries}
              contradictions={contradictions}
              questionTitles={questionTitles}
              onChange={handleChangeFromReview}
              onConfirm={handleSubmit}
              submitting={submitting}
              submitErrors={submitErrors}
            />
          ) : currentScreen !== null ? (
            <div role="region" aria-label="Assessment question">
              {currentScreen.nodes.length === 1 ? (
                <SoloScreen
                  key={currentScreen.key}
                  node={currentScreen.nodes[0]}
                  tier={tier}
                  questionNumber={resolvedIndex + 1}
                  direction={direction}
                  answer={answers[currentScreen.nodes[0].id]}
                  onCommit={(answer) =>
                    commitAnswer(currentScreen.nodes[0], answer, {
                      advance: true,
                    })
                  }
                />
              ) : (
                <GroupScreen
                  key={currentScreen.key}
                  screen={currentScreen}
                  tier={tier}
                  answers={answers}
                  onAnswer={(node, answer) =>
                    commitAnswer(node, answer, { advance: false })
                  }
                  onContinue={() => advanceFrom(answers)}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Screen renderers (top-level components) ─────────────────────────────────

function SoloScreen({
  node,
  tier,
  questionNumber,
  direction,
  answer,
  onCommit,
}: {
  node: QuestionNode;
  tier: "quick" | "full";
  questionNumber: number;
  direction: number;
  answer: TriStateAnswer | undefined;
  onCommit: (answer: TriStateAnswer) => void;
}) {
  const spec = effectiveNodeSpec(node, tier);

  if (spec.kind === "multi") {
    const question = toLegacyQuestion(node, tier, questionNumber);
    const selected =
      answer?.state === "answered" && Array.isArray(answer.value)
        ? answer.value
        : [];
    return (
      <div>
        <MultiSelectQuestionStep
          question={question}
          questionNumber={questionNumber}
          selectedValues={selected}
          onContinue={(values) =>
            onCommit({ state: "answered", value: values.map(String) })
          }
          direction={direction}
        />
        {node.unsureMode === "option" && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => onCommit({ state: "unsure" })}
              className="text-small text-black/45 hover:text-[#1d1d1f] transition-colors underline underline-offset-4"
            >
              {UNSURE_LABEL}
            </button>
          </div>
        )}
        <WhyPanel why={node.why} citations={node.citation} />
      </div>
    );
  }

  if (spec.kind === "text" || spec.kind === "country_multi") {
    return (
      <TextEntryBlock
        node={node}
        tier={tier}
        answer={answer}
        onCommit={onCommit}
      />
    );
  }

  if (spec.kind === "battery") {
    return <BatteryBlock node={node} answer={answer} onCommit={onCommit} />;
  }

  // single | bands | boolean — the legacy auto-advance card step
  const question = toLegacyQuestion(node, tier, questionNumber);
  return (
    <div>
      <QuestionStep
        question={question}
        questionNumber={questionNumber}
        selectedValue={selectedValueFor(answer)}
        onSelect={(raw) => onCommit(decodeSelection(spec.kind, raw))}
        direction={direction}
      />
      <WhyPanel why={node.why} citations={node.citation} />
    </div>
  );
}

function GroupScreen({
  screen,
  tier,
  answers,
  onAnswer,
  onContinue,
}: {
  screen: WizardScreen;
  tier: "quick" | "full";
  answers: AnswerMap;
  onAnswer: (node: QuestionNode, answer: TriStateAnswer) => void;
  onContinue: () => void;
}) {
  const complete = screenComplete(screen, answers);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen.key}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full"
      >
        {screen.nodes.map((node) => (
          <GroupOptionBlock
            key={node.id}
            node={node}
            tier={tier}
            answer={answers[node.id]}
            onAnswer={(answer) => onAnswer(node, answer)}
          />
        ))}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onContinue}
            disabled={!complete}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-full text-body-lg font-medium transition-all ${
              complete
                ? "bg-[#1d1d1f] text-white hover:bg-black hover:shadow-[0_4px_14px_rgba(0,0,0,0.18)] cursor-pointer"
                : "bg-black/[0.06] text-black/45 cursor-not-allowed"
            }`}
          >
            Continue
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
