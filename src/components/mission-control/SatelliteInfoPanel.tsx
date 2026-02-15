"use client";

import { motion } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { SatelliteData } from "@/lib/satellites/types";

interface SatelliteInfoPanelProps {
  satellite: SatelliteData;
  isFleet: boolean;
  onClose: () => void;
  t: (key: string) => string;
}

function formatAltitude(km: number): string {
  return `${Math.round(km).toLocaleString()} km`;
}

export default function SatelliteInfoPanel({
  satellite,
  isFleet,
  onClose,
  t,
}: SatelliteInfoPanelProps) {
  const fields = [
    { label: t("missionControl.noradId"), value: String(satellite.noradId) },
    { label: t("missionControl.cosparId"), value: satellite.cosparId },
    { label: t("missionControl.country"), value: satellite.countryCode },
    { label: t("missionControl.type"), value: satellite.objectType },
    { label: t("missionControl.orbitType"), value: satellite.orbitType },
    {
      label: t("missionControl.altitude"),
      value: `${formatAltitude(satellite.periapsis)} — ${formatAltitude(satellite.apoapsis)}`,
    },
    {
      label: t("missionControl.inclination"),
      value: `${satellite.inclination.toFixed(1)}°`,
    },
    {
      label: t("missionControl.period"),
      value: `${satellite.period.toFixed(1)} min`,
    },
  ];

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="absolute top-4 right-4 bottom-16 w-[300px] bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-10"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-white/10">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-[14px] font-medium text-white truncate">
            {satellite.name}
          </h3>
          {isFleet && (
            <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded">
              {t("missionControl.yourSpacecraft")}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close satellite info"
          className="text-white/40 hover:text-white/70 transition-colors mt-0.5"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Info Fields */}
      <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100%-48px)]">
        {fields.map((field) => (
          <div key={field.label}>
            <p className="text-[9px] font-mono uppercase tracking-wider text-white/35 mb-0.5">
              {field.label}
            </p>
            <p className="text-[13px] text-white/90 font-mono">{field.value}</p>
          </div>
        ))}

        {/* Fleet management link */}
        {isFleet && (
          <div className="pt-3 mt-3 border-t border-white/5">
            <Link
              href="/dashboard/modules/registration"
              className="flex items-center gap-2 text-[12px] text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ExternalLink size={12} aria-hidden="true" />
              {t("missionControl.manageSpacecraft")}
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}
