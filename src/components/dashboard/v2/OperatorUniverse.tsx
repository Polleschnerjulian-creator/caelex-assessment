"use client";

import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { SpacecraftStatus, StakeholderType } from "@prisma/client";

import type {
  OperatorUniverse as UniverseData,
  UniverseSpacecraft,
  UniverseStakeholder,
} from "@/lib/comply-v2/operator-universe.server";

/**
 * OperatorUniverse — Sprint 10B (Wow-Pattern #6)
 *
 * 3D scene rendering the operator's mission ecosystem. Operator is
 * the central star; spacecraft orbit at altitude-band radii; active
 * stakeholders sit as a static outer ring of "moons". The camera
 * orbits slowly on auto-rotate (OrbitControls with autoRotate=true)
 * so the user gets a cinematic flyover without any interaction
 * required — but click-and-drag still works for power users.
 *
 * # Why R3F + drei here
 *
 * @react-three/fiber and drei are already first-class deps in the
 * codebase (landing page, ephemeris-forge, ontology page). No new
 * bundle weight. Drei's `<OrbitControls autoRotate />` saves us
 * ~80 lines of camera math.
 *
 * # Status → colour mapping
 *
 * Spacecraft glow with a status-flavoured emissive colour:
 *   - OPERATIONAL    emerald (the healthy fleet)
 *   - LAUNCHED       cyan
 *   - PRE_LAUNCH     amber (still on the ground)
 *   - DECOMMISSIONING orange
 *   - DEORBITED      slate (faded, end-of-life)
 *   - LOST           red (alarm)
 *
 * Stakeholder moons get a per-type colour matching the network-graph
 * legend so the two surfaces feel like one product.
 *
 * # Empty state
 *
 * Zero-spacecraft orgs see a lone operator star with a "no satellites
 * yet" caption (rendered above the canvas in the page wrapper).
 */

export interface OperatorUniverseProps {
  universe: UniverseData;
}

// Status-keyed material colours. Stored as THREE.Color so we don't
// re-parse the hex string on every render.
const STATUS_COLOR: Record<
  SpacecraftStatus,
  { base: string; emissive: string }
> = {
  OPERATIONAL: { base: "#10B981", emissive: "#10B981" },
  LAUNCHED: { base: "#06B6D4", emissive: "#06B6D4" },
  PRE_LAUNCH: { base: "#F59E0B", emissive: "#F59E0B" },
  DECOMMISSIONING: { base: "#FB923C", emissive: "#FB923C" },
  DEORBITED: { base: "#64748B", emissive: "#475569" },
  LOST: { base: "#EF4444", emissive: "#EF4444" },
};

const STAKEHOLDER_COLOR: Record<StakeholderType, string> = {
  LEGAL_COUNSEL: "#60A5FA", // blue-400
  INSURER: "#10B981", // emerald-500
  AUDITOR: "#A78BFA", // violet-400
  SUPPLIER: "#FBBF24", // amber-400
  NCA: "#F87171", // red-400
  CONSULTANT: "#F472B6", // pink-400
  LAUNCH_PROVIDER: "#22D3EE", // cyan-400
};

const STAKEHOLDER_RING_RADIUS = 9.0;

// ─── Subcomponents ───────────────────────────────────────────────────────

/** The operator's central "star" — a softly pulsing emissive sphere. */
function OperatorStar() {
  const ref = React.useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Gentle breathe — visible without being distracting.
    const t = clock.elapsedTime;
    const scale = 1 + Math.sin(t * 0.8) * 0.06;
    ref.current.scale.setScalar(scale);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial
        color="#34D399"
        emissive="#10B981"
        emissiveIntensity={1.2}
        roughness={0.4}
        metalness={0.2}
      />
    </mesh>
  );
}

/**
 * One spacecraft "planet" orbiting at its band radius. Position
 * recomputed every frame from initialAngle + elapsedTime *
 * speedMultiplier. Uses a low-poly icosahedron (12 faces) so we can
 * draw 50 of them without tanking frame rate.
 */
function SpacecraftBody({ craft }: { craft: UniverseSpacecraft }) {
  const ref = React.useRef<THREE.Mesh>(null);
  const colors = STATUS_COLOR[craft.status];

  useFrame(({ clock }) => {
    if (!ref.current) return;
    // Orbital position. Slow base rotation so even GEO crafts move
    // visibly across a 30-second observation window.
    const t = clock.elapsedTime;
    const angle = craft.initialAngle + t * craft.speedMultiplier * 0.15;
    ref.current.position.x = Math.cos(angle) * craft.orbitRadius;
    ref.current.position.z = Math.sin(angle) * craft.orbitRadius;
    ref.current.position.y = craft.yOffset;
    // Tumble — spacecraft are not perfect spheres in real life, and
    // a slow tumble makes the icosahedra feel like spacecraft, not
    // marbles.
    ref.current.rotation.x = t * 0.4;
    ref.current.rotation.y = t * 0.6;
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.18, 0]} />
      <meshStandardMaterial
        color={colors.base}
        emissive={colors.emissive}
        emissiveIntensity={0.6}
        roughness={0.5}
        metalness={0.3}
      />
    </mesh>
  );
}

/** Faint ring at radius r — visualises an orbit band. */
function OrbitRing({ radius }: { radius: number }) {
  const geometry = React.useMemo(() => {
    const segments = 96;
    const positions = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [radius]);

  return (
    <line>
      <primitive attach="geometry" object={geometry} />
      <lineBasicMaterial
        color="#1E293B"
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </line>
  );
}

/** Stakeholder "moon" — small static sphere on the outer ring. */
function StakeholderMoon({ moon }: { moon: UniverseStakeholder }) {
  const color = STAKEHOLDER_COLOR[moon.type] ?? "#94A3B8";
  const x = Math.cos(moon.angle) * STAKEHOLDER_RING_RADIUS;
  const z = Math.sin(moon.angle) * STAKEHOLDER_RING_RADIUS;
  // Slight Y-jitter from angle so adjacent moons aren't perfectly
  // coplanar — keeps the ring visually rich at oblique camera angles.
  const y = Math.sin(moon.angle * 3.7) * 0.25;
  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
        roughness={0.6}
        metalness={0.2}
      />
    </mesh>
  );
}

/** Background starfield for atmosphere — 800 motionless points. */
function Starfield() {
  const geometry = React.useMemo(() => {
    const count = 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Random points on a large sphere shell.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 30 + Math.random() * 10;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#FFFFFF"
        size={0.05}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </points>
  );
}

/** Inner Scene — composed in one place so the Canvas stays terse. */
function Scene({ universe }: { universe: UniverseData }) {
  // Distinct orbit bands — render only one ring per band so
  // multiple LEO crafts share a single ring line.
  const uniqueRadii = React.useMemo(() => {
    const set = new Set<number>();
    for (const s of universe.spacecraft) {
      // Round to 1 decimal so per-craft altitude nudge doesn't
      // create visually duplicate rings.
      set.add(Math.round(s.orbitRadius * 10) / 10);
    }
    return Array.from(set);
  }, [universe.spacecraft]);

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight
        position={[0, 0, 0]}
        intensity={2.5}
        color="#34D399"
        distance={20}
      />
      <pointLight position={[10, 10, 10]} intensity={0.3} color="#FFFFFF" />

      <Starfield />
      <OperatorStar />

      {uniqueRadii.map((r) => (
        <OrbitRing key={r} radius={r} />
      ))}

      {universe.spacecraft.map((s) => (
        <SpacecraftBody key={s.id} craft={s} />
      ))}

      {/* Stakeholder ring — faint, behind everything */}
      <OrbitRing radius={STAKEHOLDER_RING_RADIUS} />

      {universe.stakeholders.map((m) => (
        <StakeholderMoon key={m.id} moon={m} />
      ))}
    </>
  );
}

// ─── Public component ────────────────────────────────────────────────────

export function OperatorUniverse({ universe }: OperatorUniverseProps) {
  return (
    <div
      data-testid="operator-universe"
      className="palantir-surface relative h-[640px] w-full overflow-hidden rounded-md"
      style={{
        background:
          "radial-gradient(ellipse at center, #0A0F1E 0%, #020617 100%)",
      }}
    >
      <Canvas
        camera={{ position: [0, 6, 16], fov: 50 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <Scene universe={universe} />
        <OrbitControls
          autoRotate
          autoRotateSpeed={0.5}
          enableZoom
          enablePan={false}
          minDistance={8}
          maxDistance={28}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.1}
        />
      </Canvas>

      {/* Overlay legend — sits above the canvas, doesn't block input */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400">
        <div className="rounded bg-black/40 px-2 py-1 ring-1 ring-inset ring-white/[0.06]">
          <span className="text-emerald-400">★</span> {universe.operator.name}
        </div>
        <div className="rounded bg-black/40 px-2 py-1 text-slate-500 ring-1 ring-inset ring-white/[0.06]">
          {universe.spacecraft.length} satellites ·{" "}
          {universe.stakeholders.length} stakeholders
        </div>
      </div>

      {universe.spacecraft.length === 0 ? (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded bg-black/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500 ring-1 ring-inset ring-white/[0.06]">
          NO SATELLITES YET — register one in /dashboard/missions
        </div>
      ) : null}
    </div>
  );
}
