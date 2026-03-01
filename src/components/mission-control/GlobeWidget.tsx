"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Loader2, Satellite } from "lucide-react";
import { useSatelliteData } from "./hooks/useSatelliteData";
import GlobeScene from "./GlobeScene";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function GlobeWidget() {
  const { satellites, fleetNoradIds, isLoading, stats, fleet } =
    useSatelliteData();
  const { t } = useLanguage();

  const fleetNoradIdSet = useMemo(() => fleetNoradIds, [fleetNoradIds]);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Globe - 2/3 width */}
        <div className="lg:col-span-2 relative h-[280px] bg-[#030810]">
          {isLoading ? (
            <div
              className="absolute inset-0 flex items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="w-6 h-6 text-white/20 animate-spin"
                aria-hidden="true"
              />
              <span className="sr-only">Loading satellite data...</span>
            </div>
          ) : (
            <GlobeScene
              satellites={satellites}
              fleetNoradIds={fleetNoradIdSet}
              compact
              autoRotate
            />
          )}

          {/* Stats overlay */}
          {!isLoading && stats && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-micro text-white/45">
                    {stats.total.toLocaleString()} {t("missionControl.tracked")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-micro text-white/45">
                    {fleet.length} {t("missionControl.yourFleet")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fleet Status - 1/3 width */}
        <div className="p-5 border-t lg:border-t-0 lg:border-l border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Satellite
              className="w-4 h-4 text-emerald-400"
              aria-hidden="true"
            />
            <h3 className="text-small uppercase tracking-wider text-white/45">
              {t("missionControl.fleetStatus")}
            </h3>
          </div>

          {fleet.length > 0 ? (
            <div className="space-y-2.5 mb-4">
              {fleet.slice(0, 4).map((sc) => (
                <div
                  key={sc.id}
                  className="flex items-center justify-between py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-small text-white/70 truncate">
                      {sc.name}
                    </p>
                    <p className="text-micro text-white/25">
                      {sc.orbitType}{" "}
                      {sc.altitudeKm ? `· ${Math.round(sc.altitudeKm)} km` : ""}
                    </p>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded ${
                      sc.status === "ACTIVE" || sc.status === "OPERATIONAL"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : sc.status === "PRE_LAUNCH"
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-white/5 text-white/45"
                    }`}
                  >
                    {sc.status}
                  </span>
                </div>
              ))}
              {fleet.length > 4 && (
                <p className="text-micro text-white/30">
                  +{fleet.length - 4} {t("missionControl.more")}
                </p>
              )}
            </div>
          ) : (
            <p className="text-small text-white/45 mb-4">
              {t("missionControl.noFleetYet")}
            </p>
          )}

          <Link
            href="/dashboard/mission-control"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-small text-white/70 hover:text-white transition-all group"
          >
            {t("missionControl.openMissionControl")}
            <ChevronRight
              className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
