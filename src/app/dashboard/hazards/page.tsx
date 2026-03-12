"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ShieldCheck,
  ChevronRight,
  Download,
  Zap,
} from "lucide-react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { GlassMotion, GlassStagger } from "@/components/ui/GlassMotion";
import { motion } from "framer-motion";
import { glassItemVariants } from "@/components/ui/GlassMotion";
import { csrfHeaders } from "@/lib/csrf-client";

// ── Types ────────────────────────────────────────────────────────────────────

interface Spacecraft {
  id: string;
  name: string;
  noradId: string | null;
  status: string;
}

interface HazardStatus {
  total: number;
  accepted: number;
  pending: number;
  rejected: number;
  open: number;
  inProgress: number;
  closed: number;
  reportReady: boolean;
  openItems: Array<{
    hazardId: string;
    title: string;
    acceptanceStatus: string;
  }>;
}

interface HazardEntry {
  id: string;
  hazardId: string;
  hazardType: string;
  title: string;
  severity: string;
  likelihood: number;
  riskIndex: number;
  mitigationStatus: string;
  acceptanceStatus: string;
  residualRisk: string | null;
  sourceModule: string;
}

interface SpacecraftHazards {
  spacecraft: Spacecraft;
  status: HazardStatus | null;
  hazards: HazardEntry[];
  loading: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  CATASTROPHIC: "bg-red-500/20 text-red-400 border border-red-500/30",
  CRITICAL: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  MARGINAL: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  NEGLIGIBLE: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-500/20 text-red-400",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400",
  CLOSED: "bg-emerald-500/20 text-emerald-400",
};

const ACCEPTANCE_COLORS: Record<string, string> = {
  PENDING: "bg-blue-500/20 text-blue-400",
  ACCEPTED: "bg-emerald-500/20 text-emerald-400",
  REJECTED: "bg-red-500/20 text-red-400",
};

const NCA_OPTIONS = [
  { value: "CNES", label: "CNES (France)" },
  { value: "RDI", label: "RDI (Luxembourg)" },
  { value: "MINISTRY_LU", label: "Ministry (Luxembourg)" },
  { value: "BELSPO", label: "BELSPO (Belgium)" },
];

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function HazardsPage() {
  const [spacecraftList, setSpacecraftList] = useState<SpacecraftHazards[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedNCA, setSelectedNCA] = useState("CNES");
  const [expandedCraft, setExpandedCraft] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch spacecraft list ──────────────────────────────────────────────────

  const fetchSpacecraft = useCallback(async () => {
    try {
      const res = await fetch("/api/satellites/fleet");
      if (!res.ok) throw new Error("Failed to load spacecraft");
      const data = await res.json();
      const craft: Spacecraft[] = data.spacecraft || [];
      setSpacecraftList(
        craft.map((s) => ({
          spacecraft: s,
          status: null,
          hazards: [],
          loading: true,
        })),
      );
      return craft;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load spacecraft");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch hazard status for a spacecraft ───────────────────────────────────

  const fetchHazardStatus = useCallback(async (spacecraftId: string) => {
    try {
      const [statusRes, hazardsRes] = await Promise.all([
        fetch(`/api/missions/${spacecraftId}/hazards/status`),
        fetch(`/api/missions/${spacecraftId}/hazards`),
      ]);
      const status: HazardStatus = statusRes.ok ? await statusRes.json() : null;
      const hazardsData = hazardsRes.ok ? await hazardsRes.json() : null;
      const hazards: HazardEntry[] = hazardsData?.entries || [];

      setSpacecraftList((prev) =>
        prev.map((item) =>
          item.spacecraft.id === spacecraftId
            ? { ...item, status, hazards, loading: false }
            : item,
        ),
      );
    } catch {
      setSpacecraftList((prev) =>
        prev.map((item) =>
          item.spacecraft.id === spacecraftId
            ? { ...item, loading: false }
            : item,
        ),
      );
    }
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchSpacecraft().then((craft) => {
      craft.forEach((s) => fetchHazardStatus(s.id));
    });
  }, [fetchSpacecraft, fetchHazardStatus]);

  // ── Sync hazards ───────────────────────────────────────────────────────────

  const handleSync = async (spacecraftId: string) => {
    setSyncing(spacecraftId);
    try {
      const res = await fetch(`/api/missions/${spacecraftId}/hazards/sync`, {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync failed");
      }
      await fetchHazardStatus(spacecraftId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  // ── Accept hazard ──────────────────────────────────────────────────────────

  const handleAccept = async (hazardId: string, spacecraftId: string) => {
    setAcceptingId(hazardId);
    try {
      const res = await fetch(`/api/hazards/${hazardId}/accept`, {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Accept failed");
      }
      await fetchHazardStatus(spacecraftId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Accept failed");
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Generate report ────────────────────────────────────────────────────────

  const handleGenerateReport = async (spacecraftId: string) => {
    setGenerating(spacecraftId);
    try {
      const res = await fetch(`/api/reports/hazard-report/${spacecraftId}`, {
        method: "POST",
        headers: {
          ...csrfHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetNCA: selectedNCA, language: "en" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Report generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Hazard-Report-${spacecraftId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report generation failed");
    } finally {
      setGenerating(null);
    }
  };

  // ── Aggregate stats ────────────────────────────────────────────────────────

  const totalHazards = spacecraftList.reduce(
    (sum, s) => sum + (s.status?.total || 0),
    0,
  );
  const totalAccepted = spacecraftList.reduce(
    (sum, s) => sum + (s.status?.accepted || 0),
    0,
  );
  const totalPending = spacecraftList.reduce(
    (sum, s) => sum + (s.status?.pending || 0),
    0,
  );
  const totalOpen = spacecraftList.reduce(
    (sum, s) => sum + (s.status?.open || 0),
    0,
  );
  const readyCount = spacecraftList.filter((s) => s.status?.reportReady).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <GlassMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display-sm font-semibold text-white">
              Hazard Analysis
            </h1>
            <p className="text-body text-slate-400 mt-1">
              CNES/FSOA hazard tracking, acceptance workflow, and report
              generation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedNCA}
              onChange={(e) => setSelectedNCA(e.target.value)}
              className="bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-300 focus:outline-none focus:border-emerald-500/50"
            >
              {NCA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-small text-red-400">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        {/* Summary cards */}
        <GlassStagger className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <motion.div variants={glassItemVariants}>
            <Card className="glass-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-display-sm font-bold text-white">
                      {totalHazards}
                    </p>
                    <p className="text-caption text-slate-400">Total Hazards</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={glassItemVariants}>
            <Card className="glass-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-display-sm font-bold text-white">
                      {totalAccepted}
                    </p>
                    <p className="text-caption text-slate-400">Accepted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={glassItemVariants}>
            <Card className="glass-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Clock size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-display-sm font-bold text-white">
                      {totalPending}
                    </p>
                    <p className="text-caption text-slate-400">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={glassItemVariants}>
            <Card className="glass-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <XCircle size={18} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-display-sm font-bold text-white">
                      {totalOpen}
                    </p>
                    <p className="text-caption text-slate-400">Open</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={glassItemVariants}>
            <Card className="glass-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <FileText size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-display-sm font-bold text-white">
                      {readyCount}/{spacecraftList.length}
                    </p>
                    <p className="text-caption text-slate-400">Report Ready</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </GlassStagger>

        {/* Spacecraft hazard cards */}
        {spacecraftList.length === 0 ? (
          <Card className="glass-elevated">
            <CardContent className="p-12 text-center">
              <AlertTriangle
                size={48}
                className="text-slate-600 mx-auto mb-4"
              />
              <p className="text-body-lg text-slate-400">
                No spacecraft found. Register spacecraft to begin hazard
                analysis.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {spacecraftList.map(
              ({ spacecraft, status, hazards, loading: scLoading }) => {
                const isExpanded = expandedCraft === spacecraft.id;
                return (
                  <motion.div
                    key={spacecraft.id}
                    variants={glassItemVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Card className="glass-elevated overflow-hidden">
                      {/* Spacecraft header row */}
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
                        onClick={() =>
                          setExpandedCraft(isExpanded ? null : spacecraft.id)
                        }
                      >
                        <div className="flex items-center gap-4">
                          <ChevronRight
                            size={16}
                            className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                          <div>
                            <h3 className="text-title font-medium text-white">
                              {spacecraft.name}
                            </h3>
                            <p className="text-caption text-slate-500">
                              {spacecraft.noradId
                                ? `NORAD ${spacecraft.noradId}`
                                : "No NORAD ID"}{" "}
                              · {formatLabel(spacecraft.status)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {scLoading ? (
                            <Loader2
                              size={16}
                              className="animate-spin text-slate-400"
                            />
                          ) : status ? (
                            <>
                              {/* Mini stat badges */}
                              <div className="hidden md:flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-micro bg-slate-500/20 text-slate-400">
                                  {status.total} hazards
                                </span>
                                <span className="px-2 py-0.5 rounded text-micro bg-emerald-500/20 text-emerald-400">
                                  {status.accepted} accepted
                                </span>
                                {status.pending > 0 && (
                                  <span className="px-2 py-0.5 rounded text-micro bg-blue-500/20 text-blue-400">
                                    {status.pending} pending
                                  </span>
                                )}
                                {status.open > 0 && (
                                  <span className="px-2 py-0.5 rounded text-micro bg-red-500/20 text-red-400">
                                    {status.open} open
                                  </span>
                                )}
                              </div>
                              {status.reportReady && (
                                <ShieldCheck
                                  size={16}
                                  className="text-emerald-400"
                                />
                              )}
                            </>
                          ) : (
                            <span className="text-caption text-slate-500">
                              No data
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="border-t border-white/5">
                          {/* Action bar */}
                          <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 bg-white/[0.01]">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSync(spacecraft.id);
                              }}
                              disabled={syncing === spacecraft.id}
                            >
                              {syncing === spacecraft.id ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin mr-2"
                                />
                              ) : (
                                <Zap size={14} className="mr-2" />
                              )}
                              Sync Hazards
                            </Button>
                            {status?.reportReady && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateReport(spacecraft.id);
                                }}
                                disabled={generating === spacecraft.id}
                              >
                                {generating === spacecraft.id ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin mr-2"
                                  />
                                ) : (
                                  <Download size={14} className="mr-2" />
                                )}
                                Generate Report ({selectedNCA})
                              </Button>
                            )}
                            {status &&
                              !status.reportReady &&
                              status.total > 0 && (
                                <span className="text-caption text-amber-400 ml-2">
                                  Resolve all hazards before generating report
                                </span>
                              )}
                          </div>

                          {/* Hazard table */}
                          {hazards.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-white/5">
                                    <th className="px-4 py-2 text-left text-caption text-slate-500 font-medium">
                                      ID
                                    </th>
                                    <th className="px-4 py-2 text-left text-caption text-slate-500 font-medium">
                                      Title
                                    </th>
                                    <th className="px-4 py-2 text-left text-caption text-slate-500 font-medium">
                                      Type
                                    </th>
                                    <th className="px-4 py-2 text-left text-caption text-slate-500 font-medium">
                                      Severity
                                    </th>
                                    <th className="px-4 py-2 text-center text-caption text-slate-500 font-medium">
                                      Risk
                                    </th>
                                    <th className="px-4 py-2 text-left text-caption text-slate-500 font-medium">
                                      Mitigation
                                    </th>
                                    <th className="px-4 py-2 text-left text-caption text-slate-500 font-medium">
                                      Acceptance
                                    </th>
                                    <th className="px-4 py-2 text-left text-caption text-slate-500 font-medium">
                                      Source
                                    </th>
                                    <th className="px-4 py-2 text-right text-caption text-slate-500 font-medium">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {hazards.map((h) => (
                                    <tr
                                      key={h.id}
                                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                                    >
                                      <td className="px-4 py-2.5 text-small text-slate-400 font-mono">
                                        {h.hazardId}
                                      </td>
                                      <td className="px-4 py-2.5 text-small text-slate-200 max-w-[240px] truncate">
                                        {h.title}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span className="text-micro text-slate-400">
                                          {formatLabel(h.hazardType)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span
                                          className={`px-2 py-0.5 rounded text-micro ${SEVERITY_COLORS[h.severity] || ""}`}
                                        >
                                          {h.severity}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-center">
                                        <span className="text-small text-white font-medium">
                                          {h.riskIndex}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span
                                          className={`px-2 py-0.5 rounded text-micro ${STATUS_COLORS[h.mitigationStatus] || ""}`}
                                        >
                                          {formatLabel(h.mitigationStatus)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span
                                          className={`px-2 py-0.5 rounded text-micro ${ACCEPTANCE_COLORS[h.acceptanceStatus] || ""}`}
                                        >
                                          {formatLabel(h.acceptanceStatus)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span className="text-micro text-slate-500">
                                          {formatLabel(h.sourceModule)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        {h.acceptanceStatus === "PENDING" &&
                                          h.mitigationStatus === "CLOSED" && (
                                            <button
                                              onClick={() =>
                                                handleAccept(
                                                  h.id,
                                                  spacecraft.id,
                                                )
                                              }
                                              disabled={acceptingId === h.id}
                                              className="px-2.5 py-1 rounded text-micro bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                                            >
                                              {acceptingId === h.id ? (
                                                <Loader2
                                                  size={12}
                                                  className="animate-spin inline"
                                                />
                                              ) : (
                                                "Accept"
                                              )}
                                            </button>
                                          )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <p className="text-small text-slate-500">
                                No hazards found. Click &quot;Sync Hazards&quot;
                                to import from Shield, Debris, Incidents, and
                                Ephemeris modules.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              },
            )}
          </div>
        )}
      </div>
    </GlassMotion>
  );
}
