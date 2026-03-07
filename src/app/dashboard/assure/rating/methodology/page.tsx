"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import RCRMethodologyExplorer from "@/components/assure/RCRMethodologyExplorer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MethodologyData = any;

export default function RCRMethodologyPage() {
  const [methodology, setMethodology] = useState<MethodologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMethodology = useCallback(async () => {
    try {
      const res = await fetch("/api/assure/rcr/methodology");
      if (res.ok) {
        const data = await res.json();
        setMethodology(data.methodology || data);
        setError(null);
      } else {
        setError("Unable to load methodology data.");
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMethodology();
  }, [fetchMethodology]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)] mx-auto mb-3" />
          <p className="text-body text-[var(--text-secondary)]">
            Loading methodology...
          </p>
        </div>
      </div>
    );
  }

  if (error || !methodology) {
    return (
      <div>
        <Link
          href="/dashboard/assure/rating"
          className="inline-flex items-center gap-1 text-small text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Rating
        </Link>
        <GlassCard>
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
            <h2 className="text-heading font-medium text-[var(--text-primary)] mb-2">
              {error || "Methodology Unavailable"}
            </h2>
            <p className="text-body text-[var(--text-secondary)]">
              The rating methodology document could not be loaded.
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchMethodology();
              }}
              className="mt-4 text-small text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
            >
              Try Again
            </button>
          </div>
        </GlassCard>
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

        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mb-1"
        >
          <BookOpen className="w-5 h-5 text-cyan-500" />
          <h1 className="text-display-sm font-medium text-[var(--text-primary)]">
            Rating Methodology
          </h1>
        </motion.div>
        <motion.p
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-body text-[var(--text-secondary)]"
        >
          Grading scale, component weights, scoring criteria, penalties, and
          peer benchmarking approach.
        </motion.p>
      </div>

      {/* Methodology Explorer */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard hover={false} className="p-6">
          <RCRMethodologyExplorer methodology={methodology} />
        </GlassCard>
      </motion.div>
    </div>
  );
}
