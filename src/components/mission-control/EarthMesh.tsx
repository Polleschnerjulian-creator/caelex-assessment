"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface EarthMeshProps {
  radius?: number;
  segments?: number;
}

// Convert longitude/latitude to equirectangular canvas pixel coords (2048x1024)
function ll(lon: number, lat: number): [number, number] {
  return [((lon + 180) / 360) * 2048, ((90 - lat) / 180) * 1024];
}

// Stroke a polygon outline from lon/lat coordinates (no fill)
function strokePoly(
  ctx: CanvasRenderingContext2D,
  coords: [number, number][],
  color: string,
  width: number,
) {
  ctx.beginPath();
  const [x0, y0] = ll(coords[0][0], coords[0][1]);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < coords.length; i++) {
    const [x, y] = ll(coords[i][0], coords[i][1]);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

// ── Continent coordinate data (lon, lat) ──

const NORTH_AMERICA: [number, number][] = [
  [-168, 65],
  [-162, 60],
  [-147, 61],
  [-138, 59],
  [-135, 57],
  [-131, 55],
  [-127, 51],
  [-124, 48],
  [-124, 44],
  [-121, 37],
  [-118, 34],
  [-117, 32],
  [-112, 31],
  [-107, 31],
  [-105, 30],
  [-104, 29],
  [-97, 26],
  [-94, 29],
  [-90, 30],
  [-89, 30],
  [-85, 29],
  [-83, 28],
  [-82, 25],
  [-80, 25],
  [-81, 28],
  [-81, 31],
  [-79, 33],
  [-76, 35],
  [-76, 37],
  [-75, 39],
  [-74, 41],
  [-72, 42],
  [-70, 43],
  [-67, 45],
  [-61, 46],
  [-53, 47],
  [-56, 49],
  [-59, 48],
  [-65, 48],
  [-69, 47],
  [-73, 46],
  [-79, 51],
  [-80, 52],
  [-82, 55],
  [-83, 57],
  [-88, 58],
  [-90, 61],
  [-86, 64],
  [-82, 66],
  [-80, 68],
  [-82, 71],
  [-87, 72],
  [-97, 72],
  [-110, 73],
  [-120, 71],
  [-133, 69],
  [-142, 70],
  [-153, 71],
  [-157, 71],
];

const CENTRAL_AMERICA: [number, number][] = [
  [-105, 20],
  [-100, 17],
  [-96, 16],
  [-92, 15],
  [-89, 15],
  [-86, 14],
  [-84, 11],
  [-83, 10],
  [-82, 8],
  [-79, 8],
  [-78, 9],
  [-83, 10],
  [-85, 12],
  [-87, 13],
  [-89, 16],
  [-93, 17],
  [-97, 19],
  [-100, 20],
  [-103, 20],
];

const SOUTH_AMERICA: [number, number][] = [
  [-77, 8],
  [-73, 11],
  [-72, 12],
  [-68, 11],
  [-63, 10],
  [-60, 7],
  [-56, 5],
  [-52, 3],
  [-50, 0],
  [-49, -2],
  [-44, -3],
  [-40, -3],
  [-36, -5],
  [-35, -8],
  [-35, -11],
  [-37, -13],
  [-39, -15],
  [-40, -19],
  [-41, -22],
  [-44, -23],
  [-46, -24],
  [-48, -28],
  [-50, -29],
  [-52, -33],
  [-55, -34],
  [-57, -36],
  [-60, -37],
  [-62, -39],
  [-65, -41],
  [-66, -45],
  [-68, -48],
  [-69, -51],
  [-70, -53],
  [-72, -52],
  [-73, -48],
  [-74, -45],
  [-74, -41],
  [-73, -38],
  [-72, -34],
  [-71, -30],
  [-70, -24],
  [-70, -19],
  [-71, -16],
  [-75, -14],
  [-76, -12],
  [-77, -8],
  [-80, -3],
  [-80, 0],
  [-78, 2],
  [-78, 5],
];

const EUROPE: [number, number][] = [
  [-10, 36],
  [-9, 39],
  [-9, 43],
  [-5, 43],
  [-2, 43],
  [0, 43],
  [3, 43],
  [5, 44],
  [7, 44],
  [8, 46],
  [6, 47],
  [6, 49],
  [3, 49],
  [2, 51],
  [4, 52],
  [5, 53],
  [8, 54],
  [8, 55],
  [10, 55],
  [11, 57],
  [12, 56],
  [12, 58],
  [15, 57],
  [14, 58],
  [18, 60],
  [20, 60],
  [24, 60],
  [28, 60],
  [30, 60],
  [30, 62],
  [28, 64],
  [20, 65],
  [18, 68],
  [15, 69],
  [16, 71],
  [23, 70],
  [27, 71],
  [31, 70],
  [29, 67],
  [30, 65],
  [32, 62],
  [33, 60],
  [36, 57],
  [38, 56],
  [40, 56],
  [42, 55],
  [44, 52],
  [42, 48],
  [40, 47],
  [37, 47],
  [34, 46],
  [30, 46],
  [29, 45],
  [28, 44],
  [24, 42],
  [24, 38],
  [26, 36],
  [23, 36],
  [20, 38],
  [18, 40],
  [16, 39],
  [15, 38],
  [14, 42],
  [13, 44],
  [12, 44],
  [11, 42],
  [10, 44],
  [8, 44],
  [6, 43],
  [3, 43],
  [1, 39],
  [-1, 38],
  [-3, 37],
  [-5, 36],
];

const AFRICA: [number, number][] = [
  [-17, 15],
  [-17, 20],
  [-16, 24],
  [-14, 27],
  [-10, 30],
  [-8, 32],
  [-5, 34],
  [-3, 35],
  [-1, 35],
  [2, 35],
  [5, 36],
  [8, 37],
  [10, 37],
  [11, 34],
  [11, 32],
  [15, 32],
  [20, 32],
  [25, 32],
  [30, 31],
  [33, 30],
  [34, 27],
  [36, 24],
  [38, 20],
  [40, 16],
  [42, 14],
  [43, 12],
  [44, 12],
  [46, 8],
  [48, 5],
  [49, 2],
  [47, 0],
  [44, -3],
  [42, -5],
  [41, -8],
  [40, -11],
  [40, -15],
  [36, -18],
  [34, -22],
  [33, -26],
  [30, -30],
  [28, -33],
  [24, -34],
  [20, -35],
  [18, -34],
  [17, -30],
  [15, -27],
  [12, -22],
  [12, -17],
  [10, -10],
  [9, -5],
  [9, 0],
  [10, 4],
  [8, 5],
  [5, 5],
  [3, 6],
  [1, 6],
  [-2, 5],
  [-5, 5],
  [-8, 6],
  [-10, 7],
  [-12, 8],
  [-15, 11],
  [-17, 13],
];

const ASIA_MAIN: [number, number][] = [
  [27, 42],
  [30, 41],
  [33, 37],
  [36, 37],
  [40, 38],
  [44, 40],
  [48, 38],
  [52, 37],
  [55, 36],
  [58, 34],
  [60, 30],
  [62, 26],
  [65, 25],
  [67, 24],
  [68, 24],
  [70, 21],
  [73, 16],
  [75, 12],
  [77, 8],
  [78, 10],
  [80, 13],
  [80, 16],
  [82, 17],
  [85, 22],
  [88, 22],
  [89, 24],
  [92, 22],
  [94, 19],
  [96, 17],
  [98, 16],
  [99, 14],
  [100, 11],
  [101, 6],
  [103, 2],
  [104, 1],
  [105, 3],
  [106, 8],
  [106, 11],
  [108, 14],
  [108, 18],
  [110, 20],
  [110, 22],
  [113, 23],
  [117, 24],
  [119, 25],
  [120, 28],
  [121, 30],
  [122, 31],
  [121, 35],
  [125, 38],
  [127, 37],
  [129, 35],
  [129, 33],
  [126, 34],
  [126, 37],
  [129, 39],
  [131, 42],
  [131, 44],
  [135, 45],
  [137, 47],
  [140, 48],
  [140, 51],
  [138, 53],
  [137, 55],
  [140, 58],
  [143, 59],
  [147, 60],
  [150, 60],
  [155, 59],
  [158, 61],
  [163, 63],
  [170, 65],
  [177, 65],
  [180, 68],
  [180, 72],
  [170, 70],
  [160, 68],
  [150, 65],
  [140, 64],
  [130, 62],
  [120, 60],
  [110, 58],
  [100, 55],
  [90, 55],
  [80, 55],
  [70, 55],
  [60, 55],
  [55, 55],
  [50, 52],
  [44, 48],
  [40, 48],
  [37, 47],
  [33, 42],
  [30, 42],
];

const RUSSIA_EAST: [number, number][] = [
  [-180, 68],
  [-175, 65],
  [-170, 64],
  [-168, 65],
  [-170, 67],
  [-175, 69],
  [-180, 72],
];

const ARABIAN_PENINSULA: [number, number][] = [
  [34, 27],
  [36, 24],
  [38, 20],
  [40, 16],
  [43, 13],
  [45, 13],
  [48, 16],
  [52, 17],
  [55, 22],
  [56, 24],
  [56, 26],
  [52, 24],
  [50, 26],
  [48, 29],
  [42, 30],
  [38, 29],
  [36, 29],
];

const AUSTRALIA: [number, number][] = [
  [114, -22],
  [115, -20],
  [119, -15],
  [124, -14],
  [130, -12],
  [133, -12],
  [137, -12],
  [139, -15],
  [141, -13],
  [143, -11],
  [145, -15],
  [146, -17],
  [146, -19],
  [148, -21],
  [150, -24],
  [153, -27],
  [153, -29],
  [151, -34],
  [148, -38],
  [145, -39],
  [140, -38],
  [136, -35],
  [132, -34],
  [129, -33],
  [124, -34],
  [118, -35],
  [115, -34],
  [114, -32],
  [114, -27],
];

const GREENLAND: [number, number][] = [
  [-52, 60],
  [-48, 60],
  [-43, 62],
  [-40, 64],
  [-36, 66],
  [-30, 68],
  [-22, 72],
  [-18, 75],
  [-20, 78],
  [-28, 80],
  [-40, 82],
  [-50, 81],
  [-55, 79],
  [-58, 76],
  [-56, 73],
  [-52, 70],
  [-48, 68],
  [-50, 65],
  [-52, 63],
];

const UK: [number, number][] = [
  [-5, 50],
  [-4, 51],
  [-5, 53],
  [-3, 54],
  [-3, 56],
  [-5, 58],
  [-3, 59],
  [-2, 57],
  [0, 55],
  [2, 53],
  [1, 51],
  [0, 50],
];

const JAPAN: [number, number][] = [
  [130, 31],
  [131, 33],
  [133, 34],
  [135, 35],
  [137, 36],
  [140, 38],
  [140, 40],
  [141, 41],
  [142, 43],
  [145, 44],
  [144, 42],
  [142, 40],
  [141, 38],
  [140, 36],
  [137, 34],
  [134, 33],
  [132, 31],
];

const INDONESIA: [number, number][] = [
  [95, 6],
  [98, 4],
  [103, -1],
  [105, -6],
  [107, -7],
  [110, -7],
  [114, -8],
  [116, -8],
  [120, -8],
  [122, -5],
  [120, -2],
  [117, -1],
  [114, 0],
  [110, 2],
  [108, 3],
  [105, 4],
  [100, 5],
];

const BORNEO: [number, number][] = [
  [109, 1],
  [110, 2],
  [112, 2],
  [115, 4],
  [118, 6],
  [119, 5],
  [118, 2],
  [117, 0],
  [116, -2],
  [115, -4],
  [114, -3],
  [111, -1],
  [110, 0],
];

const NEW_GUINEA: [number, number][] = [
  [132, -1],
  [135, -3],
  [138, -3],
  [140, -3],
  [142, -4],
  [145, -5],
  [148, -6],
  [150, -7],
  [149, -8],
  [147, -8],
  [145, -7],
  [142, -8],
  [140, -6],
  [138, -5],
  [136, -4],
  [134, -2],
  [132, -1],
];

const MADAGASCAR: [number, number][] = [
  [44, -13],
  [46, -14],
  [48, -16],
  [50, -19],
  [50, -22],
  [48, -25],
  [45, -25],
  [44, -23],
  [44, -19],
  [43, -16],
];

const NEW_ZEALAND: [number, number][] = [
  [172, -35],
  [174, -37],
  [176, -39],
  [178, -42],
  [177, -44],
  [175, -45],
  [173, -44],
  [171, -42],
  [170, -40],
  [170, -38],
];

const SRI_LANKA: [number, number][] = [
  [80, 10],
  [81, 8],
  [82, 7],
  [81, 6],
  [80, 7],
  [80, 9],
];

const ALL_CONTINENTS = [
  NORTH_AMERICA,
  CENTRAL_AMERICA,
  SOUTH_AMERICA,
  EUROPE,
  AFRICA,
  ASIA_MAIN,
  RUSSIA_EAST,
  ARABIAN_PENINSULA,
  AUSTRALIA,
  GREENLAND,
  UK,
  JAPAN,
  INDONESIA,
  BORNEO,
  NEW_GUINEA,
  MADAGASCAR,
  NEW_ZEALAND,
  SRI_LANKA,
];

// ── Monochrome wireframe texture ──

function createEarthTexture(): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Near-black base
  ctx.fillStyle = "#030508";
  ctx.fillRect(0, 0, W, H);

  // === Grid lines (latitude + longitude) ===

  // Longitude lines every 30 degrees
  ctx.strokeStyle = "rgba(60, 140, 220, 0.07)";
  ctx.lineWidth = 0.8;
  for (let lon = -180; lon <= 180; lon += 30) {
    const [x] = ll(lon, 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  // Latitude lines every 30 degrees
  for (let lat = -90; lat <= 90; lat += 30) {
    const [, y] = ll(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Equator + prime meridian slightly brighter
  ctx.strokeStyle = "rgba(60, 140, 220, 0.12)";
  ctx.lineWidth = 1;
  // Equator
  const [, eqY] = ll(0, 0);
  ctx.beginPath();
  ctx.moveTo(0, eqY);
  ctx.lineTo(W, eqY);
  ctx.stroke();
  // Prime meridian
  const [pmX] = ll(0, 0);
  ctx.beginPath();
  ctx.moveTo(pmX, 0);
  ctx.lineTo(pmX, H);
  ctx.stroke();

  // === Continent outlines — outer glow layer ===
  for (const c of ALL_CONTINENTS) {
    strokePoly(ctx, c, "rgba(50, 140, 220, 0.08)", 6);
  }

  // === Continent outlines — main line ===
  for (const c of ALL_CONTINENTS) {
    strokePoly(ctx, c, "rgba(70, 160, 240, 0.55)", 1.8);
  }

  // === Continent outlines — bright core ===
  for (const c of ALL_CONTINENTS) {
    strokePoly(ctx, c, "rgba(120, 190, 255, 0.35)", 0.8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// ── Atmosphere glow shader ──

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, 3.5);
    vec3 color = vec3(0.2, 0.5, 0.9);
    gl_FragColor = vec4(color, fresnel * 0.4);
  }
`;

export default function EarthMesh({
  radius = 1,
  segments = 64,
}: EarthMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => createEarthTexture(), []);

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0002;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.0002;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[radius, segments, segments]} />
        <meshBasicMaterial map={texture} transparent opacity={1} />
      </mesh>
      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[radius * 1.02, 64, 64]} />
        <primitive object={atmosphereMaterial} />
      </mesh>
    </group>
  );
}
