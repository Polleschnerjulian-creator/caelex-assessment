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
  Globe,
  Calendar,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassMotion, GlassStagger } from "@/components/ui/GlassMotion";
import { motion } from "framer-motion";
import { glassItemVariants } from "@/components/ui/GlassMotion";
import { csrfHeaders } from "@/lib/csrf-client";

// ── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 20;

const TIER_COLORS: Record<string, string> = {
  EMERGENCY: "bg-red-500/20 text-red-400 border border-red-500/30",
  HIGH: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  ELEVATED: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  MONITOR: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  INFORMATIONAL: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/20 text-blue-400",
  MONITORING: "bg-cyan-500/20 text-cyan-400",
  ASSESSMENT_REQUIRED: "bg-amber-500/20 text-amber-400",
  DECISION_MADE: "bg-purple-500/20 text-purple-400",
  MANEUVER_PLANNED: "bg-orange-500/20 text-orange-400",
  MANEUVER_EXECUTED: "bg-emerald-500/20 text-emerald-400",
  MANEUVER_VERIFIED: "bg-green-500/20 text-green-400",
  CLOSED: "bg-slate-500/20 text-slate-400",
};

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

// ── Formatting Helpers ───────────────────────────────────────────────────────

function formatPc(pc: number): string {
  if (pc === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(pc)));
  const mantissa = pc / Math.pow(10, exp);
  return `${mantissa.toFixed(1)}e${exp}`;
}

function formatTcaCountdown(tca: string): string {
  const diff = new Date(tca).getTime() - Date.now();
  if (diff < 0) return "TCA passed";
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
    <div className="relative bg-black rounded-xl overflow-hidden border border-white/[0.04]">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: "420px", imageRendering: "auto" }}
      />
    </div>
  );
}

// ── Dynamic Chart Components ─────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: "#1E293B",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#E2E8F0",
};

const axisTick = { fill: "#94A3B8", fontSize: 11 };
const gridStroke = "rgba(255,255,255,0.1)";

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
  const [activeTab, setActiveTab] = useState<
    "events" | "forecast" | "anomalies" | "settings"
  >("events");
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
    if (activeTab === "forecast") {
      if (!forecast) fetchForecast();
      if (!maneuverSummary) fetchManeuverSummary();
      if (!analytics) fetchAnalytics();
    }
  }, [
    activeTab,
    forecast,
    maneuverSummary,
    analytics,
    fetchForecast,
    fetchManeuverSummary,
    fetchAnalytics,
  ]);

  // Load anomalies when anomalies tab selected
  useEffect(() => {
    if (activeTab === "anomalies" && anomalies.length === 0) {
      fetchAnomalies();
    }
  }, [activeTab, anomalies.length, fetchAnomalies]);

  // Load config when settings tab selected
  useEffect(() => {
    if (activeTab === "settings" && !config) {
      fetchConfig();
    }
  }, [activeTab, config, fetchConfig]);

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
    { key: "events" as const, label: "Events", icon: Activity },
    { key: "forecast" as const, label: "Forecast", icon: BarChart3 },
    { key: "anomalies" as const, label: "Anomalies", icon: Zap },
    { key: "settings" as const, label: "Settings", icon: Settings },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black">
      <GlassMotion>
        <div className="p-4 md:p-6 space-y-4">
          {/* ── Command Center Header ───────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-[15px] font-semibold text-white tracking-wide uppercase">
                Shield — Conjunction Assessment
              </h1>
              <span className="text-[11px] font-mono text-white/20 hidden md:inline">
                {new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40 hover:text-white border border-white/[0.06] rounded hover:border-white/[0.12] transition-all disabled:opacity-30"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* ── Stats Bar: 4 cards ──────────────────────────────────────── */}
          <GlassStagger className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Events */}
            <motion.div variants={glassItemVariants}>
              <Card variant="metric" className="border-t-emerald-500">
                <CardContent>
                  <p className="text-caption text-slate-400 mb-1 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Active Events
                  </p>
                  <p className="text-display-sm font-bold text-white">
                    {stats?.activeEvents ?? "--"}
                  </p>
                  {stats && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {stats.emergencyCount > 0 && (
                        <span className="text-micro text-red-400 font-semibold">
                          {stats.emergencyCount} EMRG
                        </span>
                      )}
                      {stats.highCount > 0 && (
                        <span className="text-micro text-amber-400 font-semibold">
                          {stats.highCount} HIGH
                        </span>
                      )}
                      {stats.elevatedCount > 0 && (
                        <span className="text-micro text-yellow-400 font-semibold">
                          {stats.elevatedCount} ELEV
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Fleet Risk */}
            <motion.div variants={glassItemVariants}>
              <Card
                variant="metric"
                className={`${
                  fleetSummary?.emergencyCount > 0
                    ? "border-t-red-500"
                    : fleetSummary?.highCount > 0
                      ? "border-t-amber-500"
                      : "border-t-blue-500"
                }`}
              >
                <CardContent>
                  <p className="text-caption text-slate-400 mb-1 flex items-center gap-1.5">
                    <Satellite className="w-3.5 h-3.5" />
                    Fleet Risk
                  </p>
                  {fleetSummaryLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
                  ) : fleetSummary ? (
                    <>
                      <p className="text-display-sm font-bold text-white">
                        {fleetSummary.satellitesWithActiveEvents}
                        <span className="text-body text-slate-500 font-normal">
                          /{fleetSummary.totalSatellites}
                        </span>
                      </p>
                      <p className="text-micro text-slate-500 mt-1">
                        satellites with active events
                      </p>
                    </>
                  ) : (
                    <p className="text-display-sm font-bold text-slate-500">
                      --
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Next TCA Countdown */}
            <motion.div variants={glassItemVariants}>
              <Card variant="metric" className="border-t-orange-500">
                <CardContent>
                  <p className="text-caption text-slate-400 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Next TCA
                  </p>
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400 mt-1" />
                  ) : nearestTca ? (
                    <>
                      <p className="text-display-sm font-bold text-orange-400">
                        {formatTcaCountdown(nearestTca.tca)}
                      </p>
                      <p className="text-micro text-slate-500 mt-1 truncate">
                        {nearestTca.conjunctionId ?? nearestTca.id}
                      </p>
                    </>
                  ) : (
                    <p className="text-display-sm font-bold text-slate-500">
                      --
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Events This Week */}
            <motion.div variants={glassItemVariants}>
              <Card variant="metric" className="border-t-purple-500">
                <CardContent>
                  <p className="text-caption text-slate-400 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Events This Week
                  </p>
                  <p className="text-display-sm font-bold text-white">
                    {stats
                      ? eventsThisWeek > 0
                        ? eventsThisWeek
                        : totalEvents
                      : "--"}
                  </p>
                  <p className="text-micro text-slate-500 mt-1">
                    {stats?.overdueDecisions
                      ? `${stats.overdueDecisions} overdue`
                      : "no overdue decisions"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </GlassStagger>

          {/* ── Main Content: Globe + Priority Queue ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Globe Widget (8 cols) */}
            <div className="lg:col-span-8">
              <Card variant="elevated" padding="md" className="h-full">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-body font-semibold text-white">
                    Conjunction Map
                  </h2>
                  <span className="ml-auto text-micro text-slate-500">
                    {
                      events.filter((e) => e.riskTier !== "INFORMATIONAL")
                        .length
                    }{" "}
                    active conjunctions
                  </span>
                </div>
                {/* Globe legend */}
                <div className="flex items-center gap-4 mb-3 flex-wrap">
                  {(["EMERGENCY", "HIGH", "ELEVATED", "MONITOR"] as const).map(
                    (tier) => {
                      const dot: Record<string, string> = {
                        EMERGENCY: "bg-red-500",
                        HIGH: "bg-amber-500",
                        ELEVATED: "bg-yellow-500",
                        MONITOR: "bg-blue-500",
                      };
                      return (
                        <div key={tier} className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${dot[tier]}`}
                          />
                          <span className="text-micro text-slate-400">
                            {tier}
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>
                <ShieldGlobe events={events} stats={stats} />
              </Card>
            </div>

            {/* Priority Queue (4 cols) */}
            <div className="lg:col-span-4">
              <Card variant="elevated" padding="md" className="h-full">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h2 className="text-body font-semibold text-white">
                    Priority Queue
                  </h2>
                </div>
                {priorityLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  </div>
                ) : priorityEvents.length === 0 ? (
                  <div className="text-center py-10">
                    <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-small text-slate-400">
                      No urgent events
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-[260px] pr-1">
                    {priorityEvents.slice(0, 8).map((pe: any) => (
                      <button
                        key={pe.eventId}
                        onClick={() =>
                          router.push(`/dashboard/shield/${pe.eventId}`)
                        }
                        className="w-full text-left p-2.5 rounded-lg glass-surface hover:glass-elevated transition-all duration-200 border border-transparent hover:border-white/10"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-small font-medium text-white truncate">
                              {pe.satelliteName ?? pe.conjunctionId}
                            </p>
                            <p className="text-micro text-slate-500 mt-0.5 truncate">
                              {pe.conjunctionId}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded text-micro font-semibold uppercase ${
                              TIER_COLORS[pe.tier] ?? TIER_COLORS.INFORMATIONAL
                            }`}
                          >
                            {pe.tier}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-micro text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTcaCountdown(pe.tca)}
                          </span>
                          <span className="text-micro font-mono text-slate-400">
                            Pc {formatPc(pe.pc)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────── */}
          <div className="flex gap-1 p-1 rounded-lg glass-surface w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-small font-medium
                    transition-all duration-200
                    ${
                      activeTab === tab.key
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Tab: Events ─────────────────────────────────────────────── */}
          {activeTab === "events" && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <Card variant="elevated" padding="md">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="block text-caption text-slate-400 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full h-9 px-3 bg-[var(--fill-inset)] border border-[var(--border-subtle)] rounded-[var(--v2-radius-sm)] text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/20"
                    >
                      <option value="">All Statuses</option>
                      {STATUS_LIST.filter(Boolean).map((s) => (
                        <option key={s} value={s}>
                          {formatLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-caption text-slate-400 mb-1">
                      Risk Tier
                    </label>
                    <select
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="w-full h-9 px-3 bg-[var(--fill-inset)] border border-[var(--border-subtle)] rounded-[var(--v2-radius-sm)] text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/20"
                    >
                      <option value="">All Tiers</option>
                      {TIER_LIST.filter(Boolean).map((t) => (
                        <option key={t} value={t}>
                          {formatLabel(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
                      label="NORAD ID"
                      placeholder="Search by NORAD ID..."
                      value={noradSearch}
                      onChange={(e) => setNoradSearch(e.target.value)}
                    />
                  </div>
                </div>
              </Card>

              {/* Event List */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              ) : events.length === 0 ? (
                <Card variant="elevated" padding="lg">
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-body-lg text-slate-400">
                      No conjunction events yet
                    </p>
                    <p className="text-small text-slate-500 mt-1">
                      CDM polling is active. Events will appear here when
                      conjunction data is received.
                    </p>
                  </div>
                </Card>
              ) : (
                <GlassStagger className="space-y-2">
                  {events.map((event: any) => (
                    <motion.div key={event.id} variants={glassItemVariants}>
                      <Card
                        variant="interactive"
                        padding="md"
                        onClick={() =>
                          router.push(`/dashboard/shield/${event.id}`)
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e: React.KeyboardEvent) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/dashboard/shield/${event.id}`);
                          }
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: Tier badge + names */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-micro font-semibold uppercase ${
                                TIER_COLORS[event.riskTier] ??
                                TIER_COLORS.INFORMATIONAL
                              }`}
                            >
                              {event.riskTier}
                            </span>
                            <div className="min-w-0">
                              <p className="text-body font-medium text-white truncate">
                                {event.satelliteName ?? event.noradId}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-caption text-slate-500 truncate">
                                  {event.threatObjectName ??
                                    event.threatNoradId}
                                </span>
                                {event.threatObjectType && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded text-micro bg-slate-700/50 text-slate-400 border border-slate-600/30">
                                    {event.threatObjectType}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Metrics */}
                          <div className="flex items-center gap-4 text-small shrink-0">
                            <div className="text-right">
                              <p className="text-slate-500 text-micro uppercase">
                                Pc
                              </p>
                              <p className="text-slate-300 font-mono font-medium">
                                {formatPc(event.latestPc)}
                              </p>
                            </div>
                            <div className="text-right hidden sm:block">
                              <p className="text-slate-500 text-micro uppercase">
                                Miss Dist
                              </p>
                              <p className="text-slate-300 font-mono font-medium">
                                {event.latestMissDistance !== null &&
                                event.latestMissDistance !== undefined
                                  ? `${event.latestMissDistance.toFixed(0)}m`
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-500 text-micro uppercase">
                                TCA
                              </p>
                              <p className="text-slate-300 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTcaCountdown(event.tca)}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`px-2 py-0.5 rounded-full text-micro font-medium ${
                                  STATUS_COLORS[event.status] ??
                                  STATUS_COLORS.NEW
                                }`}
                              >
                                {formatLabel(event.status)}
                              </span>
                              {event.latestDecision && (
                                <span className="px-2 py-0.5 rounded-full text-micro font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                  {formatLabel(event.latestDecision)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </GlassStagger>
              )}

              {/* Pagination */}
              {totalEvents > LIMIT && (
                <div className="flex items-center justify-between">
                  <p className="text-small text-slate-500">
                    Showing {offset + 1}
                    &ndash;
                    {Math.min(offset + LIMIT, totalEvents)} of {totalEvents}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                      icon={<ChevronLeft className="w-4 h-4" />}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={offset + LIMIT >= totalEvents}
                      onClick={() => setOffset(offset + LIMIT)}
                      icon={<ChevronRight className="w-4 h-4" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Forecast ─────────────────────────────────────────── */}
          {activeTab === "forecast" && (
            <div className="space-y-6">
              {/* Maneuver Summary */}
              {maneuverSummaryLoading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span className="text-small text-slate-400">
                    Loading maneuver summary...
                  </span>
                </div>
              ) : maneuverSummary ? (
                <GlassStagger className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <motion.div variants={glassItemVariants}>
                    <Card variant="metric" className="border-t-orange-500">
                      <CardContent>
                        <p className="text-caption text-slate-400 mb-1">
                          Maneuvers (Week)
                        </p>
                        <p className="text-display-sm font-bold text-white">
                          {maneuverSummary.maneuversExecuted}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={glassItemVariants}>
                    <Card variant="metric" className="border-t-cyan-500">
                      <CardContent>
                        <p className="text-caption text-slate-400 mb-1">
                          Total Delta-V
                        </p>
                        <p className="text-display-sm font-bold text-white">
                          {maneuverSummary.totalDeltaV}
                          <span className="text-body text-slate-500 font-normal ml-1">
                            m/s
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={glassItemVariants}>
                    <Card variant="metric" className="border-t-blue-500">
                      <CardContent>
                        <p className="text-caption text-slate-400 mb-1">
                          Avg Response Time
                        </p>
                        <p className="text-display-sm font-bold text-white">
                          {maneuverSummary.averageResponseTimeHours > 0
                            ? `${maneuverSummary.averageResponseTimeHours}h`
                            : "N/A"}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={glassItemVariants}>
                    <Card variant="metric" className="border-t-amber-500">
                      <CardContent>
                        <p className="text-caption text-slate-400 mb-1">
                          Risks Accepted
                        </p>
                        <p className="text-display-sm font-bold text-amber-400">
                          {maneuverSummary.risksAccepted}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </GlassStagger>
              ) : null}

              {/* 7-Day Forecast */}
              {forecastLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span className="text-small text-slate-400">
                    Computing forecast...
                  </span>
                </div>
              ) : forecast && forecast.length > 0 ? (
                <Card variant="elevated" padding="md">
                  <CardHeader>
                    <CardTitle>7-Day Conjunction Forecast</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-small">
                        <thead>
                          <tr className="text-left text-micro text-slate-500 uppercase border-b border-white/5">
                            <th className="pb-2 pr-4">Satellite</th>
                            <th className="pb-2 pr-4">Expected Conjunctions</th>
                            <th className="pb-2 pr-4">Trend</th>
                            <th className="pb-2">Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forecast.map((f: any) => (
                            <tr
                              key={f.noradId}
                              className="border-b border-white/5 last:border-0"
                            >
                              <td className="py-2 pr-4 text-slate-200 font-medium">
                                {f.satelliteName}
                                <span className="text-slate-500 ml-1 text-micro">
                                  {f.noradId}
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-slate-300 font-mono">
                                {f.expectedConjunctions7d}
                              </td>
                              <td className="py-2 pr-4">
                                {f.trend === "increasing" ? (
                                  <span className="flex items-center gap-1 text-red-400">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    Increasing
                                  </span>
                                ) : f.trend === "decreasing" ? (
                                  <span className="flex items-center gap-1 text-emerald-400">
                                    <TrendingDown className="w-3.5 h-3.5" />
                                    Decreasing
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-slate-400">
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    Stable
                                  </span>
                                )}
                              </td>
                              <td className="py-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-micro font-medium ${
                                    f.confidence === "high"
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : f.confidence === "medium"
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        : f.confidence === "low"
                                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                          : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                                  }`}
                                >
                                  {f.confidence === "insufficient_data"
                                    ? "Insufficient Data"
                                    : formatLabel(f.confidence)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : forecast && forecast.length === 0 ? (
                <Card variant="elevated" padding="md">
                  <div className="text-center py-8">
                    <BarChart3 className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-body text-slate-400">
                      No forecast data yet
                    </p>
                    <p className="text-small text-slate-500 mt-1">
                      Shield needs 7+ days of CDM data to generate forecasts.
                    </p>
                  </div>
                </Card>
              ) : null}

              {/* Analytics Charts */}
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              ) : analytics ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card variant="elevated" padding="md">
                    <CardHeader>
                      <CardTitle>CDMs per Week</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics.cdmsPerWeek.length > 0 ? (
                        <CdmsPerWeekChart data={analytics.cdmsPerWeek} />
                      ) : (
                        <p className="text-small text-slate-500 text-center py-8">
                          No CDM data available
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="elevated" padding="md">
                    <CardHeader>
                      <CardTitle>Events by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics.eventsByStatus.length > 0 ? (
                        <EventsByStatusChart data={analytics.eventsByStatus} />
                      ) : (
                        <p className="text-small text-slate-500 text-center py-8">
                          No event data available
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="elevated" padding="md">
                    <CardHeader>
                      <CardTitle>Events by Risk Tier</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics.eventsByTier.length > 0 ? (
                        <EventsByTierChart data={analytics.eventsByTier} />
                      ) : (
                        <p className="text-small text-slate-500 text-center py-8">
                          No tier data available
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="elevated" padding="md">
                    <CardHeader>
                      <CardTitle>Decision Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics.decisionBreakdown.length > 0 ? (
                        <DecisionBreakdownChart
                          data={analytics.decisionBreakdown}
                        />
                      ) : (
                        <p className="text-small text-slate-500 text-center py-8">
                          No decisions recorded yet
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="elevated" padding="md">
                    <CardHeader>
                      <CardTitle>Pc Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics.pcDistribution.some(
                        (b: any) => b.count > 0,
                      ) ? (
                        <PcDistributionChart data={analytics.pcDistribution} />
                      ) : (
                        <p className="text-small text-slate-500 text-center py-8">
                          No Pc data available
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="elevated" padding="md">
                    <CardHeader>
                      <CardTitle>Events Timeline (90d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics.eventsTimeline.length > 0 ? (
                        <EventsTimelineChart
                          data={buildTimelineData(analytics.eventsTimeline)}
                        />
                      ) : (
                        <p className="text-small text-slate-500 text-center py-8">
                          No timeline data available
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>
          )}

          {/* ── Tab: Anomalies ────────────────────────────────────────── */}
          {activeTab === "anomalies" && (
            <div className="space-y-4">
              {anomaliesLoading ? (
                <div className="flex items-center gap-2 py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  <span className="text-small text-slate-400">
                    Scanning for anomalies...
                  </span>
                </div>
              ) : anomalies.length > 0 ? (
                <>
                  <Card
                    variant="elevated"
                    padding="md"
                    className="border-l-4 border-l-amber-500"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <p className="text-body font-semibold text-amber-400">
                        {anomalies.length} satellite
                        {anomalies.length !== 1 ? "s" : ""} showing unusual
                        conjunction activity
                      </p>
                    </div>
                    <div className="space-y-2">
                      {anomalies.map((a: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-lg glass-surface"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-small text-slate-200">
                              {a.message}
                            </p>
                            {a.satelliteName && (
                              <p className="text-micro text-slate-500 mt-0.5">
                                {a.satelliteName}{" "}
                                {a.noradId && `(NORAD ${a.noradId})`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Fleet overview for anomaly context */}
                  {fleetSummary?.satellites &&
                    fleetSummary.satellites.length > 1 && (
                      <Card variant="elevated" padding="md">
                        <div className="flex items-center gap-2 mb-4">
                          <Satellite className="w-4 h-4 text-emerald-400" />
                          <h2 className="text-body font-semibold text-white">
                            Fleet Status
                          </h2>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-small">
                            <thead>
                              <tr className="text-left text-micro text-slate-500 uppercase border-b border-white/5">
                                <th className="pb-2 pr-4">Satellite</th>
                                <th className="pb-2 pr-4">Active Events</th>
                                <th className="pb-2 pr-4">Highest Tier</th>
                                <th className="pb-2">Next TCA</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fleetSummary.satellites
                                .filter((s: any) => s.activeEventCount > 0)
                                .map((sat: any) => (
                                  <tr
                                    key={sat.noradId}
                                    className="border-b border-white/5 last:border-0"
                                  >
                                    <td className="py-2 pr-4 text-slate-200 font-medium">
                                      {sat.name}
                                      <span className="text-slate-500 ml-1 text-micro">
                                        {sat.noradId}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-4 text-slate-300">
                                      {sat.activeEventCount}
                                    </td>
                                    <td className="py-2 pr-4">
                                      {sat.highestTier ? (
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-micro font-semibold uppercase ${
                                            TIER_COLORS[sat.highestTier] ??
                                            TIER_COLORS.INFORMATIONAL
                                          }`}
                                        >
                                          {sat.highestTier}
                                        </span>
                                      ) : (
                                        <span className="text-slate-500">
                                          --
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 text-slate-300">
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
                      </Card>
                    )}
                </>
              ) : (
                <Card variant="elevated" padding="lg">
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <p className="text-body-lg text-slate-300">
                      No anomalies detected
                    </p>
                    <p className="text-small text-slate-500 mt-1">
                      All satellites are operating within normal conjunction
                      frequency bounds.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── Tab: Settings ────────────────────────────────────────── */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {configLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              ) : config ? (
                <Card variant="elevated" padding="lg">
                  <CardHeader>
                    <CardTitle>Conjunction Assessment Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Pc Thresholds */}
                    <div>
                      <h3 className="text-body font-semibold text-white mb-3">
                        Probability of Collision Thresholds
                      </h3>
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
                          hint="Events with Pc above this are classified as EMERGENCY"
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
                          hint="Events with Pc above this are classified as HIGH"
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
                          hint="Events with Pc above this are classified as ELEVATED"
                        />
                        <Input
                          label="Monitor Pc Threshold"
                          type="number"
                          step="any"
                          value={config.monitorPcThreshold}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              monitorPcThreshold:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          hint="Events with Pc above this are classified as MONITOR"
                        />
                      </div>
                    </div>

                    {/* Notification Settings */}
                    <div>
                      <h3 className="text-body font-semibold text-white mb-3">
                        Notification Settings
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1">
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
                            className="w-full h-9 px-3 bg-[var(--fill-inset)] border border-[var(--border-subtle)] rounded-[var(--v2-radius-sm)] text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/20"
                          >
                            {TIER_LIST.filter(Boolean).map((t) => (
                              <option key={t} value={t}>
                                {formatLabel(t)} and above
                              </option>
                            ))}
                          </select>
                          <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                            Minimum tier that triggers notifications
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
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <label
                            htmlFor="emergencyEmailAll"
                            className="text-body text-[var(--text-primary)]"
                          >
                            Email all team members on Emergency events
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Close Settings */}
                    <div>
                      <h3 className="text-body font-semibold text-white mb-3">
                        Event Lifecycle
                      </h3>
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
                          hint="Automatically close events this many hours after TCA"
                        />
                      </div>
                    </div>

                    {/* NCA Settings */}
                    <div>
                      <h3 className="text-body font-semibold text-white mb-3">
                        NCA (National Competent Authority)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 pt-5">
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
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <label
                            htmlFor="ncaAutoNotify"
                            className="text-body text-[var(--text-primary)]"
                          >
                            Automatically notify NCA for Emergency events
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
                          hint="ISO country code of the responsible NCA"
                        />
                      </div>
                    </div>

                    {/* LeoLabs Integration */}
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-body font-semibold text-white">
                          LeoLabs Integration
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            leolabsEnabled
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
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
                            placeholder="Enter your LeoLabs API key"
                            value={leolabsKey}
                            onChange={(e) => setLeolabsKey(e.target.value)}
                            hint="Your LeoLabs BYOK (Bring Your Own Key) API credential"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleTestLeolabs}
                              loading={leolabsTestResult === "testing"}
                              disabled={!leolabsKey}
                            >
                              Test Connection
                            </Button>
                            {leolabsTestResult === "success" && (
                              <span className="flex items-center gap-1.5 text-small text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                Connection successful
                              </span>
                            )}
                            {leolabsTestResult === "error" && (
                              <span className="flex items-center gap-1.5 text-small text-red-400">
                                <XCircle className="w-4 h-4" />
                                Connection failed
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
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                            />
                            <label
                              htmlFor="leolabsEnabled"
                              className="text-body text-[var(--text-primary)]"
                            >
                              Enable LeoLabs as CDM data source
                            </label>
                          </div>
                          <p className="text-small text-[var(--text-tertiary)]">
                            LeoLabs provides independent conjunction assessments
                            via BYOK integration. CDMs from LeoLabs will be
                            merged with Space-Track data and tagged with a
                            source badge.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-4 pt-4 border-t border-[var(--separator)]">
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
                        <span className="flex items-center gap-1.5 text-small text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Configuration saved successfully
                        </span>
                      )}
                      {saveStatus === "error" && (
                        <span className="flex items-center gap-1.5 text-small text-red-400">
                          <XCircle className="w-4 h-4" />
                          Failed to save configuration
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card variant="elevated" padding="lg">
                  <div className="text-center py-12">
                    <Settings className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-body-lg text-slate-400">
                      Failed to load configuration
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </GlassMotion>
    </div>
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
