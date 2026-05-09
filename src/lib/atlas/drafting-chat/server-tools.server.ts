/**
 * Atlas Drafting Chat — server-side tool implementations (Bundle 44).
 *
 * Server tools are the ones that do real work (LLM calls, parsing).
 * Client tools (state mutations) are NOT here — they're packaged as
 * ClientAction records by the engine and returned to the browser.
 *
 * Each implementation:
 *   - Validates its inputs (the LLM doesn't always honor schemas).
 *   - Calls Anthropic when needed (server-only — uses ANTHROPIC_API_KEY).
 *   - Returns a structured result that the engine feeds back into the
 *     chat loop as a tool_result block.
 *   - Surfaces the actual prompt + body + token usage so the
 *     transparency UI can render them.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildAuthPrompt,
  buildBriefPrompt,
  buildComparePrompt,
  buildNdaPrompt,
  buildCoverPrompt,
} from "../prompt-builders";
import { composeMandateContext } from "../mandate-intake";
import {
  buildExtractionPrompt,
  parseExtractionResponse,
} from "../intake-extractor";
import type { BrowserContext } from "./types";

/* ── Anthropic client (lazy) ──────────────────────────────────────── */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY missing — drafting chat requires server-side LLM access. Configure it in your environment.",
    );
  }
  if (!client) client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return client;
}

/* Default generation model — can be overridden per env. The chat
   reasoning model is set by the engine. Generation is lower temp
   because we want consistent, conservative drafts. */
const GENERATION_MODEL =
  process.env.ATLAS_DRAFTING_MODEL || "claude-sonnet-4-6";
const GENERATION_MAX_TOKENS = parseInt(
  process.env.ATLAS_DRAFTING_MAX_TOKENS || "4096",
  10,
);
const GENERATION_TEMPERATURE = parseFloat(
  process.env.ATLAS_DRAFTING_TEMPERATURE || "0.3",
);

/* ── Tool: generate_draft ─────────────────────────────────────────── */

interface GenerateDraftArgs {
  kind: "auth" | "brief" | "compare" | "nda" | "cover";
  args: Record<string, unknown>;
  useMandateContext?: boolean;
  useAttachedClauses?: boolean;
}

export interface GenerateDraftResult {
  prompt: string;
  body: string;
  inputTokens: number;
  outputTokens: number;
}

function buildClauseDirective(ctx: BrowserContext, use: boolean): string {
  if (!use || ctx.attachedClauses.length === 0) return "";
  const heading =
    ctx.outputLang === "de"
      ? "Folgende Standard-Klauseln wortgetreu in den Entwurf einbauen:"
      : "Include the following standard clauses verbatim in the draft:";
  const blocks = ctx.attachedClauses
    .map(
      (c) =>
        `--- ${c.name}${c.jurisdiction ? ` (${c.jurisdiction})` : ""} ---\n${c.content}`,
    )
    .join("\n\n");
  return `\n\n${heading}\n\n${blocks}`;
}

function buildPrivilegePrefix(lang: "de" | "en"): string {
  if (lang === "de") {
    return 'Markiere den gesamten Entwurf oben mit "PRIVILEGIERT & VERTRAULICH — Geschütztes Anwaltsgeheimnis (LPP)" und füge unten einen Hinweis hinzu, dass das Dokument Anwaltsgeheimnis nach § 43a BRAO / Art. 2 EU-Anwaltsrichtlinie unterliegt. ';
  }
  return 'Mark the entire draft at the top with "PRIVILEGED & CONFIDENTIAL — Attorney-Client Work Product" and add a footer note that the document is subject to legal professional privilege. ';
}

/**
 * Compose the full prompt for a draft, including mandate context,
 * clause directive, and privilege prefix. Then call Anthropic.
 *
 * Errors thrown here flow back to the engine as tool_result with
 * is_error=true so the assistant can recover gracefully.
 */
export async function executeGenerateDraft(
  rawArgs: unknown,
  ctx: BrowserContext,
): Promise<GenerateDraftResult> {
  const args = rawArgs as GenerateDraftArgs;
  if (!args || typeof args.kind !== "string") {
    throw new Error("generate_draft: missing 'kind' arg");
  }
  if (!args.args || typeof args.args !== "object") {
    throw new Error("generate_draft: missing 'args' object");
  }

  const useMandate = args.useMandateContext !== false;
  const useClauses = args.useAttachedClauses !== false;
  const activeMandate =
    ctx.mandates.find((m) => m.id === ctx.activeMandateId) ?? null;
  const mandateContext =
    useMandate && activeMandate
      ? composeMandateContext(activeMandate.intake, ctx.outputLang)
      : "";
  const clauseDirective = buildClauseDirective(ctx, useClauses);
  const privilegePrefix = ctx.privileged
    ? buildPrivilegePrefix(ctx.outputLang)
    : "";

  /* Build the kind-specific base prompt. */
  let basePrompt: string;
  switch (args.kind) {
    case "auth": {
      const a = args.args as {
        jurisdiction?: string;
        operatorType?: string;
        mission?: string;
        authorityId?: string;
      };
      /* Auto-fill mission from intake when not provided. */
      let mission = (a.mission ?? "").trim();
      if (!mission && activeMandate) {
        mission = [
          activeMandate.intake.satelliteSpecs.trim(),
          activeMandate.intake.missionProfile.trim(),
          activeMandate.intake.frequencies.trim(),
          activeMandate.intake.launchDate.trim(),
        ]
          .filter(Boolean)
          .join(", ");
      }
      basePrompt = buildAuthPrompt({
        jurisdiction: a.jurisdiction || "DE",
        operatorType: a.operatorType || "satellite_operator",
        mission,
        authorityId: a.authorityId,
        outputLang: ctx.outputLang,
      });
      break;
    }
    case "brief": {
      const a = args.args as { topic?: string };
      basePrompt = buildBriefPrompt({
        topic: a.topic || "",
        mandateContext,
        outputLang: ctx.outputLang,
      });
      break;
    }
    case "compare": {
      const a = args.args as { jurisdictions?: string[] };
      basePrompt = buildComparePrompt({
        jurisdictions: Array.isArray(a.jurisdictions)
          ? a.jurisdictions
          : ["DE", "FR"],
        mandateContext,
        outputLang: ctx.outputLang,
      });
      break;
    }
    case "nda": {
      const a = args.args as {
        ndaType?: "mutual" | "one_way";
        partyA?: string;
        partyB?: string;
        jurisdiction?: string;
        termYears?: string;
      };
      basePrompt = buildNdaPrompt({
        ndaType: a.ndaType || "mutual",
        partyA: a.partyA?.trim() || activeMandate?.intake.client.trim() || "",
        partyB: a.partyB || "",
        jurisdiction: a.jurisdiction || "DE",
        termYears: a.termYears || "3",
        mandateContext,
        outputLang: ctx.outputLang,
      });
      break;
    }
    case "cover": {
      const a = args.args as {
        filingType?: "authorization" | "notification" | "renewal" | "amendment";
        authority?: string;
        reference?: string;
        authorityId?: string;
      };
      basePrompt = buildCoverPrompt({
        filingType: a.filingType || "authorization",
        authority: a.authority || "",
        reference: a.reference || "",
        authorityId: a.authorityId,
        mandateContext,
        outputLang: ctx.outputLang,
      });
      break;
    }
    default:
      throw new Error(`generate_draft: unknown kind '${args.kind}'`);
  }

  /* Compose: privilege-prefix + base + clause-directive (matches studio
     order so prompts are byte-equal between the two surfaces). */
  const fullPrompt = privilegePrefix + basePrompt + clauseDirective;

  /* Call Anthropic for the actual generation. */
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: GENERATION_MODEL,
    max_tokens: GENERATION_MAX_TOKENS,
    temperature: GENERATION_TEMPERATURE,
    messages: [{ role: "user", content: fullPrompt }],
  });

  /* Extract text from response.content[]. */
  const body = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return {
    prompt: fullPrompt,
    body,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/* ── Tool: extract_mandate_facts ──────────────────────────────────── */

interface ExtractFactsArgs {
  emailBody: string;
}

export interface ExtractFactsResult {
  prompt: string;
  rawResponse: string;
  parsed: Record<string, string>;
  inputTokens: number;
  outputTokens: number;
}

export async function executeExtractMandateFacts(
  rawArgs: unknown,
  ctx: BrowserContext,
): Promise<ExtractFactsResult> {
  const args = rawArgs as ExtractFactsArgs;
  if (!args || typeof args.emailBody !== "string" || !args.emailBody.trim()) {
    throw new Error("extract_mandate_facts: missing emailBody");
  }
  const prompt = buildExtractionPrompt(args.emailBody, ctx.outputLang);

  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 1024,
    temperature: 0.1 /* Strict for structured extraction. */,
    messages: [{ role: "user", content: prompt }],
  });

  const rawResponse = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const parsed = parseExtractionResponse(rawResponse) ?? {};
  /* Cast away the partial-intake type since we serialize over JSON. */
  return {
    prompt,
    rawResponse,
    parsed: parsed as Record<string, string>,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
