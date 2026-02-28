"use client";

import type { IRSPreviewInput } from "@/lib/assure/irs-preview-calculator";

// ─── Styling ───

const inputClasses =
  "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all";
const labelClasses = "block text-body font-medium text-white/60 mb-1.5";

// ─── Component ───

interface TeamStepProps {
  data: IRSPreviewInput;
  onChange: (field: string, value: string | number | boolean) => void;
}

export default function TeamStep({ data, onChange }: TeamStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-heading font-semibold text-white mb-1">Team</h2>
        <p className="text-small text-white/40">
          Tell us about your founding team and leadership.
        </p>
      </div>

      {/* Founder Count */}
      <div>
        <label className={labelClasses}>Founder Count</label>
        <input
          type="number"
          value={data.founderCount || ""}
          onChange={(e) =>
            onChange(
              "founderCount",
              e.target.value ? Number(e.target.value) : "",
            )
          }
          placeholder="e.g., 2"
          min={1}
          max={10}
          className={inputClasses}
        />
      </div>

      {/* Has Space Background */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-white/[0.03] transition-colors">
          <input
            type="checkbox"
            checked={data.hasSpaceBackground || false}
            onChange={(e) => onChange("hasSpaceBackground", e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
          />
          <div>
            <span className="text-body-lg text-white/70">
              Team has space industry background
            </span>
            <p className="text-micro text-white/30 mt-0.5">
              Founders or key team members with prior space-sector experience
            </p>
          </div>
        </label>
      </div>

      {/* Key Hires Count */}
      <div>
        <label className={labelClasses}>Key Hires Count</label>
        <input
          type="number"
          value={data.keyHiresCount || ""}
          onChange={(e) =>
            onChange(
              "keyHiresCount",
              e.target.value ? Number(e.target.value) : "",
            )
          }
          placeholder="e.g., 5"
          min={0}
          className={inputClasses}
        />
        <p className="text-micro text-white/25 mt-1">
          Senior technical or business hires beyond founders
        </p>
      </div>

      {/* Advisory Board Count */}
      <div>
        <label className={labelClasses}>Advisory Board Count</label>
        <input
          type="number"
          value={data.advisorCount || ""}
          onChange={(e) =>
            onChange(
              "advisorCount",
              e.target.value ? Number(e.target.value) : "",
            )
          }
          placeholder="e.g., 3"
          min={0}
          className={inputClasses}
        />
        <p className="text-micro text-white/25 mt-1">
          Named advisors with relevant domain expertise
        </p>
      </div>
    </div>
  );
}
