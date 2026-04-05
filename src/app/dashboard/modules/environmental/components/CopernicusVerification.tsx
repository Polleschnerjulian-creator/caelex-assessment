"use client";

import { useState, useEffect } from "react";
import {
  Satellite,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Globe,
  Wind,
  CloudRain,
  RefreshCw,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AtmosphericStats {
  variable: string;
  displayName: string;
  unit: string;
  mean: number;
  min: number;
  max: number;
  stDev: number;
  sampleCount: number;
}

interface CopernicusResponse {
  data: {
    measurements: AtmosphericStats[];
    fetchedAt: string;
  } | null;
  source: string;
  launchSite: string;
  launchSiteCoords: { lat: number; lon: number };
  radiusKm: number;
  durationMs: number;
  error: string | null;
  assessment: {
    totalGWP: number | null;
    carbonIntensity: number | null;
    efdGrade: string | null;
  };
}

interface Props {
  assessmentId: string;
  launchVehicle: string;
  isDark: boolean;
}

// ─── Variable Icons ─────────────────────────────────────────────────────────

const VAR_ICONS: Record<string, typeof Wind> = {
  NO2: CloudRain,
  CO: Wind,
  AER_AI: Globe,
};

const VAR_THRESHOLDS: Record<string, { good: number; warning: number }> = {
  NO2: { good: 50, warning: 100 }, // µmol/m²
  CO: { good: 30, warning: 50 }, // mmol/m²
  AER_AI: { good: 1, warning: 2 }, // index
};

function getStatus(
  variable: string,
  value: number,
): "nominal" | "elevated" | "high" {
  const t = VAR_THRESHOLDS[variable];
  if (!t) return "nominal";
  if (value <= t.good) return "nominal";
  if (value <= t.warning) return "elevated";
  return "high";
}

const STATUS_COLORS = {
  nominal: { text: "#00D4AA", bg: "rgba(0,212,170,0.08)" },
  elevated: { text: "#FF8C42", bg: "rgba(255,140,66,0.08)" },
  high: { text: "#FF4757", bg: "rgba(255,71,87,0.08)" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function CopernicusVerification({
  assessmentId,
  launchVehicle,
  isDark,
}: Props) {
  const [data, setData] = useState<CopernicusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setFetchError(null);
      const res = await fetch(
        `/api/environmental/copernicus?assessmentId=${assessmentId}`,
      );
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      setFetchError("Copernicus-Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div
        style={{
          padding: 24,
          borderRadius: 16,
          background: isDark
            ? "rgba(255,255,255,0.03)"
            : "rgba(255,255,255,0.7)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          minHeight: 120,
        }}
      >
        <Loader2
          size={18}
          className="animate-spin"
          style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#94A3B8" }}
        />
        <span
          style={{
            fontSize: 13,
            color: isDark ? "rgba(255,255,255,0.4)" : "#64748B",
          }}
        >
          Fetching Copernicus Sentinel-5P data...
        </span>
      </div>
    );
  }

  if (!data?.data || data.error || fetchError) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          background: isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(255,255,255,0.6)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.04)"
            : "1px solid rgba(0,0,0,0.06)",
          textAlign: "center",
        }}
      >
        <Satellite
          size={24}
          style={{
            color: isDark ? "rgba(255,255,255,0.15)" : "#CBD5E1",
            margin: "0 auto 8px",
          }}
        />
        <p
          style={{
            fontSize: 12,
            color: isDark ? "rgba(255,255,255,0.3)" : "#94A3B8",
          }}
        >
          Copernicus data not available
          {data?.error ? ` — ${data.error}` : ""}
        </p>
        {fetchError && (
          <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>
            {fetchError}
          </p>
        )}
      </div>
    );
  }

  const measurements = data.data.measurements;
  const allNominal = measurements.every(
    (m) => getStatus(m.variable, m.mean) === "nominal",
  );
  const hasWarning = measurements.some(
    (m) => getStatus(m.variable, m.mean) === "elevated",
  );

  const borderColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const cardBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)";
  const innerBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.5)";
  const textPrimary = isDark ? "rgba(255,255,255,0.85)" : "#0F172A";
  const textSecondary = isDark ? "rgba(255,255,255,0.5)" : "#64748B";
  const textMuted = isDark ? "rgba(255,255,255,0.25)" : "#94A3B8";

  return (
    <div
      style={{
        borderRadius: 16,
        background: cardBg,
        border: `1px solid ${borderColor}`,
        overflow: "hidden",
        ...(isDark
          ? {
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
            }
          : {}),
      }}
    >
      {/* ─── Header ────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: isDark
                ? "rgba(0,212,170,0.1)"
                : "rgba(16,185,129,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Satellite
              size={16}
              style={{ color: isDark ? "#00D4AA" : "#10B981" }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: textPrimary,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Copernicus Satellite Verification
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: isDark ? "#7B8CFF" : "#2563EB",
                  background: isDark
                    ? "rgba(123,140,255,0.1)"
                    : "rgba(37,99,235,0.06)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  textTransform: "uppercase",
                }}
              >
                Sentinel-5P
              </span>
            </div>
            <div style={{ fontSize: 11, color: textMuted, marginTop: 1 }}>
              {data.launchSite} — {data.radiusKm}km radius
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Verification badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 8,
              background: allNominal
                ? STATUS_COLORS.nominal.bg
                : hasWarning
                  ? STATUS_COLORS.elevated.bg
                  : STATUS_COLORS.high.bg,
            }}
          >
            {allNominal ? (
              <ShieldCheck
                size={13}
                style={{ color: STATUS_COLORS.nominal.text }}
              />
            ) : (
              <AlertTriangle
                size={13}
                style={{
                  color: hasWarning
                    ? STATUS_COLORS.elevated.text
                    : STATUS_COLORS.high.text,
                }}
              />
            )}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: allNominal
                  ? STATUS_COLORS.nominal.text
                  : hasWarning
                    ? STATUS_COLORS.elevated.text
                    : STATUS_COLORS.high.text,
              }}
            >
              {allNominal
                ? "Verified"
                : hasWarning
                  ? "Elevated"
                  : "Review Required"}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: textMuted,
              padding: 4,
            }}
            title="Refresh data"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ─── Stats Grid ────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${measurements.length}, 1fr)`,
          gap: 1,
          background: borderColor,
        }}
      >
        {measurements.map((m) => {
          const status = getStatus(m.variable, m.mean);
          const colors = STATUS_COLORS[status];
          const Icon = VAR_ICONS[m.variable] ?? Globe;

          return (
            <div
              key={m.variable}
              style={{
                padding: "16px 18px",
                background: isDark ? "rgba(10,10,15,0.5)" : "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 10,
                }}
              >
                <Icon size={13} style={{ color: textMuted }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 1,
                    color: textMuted,
                    textTransform: "uppercase",
                  }}
                >
                  {m.displayName}
                </span>
              </div>

              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: colors.text,
                  fontFamily:
                    "var(--font-jetbrains), 'JetBrains Mono', ui-monospace, monospace",
                  lineHeight: 1,
                }}
              >
                {m.mean < 0.01 ? m.mean.toExponential(1) : m.mean.toFixed(1)}
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: textSecondary,
                  marginTop: 4,
                }}
              >
                {m.unit}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  fontSize: 10,
                  color: textMuted,
                }}
              >
                <span>
                  min {m.min < 0.01 ? m.min.toExponential(1) : m.min.toFixed(1)}
                </span>
                <span>·</span>
                <span>
                  max {m.max < 0.01 ? m.max.toExponential(1) : m.max.toFixed(1)}
                </span>
              </div>

              <div
                style={{
                  marginTop: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: colors.bg,
                  fontSize: 10,
                  fontWeight: 600,
                  color: colors.text,
                }}
              >
                {status === "nominal"
                  ? "Within limits"
                  : status === "elevated"
                    ? "Elevated"
                    : "Exceeds threshold"}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Satellite Map ─────────────────────────────────────────── */}
      <div style={{ padding: 16, borderTop: `1px solid ${borderColor}` }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1,
            color: textMuted,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Sentinel-5P NO₂ Concentration Map
        </div>
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            background: isDark ? "rgba(0,0,0,0.3)" : "#F1F5F9",
            border: `1px solid ${borderColor}`,
            position: "relative",
            aspectRatio: "640 / 480",
          }}
        >
          {!mapError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/environmental/copernicus/map?assessmentId=${assessmentId}&variable=NO2`}
              alt={`Sentinel-5P NO₂ concentration around ${data.launchSite}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={() => setMapError(true)}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: textMuted,
                fontSize: 12,
              }}
            >
              <Globe size={16} style={{ marginRight: 6 }} />
              Map imagery not available for this period
            </div>
          )}

          {/* Coordinate overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              padding: "4px 8px",
              borderRadius: 6,
              background: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              fontSize: 10,
              fontFamily:
                "var(--font-jetbrains), 'JetBrains Mono', ui-monospace, monospace",
              color: isDark ? "rgba(255,255,255,0.6)" : "#475569",
            }}
          >
            {data.launchSiteCoords.lat.toFixed(3)}°N,{" "}
            {Math.abs(data.launchSiteCoords.lon).toFixed(3)}°
            {data.launchSiteCoords.lon >= 0 ? "E" : "W"}
          </div>

          {/* Source badge */}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              padding: "4px 8px",
              borderRadius: 6,
              background: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              fontSize: 9,
              color: isDark ? "rgba(255,255,255,0.4)" : "#94A3B8",
            }}
          >
            Copernicus Sentinel-5P TROPOMI · ESA/EU
          </div>
        </div>
      </div>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "10px 20px",
          borderTop: `1px solid ${borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 10, color: textMuted }}>
          Data: Copernicus Sentinel-5P TROPOMI via CDSE Sentinel Hub ·
          Regulation (EU) 2021/696
        </span>
        <span
          style={{
            fontSize: 10,
            color: textMuted,
            fontFamily:
              "var(--font-jetbrains), 'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          {data.durationMs}ms ·{" "}
          {new Date(data.data.fetchedAt).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
