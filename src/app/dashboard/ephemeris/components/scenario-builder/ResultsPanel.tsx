"use client";

// ---------------------------------------------------------------------------
// Results Panel – right column showing simulation results
// ---------------------------------------------------------------------------

import React from "react";
import {
  Play,
  RotateCcw,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Fuel,
  BarChart3,
} from "lucide-react";
import type { SimulationResults } from "./useScenarioSimulation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResultsPanelProps {
  results: SimulationResults | null;
  isRunning: boolean;
  error: string | null;
  pipelineLength: number;
  onRun: () => void;
  onReset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DeltaBadge({
  delta,
  unit = "days",
}: {
  delta: number;
  unit?: string;
}) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-small font-medium text-[#111827]">
        <TrendingUp className="h-3.5 w-3.5" />+{delta} {unit}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-small font-medium text-red-500">
        <TrendingDown className="h-3.5 w-3.5" />
        {delta} {unit}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-small font-medium text-[#9CA3AF]">
      <Minus className="h-3.5 w-3.5" />0 {unit}
    </span>
  );
}

function statusIcon(status: string) {
  switch (status) {
    case "COMPLIANT":
      return (
        <span className="text-[#111827]" title="Compliant">
          {"\u2713"}
        </span>
      );
    case "WARNING":
      return (
        <span className="text-amber-500" title="Warning">
          {"\u26A0"}
        </span>
      );
    case "NON_COMPLIANT":
      return (
        <span className="text-red-500" title="Non-Compliant">
          {"\u2717"}
        </span>
      );
    default:
      return (
        <span className="text-[#9CA3AF]" title="Unknown">
          ?
        </span>
      );
  }
}

// ---------------------------------------------------------------------------
// Results Panel Component
// ---------------------------------------------------------------------------

export default function ResultsPanel({
  results,
  isRunning,
  error,
  pipelineLength,
  onRun,
  onReset,
}: ResultsPanelProps) {
  return (
    <aside className="w-full lg:w-[320px] flex-shrink-0">
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] p-4 space-y-4">
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning || pipelineLength === 0}
            className="
              flex items-center gap-1.5 rounded-lg bg-[#111827] px-4 py-2
              text-small font-medium text-white
              hover:bg-[#374151] transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Run Scenario
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="
              flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white
              px-3 py-2 text-small font-medium text-[#374151]
              hover:bg-[#F7F8FA] transition-colors
            "
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-small text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <>
            {/* Compliance Horizon */}
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 space-y-1.5">
              <h3 className="text-micro font-medium uppercase tracking-wider text-[#9CA3AF]">
                Compliance Horizon
              </h3>
              <DeltaBadge delta={results.totalHorizonDelta} />
            </div>

            {/* Fuel Impact */}
            {results.totalFuelDelta !== 0 && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 space-y-1.5">
                <h3 className="text-micro font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Fuel Impact
                </h3>
                <div className="flex items-center gap-1.5">
                  <Fuel className="h-3.5 w-3.5 text-[#6B7280]" />
                  <DeltaBadge delta={results.totalFuelDelta} unit="%" />
                </div>
              </div>
            )}

            {/* Affected Regulations */}
            {results.allAffectedRegulations.length > 0 && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 space-y-2">
                <h3 className="text-micro font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Affected Regulations
                </h3>
                <ul className="space-y-1.5">
                  {results.allAffectedRegulations.map((reg) => (
                    <li
                      key={reg.regulationRef}
                      className="flex items-center gap-2 text-small text-[#374151]"
                    >
                      <span className="text-micro text-[#6B7280] font-mono">
                        {reg.regulationRef}
                      </span>
                      <span className="text-[#D1D5DB]">{"\u2192"}</span>
                      <span className="flex items-center gap-1">
                        {statusIcon(reg.statusBefore)}
                        <span className="text-[#D1D5DB]">{"\u2192"}</span>
                        {statusIcon(reg.statusAfter)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step Breakdown (only if more than 1 step) */}
            {results.stepResults.length > 1 && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 space-y-2">
                <h3 className="text-micro font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Step Breakdown
                </h3>
                <ol className="space-y-1">
                  {results.stepResults.map((step, idx) => (
                    <li
                      key={step.blockInstanceId}
                      className="flex items-center gap-2 text-small"
                    >
                      <span className="text-micro text-[#9CA3AF] w-4 text-right">
                        {idx + 1}.
                      </span>
                      <span className="text-[#4B5563]">
                        {step.scenarioType}
                      </span>
                      <DeltaBadge delta={step.horizonDelta} />
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Recommendation */}
            {results.finalRecommendation && (
              <div className="rounded-lg border border-[#E5E7EB] bg-white p-3 space-y-1.5">
                <h3 className="text-micro font-medium uppercase tracking-wider text-[#9CA3AF]">
                  Recommendation
                </h3>
                <p className="text-small text-[#374151] leading-relaxed">
                  {results.finalRecommendation}
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!results && !error && !isRunning && (
          <div className="flex flex-col items-center py-8 text-center">
            <BarChart3 className="h-8 w-8 text-[#D1D5DB] mb-3" />
            <p className="text-small text-[#9CA3AF]">
              {pipelineLength === 0
                ? "Add blocks to build a scenario"
                : "Click Run to simulate"}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
