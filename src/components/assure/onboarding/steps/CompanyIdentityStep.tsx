"use client";

import type { IRSPreviewInput } from "@/lib/assure/irs-preview-calculator";

// Extended data type including UI-only fields
type WizardData = IRSPreviewInput & {
  foundedYear?: number;
  headquarters?: string;
};

// ─── Constants ───

const STAGES = [
  { value: "PRE_SEED", label: "Pre-Seed" },
  { value: "SEED", label: "Seed" },
  { value: "SERIES_A", label: "Series A" },
  { value: "SERIES_B", label: "Series B" },
  { value: "GROWTH", label: "Growth" },
];

const OPERATOR_TYPES = [
  { value: "SCO", label: "Satellite Constellation Operator" },
  { value: "LO", label: "Launch Operator" },
  { value: "LSO", label: "Launch Service Operator" },
  { value: "ISOS", label: "In-Space Operations & Services" },
  { value: "CAP", label: "Capacity Provider" },
  { value: "PDP", label: "Payload / Data Provider" },
  { value: "TCO", label: "Telecommunications Operator" },
];

// ─── Styling ───

const inputClasses =
  "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all";
const labelClasses = "block text-body font-medium text-white/60 mb-1.5";
const selectClasses = `${inputClasses} appearance-none cursor-pointer`;

// ─── Component ───

interface CompanyIdentityStepProps {
  data: WizardData;
  onChange: (field: string, value: string | number | boolean) => void;
  preFill?: Record<string, unknown>;
}

export default function CompanyIdentityStep({
  data,
  onChange,
}: CompanyIdentityStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-heading font-semibold text-white mb-1">
          Company Identity
        </h2>
        <p className="text-small text-white/40">
          Start with the essentials about your company.
        </p>
      </div>

      {/* Company Name */}
      <div>
        <label className={labelClasses}>Company Name</label>
        <input
          type="text"
          value={data.companyName || ""}
          onChange={(e) => onChange("companyName", e.target.value)}
          placeholder="e.g., Orbital Dynamics"
          className={inputClasses}
          autoFocus
        />
      </div>

      {/* Founded Year */}
      <div>
        <label className={labelClasses}>Founded Year</label>
        <input
          type="number"
          value={data.foundedYear || ""}
          onChange={(e) =>
            onChange(
              "foundedYear",
              e.target.value ? Number(e.target.value) : "",
            )
          }
          placeholder="e.g., 2022"
          min={1900}
          max={2030}
          className={inputClasses}
        />
      </div>

      {/* Headquarters */}
      <div>
        <label className={labelClasses}>Headquarters</label>
        <input
          type="text"
          value={data.headquarters || ""}
          onChange={(e) => onChange("headquarters", e.target.value)}
          placeholder="e.g., Munich, Germany"
          className={inputClasses}
        />
      </div>

      {/* Company Stage */}
      <div>
        <label className={labelClasses}>Company Stage</label>
        <select
          value={data.stage || ""}
          onChange={(e) => onChange("stage", e.target.value)}
          className={selectClasses}
        >
          <option value="">Select stage...</option>
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Operator Type */}
      <div>
        <label className={labelClasses}>Operator Type</label>
        <select
          value={data.operatorType || ""}
          onChange={(e) => onChange("operatorType", e.target.value)}
          className={selectClasses}
        >
          <option value="">Select type...</option>
          {OPERATOR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* One-liner Pitch */}
      <div>
        <label className={labelClasses}>One-liner Pitch</label>
        <input
          type="text"
          value={data.oneLiner || ""}
          onChange={(e) => onChange("oneLiner", e.target.value)}
          placeholder="e.g., We build next-gen orbital debris removal systems"
          className={inputClasses}
        />
      </div>
    </div>
  );
}
