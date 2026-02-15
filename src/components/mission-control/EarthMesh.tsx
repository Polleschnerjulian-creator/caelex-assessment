"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface EarthMeshProps {
  radius?: number;
  segments?: number;
}

// Procedural dark earth texture (no external image dependency)
function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  // Deep space-black ocean base
  ctx.fillStyle = "#050508";
  ctx.fillRect(0, 0, 2048, 1024);

  // Simplified continent outlines as subtle lighter shapes
  ctx.fillStyle = "rgba(30, 35, 50, 0.6)";

  // North America
  ctx.beginPath();
  ctx.moveTo(340, 200);
  ctx.lineTo(280, 280);
  ctx.lineTo(260, 380);
  ctx.lineTo(310, 420);
  ctx.lineTo(380, 400);
  ctx.lineTo(420, 340);
  ctx.lineTo(500, 300);
  ctx.lineTo(480, 220);
  ctx.lineTo(400, 180);
  ctx.closePath();
  ctx.fill();

  // South America
  ctx.beginPath();
  ctx.moveTo(440, 480);
  ctx.lineTo(410, 540);
  ctx.lineTo(420, 650);
  ctx.lineTo(450, 730);
  ctx.lineTo(430, 800);
  ctx.lineTo(460, 770);
  ctx.lineTo(480, 680);
  ctx.lineTo(490, 560);
  ctx.lineTo(470, 490);
  ctx.closePath();
  ctx.fill();

  // Europe
  ctx.beginPath();
  ctx.moveTo(960, 220);
  ctx.lineTo(940, 280);
  ctx.lineTo(980, 330);
  ctx.lineTo(1020, 310);
  ctx.lineTo(1040, 260);
  ctx.lineTo(1010, 220);
  ctx.closePath();
  ctx.fill();

  // Africa
  ctx.beginPath();
  ctx.moveTo(960, 370);
  ctx.lineTo(930, 420);
  ctx.lineTo(940, 520);
  ctx.lineTo(970, 620);
  ctx.lineTo(1010, 640);
  ctx.lineTo(1040, 560);
  ctx.lineTo(1050, 450);
  ctx.lineTo(1020, 380);
  ctx.closePath();
  ctx.fill();

  // Asia
  ctx.beginPath();
  ctx.moveTo(1100, 180);
  ctx.lineTo(1080, 250);
  ctx.lineTo(1120, 320);
  ctx.lineTo(1200, 350);
  ctx.lineTo(1350, 330);
  ctx.lineTo(1450, 280);
  ctx.lineTo(1500, 220);
  ctx.lineTo(1400, 180);
  ctx.lineTo(1250, 170);
  ctx.lineTo(1150, 160);
  ctx.closePath();
  ctx.fill();

  // Australia
  ctx.beginPath();
  ctx.moveTo(1480, 560);
  ctx.lineTo(1460, 610);
  ctx.lineTo(1500, 660);
  ctx.lineTo(1570, 650);
  ctx.lineTo(1600, 590);
  ctx.lineTo(1560, 550);
  ctx.closePath();
  ctx.fill();

  // Add subtle grid lines (meridians/parallels)
  ctx.strokeStyle = "rgba(40, 50, 70, 0.15)";
  ctx.lineWidth = 0.5;
  for (let x = 0; x < 2048; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y < 1024; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2048, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function EarthMesh({
  radius = 1,
  segments = 64,
}: EarthMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => createEarthTexture(), []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0002;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, segments, segments]} />
      <meshStandardMaterial
        map={texture}
        emissive="#0a0e1a"
        emissiveIntensity={0.3}
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}
