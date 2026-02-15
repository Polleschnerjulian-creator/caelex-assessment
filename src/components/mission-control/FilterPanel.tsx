"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { OrbitType } from "@/lib/satellites/types";

interface FilterPanelProps {
  orbitTypes: Set<OrbitType>;
  objectTypes: Set<string>;
  fleetOnly: boolean;
  onOrbitToggle: (orbit: OrbitType) => void;
  onObjectToggle: (objectType: string) => void;
  onFleetOnlyToggle: () => void;
  onClose: () => void;
  resultCount: number;
  t: (key: string) => string;
}

const ORBIT_OPTIONS: { value: OrbitType; label: string; color: string }[] = [
  { value: "LEO", label: "LEO", color: "bg-blue-500" },
  { value: "MEO", label: "MEO", color: "bg-amber-500" },
  { value: "GEO", label: "GEO", color: "bg-purple-500" },
  { value: "HEO", label: "HEO", color: "bg-pink-500" },
];

const OBJECT_OPTIONS: { value: string; label: string }[] = [
  { value: "PAYLOAD", label: "Payload" },
  { value: "DEBRIS", label: "Debris" },
  { value: "ROCKET BODY", label: "Rocket Body" },
];

export default function FilterPanel({
  orbitTypes,
  objectTypes,
  fleetOnly,
  onOrbitToggle,
  onObjectToggle,
  onFleetOnlyToggle,
  onClose,
  resultCount,
  t,
}: FilterPanelProps) {
  return (
    <motion.div
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="absolute top-4 left-4 bottom-16 w-[280px] bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden z-10"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-[13px] font-medium text-white">
          {t("missionControl.filters")}
        </h3>
        <button
          onClick={onClose}
          aria-label="Close filters"
          className="text-white/40 hover:text-white/70 transition-colors"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(100%-48px)]">
        {/* Orbit Type */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-2">
            {t("missionControl.orbitType")}
          </p>
          <div className="flex flex-wrap gap-2">
            {ORBIT_OPTIONS.map((opt) => {
              const active = orbitTypes.size === 0 || orbitTypes.has(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => onOrbitToggle(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all border ${
                    active
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white/5 border-white/5 text-white/30"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${opt.color} ${
                      active ? "opacity-100" : "opacity-30"
                    }`}
                  />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Object Type */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mb-2">
            {t("missionControl.objectType")}
          </p>
          <div className="flex flex-wrap gap-2">
            {OBJECT_OPTIONS.map((opt) => {
              const active =
                objectTypes.size === 0 || objectTypes.has(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => onObjectToggle(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all border ${
                    active
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white/5 border-white/5 text-white/30"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fleet Only Toggle */}
        <div>
          <button
            onClick={onFleetOnlyToggle}
            role="switch"
            aria-checked={fleetOnly}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[12px] transition-all border ${
              fleetOnly
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-white/5 border-white/5 text-white/50"
            }`}
          >
            <span>{t("missionControl.showFleetOnly")}</span>
            <div
              className={`w-8 h-4 rounded-full transition-all ${
                fleetOnly ? "bg-emerald-500" : "bg-white/10"
              } flex items-center`}
              aria-hidden="true"
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  fleetOnly ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Result Count */}
        <div className="pt-3 border-t border-white/5">
          <p className="text-[11px] text-white/40 font-mono">
            {t("missionControl.showing")}{" "}
            <span className="text-white font-medium">
              {resultCount.toLocaleString()}
            </span>{" "}
            {t("missionControl.objects")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
