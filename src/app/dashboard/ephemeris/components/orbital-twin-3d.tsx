"use client";

import { useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FleetEntity {
  noradId: string;
  satelliteName: string;
  operatorType?: string;
  overallScore: number;
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
  dataFreshness: string;
}

interface OrbitalTwinProps {
  fleet: FleetEntity[];
  onError?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusColor(score: number): string {
  if (score >= 80) return "#3fb950";
  if (score >= 60) return "#d29922";
  if (score >= 40) return "#f0883e";
  return "#f85149";
}

// ─── Entity Dot Component ─────────────────────────────────────────────────────

function EntityDot({ entity }: { entity: FleetEntity }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const isSurface = ["LO", "LSO", "TCO"].includes(entity.operatorType ?? "SCO");
  const radius = isSurface ? 1.02 : 1 + (entity.altitudeKm ?? 550) / 6371;
  // Use golden angle distribution for visual spread
  const angle =
    ((parseInt(entity.noradId || "0") * 137.5) % 360) * (Math.PI / 180);
  // Add some vertical variation based on norad ID
  const elevation =
    (((parseInt(entity.noradId || "0") * 73.7) % 180) - 90) *
    (Math.PI / 180) *
    0.6;

  const x = radius * Math.cos(angle) * Math.cos(elevation);
  const y = radius * Math.sin(elevation);
  const z = radius * Math.sin(angle) * Math.cos(elevation);

  const handleClick = useCallback(() => {
    window.location.href = `/dashboard/ephemeris/${entity.noradId}`;
  }, [entity.noradId]);

  return (
    <mesh ref={meshRef} position={[x, y, z]} onClick={handleClick}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshBasicMaterial color={getStatusColor(entity.overallScore)} />
    </mesh>
  );
}

// ─── Orbit Rings ──────────────────────────────────────────────────────────────

function OrbitRing({ radius }: { radius: number }) {
  const points: [number, number, number][] = [];
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    points.push([radius * Math.cos(theta), 0, radius * Math.sin(theta)]);
  }

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flat())}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="rgba(255,255,255,0.06)"
        transparent
        opacity={0.06}
      />
    </line>
  );
}

// ─── Main 3D Scene ────────────────────────────────────────────────────────────

function Scene({ fleet }: { fleet: FleetEntity[] }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />

      {/* Earth */}
      <Sphere args={[1, 64, 64]}>
        <meshStandardMaterial
          color="#111111"
          wireframe
          transparent
          opacity={0.3}
        />
      </Sphere>

      {/* Orbit rings */}
      <OrbitRing radius={1.08} />
      <OrbitRing radius={1.15} />
      <OrbitRing radius={1.25} />

      {/* Entity dots */}
      {fleet.map((entity) => (
        <EntityDot key={entity.noradId} entity={entity} />
      ))}

      <OrbitControls
        enableZoom
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={2}
        maxDistance={6}
      />
    </>
  );
}

// ─── Exported Component ───────────────────────────────────────────────────────

export default function OrbitalTwinCanvas({
  fleet,
  onError,
}: OrbitalTwinProps) {
  return (
    <div
      style={{
        height: 400,
        borderRadius: 16,
        overflow: "hidden",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        position: "relative",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 45 }}
        onError={() => onError?.()}
        style={{ background: "transparent" }}
      >
        <Scene fleet={fleet} />
      </Canvas>
      {/* Legend overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          display: "flex",
          gap: 12,
          fontSize: 10,
          color: "rgba(255,255,255,0.25)",
        }}
      >
        {[
          { color: "#3fb950", label: "Nominal" },
          { color: "#d29922", label: "Watch" },
          { color: "#f0883e", label: "Warning" },
          { color: "#f85149", label: "Critical" },
        ].map((item) => (
          <span
            key={item.label}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: item.color,
                display: "inline-block",
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
