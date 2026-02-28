"use client";

import type { IRSPreviewInput } from "@/lib/assure/irs-preview-calculator";

// ─── Constants ───

const TRL_LABELS: Record<number, string> = {
  1: "Basic principles",
  2: "Concept formulated",
  3: "Experimental proof",
  4: "Lab validated",
  5: "Relevant environment",
  6: "Demonstrated",
  7: "Prototype in space",
  8: "Qualified",
  9: "Flight proven",
};

const PRODUCT_STAGES = [
  { value: "concept", label: "Concept" },
  { value: "prototype", label: "Prototype" },
  { value: "mvp", label: "MVP" },
  { value: "beta", label: "Beta" },
  { value: "revenue", label: "Revenue-generating" },
];

// ─── Styling ───

const inputClasses =
  "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all";
const labelClasses = "block text-body font-medium text-white/60 mb-1.5";
const selectClasses = `${inputClasses} appearance-none cursor-pointer`;

// ─── Component ───

interface MarketTechStepProps {
  data: IRSPreviewInput;
  onChange: (field: string, value: string | number | boolean) => void;
}

export default function MarketTechStep({
  data,
  onChange,
}: MarketTechStepProps) {
  const trlValue = data.trl || 1;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-heading font-semibold text-white mb-1">
          Market & Technology
        </h2>
        <p className="text-small text-white/40">
          Define your market opportunity and tech readiness.
        </p>
      </div>

      {/* TAM */}
      <div>
        <label className={labelClasses}>Total Addressable Market (TAM)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-body-lg">
            &euro;
          </span>
          <input
            type="number"
            value={data.tam || ""}
            onChange={(e) =>
              onChange("tam", e.target.value ? Number(e.target.value) : "")
            }
            placeholder="e.g., 1000000000"
            className={`${inputClasses} pl-8`}
          />
        </div>
      </div>

      {/* SAM */}
      <div>
        <label className={labelClasses}>
          Serviceable Addressable Market (SAM)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-body-lg">
            &euro;
          </span>
          <input
            type="number"
            value={data.sam || ""}
            onChange={(e) =>
              onChange("sam", e.target.value ? Number(e.target.value) : "")
            }
            placeholder="e.g., 200000000"
            className={`${inputClasses} pl-8`}
          />
        </div>
      </div>

      {/* SOM */}
      <div>
        <label className={labelClasses}>
          Serviceable Obtainable Market (SOM)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-body-lg">
            &euro;
          </span>
          <input
            type="number"
            value={data.som || ""}
            onChange={(e) =>
              onChange("som", e.target.value ? Number(e.target.value) : "")
            }
            placeholder="e.g., 50000000"
            className={`${inputClasses} pl-8`}
          />
        </div>
      </div>

      {/* TRL Slider */}
      <div>
        <label className={labelClasses}>Technology Readiness Level (TRL)</label>
        <div className="mt-2">
          <input
            type="range"
            min={1}
            max={9}
            value={trlValue}
            onChange={(e) => onChange("trl", Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-white/10 accent-emerald-500 cursor-pointer"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-micro text-white/30">TRL 1</span>
            <span className="text-body font-medium text-emerald-400">
              TRL {trlValue} &mdash; {TRL_LABELS[trlValue]}
            </span>
            <span className="text-micro text-white/30">TRL 9</span>
          </div>
        </div>
      </div>

      {/* Patent Count */}
      <div>
        <label className={labelClasses}>Patent Count</label>
        <input
          type="number"
          value={data.patentCount || ""}
          onChange={(e) =>
            onChange(
              "patentCount",
              e.target.value ? Number(e.target.value) : "",
            )
          }
          placeholder="e.g., 3"
          min={0}
          className={inputClasses}
        />
      </div>

      {/* Product Stage */}
      <div>
        <label className={labelClasses}>Product Stage</label>
        <select
          value={data.productStage || ""}
          onChange={(e) => onChange("productStage", e.target.value)}
          className={selectClasses}
        >
          <option value="">Select stage...</option>
          {PRODUCT_STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
