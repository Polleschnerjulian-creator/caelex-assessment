"use client";

import type { JurisdictionRanking, MigrationStep } from "@/lib/optimizer/types";
import RadarChart from "./RadarChart";

// ── Props ────────────────────────────────────────────────────────────────────

interface DetailPanelProps {
  ranking: JurisdictionRanking | null;
  migrationPath?: MigrationStep[];
  accentColor?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DetailPanel({
  ranking,
  migrationPath,
  accentColor = "#10B981",
}: DetailPanelProps) {
  if (!ranking) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
        <div className="text-slate-500 text-2xl mb-3">&#9672;</div>
        <p className="text-slate-400 text-xs font-mono">
          Select a jurisdiction to view details
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 font-mono text-sm">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{ranking.flagEmoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-slate-200 text-base font-semibold truncate">
            {ranking.jurisdictionName}
          </h3>
          <span className="text-slate-500 text-xs">{ranking.jurisdiction}</span>
        </div>
        <div
          className="px-2.5 py-1 rounded-md text-xs font-bold"
          style={{
            backgroundColor: `${accentColor}20`,
            color: accentColor,
            border: `1px solid ${accentColor}40`,
          }}
        >
          {ranking.totalScore}
        </div>
      </div>

      {/* ── Radar Chart ───────────────────────────────────────── */}
      <div className="flex justify-center">
        <RadarChart scores={ranking.dimensionScores} color={accentColor} />
      </div>

      {/* ── Key Advantages ────────────────────────────────────── */}
      {ranking.keyAdvantages.length > 0 && (
        <section>
          <h4 className="text-slate-200 text-xs uppercase tracking-wider mb-2 font-semibold">
            Key Advantages
          </h4>
          <ul className="flex flex-col gap-1.5">
            {ranking.keyAdvantages.map((adv, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 text-xs font-bold shrink-0 mt-0.5">
                  +
                </span>
                <span className="text-slate-300 text-xs">{adv}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Key Risks ─────────────────────────────────────────── */}
      {ranking.keyRisks.length > 0 && (
        <section>
          <h4 className="text-slate-200 text-xs uppercase tracking-wider mb-2 font-semibold">
            Key Risks
          </h4>
          <ul className="flex flex-col gap-1.5">
            {ranking.keyRisks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-400 text-xs font-bold shrink-0 mt-0.5">
                  !
                </span>
                <span className="text-slate-300 text-xs">{risk}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Timeline & Cost ───────────────────────────────────── */}
      <section>
        <h4 className="text-slate-200 text-xs uppercase tracking-wider mb-2 font-semibold">
          Timeline & Cost
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-surface border border-white/10 rounded-lg p-3">
            <div className="text-slate-500 text-[10px] uppercase mb-1">
              Processing
            </div>
            <div className="text-slate-200 text-sm font-semibold">
              {ranking.timeline.min}&ndash;{ranking.timeline.max}
            </div>
            <div className="text-slate-400 text-[10px]">weeks</div>
          </div>
          <div className="glass-surface border border-white/10 rounded-lg p-3">
            <div className="text-slate-500 text-[10px] uppercase mb-1">
              Application Fee
            </div>
            <div className="text-slate-200 text-sm font-semibold truncate">
              {ranking.estimatedCost.application}
            </div>
            <div className="text-slate-400 text-[10px]">one-time</div>
          </div>
        </div>
      </section>

      {/* ── Migration Path ────────────────────────────────────── */}
      {migrationPath && migrationPath.length > 0 && (
        <section>
          <h4 className="text-slate-200 text-xs uppercase tracking-wider mb-3 font-semibold">
            Migration Path
          </h4>
          <div className="flex flex-col gap-4">
            {migrationPath.map((step) => (
              <div key={step.order} className="flex gap-3">
                {/* Step number circle */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {step.order}
                  </div>
                  {step.order < migrationPath.length && (
                    <div
                      className="w-px flex-1 mt-1"
                      style={{ backgroundColor: `${accentColor}40` }}
                    />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="text-slate-200 text-xs font-semibold mb-0.5">
                    {step.title}
                  </div>
                  <p className="text-slate-400 text-[11px] mb-1.5 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Duration + Cost */}
                  <div className="flex gap-3 mb-1.5">
                    <span className="text-slate-500 text-[10px]">
                      {step.estimatedDuration}
                    </span>
                    {step.cost && (
                      <span className="text-slate-500 text-[10px]">
                        {step.cost}
                      </span>
                    )}
                  </div>

                  {/* Document checklist */}
                  {step.documents.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {step.documents.map((doc, j) => (
                        <div key={j} className="flex items-center gap-1.5">
                          <span className="text-slate-600 text-[10px]">
                            &#9744;
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            {doc}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
