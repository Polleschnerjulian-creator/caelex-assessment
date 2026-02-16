"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import * as satellite from "satellite.js";
import type { SatelliteData, FleetSpacecraft } from "@/lib/satellites/types";

const EARTH_RADIUS_KM = 6371;

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
  const ecc = sat.eccentricity.toFixed(7).slice(2);
  const argP = sat.argOfPericenter.toFixed(4).padStart(8, " ");
  const ma = sat.meanAnomaly.toFixed(4).padStart(8, " ");
  const mm = sat.meanMotion.toFixed(8).padStart(11, " ");
  const revs = String(sat.revAtEpoch).padStart(5, " ");

  const line = `2 ${noradStr} ${inc} ${raan} ${ecc} ${argP} ${ma} ${mm}${revs}`;
  return line.padEnd(68, " ") + "0";
}

interface FleetLabelData {
  name: string;
  noradId: number;
  satrec: satellite.SatRec;
}

function FleetLabel({ label }: { label: FleetLabelData }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const now = new Date();
    try {
      const result = satellite.propagate(label.satrec, now);
      if (!result?.position) return;
      const pos = result.position;
      const scale = 1 / EARTH_RADIUS_KM;
      groupRef.current.position.set(
        pos.x * scale,
        pos.z * scale,
        -pos.y * scale,
      );
    } catch {
      // Skip propagation errors
    }
  });

  return (
    <group ref={groupRef}>
      <Html
        center
        distanceFactor={4}
        style={{ pointerEvents: "none" }}
        zIndexRange={[10, 0]}
      >
        <div
          style={{
            color: "#10B981",
            fontSize: "10px",
            fontFamily: "monospace",
            fontWeight: 600,
            whiteSpace: "nowrap",
            textShadow:
              "0 0 6px rgba(16, 185, 129, 0.6), 0 1px 2px rgba(0,0,0,0.8)",
            transform: "translateY(-16px)",
            userSelect: "none",
          }}
        >
          {label.name}
        </div>
      </Html>
    </group>
  );
}

interface FleetLabelsProps {
  fleet: FleetSpacecraft[];
  satelliteMap: Map<number, SatelliteData>;
}

export default function FleetLabels({ fleet, satelliteMap }: FleetLabelsProps) {
  const labels = useMemo(() => {
    const result: FleetLabelData[] = [];
    for (const craft of fleet) {
      if (!craft.noradId) continue;
      const noradId = parseInt(craft.noradId, 10);
      if (isNaN(noradId)) continue;
      const sat = satelliteMap.get(noradId);
      if (!sat) continue;
      try {
        const line1 = buildTleLine1(sat);
        const line2 = buildTleLine2(sat);
        const satrec = satellite.twoline2satrec(line1, line2);
        if (satrec.error === 0) {
          result.push({ name: craft.name, noradId, satrec });
        }
      } catch {
        // Skip bad TLEs
      }
    }
    return result;
  }, [fleet, satelliteMap]);

  return (
    <>
      {labels.map((label) => (
        <FleetLabel key={label.noradId} label={label} />
      ))}
    </>
  );
}
