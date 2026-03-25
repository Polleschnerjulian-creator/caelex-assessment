"use client";

import { useState, useMemo } from "react";
import { Sliders, ArrowRight, TrendingDown, Zap } from "lucide-react";
import {
  calculateScreeningLCA,
  launchVehicles,
  propellantProfiles,
  getGradeColor,
  formatEmissions,
  type MissionProfile,
  type LaunchVehicleId,
  type PropellantType,
  type EFDGrade,
} from "@/data/environmental-requirements";

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  assessment: {
    spacecraftMassKg: number;
    spacecraftCount: number;
    orbitType: string;
    altitudeKm: number | null;
    missionDurationYears: number;
    launchVehicle: string;
    launchSharePercent: number;
    launchSiteCountry: string | null;
    spacecraftPropellant: string | null;
    propellantMassKg: number | null;
    groundStationCount: number;
    dailyContactHours: number;
    deorbitStrategy: string;
    isSmallEnterprise: boolean;
    isResearchEducation: boolean;
    totalGWP: number | null;
    carbonIntensity: number | null;
    efdGrade: string | null;
  };
}

const DEORBIT_OPTIONS = [
  { value: "controlled_deorbit", label: "Controlled Deorbit" },
  { value: "passive_decay", label: "Passive Decay" },
  { value: "graveyard_orbit", label: "Graveyard Orbit" },
  { value: "retrieval", label: "Active Retrieval" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function SensitivityOptimizer({ assessment }: Props) {
  // What-if overrides
  const [vehicle, setVehicle] = useState(assessment.launchVehicle);
  const [sharePercent, setSharePercent] = useState(
    assessment.launchSharePercent,
  );
  const [deorbit, setDeorbit] = useState(assessment.deorbitStrategy);
  const [propellantMass, setPropellantMass] = useState(
    assessment.propellantMassKg ?? 0,
  );

  // Build what-if profile
  const whatIfResult = useMemo(() => {
    const profile: MissionProfile = {
      missionName: "",
      operatorType: "spacecraft",
      missionType: "commercial",
      spacecraftMassKg: assessment.spacecraftMassKg,
      spacecraftCount: assessment.spacecraftCount,
      orbitType: assessment.orbitType as MissionProfile["orbitType"],
      altitudeKm: assessment.altitudeKm ?? undefined,
      missionDurationYears: assessment.missionDurationYears,
      launchVehicle: vehicle as LaunchVehicleId,
      launchSharePercent: sharePercent,
      launchSiteCountry: assessment.launchSiteCountry ?? "",
      spacecraftPropellant:
        (assessment.spacecraftPropellant as PropellantType) ?? undefined,
      propellantMassKg: propellantMass || undefined,
      groundStationCount: assessment.groundStationCount,
      dailyContactHours: assessment.dailyContactHours,
      deorbitStrategy: deorbit as MissionProfile["deorbitStrategy"],
      isSmallEnterprise: assessment.isSmallEnterprise,
      isResearchEducation: assessment.isResearchEducation,
    };

    try {
      return calculateScreeningLCA(profile);
    } catch {
      return null;
    }
  }, [vehicle, sharePercent, deorbit, propellantMass, assessment]);

  const currentGWP = assessment.totalGWP ?? 0;
  const currentCI = assessment.carbonIntensity ?? 0;
  const currentGrade = assessment.efdGrade ?? "E";

  const newGWP = whatIfResult?.totalGWP ?? currentGWP;
  const newCI = whatIfResult?.carbonIntensity ?? currentCI;
  const newGrade = whatIfResult?.grade ?? currentGrade;

  const gwpDelta = newGWP - currentGWP;
  const ciDelta = newCI - currentCI;
  const hasChange =
    vehicle !== assessment.launchVehicle ||
    sharePercent !== assessment.launchSharePercent ||
    deorbit !== assessment.deorbitStrategy ||
    propellantMass !== (assessment.propellantMassKg ?? 0);

  const gradeImproved = newGrade < currentGrade;
  const gradeWorsened = newGrade > currentGrade;

  return (
    <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders
            className="w-4 h-4 text-[var(--accent-primary)]"
            aria-hidden="true"
          />
          <h3 className="text-subtitle font-medium text-[var(--text-primary)]">
            What-If Optimizer
          </h3>
          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            Live
          </span>
        </div>
        {hasChange && (
          <button
            onClick={() => {
              setVehicle(assessment.launchVehicle);
              setSharePercent(assessment.launchSharePercent);
              setDeorbit(assessment.deorbitStrategy);
              setPropellantMass(assessment.propellantMassKg ?? 0);
            }}
            className="text-small text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex">
        {/* Left: Sliders */}
        <div className="flex-1 p-6 space-y-5 border-r border-[var(--border-default)]">
          {/* Launch Vehicle */}
          <div>
            <label className="text-small font-medium text-[var(--text-secondary)] mb-2 block">
              Launch Vehicle
            </label>
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-default)] text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              {Object.entries(launchVehicles).map(([id, v]) => (
                <option key={id} value={id}>
                  {v.name}{" "}
                  {v.reusability !== "none" ? `(${v.reusability})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Launch Share */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-small font-medium text-[var(--text-secondary)]">
                Rideshare Allocation
              </label>
              <span className="text-small font-mono text-[var(--text-primary)]">
                {sharePercent}%
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={sharePercent}
              onChange={(e) => setSharePercent(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: "var(--accent-primary)" }}
            />
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1">
              <span>1% (rideshare)</span>
              <span>100% (dedicated)</span>
            </div>
          </div>

          {/* Propellant Mass */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-small font-medium text-[var(--text-secondary)]">
                Propellant Mass
              </label>
              <span className="text-small font-mono text-[var(--text-primary)]">
                {propellantMass} kg
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={500}
              step={5}
              value={propellantMass}
              onChange={(e) => setPropellantMass(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: "var(--accent-primary)" }}
            />
          </div>

          {/* Deorbit Strategy */}
          <div>
            <label className="text-small font-medium text-[var(--text-secondary)] mb-2 block">
              Deorbit Strategy
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEORBIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDeorbit(opt.value)}
                  className={`px-3 py-2 rounded-lg text-small font-medium transition-all ${
                    deorbit === opt.value
                      ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
                      : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-[var(--border-active)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Result */}
        <div className="w-[260px] p-6 flex flex-col items-center justify-center gap-4 bg-[var(--surface-sunken)]/30">
          {hasChange ? (
            <>
              {/* Grade Transition */}
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center text-[22px] font-bold opacity-50"
                  style={{
                    backgroundColor: `${getGradeColor(currentGrade as EFDGrade)}15`,
                    color: getGradeColor(currentGrade as EFDGrade),
                  }}
                >
                  {currentGrade}
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--text-tertiary)]" />
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center text-[22px] font-bold"
                  style={{
                    backgroundColor: `${getGradeColor(newGrade as EFDGrade)}20`,
                    color: getGradeColor(newGrade as EFDGrade),
                    boxShadow: gradeImproved
                      ? `0 0 16px ${getGradeColor(newGrade as EFDGrade)}30`
                      : "none",
                  }}
                >
                  {newGrade}
                </div>
              </div>

              {gradeImproved && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-small font-medium">
                  <Zap className="w-3 h-3" />
                  Grade improved!
                </div>
              )}

              {/* Deltas */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-small text-[var(--text-secondary)]">
                    GWP
                  </span>
                  <span
                    className={`text-small font-mono font-medium ${gwpDelta < 0 ? "text-emerald-500" : gwpDelta > 0 ? "text-red-400" : "text-[var(--text-tertiary)]"}`}
                  >
                    {gwpDelta < 0 ? "" : "+"}
                    {formatEmissions(gwpDelta)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-small text-[var(--text-secondary)]">
                    Carbon Intensity
                  </span>
                  <span
                    className={`text-small font-mono font-medium ${ciDelta < 0 ? "text-emerald-500" : ciDelta > 0 ? "text-red-400" : "text-[var(--text-tertiary)]"}`}
                  >
                    {ciDelta < 0 ? "" : "+"}
                    {ciDelta.toFixed(0)} kg/kg
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-small text-[var(--text-secondary)]">
                    New Total
                  </span>
                  <span className="text-small font-mono font-medium text-[var(--text-primary)]">
                    {formatEmissions(newGWP)}
                  </span>
                </div>
              </div>

              {gwpDelta < 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {((Math.abs(gwpDelta) / currentGWP) * 100).toFixed(0)}%
                  reduction
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <Sliders
                className="w-8 h-8 text-[var(--text-tertiary)]/30 mx-auto mb-2"
                aria-hidden="true"
              />
              <p className="text-small text-[var(--text-tertiary)]">
                Adjust parameters to see
                <br />
                live impact on your EFD grade
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
