import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";

/**
 * Atlas amendment-detection summariser.
 *
 * When the link-checker cron detects a content hash change on a legal
 * source URL, this helper asks Claude Haiku to classify the change:
 * is it a substantive legal amendment (new article, date change, repeal
 * etc.) or just cosmetic noise (updated nav, footer year, cookie banner)?
 *
 * Returns a compact structured result the admin queue can render.
 * Silent-fails (returns null summary) when ANTHROPIC_API_KEY is missing
 * so the cron never breaks on config-drift — admins can still review
 * the raw hash change in that case.
 */

const MODEL = process.env.ATLAS_DIFF_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOKENS = 512;
const MAX_INPUT_CHARS = 40_000; // ~10k tokens each side keeps costs bounded

export interface DiffSummary {
  /** 1-2 sentence summary, or "COSMETIC_ONLY" when no legal change. */
  summary: string;
  /** Structured tags like ["article-added", "date-change", "status-change"]. */
  keyChanges: string[];
  /** True when the model judged the diff to be non-substantive. */
  isCosmetic: boolean;
}

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY missing — atlas diff summariser disabled");
    return null;
  }
  return new Anthropic({ apiKey });
}

function extractText(message: Anthropic.Messages.Message): string {
  return message.content
    .filter(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text",
    )
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * Strip obvious HTML boilerplate before sending to the model. We fetch
 * raw page bodies — including scripts/styles — and the summariser only
 * cares about the visible text. Also shrinks the token bill.
 */
function cleanForDiff(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function summariseDiff(params: {
  sourceId: string;
  jurisdiction: string;
  sourceUrl: string;
  previousContent: string;
  newContent: string;
}): Promise<DiffSummary | null> {
  const client = getClient();
  if (!client) return null;

  const prev = cleanForDiff(params.previousContent).slice(0, MAX_INPUT_CHARS);
  const next = cleanForDiff(params.newContent).slice(0, MAX_INPUT_CHARS);

  if (prev === next) {
    // Same visible text — the hash change was from whitespace/HTML noise.
    return {
      summary: "COSMETIC_ONLY",
      keyChanges: [],
      isCosmetic: true,
    };
  }

  const system = [
    "You are a space-law compliance analyst reviewing detected changes on",
    "official legal-source URLs. Given the BEFORE and AFTER visible text of",
    "an official page, classify whether a substantive legal change occurred.",
    "",
    "Reply as strict JSON with these fields:",
    '  "summary": string — 1-2 sentences, plain English, specific. If no',
    "             substantive legal change (only nav/cookie/footer/year/",
    '             layout differences), set summary to "COSMETIC_ONLY".',
    '  "keyChanges": string[] — 0-4 short tags from this set if relevant:',
    '             "article-added", "article-removed", "date-change",',
    '             "status-change", "reference-change", "title-change",',
    '             "authority-change", "scope-change", "penalty-change",',
    '             "transposition-update", "other". Empty array when',
    '             summary is "COSMETIC_ONLY".',
    '  "isCosmetic": boolean — true iff summary is "COSMETIC_ONLY".',
    "",
    "Do not speculate. If the text is truncated or unclear, say so in the",
    "summary. Never infer beyond the supplied text. Return ONLY the JSON,",
    "no code fences, no prose.",
  ].join("\n");

  const user = [
    `Source: ${params.sourceId}  (jurisdiction: ${params.jurisdiction})`,
    `URL: ${params.sourceUrl}`,
    "",
    "=== BEFORE ===",
    prev,
    "",
    "=== AFTER ===",
    next,
  ].join("\n");

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    });

    const raw = extractText(message);
    const parsed = JSON.parse(raw) as {
      summary?: unknown;
      keyChanges?: unknown;
      isCosmetic?: unknown;
    };

    const summary =
      typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const keyChanges = Array.isArray(parsed.keyChanges)
      ? parsed.keyChanges.filter((x): x is string => typeof x === "string")
      : [];
    const isCosmetic =
      typeof parsed.isCosmetic === "boolean"
        ? parsed.isCosmetic
        : summary === "COSMETIC_ONLY";

    if (!summary) return null;

    return { summary, keyChanges, isCosmetic };
  } catch (err) {
    logger.warn("atlas diff summariser failed", {
      sourceId: params.sourceId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
