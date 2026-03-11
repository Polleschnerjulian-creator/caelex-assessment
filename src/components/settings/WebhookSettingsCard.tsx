"use client";

import { useState, useEffect, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useOrganization } from "@/components/providers/OrganizationProvider";
import {
  Webhook,
  Plus,
  Loader2,
  Trash2,
  X,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  successCount: number;
  failureCount: number;
  lastTriggeredAt: string | null;
  lastError: string | null;
}

interface EventOption {
  event: string;
  description: string;
}

const EVENT_CATEGORIES: Record<string, string> = {
  compliance: "Compliance",
  spacecraft: "Spacecraft",
  authorization: "Authorization",
  report: "Reports",
  incident: "Incidents",
  deadline: "Deadlines",
  document: "Documents",
  member: "Members",
  network: "Network",
  evidence: "Evidence",
};

export function WebhookSettingsCard() {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [availableEvents, setAvailableEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // New secret display
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/webhooks?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
        setAvailableEvents(data.availableEvents || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleCreate = async () => {
    if (!orgId || !name || !url || selectedEvents.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          organizationId: orgId,
          name,
          url,
          events: selectedEvents,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewSecret(data.secret);
        setShowCreate(false);
        setName("");
        setUrl("");
        setSelectedEvents([]);
        fetchWebhooks();
      }
    } catch {
      // Silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!orgId) return;
    setDeleting(id);
    try {
      const res = await fetch(
        `/api/v1/webhooks/${id}?organizationId=${orgId}`,
        { method: "DELETE", headers: csrfHeaders() },
      );
      if (res.ok) fetchWebhooks();
    } catch {
      // Silently fail
    } finally {
      setDeleting(null);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const toggleAllInCategory = (cat: string) => {
    const catEvents = availableEvents
      .filter((e) => e.event.startsWith(cat + "."))
      .map((e) => e.event);
    const allSelected = catEvents.every((e) => selectedEvents.includes(e));
    if (allSelected) {
      setSelectedEvents((prev) => prev.filter((e) => !catEvents.includes(e)));
    } else {
      setSelectedEvents((prev) => [...new Set([...prev, ...catEvents])]);
    }
  };

  const groupedEvents = availableEvents.reduce(
    (acc, e) => {
      const cat = e.event.split(".")[0];
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(e);
      return acc;
    },
    {} as Record<string, EventOption[]>,
  );

  const copySecret = () => {
    if (newSecret) {
      navigator.clipboard.writeText(newSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!orgId) {
    return (
      <div className="py-12 text-center">
        <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Join or create an organization to manage webhooks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* New secret alert */}
      {newSecret && (
        <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-800 dark:text-white mb-1">
                Webhook Signing Secret
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                Save this secret — it won&apos;t be shown again. Use it to
                verify webhook signatures.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/5 dark:bg-black/30 rounded-lg px-3 py-2 text-[11px] font-mono text-amber-700 dark:text-amber-300 overflow-x-auto">
                  {newSecret}
                </code>
                <button
                  onClick={copySecret}
                  className="p-2 rounded-lg bg-white/60 dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] transition-colors shrink-0"
                >
                  {copied ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} className="text-slate-500" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewSecret(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Header + create */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-slate-500 dark:text-slate-400">
          {webhooks.length} webhook{webhooks.length !== 1 ? "s" : ""} configured
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 dark:bg-white hover:bg-slate-700 dark:hover:bg-white/90 text-white dark:text-slate-900 text-[12px] font-medium transition-colors"
        >
          <Plus size={13} />
          Add Webhook
        </button>
      </div>

      {/* Webhook list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : webhooks.length === 0 && !showCreate ? (
        <div className="py-10 text-center rounded-xl bg-white/30 dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.04]">
          <Webhook className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
          <p className="text-[13px] text-slate-600 dark:text-slate-400 mb-1">
            No webhooks yet
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Create a webhook to receive real-time compliance events.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div
              key={wh.id}
              className="p-3.5 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {wh.isActive ? (
                      <CheckCircle2
                        size={13}
                        className="text-emerald-500 shrink-0"
                      />
                    ) : (
                      <XCircle size={13} className="text-slate-400 shrink-0" />
                    )}
                    <span className="text-[13px] font-medium text-slate-800 dark:text-white truncate">
                      {wh.name}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate pl-5">
                    {wh.url}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 pl-5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {wh.events.length} event
                      {wh.events.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[10px] text-emerald-500">
                      {wh.successCount} delivered
                    </span>
                    {wh.failureCount > 0 && (
                      <span className="text-[10px] text-red-500">
                        {wh.failureCount} failed
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(wh.id)}
                  disabled={deleting === wh.id}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  {deleting === wh.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form (inline) */}
      {showCreate && (
        <div className="p-5 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-slate-800 dark:text-white">
              New Webhook
            </h3>
            <button
              onClick={() => setShowCreate(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Slack Notifications"
                className="w-full bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 block">
                Endpoint URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="w-full bg-white/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-[12px] font-medium text-slate-500 dark:text-slate-400 mb-2 block">
                Events ({selectedEvents.length} selected)
              </label>
              <div className="space-y-1 max-h-[240px] overflow-y-auto rounded-xl bg-white/30 dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.04] p-2">
                {Object.entries(groupedEvents).map(([cat, events]) => {
                  const isExpanded = expandedCategories.includes(cat);
                  const catSelected = events.filter((e) =>
                    selectedEvents.includes(e.event),
                  ).length;
                  return (
                    <div key={cat}>
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAllInCategory(cat);
                            }}
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-white transition-colors ${
                              catSelected === events.length
                                ? "bg-emerald-500 border-emerald-500"
                                : catSelected > 0
                                  ? "bg-emerald-500/50 border-emerald-500/50"
                                  : "border-black/[0.15] dark:border-white/[0.15]"
                            }`}
                          >
                            {catSelected > 0 && <Check size={8} />}
                          </button>
                          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
                            {EVENT_CATEGORIES[cat] || cat}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {catSelected}/{events.length}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={12} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={12} className="text-slate-400" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="ml-5 space-y-0.5 pb-1">
                          {events.map((e) => (
                            <label
                              key={e.event}
                              className="flex items-start gap-2 px-2 py-1 rounded cursor-pointer hover:bg-white/40 dark:hover:bg-white/[0.03]"
                            >
                              <input
                                type="checkbox"
                                checked={selectedEvents.includes(e.event)}
                                onChange={() => toggleEvent(e.event)}
                                className="mt-0.5 accent-emerald-500"
                              />
                              <div>
                                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-mono">
                                  {e.event}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {e.description}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-[13px] text-slate-600 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  !name || !url || selectedEvents.length === 0 || creating
                }
                className="flex-1 py-2.5 rounded-xl bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-[13px] font-medium hover:bg-slate-700 dark:hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating && <Loader2 size={14} className="animate-spin" />}
                Create Webhook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
