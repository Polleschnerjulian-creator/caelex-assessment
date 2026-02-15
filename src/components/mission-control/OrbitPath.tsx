"use client";

import { useMemo } from "react";
import * as THREE from "three";
import * as satellite from "satellite.js";
import type { SatelliteData } from "@/lib/satellites/types";

const EARTH_RADIUS_KM = 6371;
const ORBIT_POINTS = 180;

interface OrbitPathProps {
  sat: SatelliteData;
  isFleet: boolean;
}

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

export default function OrbitPath({ sat, isFleet }: OrbitPathProps) {
  const lineObj = useMemo(() => {
    try {
      const line1 = buildTleLine1(sat);
      const line2 = buildTleLine2(sat);
      const satrec = satellite.twoline2satrec(line1, line2);
      if (satrec.error !== 0) return null;

      const periodMs = sat.period * 60 * 1000;
      const now = Date.now();
      const points: THREE.Vector3[] = [];
      const scale = 1 / EARTH_RADIUS_KM;

      for (let i = 0; i <= ORBIT_POINTS; i++) {
        const t = new Date(now + (i / ORBIT_POINTS) * periodMs);
        const positionAndVelocity = satellite.propagate(satrec, t);
        if (!positionAndVelocity) continue;
        const posEci = positionAndVelocity.position;
        if (!posEci) continue;

        points.push(
          new THREE.Vector3(
            posEci.x * scale,
            posEci.z * scale,
            -posEci.y * scale,
          ),
        );
      }

      if (points.length < 2) return null;
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: isFleet ? "#10B981" : "#ffffff",
        transparent: true,
        opacity: 0.3,
      });
      return new THREE.Line(geometry, material);
    } catch {
      return null;
    }
  }, [sat, isFleet]);

  if (!lineObj) return null;

  return <primitive object={lineObj} />;
}
