"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Shield,
  Activity,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Settings,
  BarChart3,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Satellite,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Zap,
} from "lucide-react";
import Button from "@/components/ui/Button";

const ShieldGlobe3DLazy = dynamic(
  () => import("@/components/dashboard/ShieldGlobe3D"),
  { ssr: false },
);

import { Input } from "@/components/ui/Input";
import { motion } from "framer-motion";
import { csrfHeaders } from "@/lib/csrf-client";

// ── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 20;

const TIER_DOT_COLORS: Record<string, string> = {
  EMERGENCY: "bg-red-500",
  HIGH: "bg-amber-500",
  ELEVATED: "bg-yellow-500",
  MONITOR: "bg-blue-500",
  INFORMATIONAL: "bg-slate-500",
};

const TIER_TEXT_COLORS: Record<string, string> = {
  EMERGENCY: "text-red-400",
  HIGH: "text-amber-400",
  ELEVATED: "text-yellow-400",
  MONITOR: "text-blue-400",
  INFORMATIONAL: "text-slate-400",
};

const STATUS_LIST = [
  "",
  "NEW",
  "MONITORING",
  "ASSESSMENT_REQUIRED",
  "DECISION_MADE",
  "MANEUVER_PLANNED",
  "MANEUVER_EXECUTED",
  "MANEUVER_VERIFIED",
  "CLOSED",
];

const TIER_LIST = [
  "",
  "EMERGENCY",
  "HIGH",
  "ELEVATED",
  "MONITOR",
  "INFORMATIONAL",
];

const CHART_COLORS = [
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const TIER_CHART_COLORS: Record<string, string> = {
  EMERGENCY: "#EF4444",
  HIGH: "#F59E0B",
  ELEVATED: "#EAB308",
  MONITOR: "#3B82F6",
  INFORMATIONAL: "#64748B",
};

// ── Formatting Helpers ───────────────────────────────────────────────────────

function formatPc(pc: number): string {
  if (pc === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(pc)));
  const mantissa = pc / Math.pow(10, exp);
  return `${mantissa.toFixed(1)}e${exp}`;
}

function formatTcaCountdown(tca: string): string {
  const diff = new Date(tca).getTime() - Date.now();
  if (diff < 0) return "PASSED";
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Globe Component ───────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Continent coordinate data (lon, lat) ─────────────────────────────────────

const GLOBE_NORTH_AMERICA: [number, number][] = [
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

const GLOBE_CENTRAL_AMERICA: [number, number][] = [
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

const GLOBE_SOUTH_AMERICA: [number, number][] = [
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

const GLOBE_EUROPE: [number, number][] = [
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

const GLOBE_AFRICA: [number, number][] = [
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

const GLOBE_ASIA_MAIN: [number, number][] = [
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

const GLOBE_RUSSIA_EAST: [number, number][] = [
  [-180, 68],
  [-175, 65],
  [-170, 64],
  [-168, 65],
  [-170, 67],
  [-175, 69],
  [-180, 72],
];

const GLOBE_ARABIAN_PENINSULA: [number, number][] = [
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

const GLOBE_AUSTRALIA: [number, number][] = [
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

const GLOBE_GREENLAND: [number, number][] = [
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

const GLOBE_UK: [number, number][] = [
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

const GLOBE_JAPAN: [number, number][] = [
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

const GLOBE_INDONESIA: [number, number][] = [
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

const GLOBE_BORNEO: [number, number][] = [
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

const GLOBE_NEW_GUINEA: [number, number][] = [
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

const GLOBE_MADAGASCAR: [number, number][] = [
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

const GLOBE_NEW_ZEALAND: [number, number][] = [
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

const GLOBE_SRI_LANKA: [number, number][] = [
  [80, 10],
  [81, 8],
  [82, 7],
  [81, 6],
  [80, 7],
  [80, 9],
];

const GLOBE_ALL_CONTINENTS: [number, number][][] = [
  GLOBE_NORTH_AMERICA,
  GLOBE_CENTRAL_AMERICA,
  GLOBE_SOUTH_AMERICA,
  GLOBE_EUROPE,
  GLOBE_AFRICA,
  GLOBE_ASIA_MAIN,
  GLOBE_RUSSIA_EAST,
  GLOBE_ARABIAN_PENINSULA,
  GLOBE_AUSTRALIA,
  GLOBE_GREENLAND,
  GLOBE_UK,
  GLOBE_JAPAN,
  GLOBE_INDONESIA,
  GLOBE_BORNEO,
  GLOBE_NEW_GUINEA,
  GLOBE_MADAGASCAR,
  GLOBE_NEW_ZEALAND,
  GLOBE_SRI_LANKA,
];

// ── Point-in-polygon (ray casting) ───────────────────────────────────────────

function pointInPolygon(
  lon: number,
  lat: number,
  polygon: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function isOnLand(lon: number, lat: number): boolean {
  for (const poly of GLOBE_ALL_CONTINENTS) {
    if (pointInPolygon(lon, lat, poly)) return true;
  }
  return false;
}

// ── SpaceX Command Center Globe ──────────────────────────────────────────────

function ShieldGlobe({ events, stats }: { events: any[]; stats: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const rotationRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // HiDPI
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.3;

    // ── Generate particles ──────────────────────────────────────────────────

    const particles: Array<{
      lat: number;
      lon: number;
      size: number;
      bright: number;
    }> = [];

    // ~2500 outline particles — sample along polygon edges at high density
    for (const poly of GLOBE_ALL_CONTINENTS) {
      const totalPoints = poly.length;
      const stepsPerEdge = Math.max(
        4,
        Math.floor(2500 / (GLOBE_ALL_CONTINENTS.length * totalPoints)),
      );
      for (let i = 0; i < totalPoints; i++) {
        const [x0, y0] = poly[i];
        const [x1, y1] = poly[(i + 1) % totalPoints];
        for (let s = 0; s <= stepsPerEdge; s++) {
          const t = s / stepsPerEdge;
          const lon = x0 + (x1 - x0) * t;
          const lat = y0 + (y1 - y0) * t;
          particles.push({
            lat,
            lon,
            size: 0.3 + Math.random() * 0.9,
            bright: 0.4 + Math.random() * 0.3,
          });
        }
      }
    }

    // ~1500 interior particles — random sampling + point-in-polygon test
    let interiorAttempts = 0;
    let interiorAdded = 0;
    while (interiorAdded < 1500 && interiorAttempts < 60000) {
      interiorAttempts++;
      const lat = Math.asin(2 * Math.random() - 1) * (180 / Math.PI);
      const lon = Math.random() * 360 - 180;
      if (isOnLand(lon, lat)) {
        particles.push({
          lat,
          lon,
          size: 0.3 + Math.random() * 0.7,
          bright: 0.3 + Math.random() * 0.4,
        });
        interiorAdded++;
      }
    }

    // ~800 ocean dots (very faint)
    for (let i = 0; i < 800; i++) {
      const lat = Math.asin(2 * Math.random() - 1) * (180 / Math.PI);
      const lon = Math.random() * 360 - 180;
      particles.push({
        lat,
        lon,
        size: 0.2 + Math.random() * 0.4,
        bright: 0.05 + Math.random() * 0.07,
      });
    }

    // Stable orbit positions for events
    const eventAngles = events.map(
      (_, i) =>
        (i / Math.max(events.length, 1)) * Math.PI * 2 + Math.random() * 0.3,
    );
    const eventOrbits = events.map(() => 1.2 + Math.random() * 0.5);

    const tierColors: Record<string, string> = {
      EMERGENCY: "#ef4444",
      HIGH: "#f59e0b",
      ELEVATED: "#eab308",
      MONITOR: "#3b82f6",
      INFORMATIONAL: "#475569",
    };

    function draw() {
      timeRef.current += 0.016;
      rotationRef.current += 0.002;
      ctx!.clearRect(0, 0, W, H);

      // ── Outer orbit rings (HUD) ──
      ctx!.strokeStyle = "rgba(255,255,255,0.03)";
      ctx!.lineWidth = 0.5;
      [1.5, 2.0, 2.5].forEach((mult) => {
        ctx!.beginPath();
        ctx!.arc(cx, cy, R * mult, 0, Math.PI * 2);
        ctx!.stroke();
      });

      // ── Crosshair lines ──
      ctx!.strokeStyle = "rgba(255,255,255,0.04)";
      ctx!.lineWidth = 0.5;
      ctx!.beginPath();
      ctx!.moveTo(cx - R * 2.8, cy);
      ctx!.lineTo(cx + R * 2.8, cy);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(cx, cy - R * 2.8);
      ctx!.lineTo(cx, cy + R * 2.8);
      ctx!.stroke();

      // ── Atmosphere glow ──
      const atmoGrad = ctx!.createRadialGradient(
        cx,
        cy,
        R * 0.9,
        cx,
        cy,
        R * 1.3,
      );
      atmoGrad.addColorStop(0, "rgba(100,200,255,0.03)");
      atmoGrad.addColorStop(0.5, "rgba(60,130,200,0.02)");
      atmoGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
      ctx!.fillStyle = atmoGrad;
      ctx!.fill();

      // ── Earth sphere (dark fill) ──
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.fillStyle = "#050a12";
      ctx!.fill();

      // ── Particle dots on sphere ──
      const rot = rotationRef.current;
      particles.forEach((p) => {
        const lonRad = (p.lon + rot * (180 / Math.PI)) * (Math.PI / 180);
        const latRad = p.lat * (Math.PI / 180);
        const px = Math.cos(latRad) * Math.sin(lonRad);
        const pz = Math.cos(latRad) * Math.cos(lonRad);
        if (pz < -0.05) return; // Behind globe
        const py = Math.sin(latRad);
        const screenX = cx + px * R;
        const screenY = cy - py * R;
        const depth = (pz + 1) / 2; // 0 = back, 1 = front
        const alpha = p.bright * depth;
        ctx!.beginPath();
        ctx!.arc(screenX, screenY, p.size * depth, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(200,220,255,${alpha.toFixed(3)})`;
        ctx!.fill();
      });

      // ── Latitude grid lines on sphere surface ──
      ctx!.strokeStyle = "rgba(100,160,220,0.04)";
      ctx!.lineWidth = 0.3;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx!.beginPath();
        let moved = false;
        for (let lon = 0; lon <= 360; lon += 2) {
          const lonRad = (lon + rot * (180 / Math.PI)) * (Math.PI / 180);
          const latRad = lat * (Math.PI / 180);
          const px = Math.cos(latRad) * Math.sin(lonRad);
          const pz = Math.cos(latRad) * Math.cos(lonRad);
          if (pz < 0) {
            moved = false;
            continue;
          }
          const py = Math.sin(latRad);
          const sx = cx + px * R;
          const sy = cy - py * R;
          if (!moved) {
            ctx!.moveTo(sx, sy);
            moved = true;
          } else ctx!.lineTo(sx, sy);
        }
        ctx!.stroke();
      }

      // ── Conjunction event satellites ──
      events.forEach((event, i) => {
        const angle = eventAngles[i] + rotationRef.current * 0.8;
        const orbitR = R * eventOrbits[i];
        const x = cx + orbitR * Math.cos(angle);
        const y = cy + orbitR * Math.sin(angle) * 0.55;
        const color = tierColors[event.riskTier] || "#475569";
        const pulse = Math.sin(timeRef.current * 3 + i) * 0.3 + 0.7;

        // Orbit path (faint)
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, orbitR, orbitR * 0.55, 0, 0, Math.PI * 2);
        ctx!.strokeStyle = color + "10";
        ctx!.lineWidth = 0.3;
        ctx!.stroke();

        // Connection line
        const surfAngle = Math.atan2(y - cy, x - cx);
        ctx!.beginPath();
        ctx!.moveTo(x, y);
        ctx!.lineTo(
          cx + R * Math.cos(surfAngle),
          cy + R * Math.sin(surfAngle) * 0.95,
        );
        ctx!.strokeStyle = color + "25";
        ctx!.lineWidth = 0.5;
        ctx!.setLineDash([3, 3]);
        ctx!.stroke();
        ctx!.setLineDash([]);

        // Glow
        const glow = ctx!.createRadialGradient(x, y, 0, x, y, 12 * pulse);
        glow.addColorStop(0, color + "40");
        glow.addColorStop(1, color + "00");
        ctx!.beginPath();
        ctx!.arc(x, y, 12 * pulse, 0, Math.PI * 2);
        ctx!.fillStyle = glow;
        ctx!.fill();

        // Dot
        ctx!.beginPath();
        ctx!.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.fill();

        // Label for EMERGENCY/HIGH
        if (event.riskTier === "EMERGENCY" || event.riskTier === "HIGH") {
          ctx!.font = "9px Inter, system-ui, sans-serif";
          ctx!.fillStyle = color + "CC";
          ctx!.textAlign = "left";
          ctx!.fillText(event.noradId || "", x + 8, y - 4);
          ctx!.fillStyle = color + "80";
          ctx!.fillText(event.riskTier, x + 8, y + 6);
        }
      });

      // ── HUD corners ──
      ctx!.strokeStyle = "rgba(255,255,255,0.08)";
      ctx!.lineWidth = 1;
      const m = 16;
      const cornerLen = 24;
      // Top-left
      ctx!.beginPath();
      ctx!.moveTo(m, m + cornerLen);
      ctx!.lineTo(m, m);
      ctx!.lineTo(m + cornerLen, m);
      ctx!.stroke();
      // Top-right
      ctx!.beginPath();
      ctx!.moveTo(W - m - cornerLen, m);
      ctx!.lineTo(W - m, m);
      ctx!.lineTo(W - m, m + cornerLen);
      ctx!.stroke();
      // Bottom-left
      ctx!.beginPath();
      ctx!.moveTo(m, H - m - cornerLen);
      ctx!.lineTo(m, H - m);
      ctx!.lineTo(m + cornerLen, H - m);
      ctx!.stroke();
      // Bottom-right
      ctx!.beginPath();
      ctx!.moveTo(W - m - cornerLen, H - m);
      ctx!.lineTo(W - m, H - m);
      ctx!.lineTo(W - m, H - m - cornerLen);
      ctx!.stroke();

      // ── HUD text overlay ──
      ctx!.font = "10px Inter, monospace";
      ctx!.fillStyle = "rgba(255,255,255,0.2)";
      ctx!.textAlign = "left";
      ctx!.fillText("CAELEX SHIELD", m + 4, m + 14);
      ctx!.fillText("CONJUNCTION ASSESSMENT", m + 4, m + 26);
      ctx!.textAlign = "right";
      ctx!.fillText(`${events.length} ACTIVE`, W - m - 4, m + 14);
      ctx!.fillText(
        new Date().toISOString().slice(11, 19) + " UTC",
        W - m - 4,
        m + 26,
      );

      // Bottom HUD bar — tier breakdown
      ctx!.fillStyle = "rgba(255,255,255,0.12)";
      ctx!.textAlign = "center";
      const tierCounts = { EMERGENCY: 0, HIGH: 0, ELEVATED: 0, MONITOR: 0 };
      events.forEach((e: any) => {
        if (e.riskTier in tierCounts) (tierCounts as any)[e.riskTier]++;
      });
      const statusText = `EMRG:${tierCounts.EMERGENCY}  HIGH:${tierCounts.HIGH}  ELEV:${tierCounts.ELEVATED}  MON:${tierCounts.MONITOR}`;
      ctx!.fillText(statusText, cx, H - m - 4);

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length]);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}

// ── Dynamic Chart Components ─────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: "rgba(0,0,0,0.85)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "6px",
  color: "#E2E8F0",
  fontSize: "11px",
};

const axisTick = { fill: "rgba(255,255,255,0.25)", fontSize: 10 };
const gridStroke = "rgba(255,255,255,0.04)";

const CdmsPerWeekChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        AreaChart,
        Area,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;
      return function CdmsPerWeekChartInner({
        data,
      }: {
        data: Array<{ week: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="cdmGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="week"
                tick={axisTick}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={axisTick} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#22d3ee"
                strokeWidth={1.5}
                fill="url(#cdmGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const EventsByStatusChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = mod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderStatusLabel = (props: any) =>
        `${formatLabel(String(props.status ?? ""))} ${((Number(props.percent) || 0) * 100).toFixed(0)}%`;
      return function EventsByStatusChartInner({
        data,
      }: {
        data: Array<{ status: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={renderStatusLabel}
                labelLine={false}
              >
                {data.map((_: unknown, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const EventsByTierChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
        Cell,
      } = mod;
      return function EventsByTierChartInner({
        data,
      }: {
        data: Array<{ tier: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" barCategoryGap="20%">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridStroke}
                horizontal={false}
              />
              <XAxis type="number" tick={axisTick} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="tier"
                tick={axisTick}
                width={50}
                tickFormatter={(v: string) =>
                  v === "EMERGENCY"
                    ? "EMRG"
                    : v === "ELEVATED"
                      ? "ELEV"
                      : v === "INFORMATIONAL"
                        ? "INFO"
                        : v.slice(0, 4)
                }
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(label: any) => formatLabel(String(label))}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((entry: { tier: string }, i: number) => (
                  <Cell
                    key={i}
                    fill={
                      TIER_CHART_COLORS[entry.tier] ||
                      CHART_COLORS[i % CHART_COLORS.length]
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const DecisionBreakdownChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;
      return function DecisionBreakdownChartInner({
        data,
      }: {
        data: Array<{ decision: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="decision"
                tick={axisTick}
                tickFormatter={formatLabel}
              />
              <YAxis tick={axisTick} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(label: any) => formatLabel(String(label))}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const PcDistributionChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;
      return function PcDistributionChartInner({
        data,
      }: {
        data: Array<{ label: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const EventsTimelineChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        AreaChart,
        Area,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;
      return function EventsTimelineChartInner({
        data,
      }: {
        data: Array<{ date: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="date"
                tick={axisTick}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#06B6D4"
                fill="#06B6D4"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

// ── Main Component ───────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ShieldPage() {
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [analytics, setAnalytics] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [noradSearch, setNoradSearch] = useState("");
  const [offset, setOffset] = useState(0);

  // Fleet overview & forecast state
  const [fleetSummary, setFleetSummary] = useState<any>(null);
  const [fleetSummaryLoading, setFleetSummaryLoading] = useState(false);
  const [forecast, setForecast] = useState<any[] | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [anomaliesLoading, setAnomaliesLoading] = useState(false);
  const [maneuverSummary, setManeuverSummary] = useState<any>(null);
  const [maneuverSummaryLoading, setManeuverSummaryLoading] = useState(false);
  const [priorityEvents, setPriorityEvents] = useState<any[]>([]);
  const [priorityLoading, setPriorityLoading] = useState(false);

  // Fleet satellites (for globe)
  const [fleetSatellites, setFleetSatellites] = useState<any[]>([]);

  // LeoLabs integration
  const [leolabsKey, setLeolabsKey] = useState("");
  const [leolabsEnabled, setLeolabsEnabled] = useState(false);
  const [leolabsTestResult, setLeolabsTestResult] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");

  // Bottom section tab for secondary views
  const [bottomTab, setBottomTab] = useState<
    "events" | "anomalies" | "settings"
  >("events");

  // ── Data Fetching ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/shield/stats");
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      }
    } catch {
      /* silently fail */
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", String(LIMIT));
      params.set("offset", String(offset));
      if (statusFilter) params.set("status", statusFilter);
      if (tierFilter) params.set("riskTier", tierFilter);
      if (noradSearch) params.set("noradId", noradSearch);

      const res = await fetch(`/api/shield/events?${params}`);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.data ?? []);
        setTotalEvents(json.meta?.total ?? 0);
      }
    } catch {
      /* silently fail */
    }
  }, [offset, statusFilter, tierFilter, noradSearch]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/shield/analytics");
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data);
      }
    } catch {
      /* silently fail */
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/shield/config");
      if (res.ok) {
        const json = await res.json();
        setConfig(json.data);
      }
    } catch {
      /* silently fail */
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const fetchFleetSummary = useCallback(async () => {
    setFleetSummaryLoading(true);
    try {
      const res = await fetch("/api/shield/fleet-summary");
      if (res.ok) {
        const json = await res.json();
        setFleetSummary(json);
      }
    } catch {
      /* silently fail */
    } finally {
      setFleetSummaryLoading(false);
    }
  }, []);

  const fetchForecast = useCallback(async () => {
    setForecastLoading(true);
    try {
      const res = await fetch("/api/shield/forecast");
      if (res.ok) {
        const json = await res.json();
        setForecast(json);
      }
    } catch {
      /* silently fail */
    } finally {
      setForecastLoading(false);
    }
  }, []);

  const fetchAnomalies = useCallback(async () => {
    setAnomaliesLoading(true);
    try {
      const res = await fetch("/api/shield/anomalies");
      if (res.ok) {
        const json = await res.json();
        setAnomalies(json.anomalies ?? []);
      }
    } catch {
      /* silently fail */
    } finally {
      setAnomaliesLoading(false);
    }
  }, []);

  const fetchManeuverSummary = useCallback(async () => {
    setManeuverSummaryLoading(true);
    try {
      const res = await fetch("/api/shield/fleet-maneuver-summary?period=week");
      if (res.ok) {
        const json = await res.json();
        setManeuverSummary(json);
      }
    } catch {
      /* silently fail */
    } finally {
      setManeuverSummaryLoading(false);
    }
  }, []);

  const fetchPriorityQueue = useCallback(async () => {
    setPriorityLoading(true);
    try {
      const res = await fetch("/api/shield/priority-queue");
      if (res.ok) {
        const json = await res.json();
        setPriorityEvents(json.events ?? []);
      }
    } catch {
      /* silently fail */
    } finally {
      setPriorityLoading(false);
    }
  }, []);

  const fetchFleet = useCallback(async () => {
    try {
      const res = await fetch("/api/satellites/fleet");
      if (res.ok) {
        const json = await res.json();
        setFleetSatellites(json.spacecraft ?? []);
      }
    } catch {
      /* silently fail */
    }
  }, []);

  // Initial load: all data for grid layout
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchStats(),
      fetchEvents(),
      fetchFleetSummary(),
      fetchPriorityQueue(),
      fetchAnalytics(),
      fetchForecast(),
      fetchManeuverSummary(),
      fetchAnomalies(),
    ]).finally(() => setLoading(false));
  }, [
    fetchStats,
    fetchEvents,
    fetchFleetSummary,
    fetchPriorityQueue,
    fetchAnalytics,
    fetchForecast,
    fetchManeuverSummary,
    fetchAnomalies,
  ]);

  // Load config when settings tab selected
  useEffect(() => {
    if (bottomTab === "settings" && !config) {
      fetchConfig();
    }
  }, [bottomTab, config, fetchConfig]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [statusFilter, tierFilter, noradSearch]);

  // ── Config Save ──────────────────────────────────────────────────────────

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/shield/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          emergencyPcThreshold: config.emergencyPcThreshold,
          highPcThreshold: config.highPcThreshold,
          elevatedPcThreshold: config.elevatedPcThreshold,
          monitorPcThreshold: config.monitorPcThreshold,
          notifyOnTier: config.notifyOnTier,
          emergencyEmailAll: config.emergencyEmailAll,
          autoCloseAfterTcaHours: config.autoCloseAfterTcaHours,
          ncaAutoNotify: config.ncaAutoNotify,
          ncaJurisdiction: config.ncaJurisdiction || null,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setConfig(json.data);
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // ── LeoLabs Test ─────────────────────────────────────────────────────────

  const handleTestLeolabs = async () => {
    if (!leolabsKey) return;
    setLeolabsTestResult("testing");
    try {
      const res = await fetch("/api/shield/config/test-leolabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ apiKey: leolabsKey }),
      });
      if (res.ok) {
        setLeolabsTestResult("success");
      } else {
        setLeolabsTestResult("error");
      }
    } catch {
      setLeolabsTestResult("error");
    } finally {
      setTimeout(() => setLeolabsTestResult("idle"), 4000);
    }
  };

  // ── Refresh handler ──────────────────────────────────────────────────────

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([
      fetchStats(),
      fetchEvents(),
      fetchFleetSummary(),
      fetchPriorityQueue(),
    ]).finally(() => setLoading(false));
  };

  // ── Derived stats ────────────────────────────────────────────────────────

  // Find nearest TCA across all events for countdown
  const nearestTca = events
    .filter((e) => new Date(e.tca).getTime() > Date.now())
    .sort((a, b) => new Date(a.tca).getTime() - new Date(b.tca).getTime())[0];

  // Events this week count (use stats if available)
  const eventsThisWeek = stats?.eventsThisWeek ?? 0;

  // ── Tab definitions ──────────────────────────────────────────────────────

  const tabs = [
    { key: "events" as const, label: "EVENTS", icon: Activity },
    { key: "anomalies" as const, label: "ANOMALIES", icon: Zap },
    { key: "settings" as const, label: "CONFIG", icon: Settings },
  ];

  // ── Cinematic Intro ──────────────────────────────────────────────────────

  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIntroComplete(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  // ── UTC Clock ──────────────────────────────────────────────────────────
  const [utcTime, setUtcTime] = useState(
    new Date().toISOString().slice(11, 19),
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setUtcTime(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  // Cinematic intro screen
  if (!introComplete) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050a12] flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-5"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 100 100"
              className="text-white"
            >
              <path
                d="M50 5 L15 85 L50 70 L85 85 Z"
                fill="currentColor"
                opacity="0.9"
              />
            </svg>
          </motion.div>

          {/* SHIELD text */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-cyan-400/30 mb-1">
              Caelex
            </p>
            <h1 className="text-[32px] font-light tracking-[0.3em] text-white uppercase">
              Shield
            </h1>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            className="w-48 h-px bg-white/10 mt-4 overflow-hidden rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.div
              className="h-full bg-white/40"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.2, delay: 0.9, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.p
            className="text-[10px] uppercase tracking-[0.2em] text-white/15 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
          >
            Conjunction Assessment System
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMAND CENTER UI — Grid Layout
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      className="h-screen bg-[#050a12] text-white flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 h-10 flex items-center justify-between px-4 border-b border-cyan-500/[0.08] bg-[#060d1a]">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-cyan-400/70">
            Shield
          </span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/20">
            Conjunction Assessment
          </span>
        </div>
        <div className="flex items-center gap-6">
          {stats && (
            <div className="flex items-center gap-4">
              {stats.emergencyCount > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400">
                    {stats.emergencyCount} EMRG
                  </span>
                </span>
              )}
              {stats.overdueDecisions > 0 && (
                <span className="text-[10px] font-mono text-amber-400">
                  {stats.overdueDecisions} OVERDUE
                </span>
              )}
            </div>
          )}
          <span className="text-[10px] font-mono tracking-wider text-cyan-400/30">
            {utcTime} UTC
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-white/25 hover:text-cyan-400/60 transition-colors disabled:opacity-30"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── MAIN GRID: 3 Columns ──────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[200px_1fr_280px] min-h-0">
        {/* ── LEFT COLUMN: Key Metrics ────────────────────────────────────── */}
        <div className="flex flex-col gap-2 p-3 border-r border-white/[0.04] overflow-y-auto bg-[#060d1a]/50">
          {/* Active Events */}
          <div className="relative p-3 rounded bg-white/[0.02] border border-white/[0.04]">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/20 rounded-tl" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/20 rounded-tr" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/20 rounded-bl" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/20 rounded-br" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/40 mb-1.5">
              Active Events
            </p>
            <p className="text-[36px] font-extralight text-white leading-none tabular-nums">
              {stats?.activeEvents ?? <span className="text-white/15">--</span>}
            </p>
            {stats && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {stats.emergencyCount > 0 && (
                  <span className="text-[9px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                    {stats.emergencyCount} EMRG
                  </span>
                )}
                {stats.highCount > 0 && (
                  <span className="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    {stats.highCount} HIGH
                  </span>
                )}
                {stats.elevatedCount > 0 && (
                  <span className="text-[9px] font-mono text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                    {stats.elevatedCount} ELEV
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Fleet Risk */}
          <div className="relative p-3 rounded bg-white/[0.02] border border-white/[0.04]">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/20 rounded-tl" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/20 rounded-tr" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/20 rounded-bl" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/20 rounded-br" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/40 mb-1.5">
              Fleet Risk
            </p>
            {fleetSummaryLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white/20" />
            ) : fleetSummary ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-[28px] font-extralight text-white leading-none tabular-nums">
                    {fleetSummary.satellitesWithActiveEvents}
                  </span>
                  <span className="text-[14px] text-white/15 font-extralight">
                    /{fleetSummary.totalSatellites}
                  </span>
                </div>
                <p className="text-[9px] text-white/20 mt-1 uppercase tracking-wider">
                  Satellites at risk
                </p>
              </>
            ) : (
              <p className="text-[28px] font-extralight text-white/15 leading-none">
                --
              </p>
            )}
          </div>

          {/* Next TCA */}
          <div className="relative p-3 rounded bg-white/[0.02] border border-white/[0.04]">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/20 rounded-tl" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/20 rounded-tr" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/20 rounded-bl" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/20 rounded-br" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/40 mb-1.5">
              Next TCA
            </p>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white/20" />
            ) : nearestTca ? (
              <>
                <p className="text-[22px] font-mono font-extralight text-amber-400 leading-none tabular-nums">
                  {formatTcaCountdown(nearestTca.tca)}
                </p>
                <p className="text-[9px] font-mono text-white/15 mt-1.5 truncate">
                  {nearestTca.conjunctionId ?? nearestTca.id}
                </p>
              </>
            ) : (
              <p className="text-[22px] font-extralight text-white/15 leading-none">
                --
              </p>
            )}
          </div>

          {/* This Week */}
          <div className="relative p-3 rounded bg-white/[0.02] border border-white/[0.04]">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/20 rounded-tl" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/20 rounded-tr" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/20 rounded-bl" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/20 rounded-br" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/40 mb-1.5">
              This Week
            </p>
            <p className="text-[28px] font-extralight text-white leading-none tabular-nums">
              {stats ? (
                eventsThisWeek > 0 ? (
                  eventsThisWeek
                ) : (
                  totalEvents
                )
              ) : (
                <span className="text-white/15">--</span>
              )}
            </p>
            <p className="text-[9px] text-white/20 mt-1 uppercase tracking-wider">
              {stats?.overdueDecisions
                ? `${stats.overdueDecisions} overdue`
                : "no overdue"}
            </p>
          </div>

          {/* Maneuver Summary */}
          {maneuverSummary && (
            <div className="relative p-3 rounded bg-white/[0.02] border border-white/[0.04]">
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/20 rounded-tl" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/20 rounded-tr" />
              <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/40 mb-1.5">
                Maneuvers / Wk
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-[20px] font-extralight text-white leading-none tabular-nums">
                  {maneuverSummary.maneuversExecuted}
                </span>
                <span className="text-[9px] font-mono text-white/20">
                  {maneuverSummary.totalDeltaV} m/s
                </span>
              </div>
            </div>
          )}

          {/* Tier Legend */}
          <div className="mt-auto relative p-3 rounded bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/40 mb-2">
              Risk Tiers
            </p>
            {(["EMERGENCY", "HIGH", "ELEVATED", "MONITOR"] as const).map(
              (tier) => (
                <div key={tier} className="flex items-center gap-2 py-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${TIER_DOT_COLORS[tier]}`}
                  />
                  <span className="text-[9px] text-white/25 uppercase tracking-wider font-mono">
                    {tier}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        {/* ── CENTER: Globe + Mini Charts ──────────────────────────────────── */}
        <div className="flex flex-col min-h-0">
          {/* Globe Area */}
          <div className="flex-1 relative min-h-0">
            <div className="absolute inset-0 bg-[#050a12]">
              <ShieldGlobe3DLazy satellites={fleetSatellites} events={events} />
            </div>
            {/* HUD overlays on globe */}
            <div className="absolute top-3 left-4 pointer-events-none">
              <p className="text-[9px] font-mono text-cyan-500/25 uppercase tracking-[0.3em]">
                Caelex Shield
              </p>
              <p className="text-[8px] font-mono text-white/[0.08] uppercase tracking-[0.2em]">
                Orbital Conjunction Monitoring
              </p>
            </div>
            <div className="absolute top-3 right-4 pointer-events-none text-right">
              <p className="text-[9px] font-mono text-cyan-500/25">
                {events.length} TRACKED
              </p>
            </div>
            {/* Bottom HUD readout on globe */}
            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-4">
                {(["EMERGENCY", "HIGH", "ELEVATED", "MONITOR"] as const).map(
                  (tier) => {
                    const count = events.filter(
                      (e: any) => e.riskTier === tier,
                    ).length;
                    if (count === 0) return null;
                    return (
                      <span key={tier} className="flex items-center gap-1.5">
                        <span
                          className={`w-1 h-1 rounded-full ${TIER_DOT_COLORS[tier]}`}
                        />
                        <span
                          className={`text-[9px] font-mono ${TIER_TEXT_COLORS[tier]} opacity-50`}
                        >
                          {count}
                        </span>
                      </span>
                    );
                  },
                )}
              </div>
              <span className="text-[8px] font-mono text-white/[0.08]">
                {new Date().toISOString().slice(0, 10)}
              </span>
            </div>
          </div>

          {/* ── Mini Charts Row ────────────────────────────────────────── */}
          <div
            className="shrink-0 grid grid-cols-3 gap-2 p-2 border-t border-white/[0.04] bg-[#060d1a]/50"
            style={{ height: "180px" }}
          >
            {/* CDMs per Week */}
            <div className="relative rounded bg-white/[0.02] border border-white/[0.04] p-2.5 flex flex-col overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/15" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/15" />
              <p className="text-[8px] uppercase tracking-[0.15em] text-cyan-400/40 mb-1 shrink-0">
                CDMs / Week
              </p>
              <div className="flex-1 min-h-0">
                {analytics?.cdmsPerWeek?.length > 0 ? (
                  <CdmsPerWeekChart data={analytics.cdmsPerWeek} />
                ) : analyticsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-3 h-3 animate-spin text-white/10" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[8px] text-white/[0.08]">
                      Awaiting data
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Events by Tier */}
            <div className="relative rounded bg-white/[0.02] border border-white/[0.04] p-2.5 flex flex-col overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/15" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/15" />
              <p className="text-[8px] uppercase tracking-[0.15em] text-cyan-400/40 mb-1 shrink-0">
                Events by Tier
              </p>
              <div className="flex-1 min-h-0">
                {analytics?.eventsByTier?.length > 0 ? (
                  <EventsByTierChart data={analytics.eventsByTier} />
                ) : analyticsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-3 h-3 animate-spin text-white/10" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[8px] text-white/[0.08]">
                      Awaiting data
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Events Timeline */}
            <div className="relative rounded bg-white/[0.02] border border-white/[0.04] p-2.5 flex flex-col overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/15" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/15" />
              <p className="text-[8px] uppercase tracking-[0.15em] text-cyan-400/40 mb-1 shrink-0">
                90d Timeline
              </p>
              <div className="flex-1 min-h-0">
                {analytics?.eventsTimeline?.length > 0 ? (
                  <EventsTimelineChart
                    data={buildTimelineData(analytics.eventsTimeline)}
                  />
                ) : analyticsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-3 h-3 animate-spin text-white/10" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[8px] text-white/[0.08]">
                      Awaiting data
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Priority Queue + Forecast ──────────────────────── */}
        <div className="flex flex-col gap-2 p-3 border-l border-white/[0.04] overflow-y-auto bg-[#060d1a]/50">
          {/* Priority Queue */}
          <div className="relative flex-1 flex flex-col min-h-0 rounded bg-white/[0.02] border border-white/[0.04] p-3">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/20 rounded-tl" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/20 rounded-tr" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/40 mb-3 flex items-center gap-2 shrink-0">
              <Zap className="w-3 h-3 text-amber-400/50" />
              Priority Queue
            </p>
            {priorityLoading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="w-4 h-4 animate-spin text-white/20" />
              </div>
            ) : priorityEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1">
                <Shield className="w-5 h-5 text-white/[0.06] mb-2" />
                <p className="text-[9px] text-white/15">No urgent events</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1">
                {priorityEvents.slice(0, 10).map((pe: any) => (
                  <button
                    key={pe.eventId}
                    onClick={() =>
                      router.push(`/dashboard/shield/${pe.eventId}`)
                    }
                    className="w-full text-left p-2 rounded border border-transparent hover:border-cyan-500/[0.08] hover:bg-white/[0.02] transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-light text-white/70 truncate group-hover:text-white transition-colors">
                          {pe.satelliteName ?? pe.conjunctionId}
                        </p>
                        <p className="text-[8px] font-mono text-white/15 mt-0.5 truncate">
                          {pe.conjunctionId}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1 ${
                          TIER_DOT_COLORS[pe.tier] ??
                          TIER_DOT_COLORS.INFORMATIONAL
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[8px] font-mono text-white/25 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTcaCountdown(pe.tca)}
                      </span>
                      <span className="text-[8px] font-mono text-white/25">
                        Pc {formatPc(pe.pc)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 7D Forecast */}
          <div className="relative shrink-0 rounded bg-white/[0.02] border border-white/[0.04] p-3">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/20 rounded-tl" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/20 rounded-tr" />
            <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/40 mb-2">
              7d Forecast
            </p>
            {forecastLoading ? (
              <Loader2 className="w-3 h-3 animate-spin text-white/15" />
            ) : forecast && forecast.length > 0 ? (
              <div className="space-y-1.5">
                {forecast.slice(0, 4).map((f: any) => (
                  <div
                    key={f.noradId}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[9px] text-white/30 truncate mr-2 flex-1">
                      {f.satelliteName}
                    </span>
                    <span className="text-[9px] font-mono text-white/50 shrink-0 w-6 text-right">
                      {f.expectedConjunctions7d}
                    </span>
                    {f.trend === "increasing" ? (
                      <TrendingUp className="w-2.5 h-2.5 text-red-400 ml-1 shrink-0" />
                    ) : f.trend === "decreasing" ? (
                      <TrendingDown className="w-2.5 h-2.5 text-emerald-400 ml-1 shrink-0" />
                    ) : (
                      <ArrowRight className="w-2.5 h-2.5 text-white/15 ml-1 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-white/[0.08]">No forecast data</p>
            )}
          </div>

          {/* Anomalies Mini */}
          {anomalies.length > 0 && (
            <div className="relative shrink-0 rounded bg-amber-500/[0.03] border border-amber-500/[0.08] p-3">
              <p className="text-[9px] uppercase tracking-[0.2em] text-amber-400/50 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                {anomalies.length} Anomal{anomalies.length !== 1 ? "ies" : "y"}
              </p>
              <div className="space-y-1">
                {anomalies.slice(0, 3).map((a: any, i: number) => (
                  <p key={i} className="text-[9px] text-amber-400/40 truncate">
                    {a.satelliteName ?? a.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Decision Breakdown Mini */}
          {analytics?.decisionBreakdown?.length > 0 && (
            <div
              className="relative shrink-0 rounded bg-white/[0.02] border border-white/[0.04] p-2.5 flex flex-col"
              style={{ height: "150px" }}
            >
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/15" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-500/15" />
              <p className="text-[8px] uppercase tracking-[0.15em] text-cyan-400/40 mb-1 shrink-0">
                Decisions
              </p>
              <div className="flex-1 min-h-0">
                <DecisionBreakdownChart data={analytics.decisionBreakdown} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM: Event Table ───────────────────────────────────────────── */}
      <div
        className="shrink-0 border-t border-cyan-500/[0.08] bg-[#060d1a]/80 flex flex-col"
        style={{ height: "30%" }}
      >
        {/* Tab bar + filters */}
        <div className="shrink-0 flex items-center gap-0 px-4 h-8 border-b border-white/[0.04]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setBottomTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 h-full text-[9px] uppercase tracking-[0.15em] border-b transition-all ${
                  bottomTab === tab.key
                    ? "text-cyan-400 border-cyan-400"
                    : "text-white/20 border-transparent hover:text-white/35"
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
          {bottomTab === "events" && (
            <div className="ml-auto flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-6 px-2 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded text-white/60 focus:outline-none focus:border-cyan-500/20 appearance-none"
              >
                <option value="">All Status</option>
                {STATUS_LIST.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {formatLabel(s)}
                  </option>
                ))}
              </select>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="h-6 px-2 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded text-white/60 focus:outline-none focus:border-cyan-500/20 appearance-none"
              >
                <option value="">All Tiers</option>
                {TIER_LIST.filter(Boolean).map((t) => (
                  <option key={t} value={t}>
                    {formatLabel(t)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="NORAD ID"
                value={noradSearch}
                onChange={(e) => setNoradSearch(e.target.value)}
                className="h-6 w-24 px-2 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded text-white/60 placeholder:text-white/15 focus:outline-none focus:border-cyan-500/20"
              />
            </div>
          )}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* ── EVENTS TAB ──────────────────────────────────────────────── */}
          {bottomTab === "events" && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Shield className="w-8 h-8 text-white/[0.06] mb-3" />
                  <p className="text-[11px] text-white/30">
                    No conjunction events
                  </p>
                  <p className="text-[10px] text-white/15 mt-1">
                    CDM polling active. Events appear when data is received.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[60px_1fr_1fr_100px_100px_80px_80px] gap-2 px-4 py-2 text-[9px] uppercase tracking-[0.12em] text-white/20 border-b border-white/[0.04] sticky top-0 bg-[#060d1a] z-10">
                    <span>Tier</span>
                    <span>Satellite</span>
                    <span>Threat</span>
                    <span className="text-right">Pc</span>
                    <span className="text-right">Miss</span>
                    <span className="text-right">TCA</span>
                    <span className="text-right">Status</span>
                  </div>
                  {events.map((event: any) => (
                    <button
                      key={event.id}
                      onClick={() =>
                        router.push(`/dashboard/shield/${event.id}`)
                      }
                      className="w-full grid grid-cols-[60px_1fr_1fr_100px_100px_80px_80px] gap-2 px-4 py-2 text-left border-b border-white/[0.04] hover:bg-cyan-500/[0.02] transition-colors group"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            TIER_DOT_COLORS[event.riskTier] ??
                            TIER_DOT_COLORS.INFORMATIONAL
                          }`}
                        />
                        <span
                          className={`text-[10px] font-mono uppercase ${
                            TIER_TEXT_COLORS[event.riskTier] ??
                            TIER_TEXT_COLORS.INFORMATIONAL
                          }`}
                        >
                          {event.riskTier === "EMERGENCY"
                            ? "EMRG"
                            : event.riskTier === "ELEVATED"
                              ? "ELEV"
                              : event.riskTier === "INFORMATIONAL"
                                ? "INFO"
                                : event.riskTier?.slice(0, 4)}
                        </span>
                      </span>
                      <span className="text-[11px] font-light text-white/60 truncate group-hover:text-white transition-colors">
                        {event.satelliteName ?? event.noradId}
                      </span>
                      <span className="text-[11px] font-light text-white/30 truncate">
                        {event.threatObjectName ?? event.threatNoradId ?? "--"}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-white/50 text-right">
                        {formatPc(event.latestPc)}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-white/30 text-right">
                        {event.latestMissDistance !== null &&
                        event.latestMissDistance !== undefined
                          ? `${event.latestMissDistance.toFixed(0)}m`
                          : "N/A"}
                      </span>
                      <span className="text-[11px] font-mono text-white/40 text-right">
                        {formatTcaCountdown(event.tca)}
                      </span>
                      <span className="text-[10px] text-white/25 text-right uppercase truncate">
                        {formatLabel(event.status)}
                      </span>
                    </button>
                  ))}
                  {totalEvents > LIMIT && (
                    <div className="flex items-center justify-between px-4 py-2">
                      <p className="text-[10px] font-mono text-white/20">
                        {offset + 1}&ndash;
                        {Math.min(offset + LIMIT, totalEvents)} of {totalEvents}
                      </p>
                      <div className="flex gap-2">
                        <button
                          disabled={offset === 0}
                          onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/30 hover:text-white/50 border border-white/[0.06] rounded disabled:opacity-20 transition-colors"
                        >
                          <ChevronLeft className="w-3 h-3" />
                          Prev
                        </button>
                        <button
                          disabled={offset + LIMIT >= totalEvents}
                          onClick={() => setOffset(offset + LIMIT)}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] text-white/30 hover:text-white/50 border border-white/[0.06] rounded disabled:opacity-20 transition-colors"
                        >
                          Next
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── ANOMALIES TAB ────────────────────────────────────────────── */}
          {bottomTab === "anomalies" && (
            <div className="p-4 space-y-4">
              {anomaliesLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400/50" />
                  <span className="text-[10px] text-white/30">
                    Scanning for anomalies...
                  </span>
                </div>
              ) : anomalies.length > 0 ? (
                <>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <p className="text-[11px] font-light text-amber-400">
                        {anomalies.length} satellite
                        {anomalies.length !== 1 ? "s" : ""} with unusual
                        activity
                      </p>
                    </div>
                    <div className="space-y-2">
                      {anomalies.map((a: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-2.5 rounded border border-white/[0.04] bg-white/[0.02]"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500/60 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-white/60 font-light">
                              {a.message}
                            </p>
                            {a.satelliteName && (
                              <p className="text-[10px] font-mono text-white/20 mt-0.5">
                                {a.satelliteName}{" "}
                                {a.noradId && `(${a.noradId})`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {fleetSummary?.satellites &&
                    fleetSummary.satellites.length > 1 && (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3 flex items-center gap-2">
                          <Satellite className="w-3 h-3 text-cyan-400/60" />
                          Fleet Status
                        </p>
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-white/20 border-b border-white/[0.04]">
                              <th className="pb-2 pr-4 font-normal">
                                Satellite
                              </th>
                              <th className="pb-2 pr-4 font-normal">Events</th>
                              <th className="pb-2 pr-4 font-normal">Tier</th>
                              <th className="pb-2 font-normal">Next TCA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fleetSummary.satellites
                              .filter((s: any) => s.activeEventCount > 0)
                              .map((sat: any) => (
                                <tr
                                  key={sat.noradId}
                                  className="border-b border-white/[0.04] last:border-0"
                                >
                                  <td className="py-2 pr-4 text-[11px] text-white/60 font-light">
                                    {sat.name}
                                    <span className="text-white/20 ml-1 font-mono text-[9px]">
                                      {sat.noradId}
                                    </span>
                                  </td>
                                  <td className="py-2 pr-4 text-[11px] font-mono text-white/50">
                                    {sat.activeEventCount}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {sat.highestTier ? (
                                      <span className="flex items-center gap-1.5">
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full ${
                                            TIER_DOT_COLORS[sat.highestTier] ??
                                            "bg-slate-500"
                                          }`}
                                        />
                                        <span
                                          className={`text-[10px] uppercase ${
                                            TIER_TEXT_COLORS[sat.highestTier] ??
                                            "text-slate-400"
                                          }`}
                                        >
                                          {sat.highestTier}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-white/20">--</span>
                                    )}
                                  </td>
                                  <td className="py-2 text-[11px] font-mono text-white/40">
                                    {sat.oldestUnresolvedTca
                                      ? formatTcaCountdown(
                                          sat.oldestUnresolvedTca,
                                        )
                                      : "--"}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/30 mb-3" />
                  <p className="text-[11px] text-white/30">
                    No anomalies detected
                  </p>
                  <p className="text-[10px] text-white/15 mt-1">
                    All satellites within normal bounds.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS TAB ─────────────────────────────────────────────── */}
          {bottomTab === "settings" && (
            <div className="p-4">
              {configLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                </div>
              ) : config ? (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 space-y-6">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/30">
                    Conjunction Assessment Configuration
                  </p>
                  <div>
                    <p className="text-[11px] font-light text-white/60 mb-3">
                      Probability of Collision Thresholds
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Input
                        label="Emergency Pc"
                        type="number"
                        step="any"
                        value={config.emergencyPcThreshold}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            emergencyPcThreshold:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        hint="EMERGENCY tier"
                      />
                      <Input
                        label="High Pc"
                        type="number"
                        step="any"
                        value={config.highPcThreshold}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            highPcThreshold: parseFloat(e.target.value) || 0,
                          })
                        }
                        hint="HIGH tier"
                      />
                      <Input
                        label="Elevated Pc"
                        type="number"
                        step="any"
                        value={config.elevatedPcThreshold}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            elevatedPcThreshold:
                              parseFloat(e.target.value) || 0,
                          })
                        }
                        hint="ELEVATED tier"
                      />
                      <Input
                        label="Monitor Pc"
                        type="number"
                        step="any"
                        value={config.monitorPcThreshold}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            monitorPcThreshold: parseFloat(e.target.value) || 0,
                          })
                        }
                        hint="MONITOR tier"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-light text-white/60 mb-3">
                      Notifications & Lifecycle
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-light text-white/40 mb-1">
                          Notify on Tier
                        </label>
                        <select
                          value={config.notifyOnTier}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              notifyOnTier: e.target.value,
                            })
                          }
                          className="w-full h-9 px-3 bg-white/[0.03] border border-white/[0.06] rounded text-[11px] text-white/60 focus:outline-none focus:border-cyan-500/20"
                        >
                          {TIER_LIST.filter(Boolean).map((t) => (
                            <option key={t} value={t}>
                              {formatLabel(t)} and above
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Auto-Close After TCA (h)"
                        type="number"
                        min={1}
                        max={168}
                        value={config.autoCloseAfterTcaHours}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            autoCloseAfterTcaHours:
                              parseInt(e.target.value) || 24,
                          })
                        }
                        hint="Hours after TCA"
                      />
                      <Input
                        label="NCA Jurisdiction"
                        placeholder="e.g., DE, FR"
                        value={config.ncaJurisdiction ?? ""}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            ncaJurisdiction: e.target.value || null,
                          })
                        }
                        hint="ISO country code"
                      />
                    </div>
                    <div className="flex items-center gap-6 mt-4">
                      <label className="flex items-center gap-2 text-[11px] text-white/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.emergencyEmailAll}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              emergencyEmailAll: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-white/10 bg-white/[0.03] text-cyan-500 focus:ring-cyan-500/20"
                        />
                        Email all on Emergency
                      </label>
                      <label className="flex items-center gap-2 text-[11px] text-white/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.ncaAutoNotify}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              ncaAutoNotify: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-white/10 bg-white/[0.03] text-cyan-500 focus:ring-cyan-500/20"
                        />
                        Auto-notify NCA
                      </label>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <p className="text-[11px] font-light text-white/60">
                        LeoLabs Integration
                      </p>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${leolabsEnabled ? "text-cyan-400 border border-cyan-500/20" : "text-white/20 border border-white/[0.06]"}`}
                      >
                        {leolabsEnabled ? "Connected" : "Disabled"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Input
                          label="LeoLabs API Key"
                          type="password"
                          placeholder="Enter API key"
                          value={leolabsKey}
                          onChange={(e) => setLeolabsKey(e.target.value)}
                          hint="BYOK API credential"
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleTestLeolabs}
                            loading={leolabsTestResult === "testing"}
                            disabled={!leolabsKey}
                          >
                            Test
                          </Button>
                          {leolabsTestResult === "success" && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              OK
                            </span>
                          )}
                          {leolabsTestResult === "error" && (
                            <span className="flex items-center gap-1 text-[10px] text-red-400">
                              <XCircle className="w-3 h-3" />
                              Failed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 pt-1">
                        <label className="flex items-center gap-2 text-[11px] text-white/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={leolabsEnabled}
                            onChange={(e) =>
                              setLeolabsEnabled(e.target.checked)
                            }
                            className="w-4 h-4 rounded border-white/10 bg-white/[0.03] text-cyan-500 focus:ring-cyan-500/20"
                          />
                          Enable LeoLabs CDM source
                        </label>
                        <p className="text-[10px] text-white/20">
                          CDMs merged with Space-Track data.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-4 border-t border-white/[0.04]">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={saveConfig}
                      loading={saving}
                      icon={<Save className="w-4 h-4" />}
                    >
                      Save Configuration
                    </Button>
                    {saveStatus === "success" && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Saved
                      </span>
                    )}
                    {saveStatus === "error" && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400">
                        <XCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Settings className="w-8 h-8 text-white/10 mb-3" />
                  <p className="text-[11px] text-white/30">
                    Failed to load configuration
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Timeline Data Helper ─────────────────────────────────────────────────────

function buildTimelineData(
  events: Array<{ createdAt: string }>,
): Array<{ date: string; count: number }> {
  const dayMap = new Map<string, number>();
  for (const e of events) {
    const day = new Date(e.createdAt).toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
