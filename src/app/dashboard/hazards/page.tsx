"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Plus,
  Pencil,
  ShieldAlert,
  X,
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

interface FmecaData {
  failureMode: string;
  localEffect: string;
  systemEffect: string;
  detectability: number;
  compensatingMeasures: string;
}

interface HazardEntry {
  id: string;
  hazardId: string;
  hazardType: string;
  title: string;
  description: string;
  severity: string;
  likelihood: number;
  riskIndex: number;
  mitigationStatus: string;
  acceptanceStatus: string;
  residualRisk: string | null;
  sourceModule: string;
  sourceRecordId: string | null;
  fmecaNotes: string | null;
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

// NCA options: native Prisma enum values use their value directly;
// extended NCAs use "OTHER:<name>" — parsed via parseNCAValue() below.
const NCA_OPTIONS = [
  { value: "CNES", label: "CNES (France)" },
  { value: "RDI", label: "RDI (Luxembourg)" },
  { value: "MINISTRY_LU", label: "Ministry of Economy (Luxembourg)" },
  { value: "BELSPO", label: "BELSPO (Belgium)" },
  { value: "OTHER:DLR", label: "DLR (Germany)" },
  { value: "OTHER:NSO", label: "NSO (Netherlands)" },
  { value: "OTHER:SNSA", label: "SNSA (Sweden)" },
  { value: "OTHER:ASI", label: "ASI (Italy)" },
  { value: "OTHER:UKSA", label: "UKSA (UK Space Agency)" },
];

const HAZARD_TYPES = [
  "COLLISION",
  "REENTRY",
  "EXPLOSION",
  "CONTROL_LOSS",
  "TOXICITY",
  "DEBRIS_GENERATION",
  "CYBER",
] as const;

const SEVERITY_OPTIONS = [
  "CATASTROPHIC",
  "CRITICAL",
  "MARGINAL",
  "NEGLIGIBLE",
] as const;

const SEVERITY_SCORES: Record<string, number> = {
  CATASTROPHIC: 4,
  CRITICAL: 3,
  MARGINAL: 2,
  NEGLIGIBLE: 1,
};

/** Parse a composite NCA value into the enum value sent to the API */
function parseNCAValue(selected: string): string {
  if (selected.startsWith("OTHER:")) return "OTHER";
  return selected;
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getSourceLink(
  sourceModule: string,
  _sourceRecordId: string,
): string | null {
  switch (sourceModule) {
    case "SHIELD":
      return `/dashboard/modules/shield`;
    case "DEBRIS":
      return `/dashboard/modules/debris`;
    case "INCIDENTS":
      return `/dashboard/incidents`;
    case "EPHEMERIS":
      return `/dashboard/ephemeris`;
    default:
      return null;
  }
}

function parseFmecaNotes(fmecaNotes: string | null): FmecaData | null {
  if (!fmecaNotes) return null;
  const trimmed = fmecaNotes.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (
      parsed.failureMode !== undefined &&
      parsed.localEffect !== undefined &&
      parsed.systemEffect !== undefined
    ) {
      return parsed as FmecaData;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Risk Matrix Component (E-5) ─────────────────────────────────────────────

function RiskMatrix({ hazards }: { hazards: HazardEntry[] }) {
  const matrix: number[][] = Array.from({ length: 4 }, () => Array(5).fill(0));
  for (const h of hazards) {
    const sevScore = SEVERITY_SCORES[h.severity];
    if (
      sevScore >= 1 &&
      sevScore <= 4 &&
      h.likelihood >= 1 &&
      h.likelihood <= 5
    ) {
      matrix[sevScore - 1][h.likelihood - 1]++;
    }
  }
  function cellColor(severity: number, likelihood: number): string {
    const idx = severity * likelihood;
    if (idx > 12) return "bg-red-500/40 text-red-200";
    if (idx >= 9) return "bg-orange-500/30 text-orange-200";
    if (idx >= 5) return "bg-yellow-500/25 text-yellow-200";
    return "bg-emerald-500/20 text-emerald-300";
  }
  const severityLabels = ["Negligible", "Marginal", "Critical", "Catastrophic"];
  return (
    <div className="mb-4">
      <p className="text-caption text-slate-400 mb-2 font-medium">
        Risk Matrix (Severity x Likelihood)
      </p>
      <div
        className="inline-grid gap-px"
        style={{ gridTemplateColumns: "auto repeat(5, 40px)" }}
      >
        <div className="text-micro text-slate-500 p-1" />
        {[1, 2, 3, 4, 5].map((l) => (
          <div
            key={`lh-${l}`}
            className="text-micro text-slate-500 text-center p-1"
          >
            L{l}
          </div>
        ))}
        {[3, 2, 1, 0].map((sIdx) => (
          <div key={`row-${sIdx}`} className="contents">
            <div className="text-micro text-slate-500 p-1 pr-2 text-right whitespace-nowrap">
              {severityLabels[sIdx]}
            </div>
            {[0, 1, 2, 3, 4].map((lIdx) => (
              <div
                key={`c-${sIdx}-${lIdx}`}
                className={`w-10 h-8 flex items-center justify-center rounded text-micro font-medium ${cellColor(sIdx + 1, lIdx + 1)}`}
              >
                {matrix[sIdx][lIdx] > 0 ? matrix[sIdx][lIdx] : ""}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modal Overlay ───────────────────────────────────────────────────────────

function ModalOverlay({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative glass-floating rounded-xl border border-white/10 p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-title font-medium text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Slide-out Panel ─────────────────────────────────────────────────────────

function SlidePanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative glass-floating border-l border-white/10 w-full max-w-md h-full overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-title font-medium text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function HazardsPage() {
  const [spacecraftList, setSpacecraftList] = useState<SpacecraftHazards[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  // E-4: per-spacecraft NCA selections
  const [ncaSelections, setNcaSelections] = useState<Record<string, string>>(
    {},
  );
  const [expandedCraft, setExpandedCraft] = useState<string | null>(null);
  const [expandedHazard, setExpandedHazard] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [generatingDraft, setGeneratingDraft] = useState<string | null>(null);
  const [editingFmeca, setEditingFmeca] = useState<string | null>(null);
  const [fmecaForm, setFmecaForm] = useState<FmecaData>({
    failureMode: "",
    localEffect: "",
    systemEffect: "",
    detectability: 3,
    compensatingMeasures: "",
  });
  const [savingFmeca, setSavingFmeca] = useState(false);
  // E-2: per-spacecraft errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // E-1: Create Hazard Modal State
  const [createModal, setCreateModal] = useState<{
    open: boolean;
    spacecraftId: string;
  }>({ open: false, spacecraftId: "" });
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    hazardType: "COLLISION" as string,
    severity: "MARGINAL" as string,
    likelihood: 3,
    hazardId: "",
  });
  const [creating, setCreating] = useState(false);

  // E-1: Edit Hazard Slide-out State
  const [editPanel, setEditPanel] = useState<{
    open: boolean;
    hazard: HazardEntry | null;
    spacecraftId: string;
  }>({ open: false, hazard: null, spacecraftId: "" });
  const [editForm, setEditForm] = useState({
    description: "",
    severity: "MARGINAL" as string,
    likelihood: 3,
  });
  const [saving, setSaving] = useState(false);

  // E-1: Add Mitigation Modal State
  const [mitigationModal, setMitigationModal] = useState<{
    open: boolean;
    hazardId: string;
    spacecraftId: string;
  }>({ open: false, hazardId: "", spacecraftId: "" });
  const [mitigationForm, setMitigationForm] = useState({
    type: "TECHNICAL" as string,
    description: "",
    implementedAt: "",
  });
  const [addingMitigation, setAddingMitigation] = useState(false);

  // E-1: Reject Modal State
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    hazardId: string;
    spacecraftId: string;
    hazardTitle: string;
  }>({ open: false, hazardId: "", spacecraftId: "", hazardTitle: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getNCA = (spacecraftId: string) =>
    ncaSelections[spacecraftId] || "CNES";
  const setSpacecraftError = (spacecraftId: string, msg: string) => {
    setErrors((prev) => ({ ...prev, [spacecraftId]: msg }));
  };
  const clearSpacecraftError = (spacecraftId: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[spacecraftId];
      return next;
    });
  };

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
      setErrors((prev) => ({
        ...prev,
        _global: e instanceof Error ? e.message : "Failed to load spacecraft",
      }));
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
    clearSpacecraftError(spacecraftId);
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
      setSpacecraftError(
        spacecraftId,
        e instanceof Error ? e.message : "Sync failed",
      );
    } finally {
      setSyncing(null);
    }
  };

  // ── Accept hazard ──────────────────────────────────────────────────────────

  const handleAccept = async (hazardId: string, spacecraftId: string) => {
    setAcceptingId(hazardId);
    clearSpacecraftError(spacecraftId);
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
      setSpacecraftError(
        spacecraftId,
        e instanceof Error ? e.message : "Accept failed",
      );
    } finally {
      setAcceptingId(null);
    }
  };

  // ── E-1: Reject hazard ────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    const scId = rejectModal.spacecraftId;
    clearSpacecraftError(scId);
    try {
      const res = await fetch(`/api/hazards/${rejectModal.hazardId}/reject`, {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Reject failed");
      }
      setRejectModal({
        open: false,
        hazardId: "",
        spacecraftId: "",
        hazardTitle: "",
      });
      setRejectReason("");
      await fetchHazardStatus(scId);
    } catch (e) {
      setSpacecraftError(
        scId,
        e instanceof Error ? e.message : "Reject failed",
      );
    } finally {
      setRejecting(false);
    }
  };

  // ── E-1: Create hazard ────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true);
    const scId = createModal.spacecraftId;
    clearSpacecraftError(scId);
    try {
      const res = await fetch("/api/hazards", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          spacecraftId: scId,
          hazardId: createForm.hazardId,
          hazardType: createForm.hazardType,
          sourceModule: "MANUAL",
          title: createForm.title,
          description: createForm.description,
          severity: createForm.severity,
          likelihood: createForm.likelihood,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Create failed");
      }
      setCreateModal({ open: false, spacecraftId: "" });
      setCreateForm({
        title: "",
        description: "",
        hazardType: "COLLISION",
        severity: "MARGINAL",
        likelihood: 3,
        hazardId: "",
      });
      await fetchHazardStatus(scId);
    } catch (e) {
      setSpacecraftError(
        scId,
        e instanceof Error ? e.message : "Create failed",
      );
    } finally {
      setCreating(false);
    }
  };

  // ── E-1: Edit hazard ──────────────────────────────────────────────────────
  const handleEdit = async () => {
    if (!editPanel.hazard) return;
    setSaving(true);
    const scId = editPanel.spacecraftId;
    clearSpacecraftError(scId);
    try {
      const res = await fetch(`/api/hazards/${editPanel.hazard.id}`, {
        method: "PUT",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editForm.description,
          severity: editForm.severity,
          likelihood: editForm.likelihood,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }
      setEditPanel({ open: false, hazard: null, spacecraftId: "" });
      await fetchHazardStatus(scId);
    } catch (e) {
      setSpacecraftError(
        scId,
        e instanceof Error ? e.message : "Update failed",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── E-1: Add mitigation ───────────────────────────────────────────────────
  const handleAddMitigation = async () => {
    setAddingMitigation(true);
    const scId = mitigationModal.spacecraftId;
    clearSpacecraftError(scId);
    try {
      const body: Record<string, unknown> = {
        type: mitigationForm.type,
        description: mitigationForm.description,
      };
      if (mitigationForm.implementedAt) {
        body.implementedAt = new Date(
          mitigationForm.implementedAt,
        ).toISOString();
      }
      const res = await fetch(
        `/api/hazards/${mitigationModal.hazardId}/mitigations`,
        {
          method: "POST",
          headers: { ...csrfHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Add mitigation failed");
      }
      setMitigationModal({ open: false, hazardId: "", spacecraftId: "" });
      setMitigationForm({
        type: "TECHNICAL",
        description: "",
        implementedAt: "",
      });
      await fetchHazardStatus(scId);
    } catch (e) {
      setSpacecraftError(
        scId,
        e instanceof Error ? e.message : "Add mitigation failed",
      );
    } finally {
      setAddingMitigation(false);
    }
  };

  // ── Generate report ────────────────────────────────────────────────────────

  const handleGenerateReport = async (spacecraftId: string) => {
    setGenerating(spacecraftId);
    clearSpacecraftError(spacecraftId);
    try {
      const res = await fetch(`/api/reports/hazard-report/${spacecraftId}`, {
        method: "POST",
        headers: {
          ...csrfHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetNCA: parseNCAValue(getNCA(spacecraftId)),
          language: "en",
        }),
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
      setSpacecraftError(
        spacecraftId,
        e instanceof Error ? e.message : "Report generation failed",
      );
    } finally {
      setGenerating(null);
    }
  };

  // ── Generate draft report ──────────────────────────────────────────────────

  const handleGenerateDraft = async (spacecraftId: string) => {
    setGeneratingDraft(spacecraftId);
    clearSpacecraftError(spacecraftId);
    try {
      const res = await fetch(`/api/reports/hazard-report/${spacecraftId}`, {
        method: "POST",
        headers: {
          ...csrfHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetNCA: parseNCAValue(getNCA(spacecraftId)),
          language: "en",
          draft: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Draft generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DRAFT-Hazard-Report-${spacecraftId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setSpacecraftError(
        spacecraftId,
        e instanceof Error ? e.message : "Draft generation failed",
      );
    } finally {
      setGeneratingDraft(null);
    }
  };

  // ── Save FMECA data ──────────────────────────────────────────────────────

  const handleSaveFmeca = async (hazardDbId: string, spacecraftId: string) => {
    setSavingFmeca(true);
    try {
      const res = await fetch(`/api/hazards/${hazardDbId}`, {
        method: "PUT",
        headers: {
          ...csrfHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fmeca: fmecaForm }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save FMECA");
      }
      setEditingFmeca(null);
      await fetchHazardStatus(spacecraftId);
    } catch (e) {
      setSpacecraftError(
        spacecraftId,
        e instanceof Error ? e.message : "Failed to save FMECA",
      );
    } finally {
      setSavingFmeca(false);
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
        </div>

        {/* Global error banner */}
        {errors._global && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-small text-red-400">{errors._global}</span>
            <button
              onClick={() => clearSpacecraftError("_global")}
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
                          {/* E-2: Per-spacecraft error */}
                          {errors[spacecraft.id] && (
                            <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center justify-between">
                              <span className="text-small text-red-400">
                                {errors[spacecraft.id]}
                              </span>
                              <button
                                onClick={() =>
                                  clearSpacecraftError(spacecraft.id)
                                }
                                className="text-red-400 hover:text-red-300 ml-2"
                              >
                                <XCircle size={14} />
                              </button>
                            </div>
                          )}

                          {/* Action bar */}
                          <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5 bg-white/[0.01] flex-wrap">
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
                            {/* E-1: New Hazard button */}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCreateModal({
                                  open: true,
                                  spacecraftId: spacecraft.id,
                                });
                              }}
                            >
                              <Plus size={14} className="mr-2" />
                              New Hazard
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
                                Generate Report (
                                {(() => {
                                  const nca = getNCA(spacecraft.id);
                                  return nca.includes(":")
                                    ? nca.split(":")[1]
                                    : nca;
                                })()}
                                )
                              </Button>
                            )}
                            {status && status.total > 0 && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGenerateDraft(spacecraft.id);
                                }}
                                disabled={generatingDraft === spacecraft.id}
                              >
                                {generatingDraft === spacecraft.id ? (
                                  <Loader2
                                    size={14}
                                    className="animate-spin mr-2"
                                  />
                                ) : (
                                  <FileText size={14} className="mr-2" />
                                )}
                                Generate Draft
                              </Button>
                            )}
                            {status &&
                              !status.reportReady &&
                              status.total > 0 && (
                                <span className="text-caption text-amber-400 ml-2">
                                  Resolve all hazards before generating final
                                  report
                                </span>
                              )}
                            {/* E-4: Per-spacecraft NCA selector */}
                            <div className="ml-auto">
                              <select
                                value={getNCA(spacecraft.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setNcaSelections((prev) => ({
                                    ...prev,
                                    [spacecraft.id]: e.target.value,
                                  }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-navy-800 border border-white/10 rounded-lg px-2 py-1 text-micro text-slate-300 focus:outline-none focus:border-emerald-500/50"
                              >
                                {NCA_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* E-5: Risk Matrix */}
                          {hazards.length > 0 && (
                            <div className="px-4 pt-3">
                              <RiskMatrix hazards={hazards} />
                            </div>
                          )}

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
                                  {hazards.map((h) => {
                                    const isHazardExpanded =
                                      expandedHazard === h.id;
                                    const fmecaData = parseFmecaNotes(
                                      h.fmecaNotes,
                                    );
                                    const sourceLink =
                                      h.sourceModule !== "MANUAL" &&
                                      h.sourceRecordId
                                        ? getSourceLink(
                                            h.sourceModule,
                                            h.sourceRecordId,
                                          )
                                        : null;

                                    return (
                                      <React.Fragment key={h.id}>
                                        <tr
                                          className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                                          onClick={() =>
                                            setExpandedHazard(
                                              isHazardExpanded ? null : h.id,
                                            )
                                          }
                                        >
                                          <td className="px-4 py-2.5 text-small text-slate-400 font-mono">
                                            <div className="flex items-center gap-1">
                                              <ChevronRight
                                                size={12}
                                                className={`text-slate-500 transition-transform ${isHazardExpanded ? "rotate-90" : ""}`}
                                              />
                                              {h.hazardId}
                                            </div>
                                          </td>
                                          {/* E-6: tooltip on truncated title */}
                                          <td
                                            className="px-4 py-2.5 text-small text-slate-200 max-w-[240px] truncate"
                                            title={h.title}
                                          >
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
                                            {sourceLink ? (
                                              <a
                                                href={sourceLink}
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="text-small text-[var(--text-tertiary,#64748b)] hover:text-[var(--text-secondary,#94a3b8)] underline"
                                              >
                                                Quelle: {h.sourceModule}
                                              </a>
                                            ) : (
                                              <span className="text-micro text-slate-500">
                                                {formatLabel(h.sourceModule)}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              {/* E-1: Edit button */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditForm({
                                                    description:
                                                      h.description || "",
                                                    severity: h.severity,
                                                    likelihood: h.likelihood,
                                                  });
                                                  setEditPanel({
                                                    open: true,
                                                    hazard: h,
                                                    spacecraftId: spacecraft.id,
                                                  });
                                                }}
                                                className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                                                title="Edit hazard"
                                              >
                                                <Pencil size={13} />
                                              </button>
                                              {/* E-1: Add Mitigation button */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setMitigationModal({
                                                    open: true,
                                                    hazardId: h.id,
                                                    spacecraftId: spacecraft.id,
                                                  });
                                                  setMitigationForm({
                                                    type: "TECHNICAL",
                                                    description: "",
                                                    implementedAt: "",
                                                  });
                                                }}
                                                className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                                                title="Add mitigation"
                                              >
                                                <ShieldAlert size={13} />
                                              </button>
                                              {/* Accept button */}
                                              {h.acceptanceStatus ===
                                                "PENDING" && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAccept(
                                                      h.id,
                                                      spacecraft.id,
                                                    );
                                                  }}
                                                  disabled={
                                                    acceptingId === h.id
                                                  }
                                                  className="px-2 py-0.5 rounded text-micro bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
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
                                              {/* E-1: Reject button */}
                                              {h.acceptanceStatus !==
                                                "REJECTED" && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRejectModal({
                                                      open: true,
                                                      hazardId: h.id,
                                                      spacecraftId:
                                                        spacecraft.id,
                                                      hazardTitle: h.title,
                                                    });
                                                    setRejectReason("");
                                                  }}
                                                  className="px-2 py-0.5 rounded text-micro bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                                                >
                                                  Reject
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>

                                        {/* Expanded hazard row: FMECA section */}
                                        {isHazardExpanded && (
                                          <tr>
                                            <td
                                              colSpan={9}
                                              className="bg-white/[0.01] border-b border-white/5"
                                            >
                                              <div className="px-6 py-4 space-y-3">
                                                {/* FMECA Section */}
                                                <div>
                                                  <h4 className="text-small font-medium text-slate-300 mb-2">
                                                    FMECA (Failure Mode, Effects
                                                    & Criticality Analysis)
                                                  </h4>

                                                  {fmecaData &&
                                                  editingFmeca !== h.id ? (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                      <div>
                                                        <p className="text-micro text-slate-500">
                                                          Failure Mode
                                                        </p>
                                                        <p className="text-small text-slate-300">
                                                          {
                                                            fmecaData.failureMode
                                                          }
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <p className="text-micro text-slate-500">
                                                          Local Effect
                                                        </p>
                                                        <p className="text-small text-slate-300">
                                                          {
                                                            fmecaData.localEffect
                                                          }
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <p className="text-micro text-slate-500">
                                                          System Effect
                                                        </p>
                                                        <p className="text-small text-slate-300">
                                                          {
                                                            fmecaData.systemEffect
                                                          }
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <p className="text-micro text-slate-500">
                                                          Detectability
                                                        </p>
                                                        <p className="text-small text-slate-300">
                                                          {
                                                            fmecaData.detectability
                                                          }
                                                          /5
                                                        </p>
                                                      </div>
                                                      <div className="col-span-2">
                                                        <p className="text-micro text-slate-500">
                                                          Compensating Measures
                                                        </p>
                                                        <p className="text-small text-slate-300">
                                                          {
                                                            fmecaData.compensatingMeasures
                                                          }
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingFmeca(
                                                              h.id,
                                                            );
                                                            setFmecaForm(
                                                              fmecaData,
                                                            );
                                                          }}
                                                          className="text-micro text-blue-400 hover:text-blue-300 underline"
                                                        >
                                                          Edit FMECA
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ) : editingFmeca === h.id ? (
                                                    <div className="space-y-2">
                                                      <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                          <label className="text-micro text-slate-500 block mb-1">
                                                            Failure Mode
                                                          </label>
                                                          <input
                                                            type="text"
                                                            value={
                                                              fmecaForm.failureMode
                                                            }
                                                            onChange={(e) =>
                                                              setFmecaForm({
                                                                ...fmecaForm,
                                                                failureMode:
                                                                  e.target
                                                                    .value,
                                                              })
                                                            }
                                                            className="w-full bg-navy-800 border border-white/10 rounded px-2 py-1 text-small text-slate-300 focus:outline-none focus:border-emerald-500/50"
                                                            onClick={(e) =>
                                                              e.stopPropagation()
                                                            }
                                                          />
                                                        </div>
                                                        <div>
                                                          <label className="text-micro text-slate-500 block mb-1">
                                                            Local Effect
                                                          </label>
                                                          <input
                                                            type="text"
                                                            value={
                                                              fmecaForm.localEffect
                                                            }
                                                            onChange={(e) =>
                                                              setFmecaForm({
                                                                ...fmecaForm,
                                                                localEffect:
                                                                  e.target
                                                                    .value,
                                                              })
                                                            }
                                                            className="w-full bg-navy-800 border border-white/10 rounded px-2 py-1 text-small text-slate-300 focus:outline-none focus:border-emerald-500/50"
                                                            onClick={(e) =>
                                                              e.stopPropagation()
                                                            }
                                                          />
                                                        </div>
                                                        <div>
                                                          <label className="text-micro text-slate-500 block mb-1">
                                                            System Effect
                                                          </label>
                                                          <input
                                                            type="text"
                                                            value={
                                                              fmecaForm.systemEffect
                                                            }
                                                            onChange={(e) =>
                                                              setFmecaForm({
                                                                ...fmecaForm,
                                                                systemEffect:
                                                                  e.target
                                                                    .value,
                                                              })
                                                            }
                                                            className="w-full bg-navy-800 border border-white/10 rounded px-2 py-1 text-small text-slate-300 focus:outline-none focus:border-emerald-500/50"
                                                            onClick={(e) =>
                                                              e.stopPropagation()
                                                            }
                                                          />
                                                        </div>
                                                        <div>
                                                          <label className="text-micro text-slate-500 block mb-1">
                                                            Detectability (1-5)
                                                          </label>
                                                          <select
                                                            value={
                                                              fmecaForm.detectability
                                                            }
                                                            onChange={(e) =>
                                                              setFmecaForm({
                                                                ...fmecaForm,
                                                                detectability:
                                                                  Number(
                                                                    e.target
                                                                      .value,
                                                                  ),
                                                              })
                                                            }
                                                            className="w-full bg-navy-800 border border-white/10 rounded px-2 py-1 text-small text-slate-300 focus:outline-none focus:border-emerald-500/50"
                                                            onClick={(e) =>
                                                              e.stopPropagation()
                                                            }
                                                          >
                                                            {[
                                                              1, 2, 3, 4, 5,
                                                            ].map((v) => (
                                                              <option
                                                                key={v}
                                                                value={v}
                                                              >
                                                                {v}
                                                              </option>
                                                            ))}
                                                          </select>
                                                        </div>
                                                      </div>
                                                      <div>
                                                        <label className="text-micro text-slate-500 block mb-1">
                                                          Compensating Measures
                                                        </label>
                                                        <textarea
                                                          value={
                                                            fmecaForm.compensatingMeasures
                                                          }
                                                          onChange={(e) =>
                                                            setFmecaForm({
                                                              ...fmecaForm,
                                                              compensatingMeasures:
                                                                e.target.value,
                                                            })
                                                          }
                                                          rows={2}
                                                          className="w-full bg-navy-800 border border-white/10 rounded px-2 py-1 text-small text-slate-300 focus:outline-none focus:border-emerald-500/50"
                                                          onClick={(e) =>
                                                            e.stopPropagation()
                                                          }
                                                        />
                                                      </div>
                                                      <div className="flex gap-2">
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSaveFmeca(
                                                              h.id,
                                                              spacecraft.id,
                                                            );
                                                          }}
                                                          disabled={savingFmeca}
                                                          className="px-3 py-1 rounded text-micro bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                                                        >
                                                          {savingFmeca
                                                            ? "Saving..."
                                                            : "Save FMECA"}
                                                        </button>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingFmeca(
                                                              null,
                                                            );
                                                          }}
                                                          className="px-3 py-1 rounded text-micro bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition-colors"
                                                        >
                                                          Cancel
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ) : (
                                                    <div>
                                                      {h.fmecaNotes ? (
                                                        <div>
                                                          <p className="text-micro text-slate-500 mb-1">
                                                            Legacy Notes
                                                          </p>
                                                          <p className="text-small text-slate-400">
                                                            {h.fmecaNotes}
                                                          </p>
                                                        </div>
                                                      ) : (
                                                        <p className="text-small text-slate-500">
                                                          No FMECA data
                                                          recorded.
                                                        </p>
                                                      )}
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setEditingFmeca(h.id);
                                                          setFmecaForm({
                                                            failureMode: "",
                                                            localEffect: "",
                                                            systemEffect: "",
                                                            detectability: 3,
                                                            compensatingMeasures:
                                                              "",
                                                          });
                                                        }}
                                                        className="mt-2 text-micro text-blue-400 hover:text-blue-300 underline"
                                                      >
                                                        Add FMECA
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
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
        {/* ── Create Hazard Modal (E-1) ── */}
        <ModalOverlay
          open={createModal.open}
          onClose={() => setCreateModal({ open: false, spacecraftId: "" })}
          title="New Hazard"
        >
          <div className="space-y-3">
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Hazard ID
              </label>
              <input
                type="text"
                value={createForm.hazardId}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, hazardId: e.target.value }))
                }
                placeholder="e.g. G08"
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Title
              </label>
              <input
                type="text"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Description
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-caption text-slate-400 block mb-1">
                  Hazard Type
                </label>
                <select
                  value={createForm.hazardType}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, hazardType: e.target.value }))
                  }
                  className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
                >
                  {HAZARD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {formatLabel(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-caption text-slate-400 block mb-1">
                  Severity
                </label>
                <select
                  value={createForm.severity}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, severity: e.target.value }))
                  }
                  className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
                >
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {formatLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Likelihood (1-5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={createForm.likelihood}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    likelihood: Math.min(
                      5,
                      Math.max(1, parseInt(e.target.value) || 1),
                    ),
                  }))
                }
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setCreateModal({ open: false, spacecraftId: "" })
                }
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={
                  creating ||
                  !createForm.title.trim() ||
                  !createForm.description.trim() ||
                  !createForm.hazardId.trim()
                }
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : (
                  <Plus size={14} className="mr-2" />
                )}
                Create Hazard
              </Button>
            </div>
          </div>
        </ModalOverlay>

        {/* ── Edit Hazard Slide-out (E-1) ── */}
        <SlidePanel
          open={editPanel.open}
          onClose={() =>
            setEditPanel({ open: false, hazard: null, spacecraftId: "" })
          }
          title={`Edit ${editPanel.hazard?.hazardId || "Hazard"}`}
        >
          <div className="space-y-3">
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Description
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={4}
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Severity
              </label>
              <select
                value={editForm.severity}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, severity: e.target.value }))
                }
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {formatLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Likelihood (1-5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={editForm.likelihood}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    likelihood: Math.min(
                      5,
                      Math.max(1, parseInt(e.target.value) || 1),
                    ),
                  }))
                }
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setEditPanel({ open: false, hazard: null, spacecraftId: "" })
                }
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleEdit} disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : (
                  <Pencil size={14} className="mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </SlidePanel>

        {/* ── Add Mitigation Modal (E-1) ── */}
        <ModalOverlay
          open={mitigationModal.open}
          onClose={() =>
            setMitigationModal({ open: false, hazardId: "", spacecraftId: "" })
          }
          title="Add Mitigation"
        >
          <div className="space-y-3">
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Type
              </label>
              <select
                value={mitigationForm.type}
                onChange={(e) =>
                  setMitigationForm((f) => ({ ...f, type: e.target.value }))
                }
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="TECHNICAL">Technical</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="PROCEDURAL">Procedural</option>
              </select>
            </div>
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Description
              </label>
              <textarea
                value={mitigationForm.description}
                onChange={(e) =>
                  setMitigationForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Implementation Date (optional)
              </label>
              <input
                type="date"
                value={mitigationForm.implementedAt}
                onChange={(e) =>
                  setMitigationForm((f) => ({
                    ...f,
                    implementedAt: e.target.value,
                  }))
                }
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setMitigationModal({
                    open: false,
                    hazardId: "",
                    spacecraftId: "",
                  })
                }
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddMitigation}
                disabled={
                  addingMitigation || !mitigationForm.description.trim()
                }
              >
                {addingMitigation ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : (
                  <ShieldAlert size={14} className="mr-2" />
                )}
                Add Mitigation
              </Button>
            </div>
          </div>
        </ModalOverlay>

        {/* ── Reject Hazard Modal (E-1) ── */}
        <ModalOverlay
          open={rejectModal.open}
          onClose={() =>
            setRejectModal({
              open: false,
              hazardId: "",
              spacecraftId: "",
              hazardTitle: "",
            })
          }
          title="Reject Hazard"
        >
          <div className="space-y-3">
            <p className="text-small text-slate-400">
              Rejecting:{" "}
              <span className="text-slate-200">{rejectModal.hazardTitle}</span>
            </p>
            <div>
              <label className="text-caption text-slate-400 block mb-1">
                Rejection Reason (required)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Explain why this hazard is being rejected..."
                className="w-full bg-navy-800 border border-white/10 rounded-lg px-3 py-2 text-small text-slate-200 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setRejectModal({
                    open: false,
                    hazardId: "",
                    spacecraftId: "",
                    hazardTitle: "",
                  })
                }
              >
                Cancel
              </Button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
                className="flex items-center px-3 py-1.5 rounded-lg text-small bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors disabled:opacity-50"
              >
                {rejecting ? (
                  <Loader2 size={14} className="animate-spin mr-2" />
                ) : (
                  <XCircle size={14} className="mr-2" />
                )}
                Reject Hazard
              </button>
            </div>
          </div>
        </ModalOverlay>
      </div>
    </GlassMotion>
  );
}
