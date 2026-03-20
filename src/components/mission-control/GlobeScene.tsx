"use client";

import { Suspense, useMemo, useRef, Component, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// ─── Error Boundary for WebGL/Three.js crashes ─────────────────────────────

class GlobeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0A0F1E] rounded-xl">
          <div className="text-center px-8">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-slate-400 mb-1">3D Globe unavailable</p>
            <p className="text-xs text-slate-600 max-w-[240px]">
              WebGL may not be supported in this browser. Satellite data is
              still available in table view.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
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
    <GlobeErrorBoundary>
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
    </GlobeErrorBoundary>
  );
}
