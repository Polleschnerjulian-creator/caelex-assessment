"use client";

import {
  Pencil,
  Building2,
  Globe,
  Rocket,
  Satellite,
  Radio,
  ChevronRight,
} from "lucide-react";
import type { CompanyProfileData } from "@/lib/dashboard/profile-types";
import {
  getCountryFlag,
  ENTITY_SIZE_LABELS,
  ACTIVITY_TYPE_OPTIONS,
} from "@/lib/dashboard/profile-types";

interface CompanyProfileBarProps {
  data: CompanyProfileData | null;
  onEditClick: () => void;
}

function Divider() {
  return <div className="w-px h-5 bg-gray-200 shrink-0" />;
}

function FieldSlot({
  icon,
  label,
  children,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors duration-150 hover:bg-gray-100"
    >
      {icon && (
        <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
          {icon}
        </span>
      )}
      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mr-1 hidden xl:inline">
        {label}
      </span>
      <span className="text-[13px] font-medium text-gray-800">{children}</span>
      <Pencil
        size={11}
        className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-0.5"
      />
    </button>
  );
}

function ActivityBadge({ code }: { code: string }) {
  const opt = ACTIVITY_TYPE_OPTIONS.find((a) => a.code === code);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
      {opt?.code ?? code}
    </span>
  );
}

function SizeBadge({ size }: { size: string }) {
  const label = ENTITY_SIZE_LABELS[size] ?? size;
  const colors: Record<string, string> = {
    micro: "bg-sky-50 text-sky-700 border-sky-100",
    small: "bg-blue-50 text-blue-700 border-blue-100",
    medium: "bg-violet-50 text-violet-700 border-violet-100",
    large: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  const cls = colors[size] ?? "bg-gray-50 text-gray-700 border-gray-100";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}
    >
      {label}
    </span>
  );
}

export default function CompanyProfileBar({
  data,
  onEditClick,
}: CompanyProfileBarProps) {
  // Treat null/undefined data the same as empty profile — show the
  // assessment CTA banner so the user knows they need to complete the
  // unified assessment before the dashboard becomes useful.
  if (!data) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-b border-emerald-200/60">
        <div className="h-12 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-100">
              <Rocket size={14} className="text-emerald-600" />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-gray-900">
                Complete your Operator Assessment to unlock your dashboard
              </span>
              <span className="hidden sm:inline text-[12px] text-gray-500 ml-2">
                — 8 questions, takes 3 minutes
              </span>
            </div>
          </div>
          <a
            href="/assessment/unified"
            className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors duration-150 shadow-sm"
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
      <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-b border-emerald-200/60">
        <div className="h-12 px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-100">
              <Rocket size={14} className="text-emerald-600" />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-gray-900">
                Complete your Operator Assessment to unlock your dashboard
              </span>
              <span className="hidden sm:inline text-[12px] text-gray-500 ml-2">
                — 8 questions, takes 3 minutes
              </span>
            </div>
          </div>
          <a
            href="/assessment/unified"
            className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors duration-150 shadow-sm"
          >
            Start Assessment
            <ChevronRight size={13} />
          </a>
        </div>
      </div>
    );
  }

  const flag = getCountryFlag(data.establishmentCountry);
  const constellationLabel = data.operatesConstellation
    ? data.constellationSize
      ? `${data.constellationSize} satellites`
      : "Constellation"
    : data.spacecraftCount
      ? `${data.spacecraftCount} s/c`
      : "Single";

  return (
    <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm">
      <div className="h-11 px-4 lg:px-6 flex items-center justify-between overflow-x-auto scrollbar-none">
        {/* Left: Data fields */}
        <div className="flex items-center gap-1 min-w-0">
          {/* Company name */}
          {data.companyName && (
            <>
              <FieldSlot
                icon={<Building2 size={14} />}
                label=""
                onClick={onEditClick}
              >
                <span className="font-semibold text-gray-900 truncate max-w-[180px]">
                  {data.companyName}
                </span>
              </FieldSlot>
              <Divider />
            </>
          )}

          {/* Country */}
          {data.establishmentCountry && (
            <>
              <FieldSlot
                icon={<Globe size={14} />}
                label=""
                onClick={onEditClick}
              >
                <span className="whitespace-nowrap">
                  {flag} {data.establishmentCountry}
                </span>
              </FieldSlot>
              <Divider />
            </>
          )}

          {/* Entity size */}
          {data.entitySize && (
            <>
              <FieldSlot label="" onClick={onEditClick}>
                <SizeBadge size={data.entitySize} />
              </FieldSlot>
              <Divider />
            </>
          )}

          {/* Activity types */}
          {data.activityTypes.length > 0 && (
            <>
              <FieldSlot
                icon={<Rocket size={14} />}
                label=""
                onClick={onEditClick}
              >
                <span className="flex items-center gap-1">
                  {data.activityTypes.slice(0, 3).map((code) => (
                    <ActivityBadge key={code} code={code} />
                  ))}
                  {data.activityTypes.length > 3 && (
                    <span className="text-[11px] text-gray-400 font-medium">
                      +{data.activityTypes.length - 3}
                    </span>
                  )}
                </span>
              </FieldSlot>
              <Divider />
            </>
          )}

          {/* Primary orbit */}
          {data.primaryOrbitalRegime && (
            <>
              <FieldSlot
                icon={<Radio size={14} />}
                label=""
                onClick={onEditClick}
              >
                {data.primaryOrbitalRegime}
              </FieldSlot>
              <Divider />
            </>
          )}

          {/* Constellation info */}
          <FieldSlot
            icon={<Satellite size={14} />}
            label=""
            onClick={onEditClick}
          >
            {constellationLabel}
          </FieldSlot>
        </div>

        {/* Right: Edit button */}
        <div className="flex items-center ml-4 shrink-0">
          <button
            type="button"
            onClick={onEditClick}
            className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors duration-150"
          >
            Edit Profile
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
