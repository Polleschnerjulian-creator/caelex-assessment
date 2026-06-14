// src/lib/trade/classification/claude-vision-extractor.vocab.test.ts
import { describe, it, expect } from "vitest";
import {
  __buildSystemPromptForTest,
  PROMPT_VOCABULARY_NAMES,
} from "./claude-vision-extractor.server";

describe("scoped vision vocabulary", () => {
  it("now includes the decisive extended attributes", () => {
    expect(PROMPT_VOCABULARY_NAMES).toContain("starTrackerAccuracyArcsec");
    expect(PROMPT_VOCABULARY_NAMES).toContain("starTrackerSlewRateDegPerS");
    expect(PROMPT_VOCABULARY_NAMES).toContain("gnssMaxVelocityMPerS");
  });
  it("a vocabularySubset prompt asks ONLY for the listed attributes", () => {
    const prompt = __buildSystemPromptForTest(["starTrackerAccuracyArcsec"]);
    expect(prompt).toContain("starTrackerAccuracyArcsec");
    expect(prompt).not.toContain("antennaAdaptiveBeamforming");
  });
});
