"use client";

/**
 * /dashboard/trade/items — Trade Item list
 *
 * Sprint B7: replaces the Sprint-B1 stub with real item data.
 * Renders a searchable table of TradeItems with status badges and
 * classification codes. "New Item" opens an inline creation form.
 *
 * Data model: TradeItem (prisma/schema.prisma) — fetched from
 *             GET /api/trade/items
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ScanSearch,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Archive,
  ChevronRight,
  Loader2,
  Info,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

type TradeItemStatus = "DRAFT" | "CLASSIFIED" | "REQUIRES_REVIEW" | "ARCHIVED";

interface TradeItemSummary {
  id: string;
  name: string;
  internalSku: string | null;
  manufacturerName: string | null;
  description: string;
  eccnEU: string | null;
  eccnUS: string | null;
  usmlCategory: string | null;
  mtcrCategory: string | null;
  germanAlEntry: string | null;
  status: TradeItemStatus;
  classificationSource: string;
  classifiedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface ApiResponse {
  items: TradeItemSummary[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

// ─── Status badge ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TradeItemStatus,
  {
    label: string;
    color: string;
    bg: string;
    Icon: React.ComponentType<{
      className?: string;
      strokeWidth?: number;
      style?: React.CSSProperties;
    }>;
  }
> = {
  DRAFT: {
    label: "Draft",
    color: "rgba(255,255,255,0.55)",
    bg: "rgba(255,255,255,0.06)",
    Icon: Clock,
  },
  CLASSIFIED: {
    label: "Classified",
    color: "rgb(74, 222, 128)",
    bg: "rgba(34, 197, 94, 0.10)",
    Icon: CheckCircle2,
  },
  REQUIRES_REVIEW: {
    label: "Review",
    color: "rgb(252, 211, 77)",
    bg: "rgba(245, 158, 11, 0.10)",
    Icon: AlertTriangle,
  },
  ARCHIVED: {
    label: "Archived",
    color: "rgba(255,255,255,0.35)",
    bg: "rgba(255,255,255,0.04)",
    Icon: Archive,
  },
};

function StatusBadge({ status }: { status: TradeItemStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

// ─── Code pill ────────────────────────────────────────────────────────

function CodePill({ code, isItar }: { code: string; isItar?: boolean }) {
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono text-[10px]"
      style={{
        background: isItar
          ? "rgba(239, 68, 68, 0.10)"
          : "rgba(255, 255, 255, 0.05)",
        color: isItar ? "rgb(252, 165, 165)" : "rgba(255, 255, 255, 0.6)",
        border: isItar
          ? "0.5px solid rgba(239,68,68,0.20)"
          : "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      {code}
    </span>
  );
}

// ─── New Item form (inline) ───────────────────────────────────────────

function NewItemForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (item: TradeItemSummary) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/trade/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          internalSku: sku.trim() || undefined,
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to create item");
      }
      const { item } = await res.json();
      onSuccess(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255, 255, 255, 0.04)",
    border: "0.5px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 10,
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    padding: "8px 12px",
    outline: "none",
    width: "100%",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(255, 255, 255, 0.03)",
          boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.09)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-white">
            New Trade Item
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 hover:bg-white/10"
          >
            <X className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label
              className="mb-1 block text-[11px] font-medium"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Name *
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. Star Tracker ST-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <label
              className="mb-1 block text-[11px] font-medium"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Internal SKU
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. ST-400-Rev-C"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-[11px] font-medium"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Description
            </label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 64 }}
              placeholder="Brief description for Astra classification..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p
            className="mt-2 text-[12px]"
            style={{ color: "rgb(252, 165, 165)" }}
          >
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "rgb(16, 185, 129)",
              color: "white",
            }}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {saving ? "Creating…" : "Create Item"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-[13px] transition-colors hover:text-white"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────

function ItemRow({ item }: { item: TradeItemSummary }) {
  const hasClassification =
    item.eccnEU || item.eccnUS || item.usmlCategory || item.mtcrCategory;

  return (
    <Link href={`/dashboard/trade/items/${item.id}`}>
      <div
        className="group flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(255, 255, 255, 0.04)";
          (e.currentTarget as HTMLElement).style.boxShadow =
            "inset 0 0 0 0.5px rgba(255, 255, 255, 0.10)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "rgba(255, 255, 255, 0.02)";
          (e.currentTarget as HTMLElement).style.boxShadow =
            "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)";
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-white">
              {item.name}
            </span>
            {item.internalSku && (
              <span
                className="font-mono text-[11px]"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {item.internalSku}
              </span>
            )}
            <StatusBadge status={item.status} />
          </div>

          {item.manufacturerName && (
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {item.manufacturerName}
            </p>
          )}

          {hasClassification && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.eccnEU && <CodePill code={`EU: ${item.eccnEU}`} />}
              {item.eccnUS && <CodePill code={`CCL: ${item.eccnUS}`} />}
              {item.usmlCategory && (
                <CodePill code={`USML: ${item.usmlCategory}`} isItar />
              )}
              {item.mtcrCategory && (
                <CodePill code={`MTCR: ${item.mtcrCategory}`} />
              )}
              {item.germanAlEntry && (
                <CodePill code={`DE-AL: ${item.germanAlEntry}`} />
              )}
            </div>
          )}
        </div>

        <ChevronRight
          className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ color: "rgba(255,255,255,0.4)" }}
        />
      </div>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="py-16 text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <ScanSearch
          className="h-6 w-6"
          strokeWidth={1.5}
          style={{ color: "rgba(255,255,255,0.5)" }}
        />
      </div>
      <h3 className="mb-1.5 text-[15px] font-semibold text-white">
        No trade items yet
      </h3>
      <p
        className="mb-5 text-[13px]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Add your first item to start multi-jurisdiction classification.
      </p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: "rgb(16, 185, 129)" }}
      >
        <Plus className="h-4 w-4" />
        New Item
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────

export default function TradeItemsPage() {
  const [items, setItems] = useState<TradeItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TradeItemStatus | "">("");
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/trade/items?${params}`);
      if (!res.ok) throw new Error("Failed to load items");
      const data: ApiResponse = await res.json();
      setItems(data.items);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleNewSuccess = (item: TradeItemSummary) => {
    setItems((prev) => [item, ...prev]);
    setTotal((t) => t + 1);
    setShowNew(false);
  };

  const displayFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
  const sansFont =
    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';

  return (
    <div
      className="mx-auto max-w-screen-lg px-8 py-8"
      style={{ fontFamily: sansFont, letterSpacing: "-0.005em" }}
    >
      {/* Header */}
      <header
        className="mb-7 flex items-end justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div>
          <div
            className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <Link
              href="/dashboard/trade"
              className="transition-colors hover:text-white"
            >
              Trade Operations
            </Link>
            <span>/</span>
            <span>Items</span>
          </div>
          <h1
            className="text-[24px] font-semibold text-white"
            style={{ fontFamily: displayFont, letterSpacing: "-0.020em" }}
          >
            Item Classification
          </h1>
          <p
            className="mt-1 text-[13px]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {total > 0
              ? `${total} item${total !== 1 ? "s" : ""} — multi-jurisdiction export classification`
              : "Multi-jurisdiction export classification per BoM line item"}
          </p>
        </div>

        {!showNew && (
          <button
            onClick={() => setShowNew(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "rgb(16, 185, 129)" }}
          >
            <Plus className="h-4 w-4" />
            New Item
          </button>
        )}
      </header>

      {/* New item form */}
      {showNew && (
        <div className="mb-6">
          <NewItemForm
            onSuccess={handleNewSuccess}
            onCancel={() => setShowNew(false)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1" style={{ minWidth: 200 }}>
          <Search
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            strokeWidth={2}
            style={{ color: "rgba(255,255,255,0.35)" }}
          />
          {/* Sprint UF37 (P2-14) — `focusRingColor` is not a valid
              CSS property (no Tailwind shorthand, no native CSS).
              Replaced with a Tailwind ring utility so the focus
              affordance actually renders. */}
          <input
            className="w-full rounded-xl py-2 pl-9 pr-3 text-[13px] text-white placeholder-white/30 outline-none transition-all focus:ring-1 focus:ring-white/20"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "0.5px solid rgba(255,255,255,0.10)",
            }}
            placeholder="Search items, SKUs, codes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {(
          ["", "DRAFT", "CLASSIFIED", "REQUIRES_REVIEW", "ARCHIVED"] as const
        ).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all"
            style={{
              background:
                statusFilter === s
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(255,255,255,0.04)",
              color:
                statusFilter === s
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.45)",
              border:
                statusFilter === s
                  ? "0.5px solid rgba(255,255,255,0.18)"
                  : "0.5px solid transparent",
            }}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2
            className="h-6 w-6 animate-spin"
            style={{ color: "rgba(255,255,255,0.3)" }}
          />
        </div>
      ) : error ? (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "0.5px solid rgba(239,68,68,0.20)",
          }}
        >
          <AlertTriangle
            className="h-4 w-4 shrink-0"
            style={{ color: "rgb(252,165,165)" }}
          />
          <p className="text-[13px]" style={{ color: "rgb(252,165,165)" }}>
            {error}
          </p>
        </div>
      ) : items.length === 0 && !showNew ? (
        <EmptyState onNew={() => setShowNew(true)} />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div
        className="mt-10 flex items-start gap-2.5 rounded-xl p-4"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
        }}
      >
        <Info
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          strokeWidth={2}
          style={{ color: "rgba(255, 255, 255, 0.3)" }}
        />
        <p
          className="text-[11px] leading-relaxed"
          style={{ color: "rgba(255, 255, 255, 0.38)" }}
        >
          Caelex Comply Trade ist ein Compliance-Werkzeug, kein Counsel. Vor
          jeder Export-Entscheidung mit qualifizierter
          Exportkontroll-Rechtsberatung verifizieren (BAFA, BIS, DDTC).
          AWG/EAR/ITAR-Verstöße können zu Freiheitsstrafen bis 20 Jahren und
          Bußen bis USD 1 Mio. führen.
        </p>
      </div>
    </div>
  );
}
