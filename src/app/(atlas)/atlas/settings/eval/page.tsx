/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Eval Bench results page (UI refresh 2026-05-12).
 *
 * Surfaces the latest tests/atlas-eval/last-run.json so operators can
 * see Atlas's current hallucination rate + pass-rate against the
 * SpaceLaw Bench v0 golden set. The file is committed; the page reads
 * it server-side at request-time.
 *
 * Atlas V2 commitment: every Sprint, the operator runs `npm run
 * test:atlas-eval` against staging + commits the new last-run.json so
 * this page reflects the current Sprint's quality posture.
 *
 * UI: refactored to V2 theme-aware (light default + dark: variants)
 * matching the rest of the V2 surfaces. Replaces previous dark-only
 * hardcoded palette.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface LastRun {
  ranAt: string | null;
  modelMode: string;
  totalQueries: number;
  passed: number;
  failed: number;
  hallucinationRate: number;
  avgCitationRecall: number;
  avgToolRecall: number;
  byCategory: Record<string, { pass: number; fail: number; n: number }>;
  totalCostUsd: number;
  _note?: string;
}

export const dynamic = "force-dynamic";

function loadLastRun(): LastRun | null {
  try {
    const path = join(process.cwd(), "tests", "atlas-eval", "last-run.json");
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as LastRun;
  } catch {
    return null;
  }
}

export default function AtlasEvalPage() {
  const run = loadLastRun();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <Link
          href="/atlas/settings"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={12} /> Zurück zu Einstellungen
        </Link>
      </div>

      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Quality · SpaceLaw Bench v0
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Atlas Eval Results
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          25 attorney-graded golden queries spanning 7 categories (compliance,
          national law, treaty, comparison, validity, drafting, document). Run
          via{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            npm run test:atlas-eval
          </code>{" "}
          on staging; results are committed to{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            tests/atlas-eval/last-run.json
          </code>{" "}
          and displayed here.
        </p>
      </header>

      {!run || run.ranAt === null ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-200">
          <p className="font-semibold">No eval run yet.</p>
          <p className="mt-2 text-amber-800 dark:text-amber-100/80">
            The bench has been wired but no results have been committed. Run the
            script in staging and commit{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-500/10">
              tests/atlas-eval/last-run.json
            </code>{" "}
            to populate this page.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat
              label="Pass-Rate"
              value={
                run.totalQueries > 0
                  ? `${((run.passed / run.totalQueries) * 100).toFixed(1)}%`
                  : "—"
              }
              hint={`${run.passed} / ${run.totalQueries}`}
            />
            <Stat
              label="Hallucination-Rate"
              value={`${(run.hallucinationRate * 100).toFixed(2)}%`}
              hint="Citations to non-existent corpus entries"
              highlight={run.hallucinationRate < 0.01 ? "good" : "warn"}
            />
            <Stat
              label="Citation Recall"
              value={`${(run.avgCitationRecall * 100).toFixed(1)}%`}
              hint="Avg overlap with expected sources"
            />
          </div>

          <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-400">
            <div className="mb-2 font-medium text-slate-800 dark:text-slate-300">
              Run metadata
            </div>
            <dl className="grid grid-cols-2 gap-y-1">
              <dt className="text-slate-500">Run at:</dt>
              <dd>{run.ranAt}</dd>
              <dt className="text-slate-500">Model mode:</dt>
              <dd>{run.modelMode}</dd>
              <dt className="text-slate-500">Avg tool recall:</dt>
              <dd>{(run.avgToolRecall * 100).toFixed(1)}%</dd>
              <dt className="text-slate-500">Total cost:</dt>
              <dd>${run.totalCostUsd.toFixed(3)}</dd>
            </dl>
          </div>

          <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Per-category breakdown
          </h2>
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/40">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-white text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-right">Pass</th>
                  <th className="px-4 py-2 text-right">Fail</th>
                  <th className="px-4 py-2 text-right">N</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(run.byCategory).map(([cat, stats]) => (
                  <tr
                    key={cat}
                    className="border-b border-slate-200 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-200">
                      {cat}
                    </td>
                    <td className="px-4 py-2 text-right text-emerald-600 dark:text-emerald-300">
                      {stats.pass}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 dark:text-red-300">
                      {stats.fail}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 dark:text-slate-400">
                      {stats.n}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: "good" | "warn";
}) {
  const ringClass =
    highlight === "good"
      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/5"
      : highlight === "warn"
        ? "border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5"
        : "border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/40";
  return (
    <div className={`rounded-lg border ${ringClass} p-4`}>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}
