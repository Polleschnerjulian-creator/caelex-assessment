import { describe, it, expect } from "vitest";
import { listScenarios } from "./index";
import type { ScholarPlanspielScenario } from "./types";
import { PLANSPIELE_PLAY } from "@/app/(scholar)/scholar/_i18n/planspiele-play";

/**
 * Every i18n key a scenario references MUST exist in the merged PLANSPIELE_PLAY.en
 * namespace — otherwise the cockpit/brief/results render the RAW dotted key to the
 * student (visible, embarrassing, not caught by tsc or the integrity test). This
 * test collects every *Key a scenario uses (titles, role briefs, phase briefs,
 * artifact field labels, rubric labels, answer-key feedback notes) and asserts EN
 * coverage. DE is allowed to degrade to EN, so we only assert the EN source-of-truth.
 */
function collectKeys(s: ScholarPlanspielScenario): string[] {
  const keys: string[] = [s.titleKey, s.summaryKey];
  for (const r of s.roles) {
    keys.push(r.nameKey, r.goalKey, r.briefKey, r.privateBriefKey);
  }
  for (const p of s.phases) {
    keys.push(p.titleKey, p.briefKey);
    for (const f of p.artifact.fields ?? []) keys.push(f.labelKey);
    for (const c of p.rubric) keys.push(c.labelKey);
  }
  for (const entry of Object.values(s.answerKey ?? {})) {
    if (entry.type === "exactMatch") keys.push(entry.okNote, entry.wrongNote);
    else keys.push(entry.okNote, entry.partialNote);
  }
  return keys;
}

const EN_KEYS = new Set(Object.keys(PLANSPIELE_PLAY.en));

describe("planspiele i18n coverage", () => {
  for (const scenario of listScenarios()) {
    it(`${scenario.id}: every referenced i18n key resolves in PLANSPIELE_PLAY.en`, () => {
      const missing = collectKeys(scenario).filter((k) => !EN_KEYS.has(k));
      expect(missing, `missing EN keys for ${scenario.id}`).toEqual([]);
    });
  }
});
