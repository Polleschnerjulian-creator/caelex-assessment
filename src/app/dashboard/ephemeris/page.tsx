"use client";

import { useState, useEffect } from "react";
import { Satellite, RefreshCcw, AlertTriangle, Activity } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import FleetOverview from "./components/fleet-overview";
import AlertList from "./components/alert-list";

interface FleetState {
  noradId: string;
  satelliteName: string;
  overallScore: number;
  dataFreshness: string;
  complianceHorizon: {
    daysUntilFirstBreach: number | null;
    firstBreachRegulation: string | null;
    confidence: string;
  };
  activeAlerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
  }>;
}

export default function EphemerisDashboard() {
  const [fleet, setFleet] = useState<FleetState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"fleet" | "alerts">("fleet");

  useEffect(() => {
    loadFleet();
  }, []);

  const loadFleet = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/ephemeris/fleet", {
        headers: csrfHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load fleet data");
      const data = await res.json();
      setFleet(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const totalAlerts = fleet.reduce(
    (sum, s) => sum + (s.activeAlerts?.length ?? 0),
    0,
  );
  const criticalCount = fleet.filter((s) => s.overallScore < 50).length;

  const tabs = [
    { id: "fleet" as const, label: "Fleet Overview", icon: Satellite },
    {
      id: "alerts" as const,
      label: `Alerts (${totalAlerts})`,
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm font-semibold text-white">
            Ephemeris
          </h1>
          <p className="text-body text-white/45 mt-1">
            Predictive Compliance Intelligence
          </p>
        </div>
        <button
          onClick={loadFleet}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-small font-medium
            bg-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors
            disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 text-white/40 text-small mb-1">
            <Satellite className="w-4 h-4" />
            Fleet Size
          </div>
          <div className="text-display-sm font-semibold text-white">
            {fleet.length}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 text-white/40 text-small mb-1">
            <AlertTriangle className="w-4 h-4" />
            Critical
          </div>
          <div
            className={`text-display-sm font-semibold ${criticalCount > 0 ? "text-red-400" : "text-emerald-400"}`}
          >
            {criticalCount}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 text-white/40 text-small mb-1">
            <Activity className="w-4 h-4" />
            Active Alerts
          </div>
          <div
            className={`text-display-sm font-semibold ${totalAlerts > 0 ? "text-amber-400" : "text-emerald-400"}`}
          >
            {totalAlerts}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-small font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white/[0.08] text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-small">
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "fleet" && (
        <FleetOverview fleet={fleet} loading={loading} />
      )}
      {activeTab === "alerts" && <AlertList fleet={fleet} />}
    </div>
  );
}
