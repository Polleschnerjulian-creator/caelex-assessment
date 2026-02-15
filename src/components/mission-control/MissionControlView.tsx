"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { useSatelliteData } from "./hooks/useSatelliteData";
import GlobeScene from "./GlobeScene";
import StatsBar from "./StatsBar";
import FilterPanel from "./FilterPanel";
import SatelliteInfoPanel from "./SatelliteInfoPanel";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { SatelliteData, OrbitType } from "@/lib/satellites/types";

const MAX_SEARCH_RESULTS = 8;

export default function MissionControlView() {
  const { satellites, fleet, fleetNoradIds, isLoading, stats, satelliteMap } =
    useSatelliteData();
  const { t } = useLanguage();

  const [selectedNoradId, setSelectedNoradId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [orbitTypes, setOrbitTypes] = useState<Set<OrbitType>>(new Set());
  const [objectTypes, setObjectTypes] = useState<Set<string>>(new Set());
  const [fleetOnly, setFleetOnly] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const resultCount = useMemo(() => {
    return satellites.filter((sat) => {
      if (fleetOnly && !fleetNoradIds.has(sat.noradId)) return false;
      if (orbitTypes.size > 0 && !orbitTypes.has(sat.orbitType)) return false;
      if (objectTypes.size > 0 && !objectTypes.has(sat.objectType))
        return false;
      return true;
    }).length;
  }, [satellites, orbitTypes, objectTypes, fleetOnly, fleetNoradIds]);

  // Live search results (computed as user types, but doesn't auto-select)
  const searchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return [];
    const upper = q.toUpperCase();
    const results: SatelliteData[] = [];

    // Exact NORAD ID match first
    const exactNorad = parseInt(q, 10);
    if (!isNaN(exactNorad)) {
      const exact = satelliteMap.get(exactNorad);
      if (exact) results.push(exact);
    }

    // Then partial matches
    for (const sat of satellites) {
      if (results.length >= MAX_SEARCH_RESULTS) break;
      if (results.some((r) => r.noradId === sat.noradId)) continue;
      if (
        sat.name.toUpperCase().includes(upper) ||
        String(sat.noradId).includes(q) ||
        sat.cosparId.toUpperCase().includes(upper)
      ) {
        results.push(sat);
      }
    }
    return results;
  }, [searchQuery, satellites, satelliteMap]);

  const selectSatellite = useCallback((noradId: number) => {
    setSelectedNoradId(noradId);
    setSearchFocused(false);
    searchRef.current?.blur();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && searchResults.length > 0) {
        selectSatellite(searchResults[0].noradId);
      }
      if (e.key === "Escape") {
        setSearchFocused(false);
        searchRef.current?.blur();
      }
    },
    [searchResults, selectSatellite],
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
        <div className="absolute top-4 left-4 right-4 flex items-center gap-3 z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-[16px] font-medium text-white/90 whitespace-nowrap">
              {t("missionControl.title")}
            </h1>
          </div>

          {/* Search with dropdown */}
          <div className="flex-1 max-w-md pointer-events-auto relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => {
                  // Delay so click on result registers first
                  setTimeout(() => setSearchFocused(false), 200);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("missionControl.searchPlaceholder")}
                className="w-full pl-9 pr-4 py-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg text-[12px] text-white placeholder-white/30 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Search results dropdown */}
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-2xl max-h-[320px] overflow-y-auto">
                {searchResults.map((sat, i) => {
                  const isFleet = fleetNoradIds.has(sat.noradId);
                  return (
                    <button
                      key={sat.noradId}
                      onMouseDown={() => selectSatellite(sat.noradId)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors flex items-center gap-3 ${
                        i > 0 ? "border-t border-white/5" : ""
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isFleet
                            ? "bg-emerald-400"
                            : sat.orbitType === "LEO"
                              ? "bg-blue-400"
                              : sat.orbitType === "GEO"
                                ? "bg-purple-400"
                                : "bg-amber-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-white/90 truncate">
                          {sat.name}
                        </p>
                        <p className="text-[10px] text-white/40 font-mono">
                          {sat.noradId} · {sat.cosparId} · {sat.orbitType}
                        </p>
                      </div>
                      {isFleet && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded flex-shrink-0">
                          FLEET
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* No results feedback */}
            {searchFocused &&
              searchQuery.trim().length >= 2 &&
              searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg px-4 py-3">
                  <p className="text-[11px] text-white/40">
                    {t("missionControl.noResults")}
                  </p>
                </div>
              )}
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
