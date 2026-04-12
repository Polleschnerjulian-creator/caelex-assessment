"use client";

import { useEffect, useState } from "react";
import {
  Pencil,
  Globe,
  Building2,
  Orbit,
  Layers,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import type { CompanyProfileData } from "@/lib/dashboard/profile-types";
import {
  getCountryName,
  ENTITY_SIZE_LABELS,
  ACTIVITY_TYPE_OPTIONS,
} from "@/lib/dashboard/profile-types";

/* ─── Props ─── */

interface CompanyProfileBarProps {
  data: CompanyProfileData | null;
  onEditClick: () => void;
  complianceScore?: number | null;
}

/* ─── Score Ring ─── */

function ScoreRing({
  score,
  size = 128,
  strokeWidth = 6,
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

  const getColor = (s: number) => {
    if (s >= 80) return "#10B981";
    if (s >= 60) return "#22C55E";
    if (s >= 40) return "#F59E0B";
    return "#EF4444";
  };

  const arcColor = hasScore ? getColor(displayScore!) : "#E5E7EB";

  useEffect(() => {
    if (!hasScore) {
      setOffset(circumference);
      return;
    }
    const target = circumference - (displayScore! / 100) * circumference;
    const timer = setTimeout(() => setOffset(target), 120);
    return () => clearTimeout(timer);
  }, [hasScore, displayScore, circumference]);

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Glow for high scores */}
      {hasScore && displayScore! >= 60 && (
        <div
          className="absolute inset-2 rounded-full opacity-15 blur-xl"
          style={{ background: arcColor }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="relative z-[1] -rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
          className="dark:stroke-white/[0.06]"
        />
        {/* Arc */}
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
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-[2]">
        {hasScore ? (
          <>
            <span
              className="text-[36px] font-bold tracking-tight text-gray-900 dark:text-white leading-none font-mono"
              style={{ fontFeatureSettings: "'tnum'" }}
            >
              {displayScore}
            </span>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-[0.15em] mt-1">
              Score
            </span>
          </>
        ) : (
          <>
            <span className="text-[28px] font-light text-gray-200 dark:text-white/10 leading-none">
              —
            </span>
            <span className="text-[9px] font-medium text-gray-300 uppercase tracking-[0.15em] mt-1">
              No data
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Data Field ─── */

function DataField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <Icon
          size={13}
          className="text-gray-400 dark:text-gray-500"
          strokeWidth={1.5}
        />
        <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 tracking-tight">
          {value}
        </span>
      </div>
    </div>
  );
}

/* ─── Activity Pill ─── */

function ActivityPill({ code }: { code: string }) {
  const opt = ACTIVITY_TYPE_OPTIONS.find((a) => a.code === code);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide bg-gray-100 text-gray-700 dark:bg-white/[0.08] dark:text-gray-300 border border-gray-200/60 dark:border-white/[0.06]">
      {opt?.code ?? code}
    </span>
  );
}

/* ─── Main ─── */

export default function CompanyProfileBar({
  data,
  onEditClick,
  complianceScore,
}: CompanyProfileBarProps) {
  // ── Empty state ──
  if (
    !data ||
    !(
      data.companyName ||
      data.establishmentCountry ||
      data.entitySize ||
      data.activityTypes.length > 0
    )
  ) {
    return (
      <div className="cpb-glass border-b">
        <div className="px-6 lg:px-8 py-6 flex items-center gap-8">
          <ScoreRing score={null} size={100} strokeWidth={5} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white tracking-tight">
              Complete your Operator Assessment
            </h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Define your operator profile to unlock compliance scoring,
              regulatory tracking, and module-level analysis across EU Space
              Act, NIS2, and national space laws.
            </p>
          </div>
          <a
            href="/assessment/unified"
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 rounded-xl transition-colors duration-200 shadow-sm shrink-0"
          >
            Start Assessment
            <ArrowRight size={14} strokeWidth={2} />
          </a>
        </div>
      </div>
    );
  }

  // ── Build values ──
  const countryName = getCountryName(data.establishmentCountry);
  const sizeLabel = data.entitySize
    ? (ENTITY_SIZE_LABELS[data.entitySize] ?? data.entitySize)
    : null;
  const constellationLabel = data.operatesConstellation
    ? data.constellationSize
      ? `${data.constellationSize} satellites`
      : "Constellation"
    : data.spacecraftCount
      ? `${data.spacecraftCount} spacecraft`
      : null;

  return (
    <div className="cpb-glass border-b">
      <div className="px-6 lg:px-8 py-5 flex items-center gap-8">
        {/* ── Score Ring ── */}
        <ScoreRing score={complianceScore ?? null} size={120} strokeWidth={5} />

        {/* ── Profile Content ── */}
        <div className="flex-1 min-w-0">
          {/* Company name + edit */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight truncate">
              {data.companyName || "Unnamed Operator"}
            </h2>
            <button
              type="button"
              onClick={onEditClick}
              className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white bg-gray-100/80 hover:bg-gray-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-gray-200/60 dark:border-white/[0.08] rounded-lg transition-all duration-200"
            >
              <Pencil size={11} strokeWidth={2} />
              Edit
            </button>
          </div>

          {/* Data grid */}
          <div className="flex items-start flex-wrap gap-x-8 gap-y-3">
            {/* Country */}
            {countryName && (
              <DataField
                icon={Globe}
                label="Jurisdiction"
                value={countryName}
              />
            )}

            {/* Entity size */}
            {sizeLabel && (
              <DataField
                icon={Building2}
                label="Entity Size"
                value={sizeLabel}
              />
            )}

            {/* Primary orbit */}
            {data.primaryOrbitalRegime && (
              <DataField
                icon={Orbit}
                label="Primary Orbit"
                value={data.primaryOrbitalRegime}
              />
            )}

            {/* Constellation */}
            {constellationLabel && (
              <DataField
                icon={Layers}
                label="Fleet"
                value={constellationLabel}
              />
            )}

            {/* Activity types */}
            {data.activityTypes.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em]">
                  Activities
                </span>
                <div className="flex items-center gap-1">
                  {data.activityTypes.map((code) => (
                    <ActivityPill key={code} code={code} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
