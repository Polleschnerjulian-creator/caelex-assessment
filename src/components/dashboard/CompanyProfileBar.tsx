"use client";

import { useEffect, useState } from "react";
import { Pencil, Satellite, Radio, ChevronRight } from "lucide-react";
import type { CompanyProfileData } from "@/lib/dashboard/profile-types";
import {
  getCountryFlag,
  getCountryName,
  ENTITY_SIZE_LABELS,
  ACTIVITY_TYPE_OPTIONS,
} from "@/lib/dashboard/profile-types";

/* ─── Props ─── */

interface CompanyProfileBarProps {
  data: CompanyProfileData | null;
  onEditClick: () => void;
  complianceScore?: number | null; // 0-100 or null if not yet computed
}

/* ─── Score Ring (SVG arc) ─── */

function ScoreRing({
  score,
  size = 72,
  strokeWidth = 5,
}: {
  score: number | null;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  const hasScore = score !== null && score !== undefined;
  const displayScore = hasScore ? Math.round(score) : null;

  // Determine color based on score
  const getColor = (s: number) => {
    if (s >= 80) return "#10B981"; // emerald-500
    if (s >= 60) return "#22C55E"; // green-500
    if (s >= 40) return "#F59E0B"; // amber-500
    return "#EF4444"; // red-500
  };

  const arcColor = hasScore ? getColor(displayScore!) : "#D1D5DB";

  // Animate the arc on mount
  useEffect(() => {
    if (!hasScore) {
      setOffset(circumference);
      return;
    }
    // Start fully hidden, animate to target
    const target = circumference - (displayScore! / 100) * circumference;
    // Small delay so the animation is visible after mount
    const timer = setTimeout(() => setOffset(target), 80);
    return () => clearTimeout(timer);
  }, [hasScore, displayScore, circumference]);

  // Glow for high scores
  const showGlow = hasScore && displayScore! >= 70;

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Subtle glow behind high scores */}
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full opacity-30 blur-md"
          style={{ background: arcColor }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-[1] -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          className="dark:stroke-white/10"
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-[2]">
        {hasScore ? (
          <span
            className="text-[20px] font-bold tracking-tight tabular-nums text-gray-900 dark:text-white leading-none"
            style={{ fontFeatureSettings: "'tnum'" }}
          >
            {displayScore}
          </span>
        ) : (
          <span className="text-[18px] font-semibold text-gray-300 dark:text-white/30 leading-none">
            --
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Activity Badge ─── */

function ActivityBadge({ code }: { code: string }) {
  const opt = ACTIVITY_TYPE_OPTIONS.find((a) => a.code === code);
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 leading-tight">
      {opt?.code ?? code}
    </span>
  );
}

/* ─── Size Badge ─── */

function SizeBadge({ size }: { size: string }) {
  const label = ENTITY_SIZE_LABELS[size] ?? size;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300 leading-tight">
      {label}
    </span>
  );
}

/* ─── Dot separator ─── */

function Dot() {
  return (
    <span
      className="text-gray-300 dark:text-white/20 text-[10px] mx-0.5 select-none"
      aria-hidden
    >
      ·
    </span>
  );
}

/* ─── Main Component ─── */

export default function CompanyProfileBar({
  data,
  onEditClick,
  complianceScore,
}: CompanyProfileBarProps) {
  // ── No profile data: show CTA ──
  if (!data) {
    return (
      <div className="cpb-glass relative border-b">
        <div className="px-4 lg:px-6 py-3 flex items-center gap-4">
          {/* Empty score ring */}
          <ScoreRing score={null} size={64} />

          {/* CTA content */}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
              Complete your Operator Assessment
            </p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
              8 questions, takes 3 minutes — unlocks your compliance dashboard
            </p>
          </div>

          {/* CTA button */}
          <a
            href="/assessment/unified"
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-lg transition-colors duration-150 shadow-sm shrink-0"
          >
            Start Assessment
            <ChevronRight size={13} />
          </a>
        </div>
      </div>
    );
  }

  const hasData =
    data.companyName ||
    data.establishmentCountry ||
    data.entitySize ||
    data.activityTypes.length > 0;

  if (!hasData) {
    return (
      <div className="cpb-glass relative border-b">
        <div className="px-4 lg:px-6 py-3 flex items-center gap-4">
          <ScoreRing score={null} size={64} />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
              Complete your Operator Assessment
            </p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
              8 questions, takes 3 minutes — unlocks your compliance dashboard
            </p>
          </div>
          <a
            href="/assessment/unified"
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-lg transition-colors duration-150 shadow-sm shrink-0"
          >
            Start Assessment
            <ChevronRight size={13} />
          </a>
        </div>
      </div>
    );
  }

  // ── Build derived display values ──
  const flag = getCountryFlag(data.establishmentCountry);
  const countryName = getCountryName(data.establishmentCountry);

  const constellationLabel = data.operatesConstellation
    ? data.constellationSize
      ? `${data.constellationSize} satellites`
      : "Constellation"
    : data.spacecraftCount
      ? `${data.spacecraftCount} s/c`
      : null;

  return (
    <div className="cpb-glass relative border-b">
      <div className="px-4 lg:px-6 py-3 flex items-center gap-5">
        {/* ── Left: Score Ring ── */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <ScoreRing
            score={complianceScore ?? null}
            size={68}
            strokeWidth={5}
          />
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none">
            {complianceScore !== null && complianceScore !== undefined
              ? "Compliance"
              : "Run Assessment"}
          </span>
        </div>

        {/* ── Center: Company profile data ── */}
        <button
          type="button"
          onClick={onEditClick}
          className="flex-1 min-w-0 text-left group cursor-pointer rounded-lg px-2 py-1.5 -mx-2 -my-1.5 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
        >
          {/* Row 1: Company name */}
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate leading-tight">
              {data.companyName || "Unnamed Operator"}
            </h2>
            <Pencil
              size={12}
              className="text-gray-300 dark:text-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
            />
          </div>

          {/* Row 2: Compact data pills */}
          <div className="flex items-center flex-wrap gap-x-1 gap-y-0.5 mt-1">
            {/* Country */}
            {data.establishmentCountry && (
              <>
                <span className="inline-flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400">
                  <span>{flag}</span>
                  <span className="hidden sm:inline">{countryName}</span>
                </span>
                {(data.entitySize ||
                  data.activityTypes.length > 0 ||
                  data.primaryOrbitalRegime ||
                  constellationLabel) && <Dot />}
              </>
            )}

            {/* Entity size */}
            {data.entitySize && (
              <>
                <SizeBadge size={data.entitySize} />
                {(data.activityTypes.length > 0 ||
                  data.primaryOrbitalRegime ||
                  constellationLabel) && <Dot />}
              </>
            )}

            {/* Activity types */}
            {data.activityTypes.length > 0 && (
              <>
                <span className="inline-flex items-center gap-0.5">
                  {data.activityTypes.slice(0, 3).map((code) => (
                    <ActivityBadge key={code} code={code} />
                  ))}
                  {data.activityTypes.length > 3 && (
                    <span className="text-[10px] text-gray-400 font-medium ml-0.5">
                      +{data.activityTypes.length - 3}
                    </span>
                  )}
                </span>
                {(data.primaryOrbitalRegime || constellationLabel) && <Dot />}
              </>
            )}

            {/* Primary orbit */}
            {data.primaryOrbitalRegime && (
              <>
                <span className="inline-flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400">
                  <Radio
                    size={11}
                    className="text-gray-400 dark:text-gray-500"
                  />
                  {data.primaryOrbitalRegime}
                </span>
                {constellationLabel && <Dot />}
              </>
            )}

            {/* Constellation / spacecraft info */}
            {constellationLabel && (
              <span className="inline-flex items-center gap-1 text-[12px] text-gray-500 dark:text-gray-400">
                <Satellite
                  size={11}
                  className="text-gray-400 dark:text-gray-500"
                />
                {constellationLabel}
              </span>
            )}
          </div>
        </button>

        {/* ── Right: Edit button ── */}
        <button
          type="button"
          onClick={onEditClick}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-white/[0.06] hover:bg-gray-100 dark:hover:bg-white/[0.1] border border-gray-200 dark:border-white/10 rounded-lg transition-colors duration-150 shrink-0"
        >
          <Pencil size={12} />
          Edit
        </button>
      </div>
    </div>
  );
}
