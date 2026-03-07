"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  X,
  Share2,
} from "lucide-react";
import ShareLinkManager from "@/components/assure/ShareLinkManager";
import type { ShareLink } from "@/components/assure/ShareLinkManager";
import GlassCard from "@/components/ui/GlassCard";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ───

interface CreateLinkForm {
  label: string;
  granularity: "SUMMARY" | "COMPONENT" | "DETAILED";
  expiresAt: string;
  maxViews: string;
  includeRRS: boolean;
  includeGapAnalysis: boolean;
  includeTimeline: boolean;
  includeRiskRegister: boolean;
  includeTrend: boolean;
}

const INITIAL_FORM: CreateLinkForm = {
  label: "",
  granularity: "SUMMARY",
  expiresAt: "",
  maxViews: "",
  includeRRS: true,
  includeGapAnalysis: false,
  includeTimeline: false,
  includeRiskRegister: false,
  includeTrend: false,
};

// ─── Helpers ───

function getDefaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

// ─── Main Component ───

export default function AssureSharePage() {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateLinkForm>({
    ...INITIAL_FORM,
    expiresAt: getDefaultExpiry(),
  });

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/assure/share");
      if (res.ok) {
        const data = await res.json();
        setLinks(Array.isArray(data) ? data : []);
        setError(null);
      } else {
        setError("Unable to load share links.");
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCreateNew = () => {
    setForm({ ...INITIAL_FORM, expiresAt: getDefaultExpiry() });
    setCreateError(null);
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!form.label.trim()) {
      setCreateError("Label is required.");
      return;
    }
    if (!form.expiresAt) {
      setCreateError("Expiration date is required.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/assure/share", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          label: form.label.trim(),
          granularity: form.granularity,
          expiresAt: new Date(form.expiresAt).toISOString(),
          maxViews: form.maxViews ? parseInt(form.maxViews, 10) : null,
          includeRRS: form.includeRRS,
          includeGapAnalysis: form.includeGapAnalysis,
          includeTimeline: form.includeTimeline,
          includeRiskRegister: form.includeRiskRegister,
          includeTrend: form.includeTrend,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        await fetchLinks();
      } else {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error || "Failed to create share link.");
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/assure/share/${id}/revoke`, {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        setLinks((prev) =>
          prev.map((l) => (l.id === id ? { ...l, isRevoked: true } : l)),
        );
      }
    } catch {
      // Silently fail, user can retry
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/assure/share/${id}`, {
        method: "DELETE",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== id));
      }
    } catch {
      // Silently fail, user can retry
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status" aria-live="polite">
        <div className="h-6 bg-[var(--surface-sunken)] rounded w-48" />
        <div className="h-4 bg-[var(--surface-sunken)] rounded w-96" />
        <div className="h-[400px] bg-[var(--surface-sunken)] rounded-xl mt-8" />
        <span className="sr-only">Loading share links...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb + Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/assure"
          className="inline-flex items-center gap-1 text-small text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Assure
        </Link>

        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mb-1"
        >
          <Share2 className="w-5 h-5 text-[var(--accent-primary)]" />
          <h1 className="text-display-sm font-medium text-[var(--text-primary)]">
            Share Compliance Posture
          </h1>
        </motion.div>
        <motion.p
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-body text-[var(--text-secondary)]"
        >
          Create secure, time-limited links to share your Regulatory Readiness
          Score with investors, auditors, and partners.
        </motion.p>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--accent-danger-soft)]/10 border border-[var(--accent-danger)]">
          <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0" />
          <p className="text-body text-[var(--accent-danger)]">{error}</p>
        </div>
      )}

      {/* Main content */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <ShareLinkManager
          links={links}
          onCreateNew={handleCreateNew}
          onRevoke={handleRevoke}
          onDelete={handleDelete}
        />
      </motion.div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              role="dialog"
              aria-label="Create share link"
              aria-modal="true"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-8 max-w-[520px] w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-heading font-medium text-[var(--text-primary)]">
                    Create Share Link
                  </h2>
                  <p className="text-small text-[var(--text-secondary)] mt-1">
                    Configure access level and expiration for the shared view.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  aria-label="Close"
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error */}
              {createError && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-[var(--accent-danger-soft)]/10 border border-[var(--accent-danger)]">
                  <AlertTriangle className="w-4 h-4 text-[var(--accent-danger)]" />
                  <span className="text-small text-[var(--accent-danger)]">
                    {createError}
                  </span>
                </div>
              )}

              {/* Form */}
              <div className="space-y-5">
                {/* Label */}
                <div>
                  <label
                    htmlFor="share-label"
                    className="block text-small font-medium text-[var(--text-secondary)] mb-1.5"
                  >
                    Label *
                  </label>
                  <input
                    id="share-label"
                    type="text"
                    value={form.label}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, label: e.target.value }))
                    }
                    placeholder="e.g. Series B DD — Acme Ventures"
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-2.5 text-body-lg focus:outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-tertiary)]:text-[var(--text-tertiary)]"
                  />
                </div>

                {/* Granularity */}
                <div>
                  <label
                    htmlFor="share-granularity"
                    className="block text-small font-medium text-[var(--text-secondary)] mb-1.5"
                  >
                    Detail Level
                  </label>
                  <select
                    id="share-granularity"
                    value={form.granularity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        granularity: e.target
                          .value as CreateLinkForm["granularity"],
                      }))
                    }
                    className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-2.5 text-body-lg focus:outline-none focus:border-[var(--border-focus)]"
                  >
                    <option value="SUMMARY">
                      Summary — Overall score and component scores only
                    </option>
                    <option value="COMPONENT">
                      Component — Includes gap analysis per module
                    </option>
                    <option value="DETAILED">
                      Detailed — Full breakdown with individual factors
                    </option>
                  </select>
                </div>

                {/* Expires At + Max Views */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="share-expires"
                      className="block text-small font-medium text-[var(--text-secondary)] mb-1.5"
                    >
                      Expires *
                    </label>
                    <input
                      id="share-expires"
                      type="date"
                      value={form.expiresAt}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, expiresAt: e.target.value }))
                      }
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-2.5 text-body-lg focus:outline-none focus:border-[var(--border-focus)]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="share-maxviews"
                      className="block text-small font-medium text-[var(--text-secondary)] mb-1.5"
                    >
                      Max Views{" "}
                      <span className="text-[var(--text-tertiary)] font-normal">
                        (optional)
                      </span>
                    </label>
                    <input
                      id="share-maxviews"
                      type="number"
                      value={form.maxViews}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, maxViews: e.target.value }))
                      }
                      min={1}
                      placeholder="Unlimited"
                      className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-2.5 text-body-lg focus:outline-none focus:border-[var(--border-focus)] placeholder:text-[var(--text-tertiary)]:text-[var(--text-tertiary)]"
                    />
                  </div>
                </div>

                {/* Include toggles */}
                <div>
                  <p className="text-small font-medium text-[var(--text-secondary)] mb-3">
                    Include in Shared View
                  </p>
                  <div className="space-y-2">
                    {[
                      {
                        key: "includeRRS" as const,
                        label: "RRS Score & Grade",
                        required: true,
                      },
                      {
                        key: "includeGapAnalysis" as const,
                        label: "Gap Analysis",
                        required: false,
                      },
                      {
                        key: "includeTimeline" as const,
                        label: "Compliance Timeline",
                        required: false,
                      },
                      {
                        key: "includeRiskRegister" as const,
                        label: "Risk Register",
                        required: false,
                      },
                      {
                        key: "includeTrend" as const,
                        label: "Score Trend",
                        required: false,
                      },
                    ].map((toggle) => (
                      <label
                        key={toggle.key}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form[toggle.key]}
                          onChange={(e) =>
                            !toggle.required &&
                            setForm((f) => ({
                              ...f,
                              [toggle.key]: e.target.checked,
                            }))
                          }
                          disabled={toggle.required}
                          className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--accent-primary)] focus:ring-[var(--border-focus)]/30 disabled:opacity-50"
                        />
                        <span className="text-body text-[var(--text-secondary)]">
                          {toggle.label}
                        </span>
                        {toggle.required && (
                          <span className="text-micro text-[var(--text-tertiary)]">
                            (always included)
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-8 pt-6 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-[var(--border-default)] text-[var(--text-secondary)] py-2.5 rounded-lg text-body hover:bg-[var(--surface-sunken)] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 bg-[var(--accent-primary)] text-white py-2.5 rounded-lg font-medium text-body hover:bg-[var(--accent-primary-hover)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? "Creating..." : "Create Link"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
