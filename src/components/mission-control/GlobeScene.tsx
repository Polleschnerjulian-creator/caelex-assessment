"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import EarthMesh from "./EarthMesh";
import SatellitePoints from "./SatellitePoints";
import FleetLabels from "./FleetLabels";
import OrbitPath from "./OrbitPath";
import type {
  SatelliteData,
  FleetSpacecraft,
  OrbitType,
} from "@/lib/satellites/types";

interface GlobeSceneProps {
  satellites: SatelliteData[];
  fleetNoradIds: Set<number>;
  fleet?: FleetSpacecraft[];
  satelliteMap?: Map<number, SatelliteData>;
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

// Starfield background — thousands of tiny white dots on a large sphere
function Starfield() {
  const ref = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Random position on a distant sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 40 + Math.random() * 20;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 0.5 + Math.random() * 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#ffffff",
        size: 0.08,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.7,
      }),
    [],
  );

  // Very slow rotation for parallax effect
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.00002;
    }
  });

  return <points ref={ref} geometry={geometry} material={material} />;
}

function SceneContent({
  satellites,
  fleetNoradIds,
  fleet,
  satelliteMap,
  selectedSatellite,
  onSatelliteClick,
  compact = false,
  autoRotate = true,
  filters,
}: GlobeSceneProps) {
  return (
    <>
      {/* Minimal ambient — lines are self-lit via texture */}
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 3, 5]} intensity={0.15} color="#4488cc" />

      <Starfield />

      <EarthMesh radius={1} segments={compact ? 32 : 64} />

      <SatellitePoints
        satellites={satellites}
        fleetNoradIds={fleetNoradIds}
        compact={compact}
        onSatelliteClick={onSatelliteClick}
        filters={filters}
      />

      {fleet && satelliteMap && fleet.length > 0 && !compact && (
        <FleetLabels fleet={fleet} satelliteMap={satelliteMap} />
      )}

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
