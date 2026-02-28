"use client";

import type { IRSPreviewInput } from "@/lib/assure/irs-preview-calculator";

// Extended data type including UI-only fields
type WizardData = IRSPreviewInput & {
  currentlyRaising?: boolean;
  timelineToClose?: string;
};

// ─── Constants ───

const ROUND_TYPES = [
  { value: "Pre-Seed", label: "Pre-Seed" },
  { value: "Seed", label: "Seed" },
  { value: "Series A", label: "Series A" },
  { value: "Series B+", label: "Series B+" },
];

const TIMELINES = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
  { value: "12+", label: "12+ months" },
];

// ─── Styling ───

const inputClasses =
  "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all";
const labelClasses = "block text-body font-medium text-white/60 mb-1.5";
const selectClasses = `${inputClasses} appearance-none cursor-pointer`;

// ─── Component ───

interface FundraisingStepProps {
  data: WizardData;
  onChange: (field: string, value: string | number | boolean) => void;
}

export default function FundraisingStep({
  data,
  onChange,
}: FundraisingStepProps) {
  const isRaising = data.currentlyRaising || false;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-heading font-semibold text-white mb-1">
          Fundraising
        </h2>
        <p className="text-small text-white/40">
          Your fundraising strategy calibrates benchmarks and comparisons.
        </p>
      </div>

      {/* Currently Raising */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/[0.03] transition-colors">
          <input
            type="checkbox"
            checked={isRaising}
            onChange={(e) => onChange("currentlyRaising", e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
          />
          <span className="text-body-lg text-white/70">
            Currently raising or planning to raise
          </span>
        </label>
      </div>

      {isRaising && (
        <div className="space-y-5">
          {/* Round Type */}
          <div>
            <label className={labelClasses}>Round Type</label>
            <select
              value={data.roundType || ""}
              onChange={(e) => onChange("roundType", e.target.value)}
              className={selectClasses}
            >
              <option value="">Select round type...</option>
              {ROUND_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Raise Amount */}
          <div>
            <label className={labelClasses}>Target Raise Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-body-lg">
                &euro;
              </span>
              <input
                type="number"
                value={data.targetRaise || ""}
                onChange={(e) =>
                  onChange(
                    "targetRaise",
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                placeholder="e.g., 5000000"
                className={`${inputClasses} pl-8`}
              />
            </div>
          </div>

          {/* Timeline to Close */}
          <div>
            <label className={labelClasses}>Timeline to Close</label>
            <select
              value={data.timelineToClose || ""}
              onChange={(e) => onChange("timelineToClose", e.target.value)}
              className={selectClasses}
            >
              <option value="">Select timeline...</option>
              {TIMELINES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
