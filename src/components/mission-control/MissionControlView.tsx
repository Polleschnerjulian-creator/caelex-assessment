"use client";

import { useState, useMemo, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { useSatelliteData } from "./hooks/useSatelliteData";
import GlobeScene from "./GlobeScene";
import StatsBar from "./StatsBar";
import FilterPanel from "./FilterPanel";
import SatelliteInfoPanel from "./SatelliteInfoPanel";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { SatelliteData, OrbitType } from "@/lib/satellites/types";

export default function MissionControlView() {
  const { satellites, fleet, fleetNoradIds, isLoading, stats, satelliteMap } =
    useSatelliteData();
  const { t } = useLanguage();

  const [selectedNoradId, setSelectedNoradId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [orbitTypes, setOrbitTypes] = useState<Set<OrbitType>>(new Set());
  const [objectTypes, setObjectTypes] = useState<Set<string>>(new Set());
  const [fleetOnly, setFleetOnly] = useState(false);

  const selectedSatellite = useMemo(() => {
    if (!selectedNoradId) return null;
    return satelliteMap.get(selectedNoradId) ?? null;
  }, [selectedNoradId, satelliteMap]);

  const isSelectedFleet = useMemo(
    () => selectedNoradId !== null && fleetNoradIds.has(selectedNoradId),
    [selectedNoradId, fleetNoradIds],
  );

  const filters = useMemo(
    () => ({ orbitTypes, objectTypes, fleetOnly }),
    [orbitTypes, objectTypes, fleetOnly],
  );

  // Compute result count with current filters
  const resultCount = useMemo(() => {
    return satellites.filter((sat) => {
      if (fleetOnly && !fleetNoradIds.has(sat.noradId)) return false;
      if (orbitTypes.size > 0 && !orbitTypes.has(sat.orbitType)) return false;
      if (objectTypes.size > 0 && !objectTypes.has(sat.objectType))
        return false;
      return true;
    }).length;
  }, [satellites, orbitTypes, objectTypes, fleetOnly, fleetNoradIds]);

  // Search handler
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) return;

      const upper = query.toUpperCase();
      const found = satellites.find(
        (s) =>
          s.name.toUpperCase().includes(upper) ||
          String(s.noradId).includes(query) ||
          s.cosparId.toUpperCase().includes(upper),
      );
      if (found) {
        setSelectedNoradId(found.noradId);
      }
    },
    [satellites],
  );

  const handleSatelliteClick = useCallback((noradId: number) => {
    setSelectedNoradId((prev) => (prev === noradId ? null : noradId));
  }, []);

  const handleOrbitToggle = useCallback((orbit: OrbitType) => {
    setOrbitTypes((prev) => {
      const next = new Set(prev);
      if (next.has(orbit)) next.delete(orbit);
      else next.add(orbit);
      return next;
    });
  }, []);

  const handleObjectToggle = useCallback((type: string) => {
    setObjectTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleFleetOnlyToggle = useCallback(() => {
    setFleetOnly((prev) => !prev);
  }, []);

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-64px)] bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-white/20 animate-spin mx-auto mb-3" />
          <p className="text-[12px] text-white/40 font-mono">
            {t("missionControl.loadingSatellites")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-[#0A0A0B] relative flex flex-col overflow-hidden">
      {/* 3D Canvas */}
      <div className="flex-1 relative">
        <GlobeScene
          satellites={satellites}
          fleetNoradIds={fleetNoradIds}
          selectedSatellite={selectedSatellite}
          onSatelliteClick={handleSatelliteClick}
          autoRotate={!selectedNoradId}
          filters={filters}
        />

        {/* Top overlay: title + search + filters */}
        <div className="absolute top-4 left-4 right-4 flex items-center gap-3 z-10 pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-[16px] font-medium text-white/90 whitespace-nowrap">
              {t("missionControl.title")}
            </h1>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md pointer-events-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t("missionControl.searchPlaceholder")}
                className="w-full pl-9 pr-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[12px] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Filter button */}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-mono transition-all border ${
              showFilters
                ? "bg-white/10 border-white/20 text-white"
                : "bg-black/60 backdrop-blur-md border-white/10 text-white/50 hover:text-white/70"
            }`}
          >
            <SlidersHorizontal size={14} />
            {t("missionControl.filters")}
          </button>
        </div>

        {/* Slide-in panels */}
        <AnimatePresence>
          {showFilters && (
            <FilterPanel
              orbitTypes={orbitTypes}
              objectTypes={objectTypes}
              fleetOnly={fleetOnly}
              onOrbitToggle={handleOrbitToggle}
              onObjectToggle={handleObjectToggle}
              onFleetOnlyToggle={handleFleetOnlyToggle}
              onClose={() => setShowFilters(false)}
              resultCount={resultCount}
              t={t}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedSatellite && (
            <SatelliteInfoPanel
              satellite={selectedSatellite}
              isFleet={isSelectedFleet}
              onClose={() => setSelectedNoradId(null)}
              t={t}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom stats bar */}
      <StatsBar stats={stats} fleetCount={fleet.length} t={t} />
    </div>
  );
}
