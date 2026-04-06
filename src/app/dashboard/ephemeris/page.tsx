"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { csrfHeaders } from "@/lib/csrf-client";
import EphemerisTopBar from "@/components/ephemeris/EphemerisTopBar";
import EphemerisNavRail from "@/components/ephemeris/EphemerisNavRail";
import type { NavModule } from "@/components/ephemeris/EphemerisNavRail";
import EphemerisBootScreen from "@/components/ephemeris/EphemerisBootScreen";
import EphemerisRightPanel from "@/components/ephemeris/EphemerisRightPanel";
import EphemerisSatelliteDetail from "@/components/ephemeris/EphemerisSatelliteDetail";
import EphemerisForgeOverlay from "@/components/ephemeris/EphemerisForgeOverlay";

// Lazy-load 3D Globe (Three.js)
const OrbitalTwinGlobe = dynamic(
  () => import("./components/orbital-twin-globe"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.15)",
          fontSize: 11,
          letterSpacing: "3px",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        LOADING ORBITAL DATA...
      </div>
    ),
  },
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface FleetState {
  noradId: string;
  satelliteName: string;
  operatorType?: string;
  overallScore: number;
  dataFreshness: string;
  altitudeKm?: number;
  complianceHorizon: {
    daysUntilFirstBreach: number | null;
    firstBreachRegulation: string | null;
    confidence: string;
  };
  activeAlerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
  }>;
  modules?: Record<string, { score: number; status: string }>;
}

interface FleetIntelligence {
  fleetScore: number;
  fleetSize: number;
  riskDistribution: Record<string, number>;
  riskDistributionPct: Record<string, number>;
  weakestLinks: Array<{
    noradId: string;
    name: string;
    score: number;
    fleetImpact: number;
    weakestModule: string | null;
    weakestModuleScore: number | null;
    riskCategory: string;
  }>;
  horizon: {
    earliestBreachSatellite: string | null;
    earliestBreachName: string | null;
    earliestBreachDays: number | null;
    earliestBreachRegulation: string | null;
    averageHorizonDays: number | null;
    satellitesWithHorizon: number;
  };
  trend: {
    direction: string;
    shortTermDelta: number;
    longTermDelta: number;
    trendStrength: string;
  } | null;
  moduleAverages: Record<string, number>;
  correlationMatrix: Array<{
    satA: string;
    satB: string;
    nameA: string;
    nameB: string;
    correlation: number;
    strength: string;
  }>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EphemerisOrbitalCommand() {
  // Boot sequence
  const [showBoot, setShowBoot] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem("ephemeris_booted");
  });

  // Data
  const [fleet, setFleet] = useState<FleetState[]>([]);
  const [intel, setIntel] = useState<FleetIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeModule, setActiveModule] = useState<NavModule>("orbital");
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [forgeOpen, setForgeOpen] = useState(false);

  // Boot complete handler
  const handleBootComplete = useCallback(() => {
    setShowBoot(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ephemeris_booted", "true");
    }
  }, []);

  // Data fetching
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const fleetRes = await fetch("/api/v1/ephemeris/fleet", {
        headers: csrfHeaders(),
      });

      if (fleetRes.ok) {
        const data = await fleetRes.json();
        setFleet(data.data ?? []);
      }

      setLoading(false);

      const intelRes = await fetch(
        "/api/v1/ephemeris/fleet/intelligence?include_benchmark=true&lookback_days=90",
        { headers: csrfHeaders() },
      );

      if (intelRes.ok) {
        const data = await intelRes.json();
        setIntel(data.data ?? null);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Toggle forge-mode class on parent .ephemeris-app for CSS dimming
  useEffect(() => {
    const app = document.querySelector(".ephemeris-app");
    if (app) {
      app.classList.toggle("forge-mode", forgeOpen);
    }
    return () => {
      const appEl = document.querySelector(".ephemeris-app");
      if (appEl) appEl.classList.remove("forge-mode");
    };
  }, [forgeOpen]);

  // Nav module handler
  const handleModuleChange = useCallback((module: NavModule) => {
    if (module === "forge") {
      setForgeOpen((prev) => !prev);
    } else {
      setForgeOpen(false);
      setActiveModule(module);
    }
  }, []);

  // Entity selection
  const handleEntitySelect = useCallback(
    (noradId: string) => {
      setSelectedEntity(noradId === selectedEntity ? null : noradId);
    },
    [selectedEntity],
  );

  const handleEntityClose = useCallback(() => {
    setSelectedEntity(null);
  }, []);

  // Find selected entity data
  const selectedEntityData = useMemo(
    () => fleet.find((e) => e.noradId === selectedEntity) ?? null,
    [fleet, selectedEntity],
  );

  return (
    <>
      {/* Boot Sequence */}
      {showBoot && <EphemerisBootScreen onComplete={handleBootComplete} />}

      {/* Globe Background (fullscreen) */}
      <div className="eph-globe-container">
        <OrbitalTwinGlobe fleet={fleet} onEntityClick={handleEntitySelect} />
      </div>

      {/* Overlays */}
      <div className="eph-vignette" />
      <div className="eph-scanlines" />

      {/* Top Bar */}
      <EphemerisTopBar />

      {/* Left Nav Rail */}
      <EphemerisNavRail
        activeModule={forgeOpen ? "forge" : activeModule}
        onModuleChange={handleModuleChange}
      />

      {/* Right Panel */}
      <EphemerisRightPanel
        fleet={fleet}
        intel={intel}
        selectedEntity={selectedEntity}
        onEntitySelect={handleEntitySelect}
      />

      {/* Satellite Detail Slide-in */}
      <div className={`eph-sd-panel ${selectedEntity ? "open" : ""}`}>
        {selectedEntityData && (
          <EphemerisSatelliteDetail
            entity={selectedEntityData}
            onClose={handleEntityClose}
          />
        )}
      </div>

      {/* Scenario Forge Overlay */}
      <EphemerisForgeOverlay
        isOpen={forgeOpen}
        onClose={() => setForgeOpen(false)}
      />

      {/* Loading indicator */}
      {loading && fleet.length === 0 && !showBoot && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: "1.5px solid rgba(48, 232, 160, 0.2)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "eph-spin 1s linear infinite",
            }}
          />
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: "var(--text-dim)",
            }}
          >
            LOADING FLEET DATA...
          </div>
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`
        @keyframes eph-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
