"use client";

import { useState, useCallback } from "react";
import type {
  OptimizationInput,
  OptimizationOutput,
  JurisdictionRanking,
} from "@/lib/optimizer/types";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";
import InputPanel from "@/components/optimizer/InputPanel";
import DetailPanel from "@/components/optimizer/DetailPanel";
import RankingsList from "@/components/optimizer/RankingsList";
import TradeOffChart from "@/components/optimizer/TradeOffChart";

// ── Constants ────────────────────────────────────────────────────────────────

const ACCENT = "#10B981";

type ActiveTab = "rankings" | "tradeoff";

// ── Page Component ───────────────────────────────────────────────────────────

export default function OptimizerPage() {
  const [result, setResult] = useState<OptimizationOutput | null>(null);
  const [selectedJurisdiction, setSelectedJurisdiction] =
    useState<SpaceLawCountryCode | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("rankings");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async (input: OptimizationInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/optimizer/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ??
            `Analysis failed (${res.status})`,
        );
      }

      const data = (await res.json()) as OptimizationOutput;
      setResult(data);

      // Auto-select first ranking
      if (data.rankings.length > 0) {
        const sorted = [...data.rankings].sort(
          (a, b) => b.totalScore - a.totalScore,
        );
        setSelectedJurisdiction(sorted[0].jurisdiction);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectJurisdiction = useCallback(
    (jurisdiction: SpaceLawCountryCode) => {
      setSelectedJurisdiction(jurisdiction);
    },
    [],
  );

  // ── Derived state ────────────────────────────────────────────────────────

  const selectedRanking: JurisdictionRanking | null =
    result?.rankings.find((r) => r.jurisdiction === selectedJurisdiction) ??
    null;

  const migrationPath =
    selectedJurisdiction && result?.migrationPath
      ? result.migrationPath
      : undefined;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-6 font-mono">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-slate-200 text-xl font-bold tracking-tight">
          Regulatory Arbitrage Optimizer
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Compare 10 European jurisdictions and find the optimal regulatory
          environment for your space mission.
        </p>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-6">
        {/* ── Left Panel: Input ──────────────────────────────── */}
        <div className="glass-elevated border border-white/10 rounded-xl p-4 overflow-y-auto max-h-[calc(100vh-140px)]">
          <InputPanel
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            accentColor={ACCENT}
          />
        </div>

        {/* ── Center Panel: Results ──────────────────────────── */}
        <div className="glass-elevated border border-white/10 rounded-xl p-4 min-h-[500px] flex flex-col">
          {/* Error state */}
          {error && (
            <div className="mb-4 glass-surface border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <span className="text-red-400 text-xs shrink-0 mt-0.5">
                &#9888;
              </span>
              <p className="text-red-300 text-xs">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!result && !isLoading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="text-slate-600 text-4xl mb-4">&#9881;</div>
              <p className="text-slate-400 text-xs">
                Configure parameters and click Analyze
              </p>
              <p className="text-slate-500 text-[10px] mt-1">
                Results will appear here with jurisdiction rankings and
                trade-off visualizations.
              </p>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="relative w-12 h-12 mb-4">
                <div
                  className="absolute inset-0 rounded-full border-2 border-transparent animate-spin"
                  style={{ borderTopColor: ACCENT, borderRightColor: ACCENT }}
                />
                <div
                  className="absolute inset-2 rounded-full border-2 border-transparent animate-spin"
                  style={{
                    borderBottomColor: ACCENT,
                    animationDirection: "reverse",
                    animationDuration: "1.5s",
                  }}
                />
              </div>
              <p className="text-slate-400 text-xs">
                Analyzing 10 jurisdictions...
              </p>
              <p className="text-slate-500 text-[10px] mt-1">
                Scoring regulatory dimensions and generating trade-off data.
              </p>
            </div>
          )}

          {/* Results */}
          {result && !isLoading && (
            <>
              {/* Tab buttons */}
              <div className="flex gap-1 mb-4">
                <button
                  onClick={() => setActiveTab("rankings")}
                  className={`px-4 py-1.5 rounded-md text-xs border transition-all duration-200 ${
                    activeTab === "rankings"
                      ? "border-emerald-500/40 text-emerald-400 glass-elevated"
                      : "border-white/10 text-slate-400 glass-surface hover:border-white/20"
                  }`}
                >
                  Rankings
                </button>
                <button
                  onClick={() => setActiveTab("tradeoff")}
                  className={`px-4 py-1.5 rounded-md text-xs border transition-all duration-200 ${
                    activeTab === "tradeoff"
                      ? "border-emerald-500/40 text-emerald-400 glass-elevated"
                      : "border-white/10 text-slate-400 glass-surface hover:border-white/20"
                  }`}
                >
                  Trade-off
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {activeTab === "rankings" ? (
                  <RankingsList
                    rankings={result.rankings}
                    selectedJurisdiction={selectedJurisdiction ?? undefined}
                    onSelect={handleSelectJurisdiction}
                    accentColor={ACCENT}
                  />
                ) : (
                  <div className="w-full aspect-[3/2]">
                    <TradeOffChart
                      data={result.tradeOffData}
                      selectedJurisdiction={selectedJurisdiction ?? undefined}
                      onSelect={handleSelectJurisdiction}
                      accentColor={ACCENT}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Right Panel: Detail ────────────────────────────── */}
        <div className="glass-elevated border border-white/10 rounded-xl p-4 overflow-y-auto max-h-[calc(100vh-140px)]">
          <DetailPanel
            ranking={selectedRanking}
            migrationPath={migrationPath}
            accentColor={ACCENT}
          />
        </div>
      </div>
    </div>
  );
}
