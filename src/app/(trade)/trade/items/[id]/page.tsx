"use client";

/**
 * /trade/items/[id] — Item detail + Classification Panel (Sprint A1).
 *
 * Light-Indigo port of the legacy /dashboard/trade/items/[id]/page.tsx
 * (Sprint B7). Same API contract, same behaviour:
 *   - GET /api/trade/items/[id] on mount → item + classification
 *   - PATCH /api/trade/items/[id] on save → re-load + recompute
 *   - Recompute button triggers a fresh GET (engine runs server-side)
 *
 * The Classification result is rendered by the Trade-light variant
 * of ClassificationPanel (./_components/ClassificationPanel) — same
 * data shape, light Indigo theme.
 */

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Edit2,
  Save,
  X,
  Loader2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { ClassificationPanel } from "../_components/ClassificationPanel";
import type { ClassificationResult } from "../_components/ClassificationPanel";
import { ParametricMatcherPanel } from "../_components/ParametricMatcherPanel";
import { DeMinimisPanel } from "./_components/DeMinimisPanel";
import { DeemedExportWarning } from "./_components/DeemedExportWarning";
import { evaluateDeemedExportRisk } from "@/lib/trade/deemed-export";

// ─── Types ────────────────────────────────────────────────────────────

type TradeItemStatus = "DRAFT" | "CLASSIFIED" | "REQUIRES_REVIEW" | "ARCHIVED";
type ClassificationSource =
  | "USER_DECLARED"
  | "ASTRA_SUGGESTED"
  | "ATTORNEY_OPINION"
  | "BAFA_AUSKUNFT_GUETERLISTE"
  | "CJ_DETERMINATION";

interface TradeItemDetail {
  id: string;
  name: string;
  internalSku: string | null;
  manufacturerName: string | null;
  manufacturerPartNo: string | null;
  description: string;
  eccnEU: string | null;
  eccnUS: string | null;
  usmlCategory: string | null;
  mtcrCategory: string | null;
  germanAlEntry: string | null;
  countryOfOrigin: string | null;
  usContentPercent: number | null;
  designedWithUSTech: boolean;
  manufacturedWithUSEquipment: boolean;
  apertureMeters: number | null;
  rangeKm: number | null;
  payloadKg: number | null;
  isRadHardened: boolean | null;
  isMilSpec: boolean | null;
  isAntiJam: boolean | null;
  // Z3a tier-1 — optional because legacy items may not have them yet.
  IspSeconds?: number | null;
  deltaVMetersPerSecond?: number | null;
  gsdMeters?: number | null;
  transmitPowerW?: number | null;
  frequencyGhz?: number | null;
  radHardTidKrad?: number | null;
  seuRateErrorsPerBitDay?: number | null;
  itemClass?: string | null;
  // Z3e extended vocabulary — optional. The matcher's three-valued
  // logic treats missing values as UNKNOWN and emits PossibleMatch
  // entries for them.
  spectralBandCount?: number | null;
  peakWavelengthNm?: number | null;
  radarCenterFreqGhz?: number | null;
  radarBandwidthMhz?: number | null;
  antennaDiameterM?: number | null;
  starTrackerAccuracyArcsec?: number | null;
  starTrackerSlewRateDegPerS?: number | null;
  totalImpulseNs?: number | null;
  neutronFluenceNPerCm2?: number | null;
  selLetThresholdMevCm2Mg?: number | null;
  doseRateUpsetRadSiPerS?: number | null;
  gnssMaxVelocityMPerS?: number | null;
  antennaActiveScanning?: boolean | null;
  antennaAdaptiveBeamforming?: boolean | null;
  // Z3g universal — "specially designed" qualifier.
  isSpeciallyDesigned?: boolean | null;
  parametricAttributes?: Record<string, unknown> | null;
  status: TradeItemStatus;
  classificationSource: ClassificationSource;
  classifiedAt: string | null;
  classificationEvidenceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string };
  notes: {
    id: string;
    body: string;
    createdAt: string;
    user: { id: string; name: string | null };
  }[];
}

const SOURCE_LABELS: Record<ClassificationSource, string> = {
  USER_DECLARED: "User declared",
  ASTRA_SUGGESTED: "Astra suggested",
  ATTORNEY_OPINION: "Attorney opinion",
  BAFA_AUSKUNFT_GUETERLISTE: "BAFA Auskunft",
  CJ_DETERMINATION: "CJ determination",
};

// ─── Field editor ─────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
  editValue,
  editing,
  onEdit,
  placeholder,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  editValue: string;
  editing: boolean;
  onEdit: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-36 shrink-0 pt-1.5 text-[11px] font-medium text-trade-text-secondary">
        {label}
      </span>
      {editing ? (
        <input
          className={`w-full rounded-md border border-trade-border bg-trade-bg-panel px-3 py-1.5 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30 ${mono ? "font-mono" : ""}`}
          value={editValue}
          onChange={(e) => onEdit(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <span
          className={`pt-1 text-[13px] ${
            value ? "text-trade-text-primary" : "text-trade-text-muted"
          } ${mono ? "font-mono" : ""}`}
        >
          {value || "—"}
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function TradeItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [item, setItem] = useState<TradeItemDetail | null>(null);
  const [classification, setClassification] =
    useState<ClassificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  // Edit state mirrors item classification codes + properties
  const [draft, setDraft] = useState({
    name: "",
    internalSku: "",
    manufacturerName: "",
    description: "",
    eccnEU: "",
    eccnUS: "",
    usmlCategory: "",
    mtcrCategory: "",
    germanAlEntry: "",
    countryOfOrigin: "",
    usContentPercent: "",
    apertureMeters: "",
    rangeKm: "",
    payloadKg: "",
  });

  const loadItem = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/trade/items/${id}`);
      if (!res.ok) throw new Error("Item not found");
      const data = await res.json();
      setItem(data.item);
      setClassification(data.classification);
      initDraft(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const initDraft = (it: TradeItemDetail) => {
    setDraft({
      name: it.name,
      internalSku: it.internalSku ?? "",
      manufacturerName: it.manufacturerName ?? "",
      description: it.description,
      eccnEU: it.eccnEU ?? "",
      eccnUS: it.eccnUS ?? "",
      usmlCategory: it.usmlCategory ?? "",
      mtcrCategory: it.mtcrCategory ?? "",
      germanAlEntry: it.germanAlEntry ?? "",
      countryOfOrigin: it.countryOfOrigin ?? "",
      usContentPercent:
        it.usContentPercent !== null ? String(it.usContentPercent) : "",
      apertureMeters:
        it.apertureMeters !== null ? String(it.apertureMeters) : "",
      rangeKm: it.rangeKm !== null ? String(it.rangeKm) : "",
      payloadKg: it.payloadKg !== null ? String(it.payloadKg) : "",
    });
  };

  useEffect(() => {
    loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const toNum = (s: string) => (s ? parseFloat(s) : null);
      const res = await fetch(`/api/trade/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          internalSku: draft.internalSku || null,
          manufacturerName: draft.manufacturerName || null,
          description: draft.description,
          eccnEU: draft.eccnEU || null,
          eccnUS: draft.eccnUS || null,
          usmlCategory: draft.usmlCategory || null,
          mtcrCategory: draft.mtcrCategory || null,
          germanAlEntry: draft.germanAlEntry || null,
          countryOfOrigin: draft.countryOfOrigin || null,
          usContentPercent: toNum(draft.usContentPercent),
          apertureMeters: toNum(draft.apertureMeters),
          rangeKm: toNum(draft.rangeKm),
          payloadKg: toNum(draft.payloadKg),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const { item: updated } = await res.json();
      setItem(updated);
      initDraft(updated);
      setEditing(false);
      await recomputeClassification();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const recomputeClassification = async () => {
    setRecomputing(true);
    try {
      const res = await fetch(`/api/trade/items/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setItem(data.item);
      setClassification(data.classification);
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-trade-text-muted" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-screen-lg px-8 py-8">
        <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <p className="text-[13px] text-red-700">
            {error || "Item not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-xl px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-trade-text-muted">
        <Link
          href="/trade"
          className="transition hover:text-trade-text-primary"
        >
          Trade
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href="/trade/items"
          className="transition hover:text-trade-text-primary"
        >
          Items
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="max-w-48 truncate text-trade-text-secondary">
          {item.name}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Left column: Item detail ── */}
        <div>
          {/* Item header */}
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-trade-border-subtle pb-5">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-trade-text-primary">
                {item.name}
              </h1>
              {item.internalSku && (
                <p className="mt-0.5 font-mono text-[12px] text-trade-text-muted">
                  {item.internalSku}
                </p>
              )}
              <div className="mt-1.5 text-[11px] text-trade-text-muted">
                {SOURCE_LABELS[item.classificationSource]} ·{" "}
                {item.classifiedAt
                  ? `Classified ${new Date(item.classifiedAt).toLocaleDateString()}`
                  : "Not yet classified"}{" "}
                · Status: {item.status}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={() => {
                      setEditing(false);
                      if (item) initDraft(item);
                    }}
                    className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-md bg-trade-accent px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    {saving ? "Saving…" : "Save"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={`/trade/astra?prefill=${encodeURIComponent(
                      `Hilf mir, den Artikel "${item.name}"${
                        item.internalSku ? ` (SKU ${item.internalSku})` : ""
                      } einzustufen — welche ECCN / USML / Dual-Use-Nummer trifft zu und warum?`,
                    )}`}
                    className="flex items-center gap-1.5 rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-[12px] text-trade-text-primary transition hover:bg-trade-hover"
                    title="Astra zur Einstufung dieses Artikels befragen"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-trade-accent" />
                    Astra fragen
                  </Link>
                  <button
                    onClick={recomputeClassification}
                    disabled={recomputing}
                    className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary"
                    title="Recompute classification"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${recomputing ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Classification codes */}
          <section className="mb-6">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
              Classification Codes
            </div>
            <div className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-4">
              <div className="space-y-3">
                <FieldRow
                  label="EU Annex I (ECCN)"
                  value={item.eccnEU}
                  editValue={draft.eccnEU}
                  editing={editing}
                  onEdit={(v) => setDraft((d) => ({ ...d, eccnEU: v }))}
                  placeholder="e.g. 9A515.a"
                  mono
                />
                <FieldRow
                  label="US CCL (ECCN)"
                  value={item.eccnUS}
                  editValue={draft.eccnUS}
                  editing={editing}
                  onEdit={(v) => setDraft((d) => ({ ...d, eccnUS: v }))}
                  placeholder="e.g. 9A515.a"
                  mono
                />
                <FieldRow
                  label="USML Category"
                  value={item.usmlCategory}
                  editValue={draft.usmlCategory}
                  editing={editing}
                  onEdit={(v) => setDraft((d) => ({ ...d, usmlCategory: v }))}
                  placeholder="e.g. XV(a)(7)(i)"
                  mono
                />
                <FieldRow
                  label="MTCR Category"
                  value={item.mtcrCategory}
                  editValue={draft.mtcrCategory}
                  editing={editing}
                  onEdit={(v) => setDraft((d) => ({ ...d, mtcrCategory: v }))}
                  placeholder="e.g. 1.A.1"
                  mono
                />
                <FieldRow
                  label="DE Anlage AL"
                  value={item.germanAlEntry}
                  editValue={draft.germanAlEntry}
                  editing={editing}
                  onEdit={(v) => setDraft((d) => ({ ...d, germanAlEntry: v }))}
                  placeholder="e.g. 0009"
                  mono
                />
              </div>
            </div>
          </section>

          {/* Deemed-Export Guardrail — shown after classification codes where
              the operator can see the controlled codes that drive the risk. */}
          <div className="mb-6">
            <DeemedExportWarning
              risk={evaluateDeemedExportRisk({
                isControlled: Boolean(
                  item.eccnEU ||
                  item.eccnUS ||
                  item.usmlCategory ||
                  item.mtcrCategory,
                ),
              })}
              itemName={item.name}
            />
          </div>

          {/* Physical properties */}
          <section className="mb-6">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
              Physical Properties (Trigger Engine)
            </div>
            <div className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-4">
              <div className="space-y-3">
                <FieldRow
                  label="Aperture (m)"
                  value={
                    item.apertureMeters !== null
                      ? String(item.apertureMeters)
                      : null
                  }
                  editValue={draft.apertureMeters}
                  editing={editing}
                  onEdit={(v) => setDraft((d) => ({ ...d, apertureMeters: v }))}
                  placeholder="0.50"
                />
                <FieldRow
                  label="Range (km)"
                  value={item.rangeKm !== null ? String(item.rangeKm) : null}
                  editValue={draft.rangeKm}
                  editing={editing}
                  onEdit={(v) => setDraft((d) => ({ ...d, rangeKm: v }))}
                  placeholder="300"
                />
                <FieldRow
                  label="Payload (kg)"
                  value={
                    item.payloadKg !== null ? String(item.payloadKg) : null
                  }
                  editValue={draft.payloadKg}
                  editing={editing}
                  onEdit={(v) => setDraft((d) => ({ ...d, payloadKg: v }))}
                  placeholder="500"
                />
              </div>

              {/* Boolean flags */}
              {!editing && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: "Rad-hardened", val: item.isRadHardened },
                    { label: "Mil-spec", val: item.isMilSpec },
                    { label: "Anti-jam", val: item.isAntiJam },
                    {
                      label: "Designed w/ US tech",
                      val: item.designedWithUSTech,
                    },
                    {
                      label: "Mfg w/ US equip",
                      val: item.manufacturedWithUSEquipment,
                    },
                  ].map(({ label, val }) => (
                    <span
                      key={label}
                      className={
                        val
                          ? "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200"
                          : "rounded-full bg-trade-bg-subtle px-2 py-0.5 text-[10px] font-medium text-trade-text-muted ring-1 ring-trade-border-subtle"
                      }
                    >
                      {label}: {val ? "Yes" : "No"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Origin / De-minimis inputs */}
          <section>
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
              Origin & De-minimis
            </div>
            <div className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-4">
              <div className="space-y-3">
                <FieldRow
                  label="Country of Origin"
                  value={item.countryOfOrigin}
                  editValue={draft.countryOfOrigin}
                  editing={editing}
                  onEdit={(v) =>
                    setDraft((d) => ({
                      ...d,
                      countryOfOrigin: v.toUpperCase(),
                    }))
                  }
                  placeholder="DE"
                  mono
                />
                <FieldRow
                  label="US Content %"
                  value={
                    item.usContentPercent !== null
                      ? `${item.usContentPercent}%`
                      : null
                  }
                  editValue={draft.usContentPercent}
                  editing={editing}
                  onEdit={(v) =>
                    setDraft((d) => ({ ...d, usContentPercent: v }))
                  }
                  placeholder="0–100"
                />
              </div>
            </div>
          </section>
        </div>

        {/* ── Right column: Classification Panel ── */}
        <div>
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            License Determination
          </div>

          <div className="rounded-md border border-trade-border-subtle bg-trade-bg-elevated p-5">
            {recomputing ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-trade-text-muted" />
              </div>
            ) : classification ? (
              <ClassificationPanel classification={classification} />
            ) : (
              <div className="py-10 text-center">
                <p className="text-[13px] text-trade-text-secondary">
                  Add US content percentage and property data to compute
                  classification.
                </p>
              </div>
            )}
          </div>

          {/* Sprint Z3n — Parametric cross-walk matcher panel. Pure
              client-side computation against the typed technical
              attributes; surfaces candidates / possible-matches /
              near-misses with regulatory-citation trails. */}
          <div className="mt-6">
            <ParametricMatcherPanel item={item} />
          </div>

          {/* Sprint Z12b — BOM-level De Minimis Panel. Server-driven:
              loads the per-line breakdown + aggregate percentage from
              GET /api/trade/items/[id]/de-minimis, which runs the pure
              `calculateBomDeMinimis()` engine over the item's BOM. */}
          <div className="mt-6">
            <DeMinimisPanel itemId={item.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
