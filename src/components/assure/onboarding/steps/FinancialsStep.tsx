"use client";

import type { IRSPreviewInput } from "@/lib/assure/irs-preview-calculator";

// Extended data type including UI-only fields
type WizardData = IRSPreviewInput & {
  revenueModel?: string;
};

// ─── Constants ───

const REVENUE_MODELS = [
  { value: "SaaS", label: "SaaS" },
  { value: "Usage-Based", label: "Usage-Based" },
  { value: "License", label: "License" },
  { value: "Hardware", label: "Hardware" },
  { value: "Services", label: "Services" },
  { value: "Hybrid", label: "Hybrid" },
];

// ─── Styling ───

const inputClasses =
  "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all";
const labelClasses = "block text-body font-medium text-white/60 mb-1.5";
const selectClasses = `${inputClasses} appearance-none cursor-pointer`;

// ─── Component ───

interface FinancialsStepProps {
  data: WizardData;
  onChange: (field: string, value: string | number | boolean) => void;
}

export default function FinancialsStep({
  data,
  onChange,
}: FinancialsStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-heading font-semibold text-white mb-1">
          Financials
        </h2>
        <p className="text-small text-white/40">
          Key financial metrics that investors evaluate.
        </p>
      </div>

      {/* Revenue Model */}
      <div>
        <label className={labelClasses}>Revenue Model</label>
        <select
          value={data.revenueModel || ""}
          onChange={(e) => onChange("revenueModel", e.target.value)}
          className={selectClasses}
        >
          <option value="">Select model...</option>
          {REVENUE_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* MRR */}
      <div>
        <label className={labelClasses}>Monthly Recurring Revenue (MRR)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-body-lg">
            &euro;
          </span>
          <input
            type="number"
            value={data.mrr || ""}
            onChange={(e) =>
              onChange("mrr", e.target.value ? Number(e.target.value) : "")
            }
            placeholder="e.g., 15000"
            className={`${inputClasses} pl-8`}
          />
        </div>
      </div>

      {/* Monthly Burn Rate */}
      <div>
        <label className={labelClasses}>Monthly Burn Rate</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-body-lg">
            &euro;
          </span>
          <input
            type="number"
            value={data.burnRate || ""}
            onChange={(e) =>
              onChange("burnRate", e.target.value ? Number(e.target.value) : "")
            }
            placeholder="e.g., 45000"
            className={`${inputClasses} pl-8`}
          />
        </div>
      </div>

      {/* Runway in Months */}
      <div>
        <label className={labelClasses}>Runway (months)</label>
        <input
          type="number"
          value={data.runwayMonths || ""}
          onChange={(e) =>
            onChange(
              "runwayMonths",
              e.target.value ? Number(e.target.value) : "",
            )
          }
          placeholder="e.g., 18"
          min={0}
          max={120}
          className={inputClasses}
        />
      </div>

      {/* Previous Funding Raised */}
      <div>
        <label className={labelClasses}>Previous Funding Raised</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-body-lg">
            &euro;
          </span>
          <input
            type="number"
            value={data.previousFunding || ""}
            onChange={(e) =>
              onChange(
                "previousFunding",
                e.target.value ? Number(e.target.value) : "",
              )
            }
            placeholder="e.g., 2000000"
            className={`${inputClasses} pl-8`}
          />
        </div>
      </div>
    </div>
  );
}
