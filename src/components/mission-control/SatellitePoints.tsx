"use client";

import { useRef, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SatelliteData, OrbitType } from "@/lib/satellites/types";
import * as satellite from "satellite.js";

const EARTH_RADIUS_KM = 6371;

// Vertex shader for satellite points
const vertexShader = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = (1.0 - smoothstep(0.1, 0.5, dist)) * 0.85;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// Color palette
const COLORS: Record<string, THREE.Color> = {
  fleet: new THREE.Color("#10B981"), // emerald
  LEO: new THREE.Color("#3B82F6"), // blue
  MEO: new THREE.Color("#F59E0B"), // amber
  GEO: new THREE.Color("#8B5CF6"), // purple
  HEO: new THREE.Color("#EC4899"), // pink
  DEBRIS: new THREE.Color("#4B1D1D"), // dim red
  ROCKET: new THREE.Color("#78350F"), // dim brown
};

function getColor(sat: SatelliteData, isFleet: boolean): THREE.Color {
  if (isFleet) return COLORS.fleet;
  if (sat.objectType === "DEBRIS") return COLORS.DEBRIS;
  if (sat.objectType === "ROCKET BODY") return COLORS.ROCKET;
  return COLORS[sat.orbitType] || COLORS.LEO;
}

function getSize(sat: SatelliteData, isFleet: boolean): number {
  if (isFleet) return 0.018;
  if (sat.objectType === "PAYLOAD") return 0.006;
  if (sat.objectType === "DEBRIS") return 0.003;
  return 0.004; // rocket body / unknown
}

// Build TLE lines from GP JSON elements
function buildTleLine1(sat: SatelliteData): string {
  const noradStr = String(sat.noradId).padStart(5, "0");
  const classif = sat.classificationType || "U";
  const intlDesig = (sat.cosparId || "00001A").replace(/-/, "").padEnd(8, " ");
  const epochDate = new Date(sat.epoch);
  const year = epochDate.getUTCFullYear() % 100;
  const startOfYear = new Date(Date.UTC(epochDate.getUTCFullYear(), 0, 1));
  const dayOfYear =
    (epochDate.getTime() - startOfYear.getTime()) / 86400000 + 1;
  const epochStr = `${String(year).padStart(2, "0")}${dayOfYear.toFixed(8).padStart(12, "0")}`;
  const mmDot =
    sat.meanMotionDot >= 0
      ? ` .${Math.abs(sat.meanMotionDot).toFixed(8).slice(2)}`
      : `-.${Math.abs(sat.meanMotionDot).toFixed(8).slice(2)}`;

  const line = `1 ${noradStr}${classif} ${intlDesig} ${epochStr} ${mmDot}  00000-0  00000-0 ${sat.ephemerisType} ${String(sat.elementSetNo).padStart(4, " ")}`;
  return line.padEnd(68, " ") + "0";
}

function buildTleLine2(sat: SatelliteData): string {
  const noradStr = String(sat.noradId).padStart(5, "0");
  const inc = sat.inclination.toFixed(4).padStart(8, " ");
  const raan = sat.raOfAscNode.toFixed(4).padStart(8, " ");
  const ecc = sat.eccentricity.toFixed(7).slice(2); // remove "0."
  const argP = sat.argOfPericenter.toFixed(4).padStart(8, " ");
  const ma = sat.meanAnomaly.toFixed(4).padStart(8, " ");
  const mm = sat.meanMotion.toFixed(8).padStart(11, " ");
  const revs = String(sat.revAtEpoch).padStart(5, " ");

  const line = `2 ${noradStr} ${inc} ${raan} ${ecc} ${argP} ${ma} ${mm}${revs}`;
  return line.padEnd(68, " ") + "0";
}

interface SatellitePointsProps {
  satellites: SatelliteData[];
  fleetNoradIds: Set<number>;
  compact?: boolean;
  onSatelliteClick?: (noradId: number) => void;
  filters?: {
    orbitTypes: Set<OrbitType>;
    objectTypes: Set<string>;
    fleetOnly: boolean;
  };
}

export default function SatellitePoints({
  satellites,
  fleetNoradIds,
  compact = false,
  onSatelliteClick,
  filters,
}: SatellitePointsProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const frameCounter = useRef(0);
  const { camera, raycaster, pointer } = useThree();

  // Filter satellites based on active filters
  const filteredSatellites = useMemo(() => {
    if (!filters) return satellites;
    return satellites.filter((sat) => {
      if (filters.fleetOnly && !fleetNoradIds.has(sat.noradId)) return false;
      if (filters.orbitTypes.size > 0 && !filters.orbitTypes.has(sat.orbitType))
        return false;
      if (
        filters.objectTypes.size > 0 &&
        !filters.objectTypes.has(sat.objectType)
      )
        return false;
      return true;
    });
  }, [satellites, filters, fleetNoradIds]);

  // Build satrec objects for SGP4 propagation
  const satrecMap = useMemo(() => {
    const map = new Map<number, satellite.SatRec>();
    for (const sat of filteredSatellites) {
      try {
        const line1 = buildTleLine1(sat);
        const line2 = buildTleLine2(sat);
        const satrec = satellite.twoline2satrec(line1, line2);
        if (satrec.error === 0) {
          map.set(sat.noradId, satrec);
        }
      } catch {
        // Skip satellites with bad orbital elements
      }
    }
    return map;
  }, [filteredSatellites]);

  // Create geometry buffers
  const { geometry, noradIdIndex } = useMemo(() => {
    const count = filteredSatellites.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const idIndex: number[] = [];

    for (let i = 0; i < count; i++) {
      const sat = filteredSatellites[i];
      const isFleet = fleetNoradIds.has(sat.noradId);
      const color = getColor(sat, isFleet);
      const size = getSize(sat, isFleet);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = size;
      idIndex.push(sat.noradId);

      // Initial position: spread based on orbit altitude
      const alt = (sat.apoapsis + sat.periapsis) / 2 / EARTH_RADIUS_KM;
      const theta = (i / count) * Math.PI * 2;
      const phi = Math.acos(2 * ((i * 0.618) % 1) - 1); // golden angle distribution
      const r = 1 + alt * 0.15; // scale down: Earth=1.0, LEO ~1.05, GEO ~5.6→~1.84
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("customColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    return { geometry: geo, noradIdIndex: idIndex };
  }, [filteredSatellites, fleetNoradIds]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  // SGP4 propagation in useFrame
  useFrame(() => {
    if (!pointsRef.current) return;
    frameCounter.current++;

    // Throttle: widget updates every 60 frames, full mode every frame
    const updateInterval = compact ? 60 : 1;
    if (frameCounter.current % updateInterval !== 0) return;

    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    const now = new Date();

    for (let i = 0; i < filteredSatellites.length; i++) {
      const sat = filteredSatellites[i];
      const satrec = satrecMap.get(sat.noradId);
      if (!satrec) continue;

      try {
        const positionAndVelocity = satellite.propagate(satrec, now);
        if (!positionAndVelocity) continue;
        const posEci = positionAndVelocity.position;
        if (!posEci) continue;

        // ECI km → scene units (Earth radius = 1.0)
        const scale = 1 / EARTH_RADIUS_KM;
        positions[i * 3] = posEci.x * scale;
        positions[i * 3 + 1] = posEci.z * scale; // swap Y/Z for Three.js coord system
        positions[i * 3 + 2] = -posEci.y * scale;
      } catch {
        // Skip propagation errors
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  // Click detection
  const handleClick = useCallback(() => {
    if (!onSatelliteClick || !pointsRef.current) return;
    raycaster.setFromCamera(pointer, camera);
    raycaster.params.Points = { threshold: 0.05 };
    const intersects = raycaster.intersectObject(pointsRef.current);
    if (intersects.length > 0 && intersects[0].index !== undefined) {
      const noradId = noradIdIndex[intersects[0].index];
      if (noradId !== undefined) {
        onSatelliteClick(noradId);
      }
    }
  }, [onSatelliteClick, raycaster, pointer, camera, noradIdIndex]);

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      onClick={handleClick}
    />
  );
}
