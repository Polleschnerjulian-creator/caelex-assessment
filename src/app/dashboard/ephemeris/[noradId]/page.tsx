"use client";

import { useState, useEffect, use } from "react";
import {
  ArrowLeft,
  RefreshCcw,
  Clock,
  Shield,
  Fuel,
  Radio,
  Globe,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf-client";
import ComplianceHorizonDisplay from "../components/compliance-horizon-display";
import ModuleBreakdown from "../components/module-breakdown";
import ForecastChart from "../components/forecast-chart";
import AlertList from "../components/alert-list";
import DataSourcesPanel from "../components/data-sources-panel";
import ScenarioBuilder from "../components/scenario-builder/ScenarioBuilder";

interface SatelliteState {
  noradId: string;
  satelliteName: string;
  overallScore: number;
  dataFreshness: string;
  complianceHorizon: {
    daysUntilFirstBreach: number | null;
    firstBreachRegulation: string | null;
    firstBreachType: string | null;
    confidence: string;
  };
  modules: Record<
    string,
    {
      status: string;
      score: number;
      dataSource: string;
      factors: Array<{
        id: string;
        name: string;
        regulationRef: string;
        status: string;
        thresholdValue: number;
        unit: string;
        daysToThreshold: number | null;
        confidence: number;
      }>;
    }
  >;
  dataSources: Record<
    string,
    { connected: boolean; lastUpdate: string | null; status: string }
  >;
  activeAlerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
  }>;
  calculatedAt: string;
}

interface ForecastData {
  forecastCurves: Array<{
    regulationRef: string;
    regulationName: string;
    metric: string;
    unit: string;
    thresholdValue: number;
    dataPoints: Array<{
      date: string;
      nominal: number;
      bestCase: number;
      worstCase: number;
      isHistorical: boolean;
    }>;
    crossingDate: string | null;
    crossingDaysFromNow: number | null;
    confidence: string;
  }>;
  complianceEvents: Array<{
    id: string;
    date: string;
    daysFromNow: number;
    regulationRef: string;
    regulationName: string;
    eventType: string;
    severity: string;
    description: string;
    recommendedAction: string;
  }>;
  horizonDays: number | null;
}

export default function SatelliteDetailPage({
  params,
}: {
  params: Promise<{ noradId: string }>;
}) {
  const { noradId } = use(params);
  const [state, setState] = useState<SatelliteState | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "forecast" | "simulate"
  >("overview");

  useEffect(() => {
    loadData();
  }, [noradId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stateRes, forecastRes] = await Promise.all([
        fetch(`/api/v1/ephemeris/state?norad_id=${noradId}`, {
          headers: csrfHeaders(),
        }),
        fetch(`/api/v1/ephemeris/forecast?norad_id=${noradId}`, {
          headers: csrfHeaders(),
        }),
      ]);

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        setState(stateData.data);
      }
      if (forecastRes.ok) {
        const forecastData = await forecastRes.json();
        setForecast(forecastData.data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const recalculate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/ephemeris/recalculate", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ norad_id: noradId }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: Shield },
    { id: "forecast" as const, label: "Forecast", icon: Clock },
    { id: "simulate" as const, label: "Scenario Builder", icon: Layers },
  ];

  if (loading && !state) {
    return (
      <div className="flex items-center justify-center h-64 text-[#9CA3AF]">
        <RefreshCcw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/ephemeris"
            className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F1F3F5] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-display-sm font-semibold text-[#111827]">
              {state?.satelliteName ?? noradId}
            </h1>
            <p className="text-body text-[#6B7280] mt-0.5">
              NORAD {noradId} · Score:{" "}
              <span
                className={
                  (state?.overallScore ?? 0) >= 70
                    ? "text-[#111827] font-semibold"
                    : (state?.overallScore ?? 0) >= 50
                      ? "text-amber-500 font-semibold"
                      : "text-red-500 font-semibold"
                }
              >
                {state?.overallScore ?? "—"}/100
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={recalculate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-small font-medium
            bg-[#111827] text-white hover:bg-[#374151] transition-colors
            disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Recalculate
        </button>
      </div>

      {/* Compliance Horizon */}
      {state && <ComplianceHorizonDisplay horizon={state.complianceHorizon} />}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#F7F8FA] rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-small font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-white text-[#111827] shadow-sm"
                  : "text-[#9CA3AF] hover:text-[#4B5563]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && state && (
        <div className="space-y-6">
          <ModuleBreakdown modules={state.modules} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AlertList fleet={[state]} />
            <DataSourcesPanel
              dataSources={state.dataSources}
              dataFreshness={state.dataFreshness}
            />
          </div>
        </div>
      )}

      {activeTab === "forecast" && forecast && (
        <ForecastChart
          curves={forecast.forecastCurves}
          events={forecast.complianceEvents}
        />
      )}

      {activeTab === "simulate" && (
        <ScenarioBuilder
          noradId={noradId}
          satelliteName={state?.satelliteName ?? noradId}
        />
      )}
    </div>
  );
}
