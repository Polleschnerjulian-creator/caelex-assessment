/**
 * Prompt Builder
 *
 * Orchestrates prompt construction for each document type.
 */

import type { AssessmentDataBundle } from "./types";
import {
  SHARED_INSTRUCTIONS,
  getLanguageDirective,
} from "./prompts/shared-instructions";
import { buildDebrisPrompt } from "./prompts/debris-mitigation";
import { buildCybersecurityPrompt } from "./prompts/cybersecurity-framework";
import { buildEnvironmentalPrompt } from "./prompts/environmental-footprint";
import { buildInsurancePrompt } from "./prompts/insurance-compliance";
import { buildNIS2Prompt } from "./prompts/nis2-assessment";
import { buildAuthorizationPrompt } from "./prompts/authorization-package";

export function buildPrompt(
  dataBundle: AssessmentDataBundle,
  language: string,
): { systemPrompt: string; userMessage: string } {
  const languageDirective = getLanguageDirective(language);

  let documentSpecificPrompt: string;

  switch (dataBundle.type) {
    case "DEBRIS_MITIGATION_PLAN":
      documentSpecificPrompt = buildDebrisPrompt(dataBundle.data);
      break;
    case "CYBERSECURITY_FRAMEWORK":
      documentSpecificPrompt = buildCybersecurityPrompt(dataBundle.data);
      break;
    case "ENVIRONMENTAL_FOOTPRINT":
      documentSpecificPrompt = buildEnvironmentalPrompt(dataBundle.data);
      break;
    case "INSURANCE_COMPLIANCE":
      documentSpecificPrompt = buildInsurancePrompt(dataBundle.data);
      break;
    case "NIS2_ASSESSMENT":
      documentSpecificPrompt = buildNIS2Prompt(dataBundle.data);
      break;
    case "AUTHORIZATION_APPLICATION":
      documentSpecificPrompt = buildAuthorizationPrompt(dataBundle.data);
      break;
  }

  const systemPrompt = `${SHARED_INSTRUCTIONS}\n\n${languageDirective}`;
  const userMessage = documentSpecificPrompt;

  return { systemPrompt, userMessage };
}
