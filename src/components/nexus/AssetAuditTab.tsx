"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Activity } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | null;
  actorName?: string | null;
  changes?: Record<string, unknown> | null;
  createdAt: string;
  ipAddress?: string | null;
}

interface AssetAuditTabProps {
  assetId: string;
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: "text-emerald-400",
  UPDATE: "text-blue-400",
  DELETE: "text-red-400",
  VIEW: "text-slate-400",
  EXPORT: "text-purple-400",
};

const ACTION_BG: Record<string, string> = {
  CREATE: "bg-emerald-500/10 border-emerald-500/30",
  UPDATE: "bg-blue-500/10 border-blue-500/30",
  DELETE: "bg-red-500/10 border-red-500/30",
  VIEW: "bg-slate-500/10 border-slate-500/30",
  EXPORT: "bg-purple-500/10 border-purple-500/30",
};

function fmt(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getActionCategory(action: string): string {
  if (action.startsWith("CREATE")) return "CREATE";
  if (action.startsWith("UPDATE") || action.startsWith("EDIT")) return "UPDATE";
  if (action.startsWith("DELETE") || action.startsWith("REMOVE"))
    return "DELETE";
  if (action.startsWith("EXPORT")) return "EXPORT";
  return "VIEW";
}

export default function AssetAuditTab({ assetId }: AssetAuditTabProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchEvents = useCallback(
    async (pageNum = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          entityType: "NEXUS_ASSET",
          entityId: assetId,
          page: String(pageNum),
          limit: "20",
        });
        // Try the nexus-specific audit endpoint first, fall back to audit-center
        const res =
          (await fetch(`/api/nexus/assets/${assetId}/audit?${params}`).catch(
            () => null,
          )) ?? (await fetch(`/api/audit-center?${params}`));
        if (!res.ok) throw new Error("Failed to load audit events");
        const data = await res.json();
        const items: AuditEvent[] =
          data.logs ?? data.events ?? data.items ?? data.recentActivity ?? [];
        if (pageNum === 1) {
          setEvents(items);
        } else {
          setEvents((prev) => [...prev, ...items]);
        }
        setHasMore(items.length === 20);
        setPage(pageNum);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load audit trail");
      } finally {
        setLoading(false);
      }
    },
    [assetId],
  );

  useEffect(() => {
    void fetchEvents(1);
  }, [fetchEvents]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-title font-semibold text-white">Audit Trail</h3>
          <p className="text-small text-slate-400">
            All changes and access events for this asset
          </p>
        </div>
        <button
          onClick={() => fetchEvents(1)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-small text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors border border-[var(--glass-border)]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <GlassCard hover={false} className="p-4 border border-red-500/30">
          <p className="text-small text-red-400">{error}</p>
        </GlassCard>
      )}

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-500" />
        </div>
      ) : events.length === 0 ? (
        <GlassCard hover={false} className="p-8 text-center">
          <Activity size={24} className="text-slate-600 mx-auto mb-3" />
          <p className="text-body text-slate-400">
            No audit events found for this asset.
          </p>
        </GlassCard>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-[var(--glass-border)]" />

          <div className="space-y-3 pl-12">
            {events.map((event) => {
              const category = getActionCategory(event.action);
              return (
                <div key={event.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-[2.15rem] top-3 w-3 h-3 rounded-full border-2 border-navy-950 ${
                      category === "CREATE"
                        ? "bg-emerald-500"
                        : category === "UPDATE"
                          ? "bg-blue-500"
                          : category === "DELETE"
                            ? "bg-red-500"
                            : "bg-slate-500"
                    }`}
                  />

                  <GlassCard hover={false} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-caption px-2 py-0.5 rounded border font-medium ${
                              ACTION_BG[category] ??
                              "bg-slate-500/10 border-slate-500/30"
                            } ${ACTION_COLOR[category] ?? "text-slate-400"}`}
                          >
                            {event.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-small text-slate-300">
                            {event.entityType}
                          </span>
                        </div>
                        {event.actorName && (
                          <p className="text-small text-slate-400 mt-1">
                            by{" "}
                            <span className="text-slate-200">
                              {event.actorName}
                            </span>
                          </p>
                        )}
                        {event.changes &&
                          Object.keys(event.changes).length > 0 && (
                            <div className="mt-2 text-caption text-slate-500">
                              Changed:{" "}
                              {Object.keys(event.changes)
                                .slice(0, 5)
                                .join(", ")}
                              {Object.keys(event.changes).length > 5 && " …"}
                            </div>
                          )}
                        {event.ipAddress && (
                          <p className="text-caption text-slate-600 mt-1">
                            IP: {event.ipAddress}
                          </p>
                        )}
                      </div>
                      <span className="text-caption text-slate-500 flex-shrink-0">
                        {fmt(event.createdAt)}
                      </span>
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-4 pl-12 flex justify-center">
              <button
                onClick={() => fetchEvents(page + 1)}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-small text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors border border-[var(--glass-border)]"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
