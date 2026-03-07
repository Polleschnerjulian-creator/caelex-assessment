"use client";

import { useState } from "react";
import type {
  OptimizationInput,
  OptimizationWeights,
  WeightProfileName,
} from "@/lib/optimizer/types";
import type {
  SpaceLawActivityType,
  EntityNationality,
  SpaceLawCountryCode,
} from "@/lib/space-law-types";
import { WEIGHT_PRESETS } from "@/lib/optimizer/weight-presets";
import { SPACE_LAW_COUNTRY_CODES } from "@/lib/space-law-types";

// ── Props ────────────────────────────────────────────────────────────────────

interface InputPanelProps {
  onAnalyze: (input: OptimizationInput) => void;
  isLoading: boolean;
  accentColor?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES: { value: SpaceLawActivityType; label: string }[] = [
  { value: "spacecraft_operation", label: "Spacecraft Operation" },
  { value: "launch_vehicle", label: "Launch Vehicle" },
  { value: "launch_site", label: "Launch Site" },
  { value: "in_orbit_services", label: "In-Orbit Services" },
  { value: "earth_observation", label: "Earth Observation" },
  { value: "satellite_communications", label: "Satellite Communications" },
  { value: "space_resources", label: "Space Resources" },
];

const ORBITS: OptimizationInput["primaryOrbit"][] = [
  "LEO",
  "MEO",
  "GEO",
  "beyond",
];
const ENTITY_SIZES: OptimizationInput["entitySize"][] = [
  "small",
  "medium",
  "large",
];

const NATIONALITY_OPTIONS: { value: EntityNationality; label: string }[] = [
  { value: "domestic", label: "Domestic" },
  { value: "eu_other", label: "EU (Other)" },
  { value: "non_eu", label: "Non-EU" },
  { value: "esa_member", label: "ESA Member" },
];

const COUNTRY_LABELS: Record<SpaceLawCountryCode, string> = {
  FR: "France",
  UK: "United Kingdom",
  BE: "Belgium",
  NL: "Netherlands",
  LU: "Luxembourg",
  AT: "Austria",
  DK: "Denmark",
  DE: "Germany",
  IT: "Italy",
  NO: "Norway",
};

const WEIGHT_KEYS: { key: keyof OptimizationWeights; label: string }[] = [
  { key: "timeline", label: "Timeline" },
  { key: "cost", label: "Cost" },
  { key: "compliance", label: "Compliance" },
  { key: "insurance", label: "Insurance" },
  { key: "liability", label: "Liability" },
  { key: "debrisFlex", label: "Debris Flex" },
];

const PRESET_NAMES: Exclude<WeightProfileName, "custom">[] = [
  "startup",
  "enterprise",
  "government",
  "balanced",
];

// ── Component ────────────────────────────────────────────────────────────────

export default function InputPanel({
  onAnalyze,
  isLoading,
  accentColor = "#10B981",
}: InputPanelProps) {
  // Mission specs
  const [activityType, setActivityType] = useState<SpaceLawActivityType>(
    "spacecraft_operation",
  );
  const [entityNationality, setEntityNationality] =
    useState<EntityNationality>("domestic");
  const [entitySize, setEntitySize] =
    useState<OptimizationInput["entitySize"]>("medium");
  const [primaryOrbit, setPrimaryOrbit] =
    useState<OptimizationInput["primaryOrbit"]>("LEO");
  const [constellationSize, setConstellationSize] = useState(1);
  const [missionDuration, setMissionDuration] = useState(5);
  const [hasDesignForDemise, setHasDesignForDemise] = useState(true);

  // Weight profile
  const [weightProfile, setWeightProfile] =
    useState<WeightProfileName>("balanced");
  const [customWeights, setCustomWeights] = useState<OptimizationWeights>({
    timeline: 20,
    cost: 20,
    compliance: 20,
    insurance: 15,
    liability: 15,
    debrisFlex: 10,
  });

  // Re-flagging
  const [isReFlagging, setIsReFlagging] = useState(false);
  const [currentJurisdiction, setCurrentJurisdiction] = useState<string>("");

  function handleWeightChange(key: keyof OptimizationWeights, value: number) {
    setCustomWeights((prev) => ({ ...prev, [key]: value }));
  }

  function handlePresetSelect(preset: Exclude<WeightProfileName, "custom">) {
    setWeightProfile(preset);
    setCustomWeights(WEIGHT_PRESETS[preset].weights);
  }

  function handleAnalyze() {
    const input: OptimizationInput = {
      activityType,
      entityNationality,
      entitySize,
      primaryOrbit,
      constellationSize,
      missionDurationYears: missionDuration,
      hasDesignForDemise,
      weightProfile,
      customWeights: weightProfile === "custom" ? customWeights : undefined,
      currentJurisdiction:
        isReFlagging && currentJurisdiction
          ? (currentJurisdiction as SpaceLawCountryCode)
          : undefined,
    };
    onAnalyze(input);
  }

  return (
    <div className="flex flex-col gap-5 font-mono text-sm">
      {/* ── Mission Specs ─────────────────────────────────────── */}
      <section>
        <h3 className="text-slate-200 text-xs uppercase tracking-wider mb-3 font-semibold">
          Mission Specs
        </h3>

        {/* Activity Type */}
        <label className="block mb-1.5">
          <span className="text-slate-400 text-xs">Activity Type</span>
          <select
            value={activityType}
            onChange={(e) =>
              setActivityType(e.target.value as SpaceLawActivityType)
            }
            className="mt-1 w-full glass-surface border border-white/10 rounded-md px-3 py-2 text-slate-200 text-xs bg-transparent focus:outline-none focus:border-white/20"
          >
            {ACTIVITY_TYPES.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-[#161b22] text-slate-200"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* Primary Orbit - 4 button grid */}
        <div className="mb-3">
          <span className="text-slate-400 text-xs block mb-1.5">
            Primary Orbit
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {ORBITS.map((orbit) => (
              <button
                key={orbit}
                onClick={() => setPrimaryOrbit(orbit)}
                className={`px-2 py-1.5 rounded-md text-xs border transition-all duration-200 ${
                  primaryOrbit === orbit
                    ? "border-emerald-500/40 text-emerald-400 glass-elevated"
                    : "border-white/10 text-slate-400 glass-surface hover:border-white/20"
                }`}
              >
                {orbit}
              </button>
            ))}
          </div>
        </div>

        {/* Entity Size - 3 button grid */}
        <div className="mb-3">
          <span className="text-slate-400 text-xs block mb-1.5">
            Entity Size
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {ENTITY_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setEntitySize(size)}
                className={`px-2 py-1.5 rounded-md text-xs border capitalize transition-all duration-200 ${
                  entitySize === size
                    ? "border-emerald-500/40 text-emerald-400 glass-elevated"
                    : "border-white/10 text-slate-400 glass-surface hover:border-white/20"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Entity Nationality */}
        <label className="block mb-3">
          <span className="text-slate-400 text-xs">Entity Nationality</span>
          <select
            value={entityNationality}
            onChange={(e) =>
              setEntityNationality(e.target.value as EntityNationality)
            }
            className="mt-1 w-full glass-surface border border-white/10 rounded-md px-3 py-2 text-slate-200 text-xs bg-transparent focus:outline-none focus:border-white/20"
          >
            {NATIONALITY_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-[#161b22] text-slate-200"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* Constellation + Duration row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <span className="text-slate-400 text-xs">Constellation</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={constellationSize}
              onChange={(e) =>
                setConstellationSize(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="mt-1 w-full glass-surface border border-white/10 rounded-md px-3 py-2 text-slate-200 text-xs bg-transparent focus:outline-none focus:border-white/20"
            />
          </label>
          <label className="block">
            <span className="text-slate-400 text-xs">Duration (yrs)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={missionDuration}
              onChange={(e) =>
                setMissionDuration(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="mt-1 w-full glass-surface border border-white/10 rounded-md px-3 py-2 text-slate-200 text-xs bg-transparent focus:outline-none focus:border-white/20"
            />
          </label>
        </div>

        {/* Design for Demise */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasDesignForDemise}
            onChange={(e) => setHasDesignForDemise(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-white/20 bg-transparent accent-emerald-500"
          />
          <span className="text-slate-400 text-xs">Design for Demise</span>
        </label>
      </section>

      {/* ── Weight Profile ────────────────────────────────────── */}
      <section>
        <h3 className="text-slate-200 text-xs uppercase tracking-wider mb-3 font-semibold">
          Weight Profile
        </h3>

        {/* Preset grid 2x2 */}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {PRESET_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => handlePresetSelect(name)}
              className={`px-2 py-1.5 rounded-md text-xs border capitalize transition-all duration-200 ${
                weightProfile === name
                  ? "border-emerald-500/40 text-emerald-400 glass-elevated"
                  : "border-white/10 text-slate-400 glass-surface hover:border-white/20"
              }`}
            >
              {WEIGHT_PRESETS[name].label}
            </button>
          ))}
        </div>

        {/* Custom button full-width */}
        <button
          onClick={() => setWeightProfile("custom")}
          className={`w-full px-2 py-1.5 rounded-md text-xs border transition-all duration-200 ${
            weightProfile === "custom"
              ? "border-emerald-500/40 text-emerald-400 glass-elevated"
              : "border-white/10 text-slate-400 glass-surface hover:border-white/20"
          }`}
        >
          Custom
        </button>

        {/* Custom weight sliders */}
        {weightProfile === "custom" && (
          <div className="mt-3 flex flex-col gap-2.5">
            {WEIGHT_KEYS.map(({ key, label }) => (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500 text-[10px] uppercase">
                    {label}
                  </span>
                  <span className="text-slate-300 text-[10px]">
                    {customWeights[key]}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={customWeights[key]}
                  onChange={(e) =>
                    handleWeightChange(key, parseInt(e.target.value))
                  }
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${accentColor} ${customWeights[key]}%, #334155 ${customWeights[key]}%)`,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Re-Flagging ───────────────────────────────────────── */}
      <section>
        <h3 className="text-slate-200 text-xs uppercase tracking-wider mb-3 font-semibold">
          Re-Flagging
        </h3>

        <label className="flex items-center gap-2 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={isReFlagging}
            onChange={(e) => setIsReFlagging(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-white/20 bg-transparent accent-emerald-500"
          />
          <span className="text-slate-400 text-xs">
            Currently registered in a jurisdiction
          </span>
        </label>

        {isReFlagging && (
          <select
            value={currentJurisdiction}
            onChange={(e) => setCurrentJurisdiction(e.target.value)}
            className="w-full glass-surface border border-white/10 rounded-md px-3 py-2 text-slate-200 text-xs bg-transparent focus:outline-none focus:border-white/20"
          >
            <option value="" className="bg-[#161b22] text-slate-400">
              Select jurisdiction...
            </option>
            {SPACE_LAW_COUNTRY_CODES.map((code) => (
              <option
                key={code}
                value={code}
                className="bg-[#161b22] text-slate-200"
              >
                {code} - {COUNTRY_LABELS[code]}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* ── Analyze Button ────────────────────────────────────── */}
      <button
        onClick={handleAnalyze}
        disabled={isLoading}
        className="w-full py-2.5 rounded-lg text-white text-xs font-semibold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: isLoading ? "#334155" : accentColor,
        }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing...
          </span>
        ) : (
          "Analyze Jurisdictions"
        )}
      </button>
    </div>
  );
}
