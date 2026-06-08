import "server-only";
import type {
  ScholarPlanspielScenario,
  ScholarPlanspielPhase,
} from "@/data/scholar/planspiele/types";
import type { RubricLine } from "./scoring.server";

/**
 * Track-2 — the Scholar-native AI coach for free-text artifacts.
 *
 * This mirrors ONLY the Anthropic *call pattern* of the Astra engine (env-model,
 * graceful no-key fallback, robust parse). It deliberately does NOT reuse
 * AstraEngine / buildCompleteContext / the org tool-executor — those wire the
 * org's live compliance posture, which is wrong inside a fictional teaching
 * scenario (and Astra is a frozen surface).
 *
 * Cost posture (owner decision): when no ANTHROPIC_API_KEY is configured the
 * module degrades to a deterministic rubric-checklist self-assessment, so the
 * whole feature runs at ZERO external cost. The AI path activates only where a
 * key is present.
 */

export interface CoachInput {
  scenario: ScholarPlanspielScenario;
  phase: ScholarPlanspielPhase;
  artifactText: string;
}

export interface CoachOutput {
  mode: "ai" | "fallback";
  lines: RubricLine[];
  summary: string; // i18n key or literal
}

const MODEL = process.env.SCHOLAR_COACH_MODEL ?? "claude-sonnet-4-6";

/** Count distinct provision-like citations in free text (Art. N, § N, "Law 89/2025"). */
export function countCitations(text: string): number {
  const matches =
    text.match(/\b(art\.?|article|§|law)\s*[\dA-Za-z/.-]+/gi) ?? [];
  return new Set(matches.map((m) => m.toLowerCase().replace(/\s+/g, " "))).size;
}

/** Deterministic, zero-cost rubric checklist used when no ANTHROPIC_API_KEY is present. */
export function fallbackReview(input: CoachInput): CoachOutput {
  const { phase, artifactText } = input;
  const aiCrit = phase.rubric.filter((r) => r.track === "ai");
  const wordCount = artifactText.trim().split(/\s+/).filter(Boolean).length;
  const citations = countCitations(artifactText);
  const minCites = phase.artifact.minCitations ?? 0;

  const lines: RubricLine[] = aiCrit.map((crit) => {
    if (crit.key === "citation_accuracy") {
      const correct = citations >= Math.max(1, minCites);
      return {
        category: crit.key,
        weight: crit.weight,
        earned: correct ? crit.weight : 0,
        correct,
        note: correct ? "coach.cites.ok" : "coach.cites.few",
      };
    }
    // Length-proportional provisional credit; the UI shows a self-assessment prompt.
    const ratio = Math.min(1, wordCount / 120);
    return {
      category: crit.key,
      weight: crit.weight,
      earned: Math.round(ratio * crit.weight * 0.7),
      correct: false,
      note: "coach.selfassess",
    };
  });

  return { mode: "fallback", lines, summary: "coach.fallback.summary" };
}

export async function coachReviewArtifact(
  input: CoachInput,
): Promise<CoachOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackReview(input);

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: buildScenarioScopedPrompt(input),
      messages: [{ role: "user", content: rubricUserPrompt(input) }],
    });
    const parsed = parseCoachJson(res);
    if (!parsed) return fallbackReview(input);
    return validateCoachCitations(parsed);
  } catch {
    // Any error (network, parse, quota) → graceful zero-cost path.
    return fallbackReview(input);
  }
}

// ─── AI-path helpers (active only when ANTHROPIC_API_KEY is set) ──────────────

function buildScenarioScopedPrompt(input: CoachInput): string {
  const crit = input.phase.rubric
    .filter((r) => r.track === "ai")
    .map((r) => `- ${r.key} (weight ${r.weight})`)
    .join("\n");
  return [
    "You are a legal-education coach grading a student's drafted artifact in a space-law role-play.",
    "Grade ONLY against the rubric criteria below. Cite only real provisions; never invent a regime.",
    "Return STRICT JSON: { lines: [{category, weight, earned, correct, note}], summary }.",
    `Scenario: ${input.scenario.id} (${input.scenario.jurisdiction}).`,
    `Phase: ${input.phase.phaseKey}.`,
    `Rubric:\n${crit}`,
  ].join("\n");
}

function rubricUserPrompt(input: CoachInput): string {
  return `Student artifact:\n"""\n${input.artifactText.slice(0, 8000)}\n"""`;
}

function parseCoachJson(res: unknown): CoachOutput | null {
  try {
    const text = (res as { content: { type: string; text?: string }[] }).content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const json = JSON.parse(
      text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
    );
    if (!Array.isArray(json.lines)) return null;
    return {
      mode: "ai",
      lines: json.lines as RubricLine[],
      summary: String(json.summary ?? ""),
    };
  } catch {
    return null;
  }
}

/**
 * Sprint-8 integration point: wire the existing corpus citation-validator so any
 * AI-emitted line citing an unresolved reference is demoted to correct:false with
 * note "coach.cites.unverified". For the MVP the AI output passes through.
 */
function validateCoachCitations(out: CoachOutput): CoachOutput {
  return out;
}
