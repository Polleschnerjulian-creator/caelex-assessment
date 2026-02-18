/**
 * Generate 2.0 — Prompt Builder
 *
 * 4-layer prompt assembly for NCA document generation.
 *
 * Layer 1: Base Regulatory (shared, cacheable)
 * Layer 2: Document Template (per type, cacheable)
 * Layer 3: Operator Context (per generation, variable)
 * Layer 4: Quality Rules (shared, cacheable)
 */

import type { NCADocumentType, Generate2DataBundle } from "./types";
import { getBaseRegulatoryPrompt } from "./prompts/base-regulatory";
import { getQualityRules } from "./prompts/quality-rules";
import { buildOperatorContext } from "./prompts/operator-context";
import { getDocumentTemplate } from "./prompts/document-templates";

export function buildGenerate2Prompt(
  docType: NCADocumentType,
  dataBundle: Generate2DataBundle,
  language: string,
): { systemPrompt: string; userMessage: string } {
  // System prompt = Layer 1 + Layer 2 + Layer 4 (cacheable)
  const systemPrompt = [
    getBaseRegulatoryPrompt(),
    getDocumentTemplate(docType),
    getQualityRules(),
    getLanguageDirective(language),
  ].join("\n\n---\n\n");

  // User message = Layer 3 (variable per generation)
  const userMessage = buildOperatorContext(docType, dataBundle);

  return { systemPrompt, userMessage };
}

export function buildSectionPrompt(
  userMessage: string,
  sectionNumber: number,
  sectionTitle: string,
): string {
  return `${userMessage}\n\n---\n\nCRITICAL: Generate ONLY section ${sectionNumber}: "${sectionTitle}". Start directly with "## SECTION: ${sectionTitle}" and produce comprehensive, detailed, NCA-submission-quality content for this section ONLY. Do not include any other sections. Use formal regulatory language in third person. Use the maximum available output length for this one section.`;
}

function getLanguageDirective(language: string): string {
  switch (language) {
    case "de":
      return "## Language\nGenerate all document content in German (Deutsch). Keep regulation article references (e.g., Art. 67 EU Space Act) in their original English form.";
    case "fr":
      return "## Language\nGenerate all document content in French (Français). Keep regulation article references in their original English form.";
    case "es":
      return "## Language\nGenerate all document content in Spanish (Español). Keep regulation article references in their original English form.";
    default:
      return "## Language\nGenerate all document content in English.";
  }
}
