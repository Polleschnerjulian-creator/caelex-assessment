"use client";

import { Radio, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

const SOURCE_LABELS: Record<string, string> = {
  sentinel: "Sentinel Telemetry",
  celestrak: "CelesTrak TLE",
  verity: "Verity Attestations",
  assessment: "Compliance Assessments",
  solarFlux: "NOAA Solar Flux",
};

interface DataSourcesPanelProps {
  dataSources: Record<
    string,
    { connected: boolean; lastUpdate: string | null; status: string }
  >;
  dataFreshness: string;
}

function statusIcon(connected: boolean, status: string) {
  if (!connected)
    return <XCircle className="w-4 h-4 text-[var(--accent-danger)]" />;
  if (status === "error")
    return <AlertCircle className="w-4 h-4 text-[var(--accent-warning)]" />;
  return <CheckCircle className="w-4 h-4 text-[#111827]" />;
}

function freshnessLabel(freshness: string): { text: string; color: string } {
  switch (freshness) {
    case "LIVE":
      return { text: "Live (<1h)", color: "text-[#111827]" };
    case "RECENT":
      return { text: "Recent (<24h)", color: "text-[#4B5563]" };
    case "STALE":
      return { text: "Stale (>24h)", color: "text-[var(--accent-warning)]" };
    default:
      return { text: "No Data", color: "text-[var(--accent-danger)]" };
  }
}

export default function DataSourcesPanel({
  dataSources,
  dataFreshness,
}: DataSourcesPanelProps) {
  const freshness = freshnessLabel(dataFreshness);

  return (
    <div>
      <h3 className="text-heading font-semibold text-[#111827] mb-3">
        Data Sources
      </h3>

      <GlassCard hover={false} className="p-4">
        {/* Overall freshness */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5E7EB]">
          <Radio className={`w-4 h-4 ${freshness.color}`} />
          <span className="text-small text-[#6B7280]">Overall Freshness:</span>
          <span className={`text-small font-medium ${freshness.color}`}>
            {freshness.text}
          </span>
        </div>

        {/* Individual sources */}
        <div className="space-y-3">
          {Object.entries(dataSources).map(([key, source]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {statusIcon(source.connected, source.status)}
                <span className="text-small text-[#374151]">
                  {SOURCE_LABELS[key] ?? key}
                </span>
              </div>
              <span className="text-caption text-[#9CA3AF]">
                {source.lastUpdate
                  ? new Date(source.lastUpdate).toLocaleString()
                  : "Never"}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
