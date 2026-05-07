"use client";

/**
 * /dashboard/trade/items/[id] — Trade Item detail + Classification Panel
 *
 * Sprint B7: Shows item properties, inline editing for classification codes,
 * and the ClassificationPanel (trigger results + license determination).
 *
 * The classification is computed server-side in GET /api/trade/items/[id]
 * and surfaced here without any browser-side engine invocations.
 */

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Loader2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import { ClassificationPanel } from "@/components/trade/ClassificationPanel";
import type { ClassificationResult } from "@/components/trade/ClassificationPanel";

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

// ─── Helpers ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  border: "0.5px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 10,
  color: "rgba(255, 255, 255, 0.9)",
  fontSize: 13,
  padding: "7px 11px",
  outline: "none",
  width: "100%",
};

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
      <span
        className="w-36 shrink-0 text-[11px] font-medium"
        style={{ color: "rgba(255,255,255,0.4)", paddingTop: 6 }}
      >
        {label}
      </span>
      {editing ? (
        <input
          style={{ ...inputStyle, fontFamily: mono ? "monospace" : undefined }}
          value={editValue}
          onChange={(e) => onEdit(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <span
          className="text-[13px]"
          style={{
            color: value ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)",
            fontFamily: mono ? "monospace" : undefined,
            paddingTop: 4,
          }}
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
      // Reload to get fresh classification
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

  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin"
          style={{ color: "rgba(255,255,255,0.3)" }}
        />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="mx-auto max-w-screen-lg px-8 py-8">
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "0.5px solid rgba(239,68,68,0.20)",
          }}
        >
          <AlertTriangle
            className="h-4 w-4"
            style={{ color: "rgb(252,165,165)" }}
          />
          <p className="text-[13px]" style={{ color: "rgb(252,165,165)" }}>
            {error || "Item not found"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-screen-xl px-8 py-8"
      style={{ fontFamily: sansFont, letterSpacing: "-0.005em" }}
    >
      {/* Breadcrumb */}
      <div
        className="mb-6 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em]"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        <Link
          href="/dashboard/trade"
          className="transition-colors hover:text-white"
        >
          Trade
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href="/dashboard/trade/items"
          className="transition-colors hover:text-white"
        >
          Items
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span
          className="truncate max-w-48"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          {item.name}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Left column: Item detail ── */}
        <div>
          {/* Item header */}
          <div
            className="mb-5 flex items-start justify-between gap-3 pb-5"
            style={{ borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}
          >
            <div>
              <h1
                className="text-[22px] font-semibold text-white"
                style={{
                  fontFamily: displayFont,
                  letterSpacing: "-0.020em",
                }}
              >
                {item.name}
              </h1>
              {item.internalSku && (
                <p
                  className="mt-0.5 font-mono text-[12px]"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {item.internalSku}
                </p>
              )}
              <div
                className="mt-1.5 text-[11px]"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
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
                      item && initDraft(item);
                    }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] transition-colors hover:bg-white/10"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{ background: "rgb(16, 185, 129)" }}
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
                  <button
                    onClick={recomputeClassification}
                    disabled={recomputing}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] transition-colors hover:bg-white/10"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                    title="Recompute classification"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${recomputing ? "animate-spin" : ""}`}
                    />
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] transition-colors hover:bg-white/10"
                    style={{ color: "rgba(255,255,255,0.55)" }}
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
            <div
              className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              Classification Codes
            </div>
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.025)",
                boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
              }}
            >
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

          {/* Physical properties */}
          <section className="mb-6">
            <div
              className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              Physical Properties (Trigger Engine)
            </div>
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.025)",
                boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
              }}
            >
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
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: val
                          ? "rgba(245,158,11,0.10)"
                          : "rgba(255,255,255,0.04)",
                        color: val
                          ? "rgb(252,211,77)"
                          : "rgba(255,255,255,0.35)",
                      }}
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
            <div
              className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              Origin & De-minimis
            </div>
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.025)",
                boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
              }}
            >
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
          <div
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.38)" }}
          >
            License Determination
          </div>

          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.025)",
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
            }}
          >
            {recomputing ? (
              <div className="flex items-center justify-center py-12">
                <Loader2
                  className="h-5 w-5 animate-spin"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
              </div>
            ) : classification ? (
              <ClassificationPanel classification={classification} />
            ) : (
              <div className="py-10 text-center">
                <p
                  className="text-[13px]"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Add US content percentage and property data to compute
                  classification.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
