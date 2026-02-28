"use client";

import { CheckCircle, Shield, ExternalLink } from "lucide-react";
import type { IRSPreviewInput } from "@/lib/assure/irs-preview-calculator";

// ─── Styling ───

const labelClasses = "block text-body font-medium text-white/60 mb-1.5";

// ─── Component ───

interface ComplyIntegrationStepProps {
  data: IRSPreviewInput;
  onChange: (field: string, value: string | number | boolean) => void;
}

export default function ComplyIntegrationStep({
  data,
  onChange,
}: ComplyIntegrationStepProps) {
  const isLinked = data.complyLinked || false;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-heading font-semibold text-white mb-1">
          Comply Integration
        </h2>
        <p className="text-small text-white/40">
          Link your Comply data for a Regulatory Readiness Score boost.
        </p>
      </div>

      {/* Link toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
          <input
            type="checkbox"
            checked={isLinked}
            onChange={(e) => onChange("complyLinked", e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/30"
          />
          <div className="flex-1">
            <span className="text-body-lg text-white/80 font-medium">
              Link my Comply account
            </span>
            <p className="text-micro text-white/30 mt-0.5">
              Automatically import compliance data into your investor profile
            </p>
          </div>
          <Shield className="w-5 h-5 text-emerald-400/50" />
        </label>
      </div>

      {/* Linked state */}
      {isLinked ? (
        <div className="glass-surface rounded-xl border border-emerald-500/20 p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-body-lg font-medium text-white mb-2">
                Comply Account Linked
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-small text-white/50">
                    Assessments Completed
                  </span>
                  <span className="text-body font-medium text-white/80">
                    {data.assessmentsCompleted || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-small text-white/50">
                    Compliance Score
                  </span>
                  <span className="text-body font-medium text-emerald-400">
                    {data.complianceScore || 0}%
                  </span>
                </div>
              </div>

              {/* Assessment count input */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <label className={labelClasses}>
                  Number of Completed Assessments
                </label>
                <input
                  type="number"
                  value={data.assessmentsCompleted || ""}
                  onChange={(e) =>
                    onChange(
                      "assessmentsCompleted",
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  placeholder="e.g., 3"
                  min={0}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Compliance score input */}
              <div className="mt-3">
                <label className={labelClasses}>
                  Overall Compliance Score (%)
                </label>
                <input
                  type="number"
                  value={data.complianceScore || ""}
                  onChange={(e) =>
                    onChange(
                      "complianceScore",
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                  placeholder="e.g., 72"
                  min={0}
                  max={100}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-3 text-body-lg text-white placeholder:text-white/25 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-surface rounded-xl border border-white/10 p-5">
          <div className="text-center py-4">
            <Shield className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <h3 className="text-body-lg font-medium text-white/60 mb-1">
              No Comply Data Yet
            </h3>
            <p className="text-small text-white/30 mb-4 max-w-xs mx-auto">
              Link your Comply account or run your first compliance assessment
              to unlock the Regulatory Readiness Score.
            </p>
            <a
              href="/assessment"
              className="inline-flex items-center gap-2 text-body text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Run First Assessment
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
