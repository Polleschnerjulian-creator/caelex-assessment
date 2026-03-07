"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  Plus,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Send,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ───

interface Appeal {
  id: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  reason: string;
  supportingDocs: string[];
  reviewNotes?: string;
  createdAt: string;
  resolvedAt?: string;
  rating?: {
    id: string;
    grade: string;
    numericScore: number;
    computedAt: string;
  };
}

interface CurrentRating {
  id: string;
  grade: string;
  numericScore: number;
  computedAt: string;
}

// ─── Status Badge ───

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  SUBMITTED: {
    label: "Submitted",
    icon: Send,
    className:
      "bg-[var(--accent-info-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)]",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    icon: Clock,
    className:
      "bg-[var(--accent-warning-soft)] text-[var(--accent-warning)] border-[var(--accent-warning)]",
  },
  ACCEPTED: {
    label: "Accepted",
    icon: CheckCircle2,
    className:
      "bg-[var(--accent-success-soft)] text-[var(--accent-success)] border-[var(--accent-success)]",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className:
      "bg-[var(--accent-danger-soft)]/10 text-[var(--accent-danger)] border-[var(--accent-danger)]",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    icon: XCircle,
    className:
      "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-default)]",
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.SUBMITTED;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-micro font-medium border ${config.className}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

// ─── Appeal Form ───

function AppealForm({
  rating,
  onSubmit,
  onCancel,
}: {
  rating: CurrentRating;
  onSubmit: (reason: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for your appeal.");
      return;
    }
    if (reason.trim().length < 50) {
      setError("Appeal reason must be at least 50 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(reason.trim());
    } catch {
      setError("Failed to submit appeal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
      <GlassCard highlighted className="p-6">
        <h2 className="text-heading font-medium text-[var(--text-primary)] mb-1">
          Submit Rating Appeal
        </h2>
        <p className="text-body text-[var(--text-secondary)] mb-6">
          Appeal the current rating of{" "}
          <span className="font-semibold text-[var(--text-secondary)]">
            {rating.grade}
          </span>{" "}
          (score: {rating.numericScore}) computed on{" "}
          {new Date(rating.computedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          .
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="appeal-reason"
              className="block text-body font-medium text-[var(--text-secondary)] mb-2"
            >
              Reason for Appeal
            </label>
            <textarea
              id="appeal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why you believe the current rating does not accurately reflect your organization's regulatory compliance posture. Include specific evidence or circumstances that should be considered..."
              rows={6}
              className="w-full px-4 py-3 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]/30 focus:border-[var(--border-focus)]:border-[var(--accent-primary)] transition-all resize-none"
            />
            <p className="text-micro text-[var(--text-tertiary)] mt-1">
              Minimum 50 characters. {reason.length}/50
            </p>
          </div>

          {error && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-[var(--accent-danger-soft)]/10 border border-[var(--accent-danger)]"
            >
              <AlertTriangle className="w-4 h-4 text-[var(--accent-danger)] flex-shrink-0" />
              <p className="text-small text-[var(--accent-danger)]">{error}</p>
            </motion.div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-[var(--accent-primary)] text-white px-5 py-2.5 rounded-lg text-body font-medium hover:bg-[var(--accent-primary-hover)] transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Appeal
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-body text-[var(--text-secondary)] hover:text-[var(--text-secondary)] transition-colors px-4 py-2.5"
            >
              Cancel
            </button>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  );
}

// ─── Main Component ───

export default function RCRAppealPage() {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [currentRating, setCurrentRating] = useState<CurrentRating | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [appealsRes, ratingRes] = await Promise.all([
        fetch("/api/assure/rcr/appeal"),
        fetch("/api/assure/rcr/current"),
      ]);

      if (appealsRes.ok) {
        const data = await appealsRes.json();
        setAppeals(data.appeals || data || []);
      }
      if (ratingRes.ok) {
        const data = await ratingRes.json();
        setCurrentRating(data);
      }

      setError(null);
    } catch {
      setError("Failed to load appeal data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitAppeal = async (reason: string) => {
    if (!currentRating) return;

    const res = await fetch("/api/assure/rcr/appeal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...csrfHeaders(),
      },
      body: JSON.stringify({
        ratingId: currentRating.id,
        reason,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to submit appeal");
    }

    setShowForm(false);
    await fetchData();
  };

  // Check if there's an active appeal (SUBMITTED or UNDER_REVIEW)
  const hasActiveAppeal = appeals.some((a) =>
    ["SUBMITTED", "UNDER_REVIEW"].includes(a.status),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)] mx-auto mb-3" />
          <p className="text-body text-[var(--text-secondary)]">
            Loading appeals...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/assure/rating"
          className="inline-flex items-center gap-1 text-small text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Rating
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 mb-1"
            >
              <Scale className="w-5 h-5 text-[var(--accent-info)]" />
              <h1 className="text-display-sm font-medium text-[var(--text-primary)]">
                Rating Appeals
              </h1>
            </motion.div>
            <motion.p
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="text-body text-[var(--text-secondary)]"
            >
              Submit or track appeals against your regulatory credit rating.
            </motion.p>
          </div>

          {currentRating && !hasActiveAppeal && !showForm && (
            <motion.button
              initial={false}
              animate={{ opacity: 1 }}
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-[var(--accent-primary)] text-white px-4 py-2 rounded-lg text-small font-medium hover:bg-[var(--accent-primary-hover)] transition-all"
            >
              <Plus className="w-4 h-4" />
              New Appeal
            </motion.button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--accent-danger-soft)]/10 border border-[var(--accent-danger)]"
        >
          <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0" />
          <p className="text-body text-[var(--accent-danger)]">{error}</p>
        </motion.div>
      )}

      {/* Active Appeal Notice */}
      {hasActiveAppeal && !showForm && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--accent-warning-soft)] border border-[var(--accent-warning)]"
        >
          <Clock className="w-5 h-5 text-[var(--accent-warning)] flex-shrink-0" />
          <p className="text-body text-[var(--accent-warning)]">
            You have an active appeal in progress. A new appeal cannot be
            submitted until the current one is resolved.
          </p>
        </motion.div>
      )}

      {/* Appeal Form */}
      <AnimatePresence>
        {showForm && currentRating && (
          <div className="mb-8">
            <AppealForm
              rating={currentRating}
              onSubmit={handleSubmitAppeal}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Appeal History */}
      {appeals.length === 0 ? (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard>
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--surface-sunken)] flex items-center justify-center mx-auto mb-4">
                <Scale className="w-8 h-8 text-[var(--text-tertiary)]" />
              </div>
              <h2 className="text-heading font-medium text-[var(--text-primary)] mb-2">
                No Appeals Filed
              </h2>
              <p className="text-body text-[var(--text-secondary)] max-w-md mx-auto">
                You haven&apos;t submitted any rating appeals yet. If you
                believe your current rating doesn&apos;t accurately reflect your
                compliance posture, you can file an appeal.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal, index) => (
            <motion.div
              key={appeal.id}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <GlassCard className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={appeal.status} />
                    {appeal.rating && (
                      <span className="text-small text-[var(--text-secondary)]">
                        Against rating:{" "}
                        <span className="font-medium text-[var(--text-secondary)]">
                          {appeal.rating.grade}
                        </span>{" "}
                        ({appeal.rating.numericScore})
                      </span>
                    )}
                  </div>
                  <span className="text-micro text-[var(--text-tertiary)]">
                    {new Date(appeal.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-start gap-2 mb-3">
                  <FileText className="w-4 h-4 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
                  <p className="text-body text-[var(--text-secondary)]">
                    {appeal.reason}
                  </p>
                </div>

                {appeal.reviewNotes && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                    <p className="text-caption text-[var(--text-secondary)] mb-1">
                      Review Notes
                    </p>
                    <p className="text-small text-[var(--text-secondary)]">
                      {appeal.reviewNotes}
                    </p>
                  </div>
                )}

                {appeal.resolvedAt && (
                  <p className="text-micro text-[var(--text-tertiary)] mt-2">
                    Resolved{" "}
                    {new Date(appeal.resolvedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
