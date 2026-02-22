"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Satellite,
  Orbit,
  Globe,
  Save,
  Loader2,
  CheckCircle2,
  FileText,
  AlertCircle,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";

// ─── Types ───

interface OperatorProfileData {
  id: string;
  organizationId: string;
  operatorType: string | null;
  euOperatorCode: string | null;
  entitySize: string | null;
  isResearch: boolean;
  isDefenseOnly: boolean;
  primaryOrbit: string | null;
  orbitAltitudeKm: number | null;
  satelliteMassKg: number | null;
  isConstellation: boolean;
  constellationSize: number | null;
  missionDurationMonths: number | null;
  plannedLaunchDate: string | null;
  establishment: string | null;
  operatingJurisdictions: string[];
  offersEUServices: boolean;
  completeness: number;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── Option Lists ───

const OPERATOR_TYPE_OPTIONS = [
  { value: "spacecraft_operator", label: "Spacecraft Operator (SCO)" },
  { value: "launch_operator", label: "Launch Operator (LO)" },
  { value: "launch_site_operator", label: "Launch Site Operator (LSO)" },
  {
    value: "in_space_services_provider",
    label: "In-Space Services Provider (ISOS)",
  },
  { value: "capsule_operator", label: "Capsule Operator (CAP)" },
  { value: "primary_data_provider", label: "Primary Data Provider (PDP)" },
  { value: "third_country_operator", label: "Third Country Operator (TCO)" },
];

const EU_OPERATOR_CODE_OPTIONS = [
  { value: "SCO", label: "SCO - Spacecraft Operator" },
  { value: "LO", label: "LO - Launch Operator" },
  { value: "LSO", label: "LSO - Launch Site Operator" },
  { value: "ISOS", label: "ISOS - In-Space Services Operator" },
  { value: "CAP", label: "CAP - Capsule Operator" },
  { value: "PDP", label: "PDP - Primary Data Provider" },
  { value: "TCO", label: "TCO - Third Country Operator" },
];

const ENTITY_SIZE_OPTIONS = [
  { value: "micro", label: "Micro (< 10 employees)" },
  { value: "small", label: "Small (10-49 employees)" },
  { value: "medium", label: "Medium (50-249 employees)" },
  { value: "large", label: "Large (250+ employees)" },
];

const ORBIT_OPTIONS = [
  { value: "LEO", label: "Low Earth Orbit (LEO)" },
  { value: "MEO", label: "Medium Earth Orbit (MEO)" },
  { value: "GEO", label: "Geostationary Orbit (GEO)" },
  { value: "GTO", label: "Geostationary Transfer Orbit (GTO)" },
  { value: "HEO", label: "Highly Elliptical Orbit (HEO)" },
  { value: "SSO", label: "Sun-Synchronous Orbit (SSO)" },
  { value: "cislunar", label: "Cislunar Space" },
  { value: "deep_space", label: "Deep Space" },
];

const JURISDICTION_OPTIONS = [
  { value: "DE", label: "Germany (DE)" },
  { value: "FR", label: "France (FR)" },
  { value: "IT", label: "Italy (IT)" },
  { value: "NL", label: "Netherlands (NL)" },
  { value: "BE", label: "Belgium (BE)" },
  { value: "LU", label: "Luxembourg (LU)" },
  { value: "AT", label: "Austria (AT)" },
  { value: "DK", label: "Denmark (DK)" },
  { value: "NO", label: "Norway (NO)" },
  { value: "GB", label: "United Kingdom (GB)" },
  { value: "ES", label: "Spain (ES)" },
  { value: "PT", label: "Portugal (PT)" },
  { value: "SE", label: "Sweden (SE)" },
  { value: "FI", label: "Finland (FI)" },
  { value: "IE", label: "Ireland (IE)" },
  { value: "PL", label: "Poland (PL)" },
  { value: "CZ", label: "Czech Republic (CZ)" },
  { value: "RO", label: "Romania (RO)" },
  { value: "GR", label: "Greece (GR)" },
];

// ─── Component ───

export default function OperatorProfileEditor() {
  const [profile, setProfile] = useState<OperatorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/organization/profile");
        if (res.ok) {
          const json = await res.json();
          setProfile(json.profile);
        } else {
          setFetchError(true);
        }
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  // Save function with debounce
  const saveProfile = useCallback((data: Partial<OperatorProfileData>) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const res = await fetch("/api/organization/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          const json = await res.json();
          setProfile(json.profile);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
          setTimeout(() => setSaveStatus("idle"), 3000);
        }
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    }, 500);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Field change handler
  const handleChange = useCallback(
    (field: keyof OperatorProfileData, value: unknown) => {
      if (!profile) return;

      const updated = { ...profile, [field]: value };
      setProfile(updated);
      saveProfile({ [field]: value });
    },
    [profile, saveProfile],
  );

  // Toggle jurisdiction in array
  const handleJurisdictionToggle = useCallback(
    (jurisdiction: string) => {
      if (!profile) return;

      const current = profile.operatingJurisdictions || [];
      const updated = current.includes(jurisdiction)
        ? current.filter((j) => j !== jurisdiction)
        : [...current, jurisdiction];

      const newProfile = { ...profile, operatingJurisdictions: updated };
      setProfile(newProfile);
      saveProfile({ operatingJurisdictions: updated });
    },
    [profile, saveProfile],
  );

  if (loading) {
    return (
      <GlassCard hover={false} className="p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-slate-400 dark:text-white/30 animate-spin" />
        </div>
      </GlassCard>
    );
  }

  if (fetchError || !profile) {
    return (
      <GlassCard hover={false} className="p-8">
        <div className="flex items-center justify-center gap-2 py-12 text-slate-400 dark:text-white/45">
          <AlertCircle className="w-5 h-5" />
          <p>Failed to load operator profile. Please try again later.</p>
        </div>
      </GlassCard>
    );
  }

  const completenessPercent = Math.round(profile.completeness * 100);

  return (
    <div className="space-y-6">
      {/* Header + Save Status */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-title font-semibold text-slate-900 dark:text-white">
              Operator Profile
            </h2>
            <p className="text-body text-slate-500 dark:text-white/45 mt-1">
              Complete your operator profile to pre-fill regulatory assessments.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === "saving" && (
              <div className="flex items-center gap-1.5 text-caption text-slate-400 dark:text-white/45">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {saveStatus === "saved" && (
              <div className="flex items-center gap-1.5 text-caption text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved</span>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-1.5 text-caption text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Save failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Completeness */}
        <Progress
          value={completenessPercent}
          max={100}
          size="md"
          color="emerald"
          showLabel
          showValue
          label="Profile Completeness"
        />
      </GlassCard>

      {/* Section: Classification */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Satellite className="w-4 h-4 text-emerald-400" />
          <h3 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
            Classification
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Select
            label="Operator Type"
            options={OPERATOR_TYPE_OPTIONS}
            placeholder="Select operator type..."
            value={profile.operatorType || ""}
            onChange={(e) =>
              handleChange("operatorType", e.target.value || null)
            }
            required
          />

          <Select
            label="EU Operator Code"
            options={EU_OPERATOR_CODE_OPTIONS}
            placeholder="Select EU code..."
            value={profile.euOperatorCode || ""}
            onChange={(e) =>
              handleChange("euOperatorCode", e.target.value || null)
            }
          />

          <Select
            label="Entity Size"
            options={ENTITY_SIZE_OPTIONS}
            placeholder="Select entity size..."
            value={profile.entitySize || ""}
            onChange={(e) => handleChange("entitySize", e.target.value || null)}
            required
          />

          <div className="space-y-3">
            <label className="block text-body font-medium text-slate-700 dark:text-white/70">
              Special Classifications
            </label>
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.isResearch}
                  onChange={(e) => handleChange("isResearch", e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-emerald-500 focus:ring-emerald-500/30 bg-white dark:bg-white/[0.06]"
                />
                <span className="text-body text-slate-700 dark:text-slate-200">
                  Research entity (eligible for light regime)
                </span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.isDefenseOnly}
                  onChange={(e) =>
                    handleChange("isDefenseOnly", e.target.checked)
                  }
                  className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-emerald-500 focus:ring-emerald-500/30 bg-white dark:bg-white/[0.06]"
                />
                <span className="text-body text-slate-700 dark:text-slate-200">
                  Defense-only operations (excluded from EU Space Act)
                </span>
              </label>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Section: Mission Profile */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Orbit className="w-4 h-4 text-emerald-400" />
          <h3 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
            Mission Profile
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Select
            label="Primary Orbit"
            options={ORBIT_OPTIONS}
            placeholder="Select orbit..."
            value={profile.primaryOrbit || ""}
            onChange={(e) =>
              handleChange("primaryOrbit", e.target.value || null)
            }
            required
          />

          <Input
            label="Orbit Altitude (km)"
            type="number"
            min={0}
            placeholder="e.g. 550"
            value={profile.orbitAltitudeKm ?? ""}
            onChange={(e) =>
              handleChange(
                "orbitAltitudeKm",
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />

          <Input
            label="Satellite Mass (kg)"
            type="number"
            min={0}
            placeholder="e.g. 250"
            value={profile.satelliteMassKg ?? ""}
            onChange={(e) =>
              handleChange(
                "satelliteMassKg",
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />

          <Input
            label="Mission Duration (months)"
            type="number"
            min={1}
            placeholder="e.g. 60"
            value={profile.missionDurationMonths ?? ""}
            onChange={(e) =>
              handleChange(
                "missionDurationMonths",
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />

          <Input
            label="Planned Launch Date"
            type="date"
            value={
              profile.plannedLaunchDate
                ? profile.plannedLaunchDate.split("T")[0]
                : ""
            }
            onChange={(e) =>
              handleChange(
                "plannedLaunchDate",
                e.target.value ? new Date(e.target.value).toISOString() : null,
              )
            }
          />

          <div className="space-y-3">
            <label className="block text-body font-medium text-slate-700 dark:text-white/70">
              Constellation
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.isConstellation}
                onChange={(e) =>
                  handleChange("isConstellation", e.target.checked)
                }
                className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-emerald-500 focus:ring-emerald-500/30 bg-white dark:bg-white/[0.06]"
              />
              <span className="text-body text-slate-700 dark:text-slate-200">
                Part of a constellation
              </span>
            </label>
            {profile.isConstellation && (
              <Input
                label="Constellation Size"
                type="number"
                min={1}
                placeholder="Number of satellites"
                value={profile.constellationSize ?? ""}
                onChange={(e) =>
                  handleChange(
                    "constellationSize",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
            )}
          </div>
        </div>
      </GlassCard>

      {/* Section: Jurisdiction */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-4 h-4 text-emerald-400" />
          <h3 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
            Jurisdiction
          </h3>
        </div>

        <div className="space-y-5">
          <Select
            label="Primary Establishment"
            options={JURISDICTION_OPTIONS}
            placeholder="Select jurisdiction..."
            value={profile.establishment || ""}
            onChange={(e) =>
              handleChange("establishment", e.target.value || null)
            }
            required
          />

          <div className="space-y-2">
            <label className="block text-body font-medium text-slate-700 dark:text-white/70">
              Operating Jurisdictions
            </label>
            <p className="text-small text-slate-500 dark:text-white/45">
              Select all jurisdictions where you operate or provide services.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {JURISDICTION_OPTIONS.map((j) => {
                const isSelected = (
                  profile.operatingJurisdictions || []
                ).includes(j.value);
                return (
                  <button
                    key={j.value}
                    type="button"
                    onClick={() => handleJurisdictionToggle(j.value)}
                    className={`
                      px-3 py-2 rounded-lg text-caption font-medium transition-all duration-200 text-left
                      ${
                        isSelected
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-slate-50 dark:bg-white/[0.04] text-slate-600 dark:text-white/50 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                      }
                    `}
                  >
                    {j.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.offersEUServices}
              onChange={(e) =>
                handleChange("offersEUServices", e.target.checked)
              }
              className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-emerald-500 focus:ring-emerald-500/30 bg-white dark:bg-white/[0.06]"
            />
            <span className="text-body text-slate-700 dark:text-slate-200">
              Offers services in the EU market
            </span>
          </label>
        </div>
      </GlassCard>

      {/* Assessment Pre-fill Info */}
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-emerald-400" />
          <h3 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
            Assessment Pre-fill
          </h3>
        </div>
        <p className="text-body text-slate-500 dark:text-white/45 mb-4">
          Your operator profile can pre-fill answers for the following
          assessments, saving time and ensuring consistency.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
            <div
              className={`w-2 h-2 rounded-full ${
                profile.operatorType && profile.entitySize
                  ? "bg-emerald-500"
                  : "bg-slate-300 dark:bg-white/20"
              }`}
            />
            <div className="min-w-0">
              <p className="text-body font-medium text-slate-700 dark:text-slate-200">
                EU Space Act Assessment
              </p>
              <p className="text-small text-slate-500 dark:text-white/45">
                {profile.operatorType && profile.entitySize
                  ? "Ready to pre-fill"
                  : "Needs operator type & entity size"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10">
            <div
              className={`w-2 h-2 rounded-full ${
                profile.entitySize && profile.establishment
                  ? "bg-emerald-500"
                  : "bg-slate-300 dark:bg-white/20"
              }`}
            />
            <div className="min-w-0">
              <p className="text-body font-medium text-slate-700 dark:text-slate-200">
                NIS2 Assessment
              </p>
              <p className="text-small text-slate-500 dark:text-white/45">
                {profile.entitySize && profile.establishment
                  ? "Ready to pre-fill"
                  : "Needs entity size & establishment"}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
