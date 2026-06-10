/**
 * G4 model-tiering eval harness (ILA review #7 / master-plan G4-DEFER).
 *
 * Measures Vision-extraction agreement between Claude models on a fixture
 * set of REAL datasheet PDFs so the Haiku-vs-Sonnet tiering decision can
 * be made on evidence instead of vibes (the no-quality-loss guarantee).
 *
 * ── COST GUARD ────────────────────────────────────────────────────────
 * This script CALLS THE ANTHROPIC API and therefore costs money.
 * It refuses to run unless BOTH are set:
 *   EVAL_CONFIRM_COSTS=1            (explicit founder go)
 *   ANTHROPIC_API_KEY / AI_GATEWAY_API_KEY
 * Estimated cost: ~N_pdfs × N_models × 1 Vision call (≈1-3k input tokens
 * each with prompt caching, 1k output cap).
 *
 * ── SETUP ─────────────────────────────────────────────────────────────
 * 1. Drop datasheet PDFs into  scripts/eval-fixtures/
 * 2. Create scripts/eval-fixtures/expected.json:
 *      { "rw250-datasheet.pdf": { "expectedCodes": ["9A004"] }, ... }
 * 3. Run:
 *      EVAL_CONFIRM_COSTS=1 \
 *      EVAL_MODELS="claude-haiku-4-5-20251001,claude-sonnet-4-6" \
 *      npx tsx scripts/trade-classification-eval.ts
 *
 * Output: per-model extraction success, per-model code-suggestion hit
 * rate vs expectations, and pairwise attribute agreement — the numbers
 * the G4 decision needs.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { extractDatasheetViaVision } from "@/lib/trade/classification/claude-vision-extractor.server";
import { deriveAutoClassification } from "@/lib/trade/auto-classify-on-create";

const FIXTURE_DIR = path.join(__dirname, "eval-fixtures");

interface Expectation {
  expectedCodes: string[];
}

async function main(): Promise<void> {
  if (process.env.EVAL_CONFIRM_COSTS !== "1") {
    console.error(
      "REFUSING TO RUN: this harness calls the Anthropic API (costs money).\n" +
        "Set EVAL_CONFIRM_COSTS=1 to confirm — see the file header for setup.",
    );
    process.exit(2);
  }

  const models = (process.env.EVAL_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (models.length === 0) {
    console.error('Set EVAL_MODELS="modelA,modelB" (comma-separated).');
    process.exit(2);
  }

  const expectedPath = path.join(FIXTURE_DIR, "expected.json");
  if (!existsSync(expectedPath)) {
    console.error(`Missing ${expectedPath} — see the file header for setup.`);
    process.exit(2);
  }
  const expectations = JSON.parse(readFileSync(expectedPath, "utf8")) as Record<
    string,
    Expectation
  >;

  const pdfs = readdirSync(FIXTURE_DIR).filter((f) =>
    f.toLowerCase().endsWith(".pdf"),
  );
  if (pdfs.length === 0) {
    console.error(`No PDFs in ${FIXTURE_DIR} — drop fixtures there first.`);
    process.exit(2);
  }

  console.log(
    `Eval: ${pdfs.length} datasheets × ${models.length} models = ${
      pdfs.length * models.length
    } Vision calls\n`,
  );

  type Row = {
    pdf: string;
    model: string;
    ok: boolean;
    attributeCount: number;
    suggestedCodes: string[];
    expectedHit: boolean | null;
    latencyMs: number | null;
  };
  const rows: Row[] = [];

  for (const pdf of pdfs) {
    const bytes = readFileSync(path.join(FIXTURE_DIR, pdf));
    const expected = expectations[pdf]?.expectedCodes ?? null;

    for (const model of models) {
      const result = await extractDatasheetViaVision(bytes, {
        modelOverride: model,
      });
      if (!result.ok) {
        rows.push({
          pdf,
          model,
          ok: false,
          attributeCount: 0,
          suggestedCodes: [],
          expectedHit: expected ? false : null,
          latencyMs: null,
        });
        console.log(`✗ ${pdf} × ${model}: ${result.error}`);
        continue;
      }
      const auto = deriveAutoClassification(result.attributes);
      const codes = auto?.suggestions.map((s) => s.code) ?? [];
      const expectedHit = expected
        ? expected.some((e) => codes.includes(e))
        : null;
      rows.push({
        pdf,
        model,
        ok: true,
        attributeCount: Object.values(result.attributes).filter(
          (v) => v !== null && v !== undefined,
        ).length,
        suggestedCodes: codes,
        expectedHit,
        latencyMs: result.latencyMs,
      });
      console.log(
        `✓ ${pdf} × ${model}: ${codes.join("/") || "(no suggestion)"} ` +
          `(${result.latencyMs} ms${expectedHit === null ? "" : expectedHit ? ", HIT" : ", MISS"})`,
      );
    }
  }

  // ── Per-model summary ──
  console.log("\n── Per-model summary ──");
  for (const model of models) {
    const mine = rows.filter((r) => r.model === model);
    const ok = mine.filter((r) => r.ok).length;
    const judged = mine.filter((r) => r.expectedHit !== null);
    const hits = judged.filter((r) => r.expectedHit === true).length;
    const avgLatency =
      mine.filter((r) => r.latencyMs !== null).length > 0
        ? Math.round(
            mine.reduce((s, r) => s + (r.latencyMs ?? 0), 0) /
              mine.filter((r) => r.latencyMs !== null).length,
          )
        : 0;
    console.log(
      `${model}: extraction ${ok}/${mine.length} ok · ` +
        `expected-code hit ${hits}/${judged.length} · avg ${avgLatency} ms`,
    );
  }

  // ── Pairwise agreement on suggested codes ──
  if (models.length >= 2) {
    console.log("\n── Pairwise code agreement ──");
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const a = models[i];
        const b = models[j];
        let agree = 0;
        let total = 0;
        for (const pdf of pdfs) {
          const ra = rows.find((r) => r.pdf === pdf && r.model === a);
          const rb = rows.find((r) => r.pdf === pdf && r.model === b);
          if (!ra?.ok || !rb?.ok) continue;
          total += 1;
          if (
            JSON.stringify([...ra.suggestedCodes].sort()) ===
            JSON.stringify([...rb.suggestedCodes].sort())
          ) {
            agree += 1;
          }
        }
        console.log(`${a} vs ${b}: ${agree}/${total} identical suggestions`);
      }
    }
  }
}

void main();
