"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  PlayCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  RotateCcw,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface ComplianceResult {
  operatorType: string;
  regime: string;
  applicableModules: Array<{
    name: string;
    status: string;
    articles: number;
    description: string;
  }>;
  applicableArticles: Array<{
    id: string;
    title: string;
    module: string;
    priority: string;
  }>;
  complianceProfile: {
    totalArticles: number;
    mandatoryCount: number;
    conditionalCount: number;
  };
  annotations: Array<{
    key: string;
    text: string;
  }>;
}

// ─── Constants ───

const ACTIVITY_TYPES = [
  { value: "SCO", label: "Satellite Communications Operator (SCO)" },
  { value: "LO", label: "Launch Operator (LO)" },
  { value: "LSO", label: "Launch Service Operator (LSO)" },
  { value: "ISOS", label: "In-Orbit Service Operator (ISOS)" },
  { value: "PDP", label: "Position Data Provider (PDP)" },
  { value: "TCO", label: "Tracking & Control Operator (TCO)" },
  { value: "CAP", label: "Capacity Provider (CAP)" },
];

const ENTITY_SIZES = [
  { value: "MICRO", label: "Micro (< 10 employees)" },
  { value: "SMALL", label: "Small (10-49 employees)" },
  { value: "MEDIUM", label: "Medium (50-249 employees)" },
  { value: "LARGE", label: "Large (250+ employees)" },
];

const ESTABLISHMENTS = [
  { value: "EU", label: "EU Member State" },
  { value: "NON_EU_WITH_EU_ACTIVITY", label: "Non-EU with EU activity" },
  { value: "NON_EU", label: "Non-EU" },
];

const ORBITS = [
  { value: "LEO", label: "Low Earth Orbit (LEO)" },
  { value: "MEO", label: "Medium Earth Orbit (MEO)" },
  { value: "GEO", label: "Geostationary Orbit (GEO)" },
  { value: "HEO", label: "Highly Elliptical Orbit (HEO)" },
  { value: "SSO", label: "Sun-Synchronous Orbit (SSO)" },
  { value: "NONE", label: "Not applicable" },
];

const ENGINES = [
  { value: "EU_SPACE_ACT", label: "EU Space Act" },
  { value: "NIS2", label: "NIS2 Directive" },
  { value: "SPACE_LAW", label: "National Space Law" },
];

const MODULE_STATUS_ICONS: Record<string, typeof CheckCircle> = {
  APPLICABLE: CheckCircle,
  CONDITIONAL: AlertTriangle,
  NOT_APPLICABLE: XCircle,
};

const MODULE_STATUS_COLORS: Record<string, string> = {
  APPLICABLE: "text-emerald-400",
  CONDITIONAL: "text-amber-400",
  NOT_APPLICABLE: "text-white/30",
};

// ─── Main Page ───

export default function SandboxPage() {
  const [engine, setEngine] = useState("EU_SPACE_ACT");
  const [activityType, setActivityType] = useState("");
  const [entitySize, setEntitySize] = useState("");
  const [establishment, setEstablishment] = useState("");
  const [orbit, setOrbit] = useState("");
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (!activityType || !entitySize) return;
    setCalculating(true);
    setError(null);

    try {
      const res = await fetch("/api/academy/sandbox/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine,
          activityType,
          entitySize,
          establishment,
          orbit,
        }),
      });
      if (!res.ok) throw new Error("Calculation failed");
      const data = await res.json();
      setResult(data.result ?? data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setCalculating(false);
    }
  };

  const handleReset = () => {
    setActivityType("");
    setEntitySize("");
    setEstablishment("");
    setOrbit("");
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-display font-medium text-white mb-1">
          Compliance Sandbox
        </h1>
        <p className="text-body-lg text-white/45">
          Experiment with operator profiles and see real compliance engine
          results
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* Engine Toggle */}
          <div>
            <label className="text-small text-white/60 block mb-2">
              Compliance Engine
            </label>
            <div className="flex gap-2">
              {ENGINES.map((eng) => (
                <button
                  key={eng.value}
                  onClick={() => {
                    setEngine(eng.value);
                    setResult(null);
                  }}
                  className={`flex-1 text-small py-2.5 rounded-lg border transition-all ${
                    engine === eng.value
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {eng.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Type */}
          <div>
            <label className="text-small text-white/60 block mb-2">
              Activity Type *
            </label>
            <div className="relative">
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value="" className="bg-navy-900">
                  Select activity type...
                </option>
                {ACTIVITY_TYPES.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-navy-900"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Entity Size */}
          <div>
            <label className="text-small text-white/60 block mb-2">
              Entity Size *
            </label>
            <div className="relative">
              <select
                value={entitySize}
                onChange={(e) => setEntitySize(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value="" className="bg-navy-900">
                  Select entity size...
                </option>
                {ENTITY_SIZES.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-navy-900"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Establishment */}
          <div>
            <label className="text-small text-white/60 block mb-2">
              Establishment
            </label>
            <div className="relative">
              <select
                value={establishment}
                onChange={(e) => setEstablishment(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value="" className="bg-navy-900">
                  Select establishment...
                </option>
                {ESTABLISHMENTS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-navy-900"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Orbit */}
          <div>
            <label className="text-small text-white/60 block mb-2">
              Orbit Type
            </label>
            <div className="relative">
              <select
                value={orbit}
                onChange={(e) => setOrbit(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body-lg text-white appearance-none cursor-pointer focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                <option value="" className="bg-navy-900">
                  Select orbit type...
                </option>
                {ORBITS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-navy-900"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCalculate}
              disabled={!activityType || !entitySize || calculating}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {calculating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <PlayCircle className="w-5 h-5" />
              )}
              {calculating ? "Calculating..." : "Calculate"}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-small text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Summary */}
                <GlassCard hover={false} className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FlaskConical className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-title font-medium text-white">
                      Compliance Profile
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-display-sm font-semibold text-white">
                        {result.complianceProfile.totalArticles}
                      </p>
                      <p className="text-micro text-white/45">Total Articles</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-display-sm font-semibold text-emerald-400">
                        {result.complianceProfile.mandatoryCount}
                      </p>
                      <p className="text-micro text-white/45">Mandatory</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white/5">
                      <p className="text-display-sm font-semibold text-amber-400">
                        {result.complianceProfile.conditionalCount}
                      </p>
                      <p className="text-micro text-white/45">Conditional</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-small text-white/45">
                    <span>
                      Operator:{" "}
                      <span className="text-white/70">
                        {result.operatorType}
                      </span>
                    </span>
                    <span>
                      Regime:{" "}
                      <span className="text-white/70">{result.regime}</span>
                    </span>
                  </div>
                </GlassCard>

                {/* Module Statuses */}
                <div>
                  <h3 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-3">
                    Module Status
                  </h3>
                  <div className="space-y-2">
                    {result.applicableModules.map((mod, i) => {
                      const StatusIcon =
                        MODULE_STATUS_ICONS[mod.status] ?? Info;
                      const statusColor =
                        MODULE_STATUS_COLORS[mod.status] ?? "text-white/30";
                      return (
                        <GlassCard key={i} hover={false} className="p-4">
                          <div className="flex items-center gap-3">
                            <StatusIcon
                              className={`w-5 h-5 ${statusColor} flex-shrink-0`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-body-lg font-medium text-white">
                                  {mod.name}
                                </h4>
                                <span className="text-micro text-white/30">
                                  {mod.articles} articles
                                </span>
                              </div>
                              <p className="text-small text-white/45">
                                {mod.description}
                              </p>
                            </div>
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>
                </div>

                {/* Annotations */}
                {result.annotations && result.annotations.length > 0 && (
                  <div>
                    <h3 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-3">
                      Educational Notes
                    </h3>
                    <div className="space-y-2">
                      {result.annotations.map((ann, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10"
                        >
                          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                          <p className="text-small text-white/60">{ann.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GlassCard hover={false} className="p-10 text-center">
                  <FlaskConical className="w-14 h-14 text-white/10 mx-auto mb-4" />
                  <h3 className="text-title font-medium text-white/50 mb-2">
                    Configure Your Operator
                  </h3>
                  <p className="text-body text-white/30 max-w-sm mx-auto">
                    Select an activity type and entity size, then click
                    Calculate to see the compliance profile generated by the
                    Caelex engine.
                  </p>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
