"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttestationSummary {
  attestationId: string;
  regulationRef: string;
  regulationName: string;
  dataPoint: string;
  result: boolean;
  trustLevel: string;
  issuedAt: string;
  expiresAt: string;
}

interface PassportData {
  passportId: string;
  label: string;
  operatorId: string;
  satelliteNorad: string | null;
  satelliteName: string | null;
  complianceScore: number;
  scoreBreakdown: Record<string, number>;
  attestations: AttestationSummary[];
  jurisdictions: string[];
  generatedAt: string;
  expiresAt: string;
  verificationUrl: string;
}

// ─── Score Colour ─────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score < 40) return "#ef4444"; // red-500
  if (score < 70) return "#f59e0b"; // amber-500
  return "#10b981"; // emerald-500
}

function scoreTailwind(score: number): string {
  if (score < 40) return "text-red-400";
  if (score < 70) return "text-amber-400";
  return "text-emerald-400";
}

// ─── Score Ring (SVG) ─────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const progress = ((100 - score) / 100) * circ;
  const color = scoreColor(score);

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="block">
      {/* Track */}
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="10"
      />
      {/* Progress */}
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={progress}
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      {/* Score label */}
      <text
        x="70"
        y="66"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color}
        fontSize="28"
        fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {score}
      </text>
      <text
        x="70"
        y="90"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(148,163,184,0.9)"
        fontSize="11"
        fontFamily="Inter, system-ui, sans-serif"
      >
        / 100
      </text>
    </svg>
  );
}

// ─── Category Bar ─────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  debris: "Debris Mitigation",
  cybersecurity: "Cybersecurity (NIS2)",
  authorization: "Authorization",
  environmental: "Environmental",
  spectrum: "Spectrum / ITU",
  insurance: "Insurance",
};

function CategoryBar({ name, value }: { name: string; value: number }) {
  const label = CATEGORY_LABELS[name] ?? name;
  const color = scoreColor(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-slate-300 text-sm">{label}</span>
        <span className="text-sm font-semibold" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Trust Badge ──────────────────────────────────────────────────────────────

function TrustBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    HIGH: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    MEDIUM: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    LOW: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  const cls = styles[level.toUpperCase()] ?? styles.LOW;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}
    >
      {level}
    </span>
  );
}

// ─── Result Badge ─────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: boolean }) {
  return result ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
      <CheckCircle className="w-3 h-3" />
      PASS
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
      <XCircle className="w-3 h-3" />
      FAIL
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-white/[0.06] ${className ?? ""}`}
    />
  );
}

function LoadingState() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-12 px-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="max-w-3xl mx-auto py-24 px-4 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
        <XCircle className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">
        Passport Unavailable
      </h2>
      <p className="text-slate-400 text-sm mb-8">{message}</p>
      <a
        href="https://www.caelex.eu"
        className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
      >
        <Shield className="w-4 h-4" />
        Get your compliance passport at caelex.eu
      </a>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

interface Props {
  passportId: string;
}

export default function PassportView({ passportId }: Props) {
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/v1/verity/passport/${passportId}`);
        const data = (await res.json()) as {
          passport?: PassportData;
          error?: string;
        };

        if (!res.ok || !data.passport) {
          throw new Error(data.error ?? "Passport not found");
        }

        if (!cancelled) setPassport(data.passport);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load passport",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [passportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E]">
        <LoadingState />
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="min-h-screen bg-[#0A0F1E]">
        <ErrorState message={error ?? "Passport not found"} />
      </div>
    );
  }

  const categories = Object.entries(passport.scoreBreakdown);
  const generatedDate = new Date(passport.generatedAt).toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
  const expiresDate = new Date(passport.expiresAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        {/* ── Section 1: Header ── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono tracking-wide">
                  {passport.passportId}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white truncate">
                {passport.label}
              </h1>
              {passport.satelliteName && (
                <p className="text-slate-400 text-sm mt-0.5">
                  {passport.satelliteName}
                  {passport.satelliteNorad && (
                    <span className="ml-2 text-slate-500">
                      NORAD {passport.satelliteNorad}
                    </span>
                  )}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Issued {generatedDate}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires {expiresDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Score ── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            Compliance Score
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <ScoreRing score={passport.complianceScore} />
            <div className="flex-1">
              <p
                className={`text-5xl font-extrabold tabular-nums ${scoreTailwind(passport.complianceScore)}`}
              >
                {passport.complianceScore}
                <span className="text-xl text-slate-500 font-normal ml-1">
                  /100
                </span>
              </p>
              <p className="text-slate-400 text-sm mt-2">
                {passport.complianceScore >= 70
                  ? "Regulatory compliance demonstrated"
                  : passport.complianceScore >= 40
                    ? "Partial compliance — improvements needed"
                    : "Significant compliance gaps detected"}
              </p>
              {passport.jurisdictions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {passport.jurisdictions.map((j) => (
                    <span
                      key={j}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-white/[0.05] border border-white/10 text-slate-300"
                    >
                      {j}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Section 3: Category Breakdown ── */}
        {categories.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">
              Category Breakdown
            </h2>
            <div className="space-y-4">
              {categories.map(([name, value]) => (
                <CategoryBar key={name} name={name} value={value} />
              ))}
            </div>
          </div>
        )}

        {/* ── Section 4: Attestations ── */}
        {passport.attestations.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">
              Attestations ({passport.attestations.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {passport.attestations.map((att) => (
                <div
                  key={att.attestationId}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white leading-snug flex-1">
                      {att.regulationName}
                    </p>
                    <ResultBadge result={att.result} />
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate">
                    {att.dataPoint}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <TrustBadge level={att.trustLevel} />
                    <span className="text-xs text-slate-600">
                      Expires{" "}
                      {new Date(att.expiresAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 5: Footer ── */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-emerald-400">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-semibold">
              Cryptographically verified by Caelex Verity
            </span>
          </div>
          <p className="text-xs text-slate-500">
            This passport is anchored to immutable cryptographic attestations.
            Each claim has been independently verified against regulatory
            thresholds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
            <a
              href={passport.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Verify this passport
            </a>
            <span className="hidden sm:inline text-slate-700">·</span>
            <a
              href="https://www.caelex.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Get your compliance passport at caelex.eu
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
