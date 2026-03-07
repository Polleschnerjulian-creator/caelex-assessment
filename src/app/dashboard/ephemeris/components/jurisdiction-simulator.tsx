"use client";

import { useState } from "react";
import {
  Globe,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { csrfHeaders } from "@/lib/csrf-client";

const JURISDICTIONS = [
  { code: "DE", name: "Germany" },
  { code: "NO", name: "Norway" },
  { code: "GB", name: "United Kingdom" },
  { code: "LU", name: "Luxembourg" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "SE", name: "Sweden" },
];

interface SimulationResult {
  fromJurisdiction: string;
  toJurisdiction: string;
  complianceDelta: {
    scoreBefore: number;
    scoreAfter: number;
    scoreDelta: number;
  };
  requirementsAdded: Array<{ name: string; regulationRef: string }>;
  requirementsRemoved: Array<{ name: string; regulationRef: string }>;
  documentsNeeded: string[];
  documentsRemoved: string[];
  estimatedTimeline: {
    approvalDuration: string;
    additionalComplianceWork: string;
  };
  regulatoryAuthority: {
    current: string;
    new: string;
  };
}

interface JurisdictionSimulatorProps {
  noradId: string;
  satelliteName: string;
}

export default function JurisdictionSimulator({
  noradId,
  satelliteName,
}: JurisdictionSimulatorProps) {
  const [fromCode, setFromCode] = useState("DE");
  const [toCode, setToCode] = useState<string | null>(null);
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const body: Record<string, string> = {
        norad_id: noradId,
        from_jurisdiction: fromCode,
      };
      if (toCode) body.to_jurisdiction = toCode;

      const res = await fetch("/api/v1/ephemeris/simulate", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Simulation failed");
      const data = await res.json();

      // Normalize to array
      setResults(Array.isArray(data.data) ? data.data : [data.data]);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <GlassCard hover={false} className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-[var(--text-primary)]" />
          <h3 className="text-title font-medium text-[var(--text-primary)]">
            Jurisdiction Simulator
          </h3>
        </div>
        <p className="text-small text-[var(--text-tertiary)] mb-4">
          Compare compliance requirements across European jurisdictions for{" "}
          <span className="text-[var(--text-secondary)]">{satelliteName}</span>.
        </p>

        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="text-caption text-[var(--text-tertiary)] block mb-1">
              Current Jurisdiction
            </label>
            <select
              value={fromCode}
              onChange={(e) => setFromCode(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--fill-strong)] text-small text-[var(--text-primary)]
                focus:outline-none focus:border-[var(--accent-primary)]"
            >
              {JURISDICTIONS.map((j) => (
                <option key={j.code} value={j.code}>
                  {j.code} — {j.name}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-5 h-5 text-[var(--text-tertiary)] mb-2" />

          <div>
            <label className="text-caption text-[var(--text-tertiary)] block mb-1">
              Target Jurisdiction
            </label>
            <select
              value={toCode ?? ""}
              onChange={(e) => setToCode(e.target.value || null)}
              className="px-3 py-2 rounded-lg bg-[var(--surface-raised)] border border-[var(--fill-strong)] text-small text-[var(--text-primary)]
                focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="">Compare All</option>
              {JURISDICTIONS.filter((j) => j.code !== fromCode).map((j) => (
                <option key={j.code} value={j.code}>
                  {j.code} — {j.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={runSimulation}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-small font-medium
              bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] transition-colors
              disabled:opacity-50"
          >
            {loading ? "Simulating..." : "Run Simulation"}
          </button>
        </div>
      </GlassCard>

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <h3 className="text-heading font-semibold text-[var(--text-primary)]">
            Results ({results.length} jurisdiction
            {results.length !== 1 ? "s" : ""})
          </h3>
          {results.map((sim) => (
            <SimulationResultCard key={sim.toJurisdiction} sim={sim} />
          ))}
        </div>
      )}
    </div>
  );
}

function SimulationResultCard({ sim }: { sim: SimulationResult }) {
  const delta = sim.complianceDelta.scoreDelta;

  return (
    <GlassCard hover={false} highlighted={delta > 0} className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-title font-medium text-[var(--text-primary)]">
              {sim.fromJurisdiction} → {sim.toJurisdiction}
            </span>
            {delta > 0 ? (
              <TrendingUp className="w-4 h-4 text-[var(--text-primary)]" />
            ) : delta < 0 ? (
              <TrendingDown className="w-4 h-4 text-[var(--accent-danger)]" />
            ) : (
              <Minus className="w-4 h-4 text-[var(--text-tertiary)]" />
            )}
          </div>
          <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
            {sim.regulatoryAuthority.current} → {sim.regulatoryAuthority.new}
          </p>
        </div>
        <div
          className={`text-heading font-bold ${
            delta > 0
              ? "text-[var(--text-primary)]"
              : delta < 0
                ? "text-[var(--accent-danger)]"
                : "text-[var(--text-tertiary)]"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-small">
        <div>
          <span className="text-[var(--text-tertiary)]">Score Before</span>
          <span className="ml-2 text-[var(--text-secondary)]">
            {sim.complianceDelta.scoreBefore}
          </span>
        </div>
        <div>
          <span className="text-[var(--text-tertiary)]">Score After</span>
          <span className="ml-2 text-[var(--text-secondary)]">
            {sim.complianceDelta.scoreAfter}
          </span>
        </div>
        <div>
          <span className="text-[var(--text-tertiary)]">Approval</span>
          <span className="ml-2 text-[var(--text-secondary)]">
            {sim.estimatedTimeline.approvalDuration}
          </span>
        </div>
        <div>
          <span className="text-[var(--text-tertiary)]">Compliance Work</span>
          <span className="ml-2 text-[var(--text-secondary)]">
            {sim.estimatedTimeline.additionalComplianceWork}
          </span>
        </div>
      </div>

      {sim.requirementsAdded.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--separator-strong)]">
          <span className="text-caption text-[var(--accent-danger)]">
            +{sim.requirementsAdded.length} new requirements:
          </span>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {sim.requirementsAdded.map((r) => (
              <span
                key={r.regulationRef}
                className="px-2 py-0.5 rounded text-micro bg-[var(--accent-danger-soft)] text-[var(--accent-danger)]"
              >
                {r.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {sim.requirementsRemoved.length > 0 && (
        <div className="mt-2">
          <span className="text-caption text-[var(--text-secondary)]">
            −{sim.requirementsRemoved.length} removed requirements:
          </span>
          <div className="flex gap-1.5 flex-wrap mt-1">
            {sim.requirementsRemoved.map((r) => (
              <span
                key={r.regulationRef}
                className="px-2 py-0.5 rounded text-micro bg-[var(--fill-light)] text-[var(--text-secondary)]"
              >
                {r.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
