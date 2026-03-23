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

    // Generate continent-like dot particles on sphere surface
    const PARTICLE_COUNT = 1800;
    const particles: Array<{
      lat: number;
      lon: number;
      size: number;
      bright: number;
    }> = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const lat = Math.asin(2 * Math.random() - 1) * (180 / Math.PI);
      const lon = Math.random() * 360 - 180;
      // More particles near coastlines (rough approximation via noise)
      const landProb =
        Math.sin(lat * 0.05) * Math.cos(lon * 0.03) +
        Math.sin(lat * 0.02 + lon * 0.04);
      if (landProb > -0.2 || Math.random() < 0.15) {
        particles.push({
          lat,
          lon,
          size: 0.3 + Math.random() * 0.8,
          bright: 0.15 + Math.random() * 0.35,
        });
      }
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
      rotationRef.current += 0.003;
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

      // ── Earth sphere (dark) ──
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
        const depth = (pz + 1) / 2;
        const alpha = p.bright * depth;
        ctx!.beginPath();
        ctx!.arc(screenX, screenY, p.size * depth, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(200,220,255,${alpha})`;
        ctx!.fill();
      });

      // ── Grid lines on sphere ──
      ctx!.strokeStyle = "rgba(100,160,220,0.04)";
      ctx!.lineWidth = 0.3;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx!.beginPath();
        for (let lon = 0; lon <= 360; lon += 2) {
          const lonRad = (lon + rot * (180 / Math.PI)) * (Math.PI / 180);
          const latRad = lat * (Math.PI / 180);
          const px = Math.cos(latRad) * Math.sin(lonRad);
          const pz = Math.cos(latRad) * Math.cos(lonRad);
          if (pz < 0) continue;
          const py = Math.sin(latRad);
          const sx = cx + px * R;
          const sy = cy - py * R;
          if (lon === 0 || pz < 0.01) ctx!.moveTo(sx, sy);
          else ctx!.lineTo(sx, sy);
        }
        ctx!.stroke();
      }

      // ── Equator ring ──
      ctx!.strokeStyle = "rgba(100,200,255,0.06)";
      ctx!.lineWidth = 0.5;
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, R, R * 0.08, 0, 0, Math.PI * 2);
      ctx!.stroke();

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

      // Bottom HUD bar
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
    <canvas
      ref={canvasRef}
      className="w-full h-full absolute inset-0"
      style={{ imageRendering: "auto" }}
    />
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
        BarChart,
        Bar,
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
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="week"
                tick={axisTick}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
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
          <ResponsiveContainer width="100%" height={250}>
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
      const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = mod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderTierLabel = (props: any) =>
        `${formatLabel(String(props.tier ?? ""))} ${((Number(props.percent) || 0) * 100).toFixed(0)}%`;
      return function EventsByTierChartInner({
        data,
      }: {
        data: Array<{ tier: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="tier"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={renderTierLabel}
                labelLine={false}
              >
                {data.map((entry: { tier: string }, i: number) => (
                  <Cell
                    key={i}
                    fill={
                      TIER_CHART_COLORS[entry.tier] ||
                      CHART_COLORS[i % CHART_COLORS.length]
                    }
                  />
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
          <ResponsiveContainer width="100%" height={250}>
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
          <ResponsiveContainer width="100%" height={250}>
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
          <ResponsiveContainer width="100%" height={250}>
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

  // LeoLabs integration
  const [leolabsKey, setLeolabsKey] = useState("");
  const [leolabsEnabled, setLeolabsEnabled] = useState(false);
  const [leolabsTestResult, setLeolabsTestResult] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");

  // Bottom section tab for secondary views
  const [bottomTab, setBottomTab] = useState<
    "events" | "forecast" | "anomalies" | "settings"
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

  // Initial load: stats + events + fleet summary + priority queue
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchStats(),
      fetchEvents(),
      fetchFleetSummary(),
      fetchPriorityQueue(),
    ]).finally(() => setLoading(false));
  }, [fetchStats, fetchEvents, fetchFleetSummary, fetchPriorityQueue]);

  // Load forecast when forecast tab selected
  useEffect(() => {
    if (bottomTab === "forecast") {
      if (!forecast) fetchForecast();
      if (!maneuverSummary) fetchManeuverSummary();
      if (!analytics) fetchAnalytics();
    }
  }, [
    bottomTab,
    forecast,
    maneuverSummary,
    analytics,
    fetchForecast,
    fetchManeuverSummary,
    fetchAnalytics,
  ]);

  // Load anomalies when anomalies tab selected
  useEffect(() => {
    if (bottomTab === "anomalies" && anomalies.length === 0) {
      fetchAnomalies();
    }
  }, [bottomTab, anomalies.length, fetchAnomalies]);

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
    { key: "forecast" as const, label: "FORECAST", icon: BarChart3 },
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
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
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
            <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-white/30 mb-1">
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
  // COMMAND CENTER UI
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      className="h-screen bg-black text-white flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 h-10 flex items-center justify-between px-4 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-light uppercase tracking-[0.2em] text-white/60">
            Shield
          </span>
          <span className="text-[10px] uppercase tracking-[0.12em] text-white/20">
            Conjunction Assessment
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono tracking-wider text-white/25">
            {utcTime} UTC
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/25 hover:text-white/50 transition-colors disabled:opacity-30"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── COMMAND CENTER: Globe + Overlaid Panels ───────────────────────── */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* Globe fills the entire center area */}
        <div className="absolute inset-0 bg-black">
          <ShieldGlobe events={events} stats={stats} />
        </div>

        {/* ── LEFT PANELS (overlaid on globe) ──────────────────────────── */}
        <div className="absolute left-4 top-4 bottom-4 w-[200px] flex flex-col gap-3 z-10 pointer-events-none">
          {/* Active Events */}
          <div className="pointer-events-auto bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-2">
              Active Events
            </p>
            <p className="text-[32px] font-light text-white leading-none">
              {stats?.activeEvents ?? "--"}
            </p>
            {stats && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {stats.emergencyCount > 0 && (
                  <span className="text-[10px] font-mono text-red-400">
                    {stats.emergencyCount} EMRG
                  </span>
                )}
                {stats.highCount > 0 && (
                  <span className="text-[10px] font-mono text-amber-400">
                    {stats.highCount} HIGH
                  </span>
                )}
                {stats.elevatedCount > 0 && (
                  <span className="text-[10px] font-mono text-yellow-400">
                    {stats.elevatedCount} ELEV
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Fleet Risk */}
          <div className="pointer-events-auto bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-2">
              Fleet Risk
            </p>
            {fleetSummaryLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white/20" />
            ) : fleetSummary ? (
              <>
                <p className="text-[24px] font-light text-white leading-none">
                  {fleetSummary.satellitesWithActiveEvents}
                  <span className="text-[14px] text-white/20 font-light">
                    /{fleetSummary.totalSatellites}
                  </span>
                </p>
                <p className="text-[10px] text-white/20 mt-1">
                  satellites at risk
                </p>
              </>
            ) : (
              <p className="text-[24px] font-light text-white/20">--</p>
            )}
          </div>

          {/* Next TCA */}
          <div className="pointer-events-auto bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-2">
              Next TCA
            </p>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white/20" />
            ) : nearestTca ? (
              <>
                <p className="text-[20px] font-mono font-light text-amber-400 leading-none">
                  {formatTcaCountdown(nearestTca.tca)}
                </p>
                <p className="text-[10px] font-mono text-white/20 mt-1 truncate">
                  {nearestTca.conjunctionId ?? nearestTca.id}
                </p>
              </>
            ) : (
              <p className="text-[20px] font-light text-white/20">--</p>
            )}
          </div>

          {/* Weekly Count */}
          <div className="pointer-events-auto bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-2">
              This Week
            </p>
            <p className="text-[24px] font-light text-white leading-none">
              {stats
                ? eventsThisWeek > 0
                  ? eventsThisWeek
                  : totalEvents
                : "--"}
            </p>
            <p className="text-[10px] text-white/20 mt-1">
              {stats?.overdueDecisions
                ? `${stats.overdueDecisions} overdue`
                : "no overdue"}
            </p>
          </div>

          {/* Globe Legend */}
          <div className="pointer-events-auto bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-lg p-3 mt-auto">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-2">
              Tier Legend
            </p>
            {(["EMERGENCY", "HIGH", "ELEVATED", "MONITOR"] as const).map(
              (tier) => (
                <div key={tier} className="flex items-center gap-2 py-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${TIER_DOT_COLORS[tier]}`}
                  />
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">
                    {tier}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Priority Queue + Forecast ───────────────────── */}
        <div className="absolute right-4 top-4 bottom-4 w-[260px] flex flex-col gap-3 z-10 pointer-events-none">
          {/* Priority Queue */}
          <div className="pointer-events-auto bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-lg p-3 flex-1 flex flex-col min-h-0">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3 flex items-center gap-2">
              <Zap className="w-3 h-3 text-amber-400/60" />
              Priority Queue
            </p>
            {priorityLoading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="w-4 h-4 animate-spin text-white/20" />
              </div>
            ) : priorityEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1">
                <Shield className="w-6 h-6 text-white/10 mb-2" />
                <p className="text-[10px] text-white/20">No urgent events</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1">
                {priorityEvents.slice(0, 8).map((pe: any) => (
                  <button
                    key={pe.eventId}
                    onClick={() =>
                      router.push(`/dashboard/shield/${pe.eventId}`)
                    }
                    className="w-full text-left p-2 rounded border border-transparent hover:border-white/[0.08] hover:bg-white/[0.03] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-light text-white truncate">
                          {pe.satelliteName ?? pe.conjunctionId}
                        </p>
                        <p className="text-[9px] font-mono text-white/20 mt-0.5 truncate">
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
                      <span className="text-[9px] font-mono text-white/30 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTcaCountdown(pe.tca)}
                      </span>
                      <span className="text-[9px] font-mono text-white/30">
                        Pc {formatPc(pe.pc)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mini Forecast Sparkline */}
          <div className="pointer-events-auto bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-2">
              7d Forecast
            </p>
            {forecast && forecast.length > 0 ? (
              <div className="space-y-1.5">
                {forecast.slice(0, 3).map((f: any) => (
                  <div
                    key={f.noradId}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[10px] text-white/40 truncate mr-2 flex-1">
                      {f.satelliteName}
                    </span>
                    <span className="text-[10px] font-mono text-white/60 shrink-0">
                      {f.expectedConjunctions7d}
                    </span>
                    {f.trend === "increasing" ? (
                      <TrendingUp className="w-2.5 h-2.5 text-red-400 ml-1 shrink-0" />
                    ) : f.trend === "decreasing" ? (
                      <TrendingDown className="w-2.5 h-2.5 text-emerald-400 ml-1 shrink-0" />
                    ) : (
                      <ArrowRight className="w-2.5 h-2.5 text-white/20 ml-1 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-white/15">No forecast data</p>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION: Tabs + Event List ──────────────────────────────── */}
      <div
        className="shrink-0 border-t border-white/[0.06] bg-black flex flex-col"
        style={{ height: "42%" }}
      >
        {/* Tab bar */}
        <div className="shrink-0 flex items-center gap-0 px-4 h-9 border-b border-white/[0.04]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setBottomTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 h-full text-[10px] uppercase tracking-[0.12em] border-b transition-all ${
                  bottomTab === tab.key
                    ? "text-emerald-400 border-emerald-400"
                    : "text-white/25 border-transparent hover:text-white/40"
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
          {/* Filters inline for events tab */}
          {bottomTab === "events" && (
            <div className="ml-auto flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-6 px-2 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded text-white/60 focus:outline-none focus:border-white/[0.12] appearance-none"
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
                className="h-6 px-2 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded text-white/60 focus:outline-none focus:border-white/[0.12] appearance-none"
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
                className="h-6 w-24 px-2 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded text-white/60 placeholder:text-white/15 focus:outline-none focus:border-white/[0.12]"
              />
            </div>
          )}
        </div>

        {/* Tab content area (scrollable) */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* ── EVENTS TAB ─────────────────────────────────────────────── */}
          {bottomTab === "events" && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                </div>
              ) : events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Shield className="w-8 h-8 text-white/10 mb-3" />
                  <p className="text-[11px] text-white/30">
                    No conjunction events
                  </p>
                  <p className="text-[10px] text-white/15 mt-1">
                    CDM polling active. Events appear when data is received.
                  </p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-[60px_1fr_1fr_100px_100px_80px_80px] gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-white/20 border-b border-white/[0.04] sticky top-0 bg-black z-10">
                    <span>Tier</span>
                    <span>Satellite</span>
                    <span>Threat</span>
                    <span className="text-right">Pc</span>
                    <span className="text-right">Miss</span>
                    <span className="text-right">TCA</span>
                    <span className="text-right">Status</span>
                  </div>
                  {/* Table rows */}
                  {events.map((event: any) => (
                    <button
                      key={event.id}
                      onClick={() =>
                        router.push(`/dashboard/shield/${event.id}`)
                      }
                      className="w-full grid grid-cols-[60px_1fr_1fr_100px_100px_80px_80px] gap-2 px-4 py-2.5 text-left border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Tier dot */}
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

                      {/* Satellite */}
                      <span className="text-[11px] font-light text-white truncate group-hover:text-white">
                        {event.satelliteName ?? event.noradId}
                      </span>

                      {/* Threat */}
                      <span className="text-[11px] font-light text-white/40 truncate">
                        {event.threatObjectName ?? event.threatNoradId ?? "--"}
                      </span>

                      {/* Pc */}
                      <span className="text-[11px] font-mono tabular-nums text-white/60 text-right">
                        {formatPc(event.latestPc)}
                      </span>

                      {/* Miss Distance */}
                      <span className="text-[11px] font-mono tabular-nums text-white/40 text-right">
                        {event.latestMissDistance !== null &&
                        event.latestMissDistance !== undefined
                          ? `${event.latestMissDistance.toFixed(0)}m`
                          : "N/A"}
                      </span>

                      {/* TCA */}
                      <span className="text-[11px] font-mono text-white/50 text-right">
                        {formatTcaCountdown(event.tca)}
                      </span>

                      {/* Status */}
                      <span className="text-[10px] text-white/30 text-right uppercase truncate">
                        {formatLabel(event.status)}
                      </span>
                    </button>
                  ))}

                  {/* Pagination */}
                  {totalEvents > LIMIT && (
                    <div className="flex items-center justify-between px-4 py-3">
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

          {/* ── FORECAST TAB ───────────────────────────────────────────── */}
          {bottomTab === "forecast" && (
            <div className="p-4 space-y-4">
              {/* Maneuver Summary */}
              {maneuverSummaryLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                  <span className="text-[10px] text-white/30">
                    Loading maneuver summary...
                  </span>
                </div>
              ) : maneuverSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Maneuvers (Week)",
                      value: maneuverSummary.maneuversExecuted,
                      color: "text-white",
                    },
                    {
                      label: "Total Delta-V",
                      value: `${maneuverSummary.totalDeltaV} m/s`,
                      color: "text-white",
                    },
                    {
                      label: "Avg Response",
                      value:
                        maneuverSummary.averageResponseTimeHours > 0
                          ? `${maneuverSummary.averageResponseTimeHours}h`
                          : "N/A",
                      color: "text-white",
                    },
                    {
                      label: "Risks Accepted",
                      value: maneuverSummary.risksAccepted,
                      color: "text-amber-400",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3"
                    >
                      <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-1">
                        {item.label}
                      </p>
                      <p
                        className={`text-[18px] font-light ${item.color} font-mono`}
                      >
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* 7-Day Forecast Table */}
              {forecastLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                  <span className="text-[10px] text-white/30">
                    Computing forecast...
                  </span>
                </div>
              ) : forecast && forecast.length > 0 ? (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3">
                    7-Day Conjunction Forecast
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-white/20 border-b border-white/[0.04]">
                          <th className="pb-2 pr-4 font-normal">Satellite</th>
                          <th className="pb-2 pr-4 font-normal">Expected</th>
                          <th className="pb-2 pr-4 font-normal">Trend</th>
                          <th className="pb-2 font-normal">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forecast.map((f: any) => (
                          <tr
                            key={f.noradId}
                            className="border-b border-white/[0.04] last:border-0"
                          >
                            <td className="py-2 pr-4 text-[11px] text-white/60 font-light">
                              {f.satelliteName}
                              <span className="text-white/20 ml-1 font-mono text-[9px]">
                                {f.noradId}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-[11px] font-mono text-white/50">
                              {f.expectedConjunctions7d}
                            </td>
                            <td className="py-2 pr-4">
                              {f.trend === "increasing" ? (
                                <span className="flex items-center gap-1 text-[10px] text-red-400">
                                  <TrendingUp className="w-3 h-3" />
                                  UP
                                </span>
                              ) : f.trend === "decreasing" ? (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                                  <TrendingDown className="w-3 h-3" />
                                  DOWN
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] text-white/30">
                                  <ArrowRight className="w-3 h-3" />
                                  STABLE
                                </span>
                              )}
                            </td>
                            <td className="py-2 text-[10px] text-white/30 uppercase">
                              {f.confidence === "insufficient_data"
                                ? "LOW DATA"
                                : f.confidence}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : forecast && forecast.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <BarChart3 className="w-8 h-8 text-white/10 mb-3" />
                  <p className="text-[11px] text-white/30">No forecast data</p>
                  <p className="text-[10px] text-white/15 mt-1">
                    Needs 7+ days of CDM data.
                  </p>
                </div>
              ) : null}

              {/* Analytics Charts */}
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                </div>
              ) : analytics ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3">
                      CDMs per Week
                    </p>
                    {analytics.cdmsPerWeek.length > 0 ? (
                      <CdmsPerWeekChart data={analytics.cdmsPerWeek} />
                    ) : (
                      <p className="text-[10px] text-white/15 text-center py-8">
                        No data
                      </p>
                    )}
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3">
                      Events by Status
                    </p>
                    {analytics.eventsByStatus.length > 0 ? (
                      <EventsByStatusChart data={analytics.eventsByStatus} />
                    ) : (
                      <p className="text-[10px] text-white/15 text-center py-8">
                        No data
                      </p>
                    )}
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3">
                      Events by Risk Tier
                    </p>
                    {analytics.eventsByTier.length > 0 ? (
                      <EventsByTierChart data={analytics.eventsByTier} />
                    ) : (
                      <p className="text-[10px] text-white/15 text-center py-8">
                        No data
                      </p>
                    )}
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3">
                      Decision Breakdown
                    </p>
                    {analytics.decisionBreakdown.length > 0 ? (
                      <DecisionBreakdownChart
                        data={analytics.decisionBreakdown}
                      />
                    ) : (
                      <p className="text-[10px] text-white/15 text-center py-8">
                        No data
                      </p>
                    )}
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3">
                      Pc Distribution
                    </p>
                    {analytics.pcDistribution.some((b: any) => b.count > 0) ? (
                      <PcDistributionChart data={analytics.pcDistribution} />
                    ) : (
                      <p className="text-[10px] text-white/15 text-center py-8">
                        No data
                      </p>
                    )}
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3">
                      Events Timeline (90d)
                    </p>
                    {analytics.eventsTimeline.length > 0 ? (
                      <EventsTimelineChart
                        data={buildTimelineData(analytics.eventsTimeline)}
                      />
                    ) : (
                      <p className="text-[10px] text-white/15 text-center py-8">
                        No data
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── ANOMALIES TAB ──────────────────────────────────────────── */}
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

                  {/* Fleet status table */}
                  {fleetSummary?.satellites &&
                    fleetSummary.satellites.length > 1 && (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3 flex items-center gap-2">
                          <Satellite className="w-3 h-3 text-emerald-400/60" />
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

          {/* ── SETTINGS TAB ───────────────────────────────────────────── */}
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

                  {/* Pc Thresholds */}
                  <div>
                    <p className="text-[11px] font-light text-white/60 mb-3">
                      Probability of Collision Thresholds
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Emergency Pc Threshold"
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
                        hint="EMERGENCY classification threshold"
                      />
                      <Input
                        label="High Pc Threshold"
                        type="number"
                        step="any"
                        value={config.highPcThreshold}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            highPcThreshold: parseFloat(e.target.value) || 0,
                          })
                        }
                        hint="HIGH classification threshold"
                      />
                      <Input
                        label="Elevated Pc Threshold"
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
                        hint="ELEVATED classification threshold"
                      />
                      <Input
                        label="Monitor Pc Threshold"
                        type="number"
                        step="any"
                        value={config.monitorPcThreshold}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            monitorPcThreshold: parseFloat(e.target.value) || 0,
                          })
                        }
                        hint="MONITOR classification threshold"
                      />
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div>
                    <p className="text-[11px] font-light text-white/60 mb-3">
                      Notification Settings
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="w-full h-9 px-3 bg-white/[0.03] border border-white/[0.06] rounded text-[11px] text-white/60 focus:outline-none focus:border-white/[0.12]"
                        >
                          {TIER_LIST.filter(Boolean).map((t) => (
                            <option key={t} value={t}>
                              {formatLabel(t)} and above
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-white/20 mt-1">
                          Minimum tier for notifications
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-5">
                        <input
                          type="checkbox"
                          id="emergencyEmailAll"
                          checked={config.emergencyEmailAll}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              emergencyEmailAll: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-white/10 bg-white/[0.03] text-emerald-500 focus:ring-emerald-500/20"
                        />
                        <label
                          htmlFor="emergencyEmailAll"
                          className="text-[11px] text-white/50"
                        >
                          Email all team on Emergency
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Close */}
                  <div>
                    <p className="text-[11px] font-light text-white/60 mb-3">
                      Event Lifecycle
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Auto-Close After TCA (hours)"
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
                        hint="Hours after TCA to auto-close events"
                      />
                    </div>
                  </div>

                  {/* NCA Settings */}
                  <div>
                    <p className="text-[11px] font-light text-white/60 mb-3">
                      NCA (National Competent Authority)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 pt-1">
                        <input
                          type="checkbox"
                          id="ncaAutoNotify"
                          checked={config.ncaAutoNotify}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              ncaAutoNotify: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-white/10 bg-white/[0.03] text-emerald-500 focus:ring-emerald-500/20"
                        />
                        <label
                          htmlFor="ncaAutoNotify"
                          className="text-[11px] text-white/50"
                        >
                          Auto-notify NCA on Emergency
                        </label>
                      </div>
                      <Input
                        label="NCA Jurisdiction"
                        placeholder="e.g., DE, FR, UK"
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
                  </div>

                  {/* LeoLabs Integration */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <p className="text-[11px] font-light text-white/60">
                        LeoLabs Integration
                      </p>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                          leolabsEnabled
                            ? "text-emerald-400 border border-emerald-500/20"
                            : "text-white/20 border border-white/[0.06]"
                        }`}
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
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="leolabsEnabled"
                            checked={leolabsEnabled}
                            onChange={(e) =>
                              setLeolabsEnabled(e.target.checked)
                            }
                            className="w-4 h-4 rounded border-white/10 bg-white/[0.03] text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <label
                            htmlFor="leolabsEnabled"
                            className="text-[11px] text-white/50"
                          >
                            Enable LeoLabs CDM source
                          </label>
                        </div>
                        <p className="text-[10px] text-white/20">
                          CDMs merged with Space-Track data.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Save */}
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
