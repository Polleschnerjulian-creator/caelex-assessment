"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Package, ArrowLeft, Loader2, AlertTriangle, Info } from "lucide-react";
import DDPackageGenerator from "@/components/assure/DDPackageGenerator";
import type { DDPackage } from "@/components/assure/DDPackageGenerator";
import GlassCard from "@/components/ui/GlassCard";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Main Component ───

export default function AssurePackagesPage() {
  const [packages, setPackages] = useState<DDPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    try {
      const res = await fetch("/api/assure/dd-package");
      if (res.ok) {
        const data = await res.json();
        setPackages(Array.isArray(data) ? data : []);
        setError(null);
      } else {
        setError("Unable to load DD packages.");
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/assure/dd-package", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
      });

      if (res.ok) {
        // Refresh the packages list
        await fetchPackages();
      } else {
        const data = await res.json().catch(() => ({}));
        setGenerateError(
          data.error || "Failed to generate DD package. Please try again.",
        );
      }
    } catch {
      setGenerateError("Network error. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6" role="status" aria-live="polite">
        <div className="h-6 bg-[var(--surface-sunken)] rounded w-48" />
        <div className="h-4 bg-[var(--surface-sunken)] rounded w-96" />
        <div className="h-[300px] bg-[var(--surface-sunken)] rounded-xl mt-8" />
        <span className="sr-only">Loading DD packages...</span>
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
          <Package className="w-5 h-5 text-[var(--accent-primary)]" />
          <h1 className="text-display-sm font-medium text-[var(--text-primary)]">
            Due Diligence Packages
          </h1>
        </motion.div>
        <motion.p
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-body text-[var(--text-secondary)]"
        >
          Generate point-in-time compliance snapshots for investor due diligence
          processes.
        </motion.p>
      </div>

      {/* Info banner */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--accent-success-soft)] border border-[var(--accent-success)]">
          <Info className="w-4 h-4 text-[var(--accent-success)] mt-0.5 flex-shrink-0" />
          <div className="text-small text-[var(--accent-success)] leading-relaxed">
            Each DD package captures your current Regulatory Readiness Score and
            full compliance breakdown at the time of generation. Packages are
            immutable snapshots that cannot be modified after creation, ensuring
            verifiable integrity for due diligence purposes.
          </div>
        </div>
      </motion.div>

      {/* Error states */}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--accent-danger-soft)]/10 border border-[var(--accent-danger)]">
          <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0" />
          <p className="text-body text-[var(--accent-danger)]">{error}</p>
        </div>
      )}

      {generateError && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-[var(--accent-danger-soft)]/10 border border-[var(--accent-danger)]"
        >
          <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0" />
          <p className="text-body text-[var(--accent-danger)]">
            {generateError}
          </p>
          <button
            onClick={() => setGenerateError(null)}
            className="ml-auto text-small text-[var(--accent-danger)] hover:text-[var(--accent-danger)]:text-red-300 transition-colors"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <DDPackageGenerator
          onGenerate={handleGenerate}
          packages={packages}
          isGenerating={isGenerating}
        />
      </motion.div>

      {/* Stats footer */}
      {packages.length > 0 && (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <GlassCard hover={false} className="p-4">
            <div className="flex items-center justify-between text-small text-[var(--text-secondary)]">
              <span>
                {packages.length} package{packages.length !== 1 ? "s" : ""}{" "}
                generated
              </span>
              <span>
                Latest score:{" "}
                <span className="font-medium text-[var(--text-secondary)]">
                  {packages[0]?.rrsScore || "—"}/100
                </span>{" "}
                ({packages[0]?.grade || "—"})
              </span>
              <span>
                Last generated:{" "}
                {packages[0]?.generatedAt
                  ? new Date(packages[0].generatedAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )
                  : "—"}
              </span>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
