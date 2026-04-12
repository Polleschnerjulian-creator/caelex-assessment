"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Building2,
  Globe,
  Rocket,
  Satellite,
  Shield,
  Radio,
} from "lucide-react";
import type { CompanyProfileData } from "@/lib/dashboard/profile-types";
import {
  COUNTRY_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  ORBIT_OPTIONS,
  ENTITY_SIZE_LABELS,
  MISSION_DURATION_OPTIONS,
  DEFAULT_PROFILE_DATA,
} from "@/lib/dashboard/profile-types";

interface ProfileSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  data: CompanyProfileData | null;
  onSave: (data: CompanyProfileData) => void;
}

/* ─── Section header ─── */
function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <span className="text-gray-400">{icon}</span>
      <h3 className="text-[14px] font-semibold text-gray-900 tracking-[-0.01em]">
        {title}
      </h3>
    </div>
  );
}

/* ─── Form primitives ─── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-150"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) =>
        onChange(e.target.value === "" ? null : Number(e.target.value))
      }
      placeholder={placeholder}
      className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-150"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  options: { code: string; label: string; flag?: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all duration-150 appearance-none"
    >
      <option value="">{placeholder ?? "Select..."}</option>
      {options.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {opt.flag ? `${opt.flag}  ${opt.label}` : opt.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
          checked ? "bg-emerald-500" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-[13px] text-gray-700 group-hover:text-gray-900 transition-colors">
        {label}
      </span>
    </label>
  );
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: { code: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.code);
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => toggle(opt.code)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all duration-150 text-left ${
              active
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                active
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-gray-300 bg-white"
              }`}
            >
              {active && (
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 10 8"
                  fill="none"
                  className="text-white"
                >
                  <path
                    d="M1 4L3.5 6.5L9 1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function EntitySizeRadio({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: "micro" | "small" | "medium" | "large" | null) => void;
}) {
  const sizes = ["micro", "small", "medium", "large"] as const;
  return (
    <div className="grid grid-cols-4 gap-2">
      {sizes.map((size) => {
        const active = value === size;
        return (
          <button
            key={size}
            type="button"
            onClick={() => onChange(active ? null : size)}
            className={`px-3 py-2 rounded-lg border text-[12px] font-semibold transition-all duration-150 capitalize ${
              active
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm"
                : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            {ENTITY_SIZE_LABELS[size]}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main component ─── */
export default function ProfileSlideOver({
  isOpen,
  onClose,
  data,
  onSave,
}: ProfileSlideOverProps) {
  const [form, setForm] = useState<CompanyProfileData>(
    data ?? DEFAULT_PROFILE_DATA,
  );
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync form with external data when it changes or panel opens
  useEffect(() => {
    if (isOpen && data) {
      setForm(data);
    }
  }, [isOpen, data]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const update = useCallback(
    <K extends keyof CompanyProfileData>(
      key: K,
      value: CompanyProfileData[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      // Error handling done by parent
    } finally {
      setSaving(false);
    }
  };

  const countrySelectOptions = COUNTRY_OPTIONS.map((c) => ({
    code: c.code,
    label: c.name,
    flag: c.flag,
  }));

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] transition-all duration-300 ${
          isOpen
            ? "bg-black/20 backdrop-blur-sm pointer-events-auto"
            : "bg-transparent backdrop-blur-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Operator Profile"
        className={`fixed top-0 right-0 z-[61] h-full w-full max-w-[480px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Building2 size={15} className="text-emerald-600" />
            </div>
            <h2 className="text-[15px] font-semibold text-gray-900 tracking-[-0.01em]">
              Operator Profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {/* Company Info */}
          <section>
            <SectionHeader
              icon={<Building2 size={16} />}
              title="Company Information"
            />
            <div className="space-y-4">
              <div>
                <Label>Company Name</Label>
                <TextInput
                  value={form.companyName ?? ""}
                  onChange={(v) => update("companyName", v || null)}
                  placeholder="e.g. AISATS GmbH"
                />
              </div>
              <div>
                <Label>Establishment Country</Label>
                <SelectInput
                  value={form.establishmentCountry}
                  onChange={(v) => update("establishmentCountry", v)}
                  options={countrySelectOptions}
                  placeholder="Select country..."
                />
              </div>
              <div>
                <Label>Entity Size</Label>
                <EntitySizeRadio
                  value={form.entitySize}
                  onChange={(v) => update("entitySize", v)}
                />
              </div>
              <div className="flex flex-col gap-3 pt-1">
                <Toggle
                  checked={form.isResearchInstitution}
                  onChange={(v) => update("isResearchInstitution", v)}
                  label="Research Institution"
                />
                <Toggle
                  checked={form.isStartup}
                  onChange={(v) => update("isStartup", v)}
                  label="Startup"
                />
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* Activities */}
          <section>
            <SectionHeader icon={<Rocket size={16} />} title="Activity Types" />
            <div className="space-y-4">
              <CheckboxGroup
                options={ACTIVITY_TYPE_OPTIONS.map((a) => ({
                  code: a.code,
                  label: a.label,
                }))}
                selected={form.activityTypes}
                onChange={(v) => update("activityTypes", v)}
              />
              <Toggle
                checked={form.isDefenseOnly}
                onChange={(v) => update("isDefenseOnly", v)}
                label="Defense Only"
              />
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* Operations */}
          <section>
            <SectionHeader icon={<Satellite size={16} />} title="Operations" />
            <div className="space-y-4">
              <div>
                <Label>Primary Orbital Regime</Label>
                <SelectInput
                  value={form.primaryOrbitalRegime}
                  onChange={(v) => update("primaryOrbitalRegime", v)}
                  options={ORBIT_OPTIONS}
                  placeholder="Select orbit..."
                />
              </div>
              <div>
                <Toggle
                  checked={form.operatesConstellation}
                  onChange={(v) => update("operatesConstellation", v)}
                  label="Operates Constellation"
                />
                {form.operatesConstellation && (
                  <div className="mt-3 ml-12">
                    <Label>Constellation Size</Label>
                    <TextInput
                      value={form.constellationSize ?? ""}
                      onChange={(v) => update("constellationSize", v || null)}
                      placeholder="e.g. 12"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Spacecraft Count</Label>
                <NumberInput
                  value={form.spacecraftCount}
                  onChange={(v) => update("spacecraftCount", v)}
                  placeholder="e.g. 4"
                />
              </div>
              <div>
                <Label>Mission Duration</Label>
                <SelectInput
                  value={form.missionDuration}
                  onChange={(v) => update("missionDuration", v)}
                  options={MISSION_DURATION_OPTIONS}
                  placeholder="Select duration..."
                />
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* Services */}
          <section>
            <SectionHeader icon={<Radio size={16} />} title="Service Types" />
            <CheckboxGroup
              options={SERVICE_TYPE_OPTIONS}
              selected={form.serviceTypes}
              onChange={(v) => update("serviceTypes", v)}
            />
          </section>

          {/* Spacer for sticky footer */}
          <div className="h-4" />
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold shadow-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Shield size={14} />
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
