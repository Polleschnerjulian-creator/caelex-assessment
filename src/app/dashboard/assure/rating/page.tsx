"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Send,
  BookOpen,
  Scale,
  MessageSquare,
  Clock,
  Percent,
  Users,
  BarChart3,
} from "lucide-react";
import dynamic from "next/dynamic";
import GlassCard from "@/components/ui/GlassCard";
import { csrfHeaders } from "@/lib/csrf-client";
import RCROutlookIndicator from "@/components/assure/RCROutlookIndicator";
import RatingWatchBanner from "@/components/assure/RatingWatchBanner";

// Dynamic imports for heavy components
const RCRGradeBadge = dynamic(
  () => import("@/components/assure/RCRGradeBadge"),
  {
    ssr: false,
    loading: () => (
      <div className="w-[120px] h-[120px] rounded-full bg-[var(--surface-sunken)] animate-pulse" />
    ),
  },
);

const RatingActionTimeline = dynamic(
  () => import("@/components/assure/RatingActionTimeline"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 bg-[var(--surface-sunken)] rounded-xl animate-pulse"
          />
        ))}
      </div>
    ),
  },
);

// ─── Types ───

interface RatingAction {
  id: string;
  actionType: string;
  grade: string;
  previousGrade?: string;
  computedAt: string;
  actionRationale?: string;
  isPublished: boolean;
}

interface CurrentRating {
  id: string;
  grade: string;
  numericScore: number;
  outlook: "POSITIVE" | "STABLE" | "NEGATIVE" | "DEVELOPING";
  onWatch: boolean;
  watchReason?: string;
  confidence: number;
  validUntil: string;
  peerPercentile: number;
  computedAt: string;
  isPublished: boolean;
  recentActions: RatingAction[];
}

// ─── Loading Skeleton ───

function RatingSkeleton() {
  return (
    <div
      className="animate-pulse space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading rating overview"
    >
      <div className="h-6 bg-[var(--surface-sunken)] rounded w-48" />
      <div className="h-4 bg-[var(--surface-sunken)] rounded w-96" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="h-[300px] bg-[var(--surface-sunken)] rounded-xl" />
        <div className="lg:col-span-2 h-[300px] bg-[var(--surface-sunken)] rounded-xl" />
      </div>
      <div className="h-[200px] bg-[var(--surface-sunken)] rounded-xl" />
      <span className="sr-only">Loading rating overview...</span>
    </div>
  );
}

// ─── Empty State ───

function EmptyRatingState({
  onCompute,
  computing,
}: {
  onCompute: () => void;
  computing: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full bg-[var(--accent-success-soft)] flex items-center justify-center mb-6"
      >
        <Shield className="w-10 h-10 text-[var(--accent-primary)]" />
      </motion.div>
      <motion.h2
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-heading font-medium text-[var(--text-primary)] mb-2"
      >
        No Rating Computed Yet
      </motion.h2>
      <motion.p
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-body text-[var(--text-secondary)] mb-8 max-w-md"
      >
        Compute your first Regulatory Credit Rating to get a comprehensive
        assessment of your organization&apos;s regulatory compliance posture.
      </motion.p>
      <motion.button
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={onCompute}
        disabled={computing}
        className="inline-flex items-center gap-2 bg-[var(--accent-primary)] text-white px-6 py-3 rounded-lg font-medium text-body hover:bg-[var(--accent-primary-hover)] transition-all disabled:opacity-50"
      >
        {computing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Computing...
          </>
        ) : (
          <>
            <BarChart3 className="w-4 h-4" />
            Compute Your First Rating
          </>
        )}
      </motion.button>
    </div>
  );
}

// ─── Main Component ───

export default function RCROverviewPage() {
  const [rating, setRating] = useState<CurrentRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [noRating, setNoRating] = useState(false);

  const fetchRating = useCallback(async () => {
    try {
      const res = await fetch("/api/assure/rcr/current");
      if (res.ok) {
        const data = await res.json();
        setRating(data);
        setNoRating(false);
        setError(null);
      } else if (res.status === 404) {
        setNoRating(true);
        setError(null);
      } else {
        setError("Unable to load rating data.");
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRating();
  }, [fetchRating]);

  const handleRecompute = async () => {
    setComputing(true);
    try {
      const res = await fetch("/api/assure/rcr/compute", {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        await fetchRating();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to compute rating.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setComputing(false);
    }
  };

  const handlePublish = async () => {
    if (!rating) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/assure/rcr/${rating.id}/publish`, {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (res.ok) {
        await fetchRating();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to publish rating.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <RatingSkeleton />;

  if (error && !rating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--accent-danger-soft)]/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-[var(--accent-danger)]" />
        </div>
        <h2 className="text-title font-medium text-[var(--text-primary)] mb-2">
          {error}
        </h2>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            fetchRating();
          }}
          className="text-small text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors mt-2"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (noRating) {
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
            <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
            <h1 className="text-display-sm font-medium text-[var(--text-primary)]">
              Regulatory Credit Rating
            </h1>
          </motion.div>
        </div>
        <EmptyRatingState onCompute={handleRecompute} computing={computing} />
      </div>
    );
  }

  if (!rating) return null;

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

        <div className="flex items-center justify-between">
          <div>
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 mb-1"
            >
              <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
              <h1 className="text-display-sm font-medium text-[var(--text-primary)]">
                Regulatory Credit Rating
              </h1>
            </motion.div>
            <motion.p
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="text-body text-[var(--text-secondary)]"
            >
              Your organization&apos;s credit-style regulatory compliance
              rating.
            </motion.p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRecompute}
              disabled={computing}
              className="inline-flex items-center gap-2 bg-[var(--surface-sunken)] text-[var(--text-secondary)] text-small font-medium px-3 py-2 rounded-lg hover:bg-[var(--surface-sunken)] transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${computing ? "animate-spin" : ""}`}
              />
              {computing ? "Computing..." : "Recompute"}
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--accent-danger-soft)]/10 border border-[var(--accent-danger)]"
        >
          <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0" />
          <p className="text-body text-[var(--accent-danger)]">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-small text-[var(--accent-danger)] hover:text-[var(--accent-danger)] transition-colors"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Watch Banner */}
      <div className="mb-6">
        <RatingWatchBanner
          onWatch={rating.onWatch}
          watchReason={rating.watchReason}
        />
      </div>

      {/* Main content: Grade + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Grade Card */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard hover={false} highlighted className="p-6 h-full">
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <RCRGradeBadge grade={rating.grade} size="xl" showLabel />

              <div className="flex items-center gap-2 mt-2">
                <RCROutlookIndicator outlook={rating.outlook} />
              </div>

              {!rating.isPublished && (
                <span className="text-micro px-2 py-0.5 rounded bg-[var(--accent-warning-soft)] text-[var(--accent-warning)] border border-[var(--accent-warning)] font-medium">
                  UNPUBLISHED DRAFT
                </span>
              )}

              <p className="text-micro text-[var(--text-tertiary)] mt-1">
                Computed{" "}
                {new Date(rating.computedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2"
        >
          <GlassCard hover={false} className="p-6 h-full">
            <h2 className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-5">
              Rating Summary
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Numeric Score */}
              <div className="bg-[var(--surface-sunken)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-caption text-[var(--text-secondary)]">
                    Numeric Score
                  </span>
                </div>
                <div className="text-display-sm font-semibold text-[var(--text-primary)]">
                  {rating.numericScore.toFixed(1)}
                </div>
                <div className="text-micro text-[var(--text-tertiary)] mt-0.5">
                  out of 100
                </div>
              </div>

              {/* Confidence */}
              <div className="bg-[var(--surface-sunken)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-caption text-[var(--text-secondary)]">
                    Confidence
                  </span>
                </div>
                <div className="text-display-sm font-semibold text-[var(--text-primary)]">
                  {rating.confidence}%
                </div>
                <div className="text-micro text-[var(--text-tertiary)] mt-0.5">
                  data completeness
                </div>
              </div>

              {/* Valid Until */}
              <div className="bg-[var(--surface-sunken)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-caption text-[var(--text-secondary)]">
                    Valid Until
                  </span>
                </div>
                <div className="text-body-lg font-semibold text-[var(--text-primary)]">
                  {new Date(rating.validUntil).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
                <div className="text-micro text-[var(--text-tertiary)] mt-0.5">
                  next review date
                </div>
              </div>

              {/* Peer Percentile */}
              <div className="bg-[var(--surface-sunken)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-caption text-[var(--text-secondary)]">
                    Peer Percentile
                  </span>
                </div>
                <div className="text-display-sm font-semibold text-[var(--text-primary)]">
                  {rating.peerPercentile}th
                </div>
                <div className="text-micro text-[var(--text-tertiary)] mt-0.5">
                  among peer group
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[var(--border-subtle)]">
              <Link
                href="/dashboard/assure/rating/report"
                className="inline-flex items-center gap-2 bg-[var(--accent-primary)] text-white px-4 py-2 rounded-lg text-small font-medium hover:bg-[var(--accent-primary-hover)] transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                View Full Report
              </Link>
              {!rating.isPublished && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="inline-flex items-center gap-2 bg-[var(--surface-sunken)] text-[var(--text-secondary)] px-4 py-2 rounded-lg text-small font-medium hover:bg-[var(--surface-sunken)] transition-all disabled:opacity-50"
                >
                  {publishing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {publishing ? "Publishing..." : "Publish Rating"}
                </button>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Recent Rating Actions */}
      {rating.recentActions && rating.recentActions.length > 0 && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <GlassCard hover={false} className="p-6">
            <h2 className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">
              Recent Rating Actions
            </h2>
            <RatingActionTimeline actions={rating.recentActions.slice(0, 5)} />
          </GlassCard>
        </motion.div>
      )}

      {/* Sub-navigation */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              label: "Full Report",
              description:
                "Component breakdown, risk register, and peer analysis",
              icon: FileText,
              color: "text-[var(--accent-primary)]",
              href: "/dashboard/assure/rating/report",
            },
            {
              label: "Methodology",
              description: "Grading scale, weights, and scoring criteria",
              icon: BookOpen,
              color: "text-cyan-500",
              href: "/dashboard/assure/rating/methodology",
            },
            {
              label: "Appeals",
              description: "Submit or track rating appeals",
              icon: Scale,
              color: "text-[var(--accent-info)]",
              href: "/dashboard/assure/rating/appeal",
            },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.08 }}
              >
                <Link href={item.href}>
                  <GlassCard className="p-5 group cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface-sunken)] flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div>
                        <p className="text-body-lg font-medium text-[var(--text-primary)]">
                          {item.label}
                        </p>
                        <p className="text-caption text-[var(--text-secondary)] mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
