"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Webhook,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Send,
  Check,
  X,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  secretPrefix: string;
  isActive: boolean;
  successCount: number;
  failureCount: number;
  lastTriggeredAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  event: string;
  status: "PENDING" | "DELIVERED" | "FAILED" | "RETRYING";
  statusCode: number | null;
  responseTimeMs: number | null;
  attempts: number;
  createdAt: string;
  deliveredAt: string | null;
}

interface AvailableEvent {
  event: string;
  description: string;
}

interface WebhookListProps {
  organizationId: string;
}

export default function WebhookList({ organizationId }: WebhookListProps) {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [availableEvents, setAvailableEvents] = useState<AvailableEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookItem | null>(
    null,
  );
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/webhooks?organizationId=${organizationId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks);
        setAvailableEvents(data.availableEvents);
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/v1/webhooks/${webhookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ organizationId, isActive: !isActive }),
      });

      if (response.ok) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error("Error toggling webhook:", error);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/webhooks/${webhookId}?organizationId=${organizationId}`,
        { method: "DELETE", headers: { ...csrfHeaders() } },
      );

      if (response.ok) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error("Error deleting webhook:", error);
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/v1/webhooks/${webhookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ organizationId, test: true }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(
          data.testResult.success
            ? `Test successful! Status: ${data.testResult.statusCode}`
            : `Test failed: ${data.testResult.error}`,
        );
        fetchWebhooks();
      }
    } catch (error) {
      console.error("Error testing webhook:", error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-navy-800 rounded w-1/4"></div>
        <div className="h-32 bg-navy-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Webhooks</h2>
          <p className="text-sm text-slate-400">
            Receive real-time notifications when events occur in your
            organization
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {/* New Webhook Secret Display */}
      {newWebhookSecret && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-500">
                Save your webhook secret
              </h3>
              <p className="text-sm text-slate-400 mt-1 mb-3">
                Use this secret to verify webhook signatures. This is the only
                time you&apos;ll see it.
              </p>
              <code className="block px-3 py-2 bg-navy-900 rounded font-mono text-sm text-white break-all">
                {newWebhookSecret}
              </code>
              <button
                onClick={() => setNewWebhookSecret(null)}
                className="mt-3 text-sm text-slate-400 hover:text-white"
              >
                I&apos;ve saved my secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="text-center py-12 bg-navy-800/50 border border-navy-700 rounded-xl">
          <Webhook className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No webhooks yet
          </h3>
          <p className="text-slate-400 mb-4">
            Create a webhook to receive real-time event notifications
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create your first webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <WebhookCard
              key={webhook.id}
              webhook={webhook}
              organizationId={organizationId}
              expanded={expandedWebhook === webhook.id}
              onToggleExpand={() =>
                setExpandedWebhook(
                  expandedWebhook === webhook.id ? null : webhook.id,
                )
              }
              onToggleActive={() => toggleWebhook(webhook.id, webhook.isActive)}
              onTest={() => testWebhook(webhook.id)}
              onEdit={() => setEditingWebhook(webhook)}
              onDelete={() => deleteWebhook(webhook.id)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingWebhook) && (
        <WebhookModal
          organizationId={organizationId}
          availableEvents={availableEvents}
          webhook={editingWebhook}
          onClose={() => {
            setShowCreateModal(false);
            setEditingWebhook(null);
          }}
          onCreated={(secret) => {
            setNewWebhookSecret(secret);
            setShowCreateModal(false);
            fetchWebhooks();
          }}
          onUpdated={() => {
            setEditingWebhook(null);
            fetchWebhooks();
          }}
        />
      )}
    </div>
  );
}

function WebhookCard({
  webhook,
  organizationId,
  expanded,
  onToggleExpand,
  onToggleActive,
  onTest,
  onEdit,
  onDelete,
}: {
  webhook: WebhookItem;
  organizationId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  useEffect(() => {
    if (expanded && deliveries.length === 0) {
      setLoadingDeliveries(true);
      fetch(
        `/api/v1/webhooks/${webhook.id}/deliveries?organizationId=${organizationId}`,
      )
        .then((res) => res.json())
        .then((data) => setDeliveries(data.deliveries || []))
        .catch(console.error)
        .finally(() => setLoadingDeliveries(false));
    }
  }, [expanded, webhook.id, organizationId, deliveries.length]);

  const successRate =
    webhook.successCount + webhook.failureCount > 0
      ? Math.round(
          (webhook.successCount /
            (webhook.successCount + webhook.failureCount)) *
            100,
        )
      : null;

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-medium text-white truncate">
                {webhook.name}
              </h3>
              {webhook.isActive ? (
                <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 rounded">
                  Active
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs bg-slate-500/10 text-slate-400 rounded">
                  Paused
                </span>
              )}
            </div>

            <p className="text-sm text-slate-400 truncate mb-3">
              {webhook.url}
            </p>

            <div className="flex flex-wrap gap-1 mb-3">
              {webhook.events.slice(0, 3).map((event) => (
                <span
                  key={event}
                  className="px-2 py-0.5 text-xs bg-navy-700 text-slate-300 rounded"
                >
                  {event}
                </span>
              ))}
              {webhook.events.length > 3 && (
                <span className="px-2 py-0.5 text-xs bg-navy-700 text-slate-400 rounded">
                  +{webhook.events.length - 3} more
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              {successRate !== null && (
                <span
                  className={
                    successRate >= 90
                      ? "text-green-400"
                      : successRate >= 70
                        ? "text-amber-400"
                        : "text-red-400"
                  }
                >
                  {successRate}% success rate
                </span>
              )}
              {webhook.lastTriggeredAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last triggered{" "}
                  {new Date(webhook.lastTriggeredAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onTest}
              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
              title="Send test event"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleActive}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
              title={webhook.isActive ? "Pause webhook" : "Activate webhook"}
            >
              {webhook.isActive ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded transition-colors"
              title="Edit webhook"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Delete webhook"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mt-2"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide delivery history
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show delivery history
            </>
          )}
        </button>
      </div>

      {/* Delivery History */}
      {expanded && (
        <div className="border-t border-navy-700 p-4 bg-navy-900/50">
          <h4 className="text-sm font-medium text-slate-300 mb-3">
            Recent Deliveries
          </h4>
          {loadingDeliveries ? (
            <div className="animate-pulse space-y-2">
              <div className="h-8 bg-navy-800 rounded"></div>
              <div className="h-8 bg-navy-800 rounded"></div>
            </div>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-slate-500">No deliveries yet</p>
          ) : (
            <div className="space-y-2">
              {deliveries.slice(0, 10).map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between py-2 px-3 bg-navy-800 rounded text-sm"
                >
                  <div className="flex items-center gap-3">
                    {delivery.status === "DELIVERED" ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : delivery.status === "FAILED" ? (
                      <X className="w-4 h-4 text-red-400" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                    )}
                    <span className="text-slate-300">{delivery.event}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    {delivery.statusCode && (
                      <span
                        className={
                          delivery.statusCode >= 200 &&
                          delivery.statusCode < 300
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {delivery.statusCode}
                      </span>
                    )}
                    {delivery.responseTimeMs && (
                      <span>{delivery.responseTimeMs}ms</span>
                    )}
                    <span>{new Date(delivery.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WebhookModal({
  organizationId,
  availableEvents,
  webhook,
  onClose,
  onCreated,
  onUpdated,
}: {
  organizationId: string;
  availableEvents: AvailableEvent[];
  webhook: WebhookItem | null;
  onClose: () => void;
  onCreated: (secret: string) => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(webhook?.name || "");
  const [url, setUrl] = useState(webhook?.url || "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    webhook?.events || [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!webhook;

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!url.trim()) {
      setError("URL is required");
      return;
    }
    if (selectedEvents.length === 0) {
      setError("Select at least one event");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing) {
        const response = await fetch(`/api/v1/webhooks/${webhook.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            organizationId,
            name: name.trim(),
            url: url.trim(),
            events: selectedEvents,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update webhook");
        }

        onUpdated();
      } else {
        const response = await fetch("/api/v1/webhooks", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            organizationId,
            name: name.trim(),
            url: url.trim(),
            events: selectedEvents,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create webhook");
        }

        const data = await response.json();
        onCreated(data.secret);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const selectAllEvents = () => {
    setSelectedEvents(availableEvents.map((e) => e.event));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-navy-900 border border-navy-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-navy-700">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? "Edit Webhook" : "Create Webhook"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isEditing
              ? "Update your webhook configuration"
              : "Set up a new webhook endpoint"}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Webhook Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Slack Notifications"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Payload URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks/caelex"
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Must be HTTPS in production
            </p>
          </div>

          {/* Events */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-300">
                Events to Subscribe
              </label>
              <button
                onClick={selectAllEvents}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Select all
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableEvents.map(({ event, description }) => (
                <label
                  key={event}
                  className="flex items-start gap-3 p-2 rounded hover:bg-navy-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="mt-0.5"
                  />
                  <div>
                    <code className="text-sm text-white">{event}</code>
                    <p className="text-xs text-slate-500">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-navy-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Webhook"}
          </button>
        </div>
      </div>
    </div>
  );
}
