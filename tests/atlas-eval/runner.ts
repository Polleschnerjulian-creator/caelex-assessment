/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * SpaceLaw Bench Runner (Sprint 6, 2026-05-12).
 *
 * Manual-run script that executes every golden query against Atlas's
 * actual chat-engine, computes per-query + aggregate metrics, and
 * writes a JSON + markdown report.
 *
 * Run:
 *   ATLAS_EVAL_USER_ID=<...> ATLAS_EVAL_ORG_ID=<...> \
 *     npx tsx tests/atlas-eval/runner.ts
 *
 * Required env vars:
 *   ATLAS_EVAL_USER_ID — a user-id with Atlas-membership (LAW_FIRM org)
 *   ATLAS_EVAL_ORG_ID  — that user's organisation id
 *   ANTHROPIC_API_KEY OR AI_GATEWAY_API_KEY — for LLM calls
 *
 * Output:
 *   tests/atlas-eval/last-run.json  — full report (committed)
 *   tests/atlas-eval/last-run.md    — markdown summary (committed)
 *
 * Why not in CI yet: each run costs ~$1-2 in inference + needs DB
 * connection + a real Atlas-eligible user. Sprint 7+ will set up a
 * dedicated test-user + test-org seed + nightly cron in GitHub Actions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { GOLDEN_SET } from "./golden-set";
import type {
  EvalCategory,
  EvalReport,
  EvalResult,
  GoldenQuery,
} from "./types";

/* ── Helpers ─────────────────────────────────────────────────────────── */

function intersection(a: string[], b: string[]): string[] {
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => setB.has(x.toLowerCase()));
}

function checkKeywordsPresent(
  text: string,
  keywords: string[],
): { hits: string[]; misses: string[] } {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  const misses: string[] = [];
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) hits.push(kw);
    else misses.push(kw);
  }
  return { hits, misses };
}

function checkNegativeSignals(text: string, terms: string[]): string[] {
  if (terms.length === 0) return [];
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t.toLowerCase()));
}

/* ── Per-query runner ────────────────────────────────────────────────── */

async function runQuery(
  q: GoldenQuery,
  userId: string,
  organizationId: string,
): Promise<EvalResult> {
  /* Lazy-import the engine + extractor so this script can be evaluated
     for syntax without a Prisma connection. */
  const { runChat } = await import("../../src/lib/atlas/chat-engine.server");
  const { extractCitations } =
    await import("../../src/lib/atlas/citation-extractor.server");

  const start = Date.now();
  const { stream } = await runChat({
    chatId: null,
    userId,
    organizationId,
    userMessage: q.query,
    language: "de",
    titleHint: `[EVAL] ${q.id}`,
  });

  /* Drain the SSE stream. We collect:
       - the final text (from `text` events)
       - tools used (from `tool_call_complete` events that aren't errors)
       - usage (from `done` event) */
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assembledText = "";
  const toolsUsed: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let costUsd = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (!json) continue;
      try {
        const evt = JSON.parse(json) as {
          type: string;
          delta?: string;
          name?: string;
          isError?: boolean;
          usage?: {
            inputTokens: number;
            outputTokens: number;
            costUsd: number;
          };
        };
        if (evt.type === "text" && typeof evt.delta === "string") {
          assembledText += evt.delta;
        } else if (
          evt.type === "tool_call_complete" &&
          typeof evt.name === "string" &&
          !evt.isError
        ) {
          toolsUsed.push(evt.name);
        } else if (evt.type === "done" && evt.usage) {
          inputTokens = evt.usage.inputTokens;
          outputTokens = evt.usage.outputTokens;
          costUsd = evt.usage.costUsd;
        }
      } catch {
        /* incomplete chunk */
      }
    }
  }
  const durationMs = Date.now() - start;

  /* Score the response. */
  const citations = extractCitations(assembledText);
  const actualCitations = citations.map((c) => c.sourceId);
  const hallucinatedCitations = citations
    .filter((c) => c.badge === "unknown")
    .map((c) => c.citation);

  const citationHits = intersection(q.expectedSources, actualCitations);
  const citationRecall =
    q.expectedSources.length === 0
      ? 1
      : citationHits.length / q.expectedSources.length;
  const dedupedTools = Array.from(new Set(toolsUsed));
  const toolHits = intersection(q.expectedTools, dedupedTools);
  const toolRecall =
    q.expectedTools.length === 0 ? 1 : toolHits.length / q.expectedTools.length;

  const { hits: keywordHits, misses: keywordMisses } = checkKeywordsPresent(
    assembledText,
    q.expectedKeywords ?? [],
  );
  const negativeSignalHits = checkNegativeSignals(
    assembledText,
    q.mustNotContain ?? [],
  );

  const pass =
    citationRecall >= 0.5 &&
    toolRecall >= 0.5 &&
    hallucinatedCitations.length === 0 &&
    negativeSignalHits.length === 0;

  return {
    queryId: q.id,
    query: q.query,
    category: q.category,
    responseText: assembledText.slice(0, 4000),
    actualTools: dedupedTools,
    actualCitations,
    citationRecall,
    toolRecall,
    hallucinatedCitations,
    keywordHits,
    keywordMisses,
    negativeSignalHits,
    pass,
    durationMs,
    inputTokens,
    outputTokens,
    costUsd,
  };
}

/* ── Aggregation + report ────────────────────────────────────────────── */

function aggregate(
  results: EvalResult[],
  modelMode: EvalReport["modelMode"],
): EvalReport {
  const passed = results.filter((r) => r.pass).length;
  const totalCitations = results.reduce(
    (sum, r) => sum + r.actualCitations.length,
    0,
  );
  const totalHallucinations = results.reduce(
    (sum, r) => sum + r.hallucinatedCitations.length,
    0,
  );
  const avgCitationRecall =
    results.reduce((sum, r) => sum + r.citationRecall, 0) / results.length;
  const avgToolRecall =
    results.reduce((sum, r) => sum + r.toolRecall, 0) / results.length;

  const byCategory = {} as EvalReport["byCategory"];
  for (const r of results) {
    if (!byCategory[r.category])
      byCategory[r.category] = { pass: 0, fail: 0, n: 0 };
    byCategory[r.category].n++;
    if (r.pass) byCategory[r.category].pass++;
    else byCategory[r.category].fail++;
  }

  const totalCostUsd = results.reduce((sum, r) => sum + r.costUsd, 0);

  return {
    ranAt: new Date().toISOString(),
    modelMode,
    totalQueries: results.length,
    passed,
    failed: results.length - passed,
    hallucinationRate:
      totalCitations > 0 ? totalHallucinations / totalCitations : 0,
    avgCitationRecall,
    avgToolRecall,
    byCategory,
    results,
    totalCostUsd,
  };
}

function renderMarkdown(report: EvalReport): string {
  const lines: string[] = [];
  lines.push(`# Atlas SpaceLaw Bench — last run`);
  lines.push("");
  lines.push(`- Run at: \`${report.ranAt}\``);
  lines.push(`- Model mode: \`${report.modelMode}\``);
  lines.push(`- Queries: ${report.totalQueries}`);
  lines.push(
    `- Pass / Fail: **${report.passed}** / ${report.failed}  (${((report.passed / report.totalQueries) * 100).toFixed(1)}%)`,
  );
  lines.push(
    `- **Hallucination rate**: ${(report.hallucinationRate * 100).toFixed(2)}%`,
  );
  lines.push(
    `- Avg citation recall: ${(report.avgCitationRecall * 100).toFixed(1)}%`,
  );
  lines.push(`- Avg tool recall: ${(report.avgToolRecall * 100).toFixed(1)}%`);
  lines.push(`- Total inference cost: $${report.totalCostUsd.toFixed(3)}`);
  lines.push("");
  lines.push("## Per-category breakdown");
  lines.push("");
  lines.push("| Category | Pass | Fail | N |");
  lines.push("|---|---|---|---|");
  for (const [cat, stats] of Object.entries(report.byCategory)) {
    lines.push(`| ${cat} | ${stats.pass} | ${stats.fail} | ${stats.n} |`);
  }
  lines.push("");
  lines.push("## Failed queries");
  lines.push("");
  for (const r of report.results.filter((r) => !r.pass)) {
    lines.push(`### ${r.queryId} (${r.category})`);
    lines.push(`> ${r.query}`);
    lines.push("");
    lines.push(`- Citation recall: ${(r.citationRecall * 100).toFixed(0)}%`);
    lines.push(`- Tool recall: ${(r.toolRecall * 100).toFixed(0)}%`);
    if (r.hallucinatedCitations.length > 0) {
      lines.push(
        `- ⚠️ Hallucinated citations: ${r.hallucinatedCitations.join(", ")}`,
      );
    }
    if (r.keywordMisses.length > 0) {
      lines.push(`- Missing keywords: ${r.keywordMisses.join(", ")}`);
    }
    if (r.negativeSignalHits.length > 0) {
      lines.push(`- ⚠️ Negative signals: ${r.negativeSignalHits.join(", ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/* ── Main ────────────────────────────────────────────────────────────── */

async function main() {
  const userId = process.env.ATLAS_EVAL_USER_ID;
  const orgId = process.env.ATLAS_EVAL_ORG_ID;
  if (!userId || !orgId) {
    console.error(
      "❌ Missing env: set ATLAS_EVAL_USER_ID + ATLAS_EVAL_ORG_ID first.\n" +
        "   They must reference a User in a LAW_FIRM (or BOTH) Organization.\n",
    );
    process.exit(1);
  }

  console.log(`▸ Running ${GOLDEN_SET.length} golden queries…`);
  const results: EvalResult[] = [];
  for (let i = 0; i < GOLDEN_SET.length; i++) {
    const q = GOLDEN_SET[i];
    process.stdout.write(`  [${i + 1}/${GOLDEN_SET.length}] ${q.id} … `);
    try {
      const r = await runQuery(q, userId, orgId);
      results.push(r);
      console.log(
        `${r.pass ? "✓" : "✗"} cit=${(r.citationRecall * 100).toFixed(0)}% tool=${(r.toolRecall * 100).toFixed(0)}% ${r.durationMs}ms`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`💥 ${msg}`);
      results.push({
        queryId: q.id,
        query: q.query,
        category: q.category,
        responseText: `[runner-error] ${msg}`,
        actualTools: [],
        actualCitations: [],
        citationRecall: 0,
        toolRecall: 0,
        hallucinatedCitations: [],
        keywordHits: [],
        keywordMisses: q.expectedKeywords ?? [],
        negativeSignalHits: [],
        pass: false,
        durationMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      });
    }
  }

  const modelMode: EvalReport["modelMode"] = process.env.AI_GATEWAY_API_KEY
    ? "gateway"
    : process.env.ANTHROPIC_API_KEY
      ? "direct"
      : "unknown";
  const report = aggregate(results, modelMode);

  const outDir = join(process.cwd(), "tests", "atlas-eval");
  writeFileSync(join(outDir, "last-run.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(outDir, "last-run.md"), renderMarkdown(report));

  console.log(
    `\n→ Pass: ${report.passed}/${report.totalQueries}  ·  ` +
      `Hallucination rate: ${(report.hallucinationRate * 100).toFixed(2)}%  ·  ` +
      `Cost: $${report.totalCostUsd.toFixed(3)}`,
  );
  console.log(`→ Report: ${join(outDir, "last-run.md")}`);

  /* Exit non-zero if pass-rate below 70 % so a future CI wiring can
     gate deploys on the bench. */
  process.exit(report.passed / report.totalQueries < 0.7 ? 1 : 0);
}

void main();

/* Mark category-typing as a runtime export so TS compiles cleanly. */
export type { EvalCategory };
