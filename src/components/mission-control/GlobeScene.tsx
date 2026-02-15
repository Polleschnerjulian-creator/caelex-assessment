"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import EarthMesh from "./EarthMesh";
import SatellitePoints from "./SatellitePoints";
import OrbitPath from "./OrbitPath";
import type { SatelliteData, OrbitType } from "@/lib/satellites/types";

interface GlobeSceneProps {
  satellites: SatelliteData[];
  fleetNoradIds: Set<number>;
  selectedSatellite?: SatelliteData | null;
  onSatelliteClick?: (noradId: number) => void;
  compact?: boolean;
  autoRotate?: boolean;
  filters?: {
    orbitTypes: Set<OrbitType>;
    objectTypes: Set<string>;
    fleetOnly: boolean;
  };
}

function SceneContent({
  satellites,
  fleetNoradIds,
  selectedSatellite,
  onSatelliteClick,
  compact = false,
  autoRotate = true,
  filters,
}: GlobeSceneProps) {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 3, 5]} intensity={0.4} color="#b4c6ef" />
      <pointLight position={[0, 0, 0]} intensity={0.05} color="#1a2744" />

      <EarthMesh radius={1} segments={compact ? 32 : 64} />

      <SatellitePoints
        satellites={satellites}
        fleetNoradIds={fleetNoradIds}
        compact={compact}
        onSatelliteClick={onSatelliteClick}
        filters={filters}
      />

      {selectedSatellite && (
        <OrbitPath
          sat={selectedSatellite}
          isFleet={fleetNoradIds.has(selectedSatellite.noradId)}
        />
      )}

      <OrbitControls
        enableZoom={!compact}
        enablePan={!compact}
        autoRotate={autoRotate}
        autoRotateSpeed={compact ? 0.5 : 0.3}
        minDistance={compact ? 2.5 : 1.5}
        maxDistance={compact ? 4 : 8}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
}

export default function GlobeScene(props: GlobeSceneProps) {
  return (
    <Canvas
      camera={{
        position: [0, 0.8, props.compact ? 3.2 : 2.8],
        fov: 45,
        near: 0.1,
        far: 100,
      }}
      gl={{
        alpha: true,
        antialias: true,
        toneMapping: 0, // NoToneMapping
      }}
      style={{ background: "transparent" }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  );
}
