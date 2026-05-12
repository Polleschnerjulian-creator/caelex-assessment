import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Document Tools (Sprint 5, 2026-05-12).
 *
 * Five tools that operate on AtlasMandateFile.extractedText:
 *   - extract_text_from_pdf(fileId) — return the stored text (or
 *     the deferred-extraction message for PDF/Office binaries).
 *   - find_clauses(fileId, clauseType) — keyword/regex sweep for a
 *     clause family (liability cap, termination, ITAR flow-down …).
 *   - summarize_document(fileId, perspective) — LLM call (Sonnet)
 *     that produces a 200-300 word lawyer-grade summary.
 *   - classify_document(fileId) — LLM-driven richer classification
 *     than the upload-time heuristic.
 *   - compare_documents(fileIdA, fileIdB) — LLM diff of two docs
 *     against the same prompt-driven dimensions.
 *
 * Tools that need the LLM use buildAnthropicClient (Bedrock EU first).
 * Tools that don't need the LLM (extract_text_from_pdf + find_clauses)
 * are pure data — no model call, no cost.
 *
 * Access control: every tool resolves the file via
 * AtlasMandateFile.findFirst with mandate-membership clause; reading
 * a file you don't have access to returns a 'not found' result.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { buildAnthropicClient } from "./anthropic-client";

export interface DocumentToolResult {
  content: string;
  isError: boolean;
}

const NEEDS_EXTRACTION_NOTE =
  "Atlas hat den Text dieses Dokuments noch nicht extrahiert (Sprint 6 wird PDF/Office-Extraktion liefern). Bitte fügen Sie die relevanten Auszüge direkt in den Chat ein, oder laden Sie das Dokument als TXT/MD/HTML hoch.";

/* ── Tool definitions ────────────────────────────────────────────────── */

export const DOCUMENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "extract_text_from_pdf",
    description:
      "Returns the extracted text body of a file the user has uploaded into the active mandate's vault. Use this to quote or reason over a specific document. Returns the first 200 KB of text.",
    input_schema: {
      type: "object",
      properties: {
        fileId: {
          type: "string",
          description:
            "AtlasMandateFile id. Get the id by listing files via the user's mandate, or by quoting it back from a previous tool result.",
        },
        maxChars: {
          type: "number",
          description:
            "Optional cap on returned characters (≤ 50_000 recommended). Default 20_000.",
        },
      },
      required: ["fileId"],
    },
  },
  {
    name: "find_clauses",
    description:
      "Finds candidate clauses in an uploaded document by keyword/regex sweep. Use for fast 'where does this contract say X?' lookups (liability cap, termination, indemnification, ITAR flow-down, IP, governing law, dispute resolution).",
    input_schema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "AtlasMandateFile id." },
        clauseType: {
          type: "string",
          enum: [
            "liability_cap",
            "termination",
            "indemnification",
            "itar_flow_down",
            "ip_assignment",
            "governing_law",
            "dispute_resolution",
            "confidentiality",
            "force_majeure",
            "warranty",
          ],
          description:
            "Clause family to search for. Returns up to 5 candidate paragraphs with surrounding context.",
        },
      },
      required: ["fileId", "clauseType"],
    },
  },
  {
    name: "summarize_document",
    description:
      "Generates a 200-300 word lawyer-grade summary of an uploaded document. Use when the user asks 'fass das Dokument zusammen' or before drafting a memo. Calls Claude Sonnet for the synthesis.",
    input_schema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "AtlasMandateFile id." },
        perspective: {
          type: "string",
          enum: [
            "neutral",
            "operator_friendly",
            "buyer_friendly",
            "regulator_facing",
          ],
          description: "Reading angle for the summary. Default 'neutral'.",
        },
      },
      required: ["fileId"],
    },
  },
  {
    name: "classify_document",
    description:
      "Classifies an uploaded document into a richer document-type taxonomy than the upload-time heuristic (NDA / SPA / Filing / TechnicalSpec / Memo / Contract / etc.) plus subtype + signals (jurisdiction, parties, effective dates if visible).",
    input_schema: {
      type: "object",
      properties: {
        fileId: { type: "string", description: "AtlasMandateFile id." },
      },
      required: ["fileId"],
    },
  },
  {
    name: "compare_documents",
    description:
      "LLM-driven side-by-side compare of two uploaded documents along a user-provided dimension (e.g. 'liability terms', 'IP ownership', 'termination conditions'). Returns a structured diff + concrete redline suggestions.",
    input_schema: {
      type: "object",
      properties: {
        fileIdA: { type: "string", description: "First file id." },
        fileIdB: { type: "string", description: "Second file id." },
        dimension: {
          type: "string",
          description:
            "What aspect to compare (e.g. 'liability', 'IP terms', 'governing law'). Free text.",
        },
      },
      required: ["fileIdA", "fileIdB", "dimension"],
    },
  },
  {
    name: "search_mandate_knowledge",
    description:
      "Searches the EXTRACTED TEXT of every file uploaded to the active mandate for a given query (substring/keyword). Use when the user asks an open-ended question and you need to surface what the mandate's documents say about it WITHOUT knowing which specific file holds the answer. Returns up to 8 matching snippets with surrounding context + file references. Pairs well with summarize_document or find_clauses for follow-up deep-dives.",
    input_schema: {
      type: "object",
      properties: {
        mandateId: {
          type: "string",
          description:
            "AtlasMandate id whose file vault to search. Resolve from the active chat's mandateId (system prompt context).",
        },
        query: {
          type: "string",
          description:
            "Free-text query — keyword(s), term, or phrase to match against the extracted document text. Case-insensitive ILIKE search.",
        },
        maxHits: {
          type: "number",
          description:
            "Optional cap on returned snippets. Defaults to 8, max 20.",
        },
      },
      required: ["mandateId", "query"],
    },
  },
];

const DOCUMENT_TOOL_NAMES = DOCUMENT_TOOLS.map((t) => t.name) as string[];

export function isDocumentToolName(name: string): boolean {
  return DOCUMENT_TOOL_NAMES.includes(name);
}

/* ── Executor ────────────────────────────────────────────────────────── */

export async function executeDocumentTool(args: {
  name: string;
  input: unknown;
  callerUserId: string;
  callerOrgId: string;
}): Promise<DocumentToolResult> {
  switch (args.name) {
    case "extract_text_from_pdf":
      return runExtractText(args.input, args.callerUserId, args.callerOrgId);
    case "find_clauses":
      return runFindClauses(args.input, args.callerUserId, args.callerOrgId);
    case "summarize_document":
      return runSummarize(args.input, args.callerUserId, args.callerOrgId);
    case "classify_document":
      return runClassify(args.input, args.callerUserId, args.callerOrgId);
    case "compare_documents":
      return runCompare(args.input, args.callerUserId, args.callerOrgId);
    case "search_mandate_knowledge":
      return runSearchMandateKnowledge(
        args.input,
        args.callerUserId,
        args.callerOrgId,
      );
    default:
      return {
        content: JSON.stringify({
          error: `Unknown document tool: ${args.name}`,
        }),
        isError: true,
      };
  }
}

/* ── Per-tool implementations ────────────────────────────────────────── */

async function loadFile(
  fileId: string,
  userId: string,
  organizationId: string,
) {
  return prisma.atlasMandateFile.findFirst({
    where: {
      id: fileId,
      mandate: {
        organizationId,
        OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
      },
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      documentType: true,
      extractedText: true,
      mandateId: true,
    },
  });
}

interface ExtractInput {
  fileId: string;
  maxChars?: number;
}

async function runExtractText(
  rawInput: unknown,
  userId: string,
  orgId: string,
): Promise<DocumentToolResult> {
  const i = rawInput as ExtractInput;
  if (!i?.fileId) {
    return {
      content: JSON.stringify({ error: "fileId required" }),
      isError: true,
    };
  }
  const file = await loadFile(i.fileId, userId, orgId);
  if (!file) {
    return {
      content: JSON.stringify({ error: "File not found or access denied" }),
      isError: true,
    };
  }
  if (!file.extractedText) {
    return {
      content: JSON.stringify({
        fileId: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        documentType: file.documentType,
        text: null,
        message: NEEDS_EXTRACTION_NOTE,
      }),
      isError: false,
    };
  }
  const cap = Math.min(i.maxChars ?? 20_000, 50_000);
  const text =
    file.extractedText.length <= cap
      ? file.extractedText
      : file.extractedText.slice(0, cap) +
        `\n\n[…truncated at ${cap} chars; original ${file.extractedText.length}.]`;
  return {
    content: JSON.stringify({
      fileId: file.id,
      filename: file.filename,
      mimeType: file.mimeType,
      documentType: file.documentType,
      text,
      sizeChars: file.extractedText.length,
    }),
    isError: false,
  };
}

interface FindClausesInput {
  fileId: string;
  clauseType: string;
}

const CLAUSE_PATTERNS: Record<string, RegExp[]> = {
  liability_cap: [
    /liability[\s\S]{0,40}cap/i,
    /haftung[\s\S]{0,80}beschränk/i,
    /haftungsobergrenze/i,
    /maximum aggregate liability/i,
  ],
  termination: [
    /termination[\s\S]{0,40}(for cause|for convenience|breach)/i,
    /kündigung/i,
    /right to terminate/i,
  ],
  indemnification: [/indemnif/i, /freistell/i, /hold harmless/i],
  itar_flow_down: [
    /itar[\s\S]{0,80}flow.?down/i,
    /22 cfr 120/i,
    /defense services/i,
  ],
  ip_assignment: [
    /assignment of intellectual property/i,
    /ip[\s\S]{0,40}ownership/i,
    /work[\s\S]{0,10}for[\s\S]{0,10}hire/i,
    /übertragung[\s\S]{0,40}schutzrechte/i,
  ],
  governing_law: [
    /governing law/i,
    /anwendbares recht/i,
    /shall be governed by/i,
  ],
  dispute_resolution: [
    /dispute[\s\S]{0,60}(resolved|arbitration|jurisdiction)/i,
    /arbitration/i,
    /streitbeilegung/i,
    /gerichtsstand/i,
  ],
  confidentiality: [
    /confidential information/i,
    /vertrauliche information/i,
    /non.?disclosure/i,
  ],
  force_majeure: [/force majeure/i, /höhere gewalt/i],
  warranty: [/warrant(y|ies)/i, /gewährleist/i, /repräsentation/i],
};

async function runFindClauses(
  rawInput: unknown,
  userId: string,
  orgId: string,
): Promise<DocumentToolResult> {
  const i = rawInput as FindClausesInput;
  if (!i?.fileId || !i?.clauseType) {
    return {
      content: JSON.stringify({ error: "fileId + clauseType required" }),
      isError: true,
    };
  }
  const file = await loadFile(i.fileId, userId, orgId);
  if (!file) {
    return {
      content: JSON.stringify({ error: "File not found or access denied" }),
      isError: true,
    };
  }
  if (!file.extractedText) {
    return {
      content: JSON.stringify({
        fileId: file.id,
        clauseType: i.clauseType,
        matches: [],
        message: NEEDS_EXTRACTION_NOTE,
      }),
      isError: false,
    };
  }
  const patterns = CLAUSE_PATTERNS[i.clauseType] ?? [];
  if (patterns.length === 0) {
    return {
      content: JSON.stringify({
        error: `Unknown clauseType '${i.clauseType}'. Allowed: ${Object.keys(CLAUSE_PATTERNS).join(", ")}`,
      }),
      isError: true,
    };
  }
  const matches: { snippet: string; offset: number; pattern: string }[] = [];
  for (const re of patterns) {
    const m = file.extractedText.match(re);
    if (m && m.index !== undefined) {
      const start = Math.max(0, m.index - 100);
      const end = Math.min(file.extractedText.length, m.index + 400);
      matches.push({
        snippet: file.extractedText.slice(start, end).replace(/\s+/g, " "),
        offset: m.index,
        pattern: re.source,
      });
    }
    if (matches.length >= 5) break;
  }
  return {
    content: JSON.stringify({
      fileId: file.id,
      filename: file.filename,
      clauseType: i.clauseType,
      matchCount: matches.length,
      matches,
      hint:
        matches.length === 0
          ? "Kein Treffer mit den Standard-Pattern. Verwende summarize_document oder paste relevante Stellen direkt in den Chat."
          : undefined,
    }),
    isError: false,
  };
}

interface SummarizeInput {
  fileId: string;
  perspective?: string;
}

async function runSummarize(
  rawInput: unknown,
  userId: string,
  orgId: string,
): Promise<DocumentToolResult> {
  const i = rawInput as SummarizeInput;
  if (!i?.fileId) {
    return {
      content: JSON.stringify({ error: "fileId required" }),
      isError: true,
    };
  }
  const file = await loadFile(i.fileId, userId, orgId);
  if (!file) {
    return {
      content: JSON.stringify({ error: "File not found or access denied" }),
      isError: true,
    };
  }
  if (!file.extractedText) {
    return {
      content: JSON.stringify({
        fileId: file.id,
        summary: null,
        message: NEEDS_EXTRACTION_NOTE,
      }),
      isError: false,
    };
  }
  const setup = buildAnthropicClient();
  if (!setup) {
    return {
      content: JSON.stringify({ error: "AI not configured" }),
      isError: true,
    };
  }
  const perspective = i.perspective ?? "neutral";
  const prompt = `Du bist eine Anwaltsassistentin für Weltraumrecht. Erstelle eine 200-300-Wort-Zusammenfassung des folgenden Dokuments aus der ${perspective.replace("_", " ")}-Perspektive.

Struktur:
- 1 Satz: Was ist das Dokument? Welche Parteien?
- 3-5 Bullet-Punkte: Die wichtigsten substantiellen Klauseln (Haftung, IP, Kündigung, Sonderpflichten).
- 1-2 Sätze: Risiken / offene Punkte aus der gewählten Perspektive.

Dokument: ${file.filename} (${file.mimeType}, ${file.documentType ?? "uncategorised"})

Inhalt:
${file.extractedText.slice(0, 50_000)}${file.extractedText.length > 50_000 ? "\n[… truncated]" : ""}`;
  try {
    const resp = await setup.client.messages.create({
      model: setup.model,
      max_tokens: 800,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return {
      content: JSON.stringify({
        fileId: file.id,
        filename: file.filename,
        perspective,
        summary: text,
        usage: {
          inputTokens: resp.usage.input_tokens,
          outputTokens: resp.usage.output_tokens,
        },
      }),
      isError: false,
    };
  } catch (err) {
    return {
      content: JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      isError: true,
    };
  }
}

async function runClassify(
  rawInput: unknown,
  userId: string,
  orgId: string,
): Promise<DocumentToolResult> {
  const i = rawInput as { fileId: string };
  if (!i?.fileId) {
    return {
      content: JSON.stringify({ error: "fileId required" }),
      isError: true,
    };
  }
  const file = await loadFile(i.fileId, userId, orgId);
  if (!file) {
    return {
      content: JSON.stringify({ error: "File not found or access denied" }),
      isError: true,
    };
  }
  if (!file.extractedText) {
    return {
      content: JSON.stringify({
        fileId: file.id,
        documentType: file.documentType,
        hint: NEEDS_EXTRACTION_NOTE,
      }),
      isError: false,
    };
  }
  const setup = buildAnthropicClient();
  if (!setup) {
    return {
      content: JSON.stringify({ error: "AI not configured" }),
      isError: true,
    };
  }
  /* Use Haiku — classification is cheap, predictable. */
  const haikuModel =
    setup.mode === "gateway"
      ? "anthropic/claude-haiku-4-5"
      : "claude-haiku-4-5";
  const prompt = `Klassifiziere folgendes Dokument für ein Weltraum-Anwaltsrecherche-System. Output STRICT JSON:
{
  "documentType": "<one of: NDA | SPA | License | Filing | TechnicalSpec | Memo | Contract | Insurance | RegulatoryGuidance | Correspondence | Other>",
  "subtype": "<short string, e.g. 'satellite procurement', 'launch contract', 'ECSS standard'>",
  "parties": ["<party 1>", "<party 2>"],
  "jurisdiction": "<ISO-2 if visible, else null>",
  "language": "<en|de|fr|es|other>",
  "effectiveDate": "<YYYY-MM-DD or null>",
  "containsItar": <bool>,
  "containsClassifiedInfo": <bool>
}

Dateiname: ${file.filename}
Inhalt (erste 8000 Zeichen):
${file.extractedText.slice(0, 8000)}`;
  try {
    const resp = await setup.client.messages.create({
      model: haikuModel,
      max_tokens: 500,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { raw: cleaned };
    }
    /* Persist the LLM-derived documentType back to the row so the UI
       reflects the better classification next time. */
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { documentType?: unknown }).documentType === "string"
    ) {
      await prisma.atlasMandateFile.update({
        where: { id: file.id },
        data: {
          documentType: (parsed as { documentType: string }).documentType,
        },
      });
    }
    return {
      content: JSON.stringify({
        fileId: file.id,
        filename: file.filename,
        classification: parsed,
      }),
      isError: false,
    };
  } catch (err) {
    return {
      content: JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      isError: true,
    };
  }
}

interface CompareInput {
  fileIdA: string;
  fileIdB: string;
  dimension: string;
}

async function runCompare(
  rawInput: unknown,
  userId: string,
  orgId: string,
): Promise<DocumentToolResult> {
  const i = rawInput as CompareInput;
  if (!i?.fileIdA || !i?.fileIdB || !i?.dimension) {
    return {
      content: JSON.stringify({
        error: "fileIdA + fileIdB + dimension required",
      }),
      isError: true,
    };
  }
  const [a, b] = await Promise.all([
    loadFile(i.fileIdA, userId, orgId),
    loadFile(i.fileIdB, userId, orgId),
  ]);
  if (!a || !b) {
    return {
      content: JSON.stringify({
        error: "One or both files not found / no access",
      }),
      isError: true,
    };
  }
  if (!a.extractedText || !b.extractedText) {
    return {
      content: JSON.stringify({
        error:
          "One or both files have no extracted text yet. " +
          NEEDS_EXTRACTION_NOTE,
      }),
      isError: true,
    };
  }
  const setup = buildAnthropicClient();
  if (!setup) {
    return {
      content: JSON.stringify({ error: "AI not configured" }),
      isError: true,
    };
  }
  const prompt = `Vergleiche die folgenden zwei Dokumente entlang der Dimension: "${i.dimension}".

Output STRICT structure:
1. Kurz-Diff (3-5 Bullet-Punkte): Wo unterscheiden sich A und B?
2. Konkrete Redline-Vorschläge (was sollte angepasst werden, basierend auf A oder B als Goldstandard?).
3. Risiko-Einordnung (welche Differenzen sind operativ kritisch?).

Dokument A: ${a.filename}
${a.extractedText.slice(0, 25_000)}${a.extractedText.length > 25_000 ? "\n[… truncated]" : ""}

---

Dokument B: ${b.filename}
${b.extractedText.slice(0, 25_000)}${b.extractedText.length > 25_000 ? "\n[… truncated]" : ""}`;
  try {
    const resp = await setup.client.messages.create({
      model: setup.model,
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    });
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return {
      content: JSON.stringify({
        fileA: { id: a.id, name: a.filename },
        fileB: { id: b.id, name: b.filename },
        dimension: i.dimension,
        comparison: text,
      }),
      isError: false,
    };
  } catch (err) {
    return {
      content: JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      isError: true,
    };
  }
}

/**
 * search_mandate_knowledge — substring search across the extracted
 * text of every file in a mandate's vault. Returns matching snippets
 * with surrounding context so the model can follow up with
 * summarize_document or find_clauses on the most relevant file.
 *
 * Why no embeddings yet: text-search via in-process scan is good
 * enough for a few hundred files per mandate. Vectorisation +
 * hybrid retrieval is a Sprint 11+ item once we hit usage that
 * needs it.
 *
 * Snippet extraction: 200 chars before + the match + 200 after,
 * truncated at sentence boundaries where convenient.
 */
async function runSearchMandateKnowledge(
  input: unknown,
  userId: string,
  organizationId: string,
): Promise<DocumentToolResult> {
  const i = input as {
    mandateId?: unknown;
    query?: unknown;
    maxHits?: unknown;
  };
  const mandateId = typeof i.mandateId === "string" ? i.mandateId : null;
  const query = typeof i.query === "string" ? i.query.trim() : "";
  const maxHits = Math.min(
    Math.max(1, typeof i.maxHits === "number" ? i.maxHits : 8),
    20,
  );

  if (!mandateId || !query) {
    return {
      content: JSON.stringify({
        error: "Missing required parameters mandateId + query",
      }),
      isError: true,
    };
  }

  /* Membership check — same gate as the per-file tools. */
  const mandate = await prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true, name: true },
  });
  if (!mandate) {
    return {
      content: JSON.stringify({
        error: "Mandate not found or access denied",
      }),
      isError: true,
    };
  }

  /* Pull all files with extracted text for this mandate. We filter
     in-process because each file's extractedText is already loaded
     in a single pass — much cheaper than N ILIKE queries against
     a Text column. */
  const files = await prisma.atlasMandateFile.findMany({
    where: {
      mandateId,
      extractedText: { not: null },
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      documentType: true,
      extractedText: true,
    },
  });

  const queryLower = query.toLowerCase();
  const hits: Array<{
    fileId: string;
    filename: string;
    documentType: string | null;
    snippet: string;
    matchPosition: number;
  }> = [];

  for (const f of files) {
    if (!f.extractedText) continue;
    const haystack = f.extractedText.toLowerCase();
    let from = 0;
    let perFileCount = 0;
    while (true) {
      const idx = haystack.indexOf(queryLower, from);
      if (idx === -1) break;
      const start = Math.max(0, idx - 200);
      const end = Math.min(f.extractedText.length, idx + query.length + 200);
      let snippet = f.extractedText.slice(start, end);
      /* Try to nudge to sentence boundaries — find the previous
         period before start + the next period after end. Cosmetic
         but keeps the snippet readable. */
      if (start > 0) {
        const dot = snippet.indexOf(". ");
        if (dot >= 0 && dot < 60) snippet = snippet.slice(dot + 2);
      }
      hits.push({
        fileId: f.id,
        filename: f.filename,
        documentType: f.documentType,
        snippet:
          (start > 0 ? "…" : "") +
          snippet +
          (end < f.extractedText.length ? "…" : ""),
        matchPosition: idx,
      });
      perFileCount++;
      from = idx + query.length;
      /* Per-file cap: at most 3 hits per file so a single big file
         doesn't dominate the result set. */
      if (perFileCount >= 3) break;
      if (hits.length >= maxHits) break;
    }
    if (hits.length >= maxHits) break;
  }

  return {
    content: JSON.stringify({
      mandateId: mandate.id,
      mandateName: mandate.name,
      query,
      filesScanned: files.length,
      totalHits: hits.length,
      hits,
    }),
    isError: false,
  };
}
