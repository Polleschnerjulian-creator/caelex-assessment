"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Satellite,
  Globe,
  Building2,
  Orbit,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { ProvenanceChip, SidePeek } from "@/components/provenance";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isTraceStale } from "@/lib/design/trust-tokens";

interface OperatorProfileData {
  id: string;
  operatorType: string | null;
  entitySize: string | null;
  primaryOrbit: string | null;
  establishment: string | null;
  completeness: number;
}

/**
 * One per-field summary derived from the DerivationTrace. Client only needs
 * the origin + maybe confidence + stale-flag to render a chip — full trace
 * details are fetched on-demand when the user clicks through.
 */
interface FieldTrace {
  id: string;
  origin: string;
  confidence: number | null;
  expiresAt: string | null;
}

const OPERATOR_TYPE_LABELS: Record<string, string> = {
  spacecraft_operator: "Spacecraft Operator",
  launch_operator: "Launch Operator",
  launch_site_operator: "Launch Site Operator",
  in_space_services_provider: "In-Space Services",
  primary_data_provider: "Primary Data Provider",
  third_country_operator: "Third Country Operator",
  capsule_operator: "Capsule Operator",
  return_operator: "Return Operator",
  spaceport_operator: "Spaceport Operator",
  satellite_operator: "Satellite Operator",
  reentry_operator: "Reentry Operator",
};

const ENTITY_SIZE_LABELS: Record<string, string> = {
  micro: "Micro",
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const ORBIT_LABELS: Record<string, string> = {
  LEO: "LEO",
  MEO: "MEO",
  GEO: "GEO",
  GTO: "GTO",
  HEO: "HEO",
  SSO: "SSO",
  cislunar: "Cislunar",
  deep_space: "Deep Space",
  NGSO: "NGSO",
};

interface LastSnapshot {
  id: string;
  snapshotHash: string;
  frozenAt: string; // ISO
}

export default function OperatorProfileCard() {
  const [profile, setProfile] = useState<OperatorProfileData | null>(null);
  const [traces, setTraces] = useState<Record<string, FieldTrace>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [peekTraceId, setPeekTraceId] = useState<string | null>(null);
  const [lastSnapshot, setLastSnapshot] = useState<LastSnapshot | null>(null);
  const [freezeBusy, setFreezeBusy] = useState(false);
  const [freezeError, setFreezeError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Resolved once at mount — the flag controls whether we fetch traces AND
  // whether we render chips. We never render partial trace UI without data.
  const provenanceEnabled = isFeatureEnabled("provenance_v1");

  useEffect(() => {
    async function fetchProfile() {
      try {
        // When the flag is on, ask the API to include traces in the payload
        // so we get provenance + profile in one round-trip.
        const url = provenanceEnabled
          ? "/api/organization/profile?includeTraces=true"
          : "/api/organization/profile";
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          setProfile(json.profile);
          if (provenanceEnabled && json.traces) {
            setTraces(json.traces as Record<string, FieldTrace>);
          }
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [provenanceEnabled]);

  // Fetch last snapshot — same flag gate as the chips.
  useEffect(() => {
    if (!provenanceEnabled) return;
    fetch("/api/organization/profile/snapshot")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const newest = data?.snapshots?.[0];
        if (newest) setLastSnapshot(newest);
      })
      .catch(() => {});
  }, [provenanceEnabled]);

  async function handleFreeze() {
    setFreezeBusy(true);
    setFreezeError(null);
    try {
      const res = await fetch("/api/organization/profile/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "voluntary" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      const created = await res.json();
      setLastSnapshot({
        id: created.id,
        snapshotHash: created.snapshotHash,
        frozenAt: created.frozenAt,
      });
    } catch (err) {
      setFreezeError(err instanceof Error ? err.message : "Failed to freeze");
    } finally {
      setFreezeBusy(false);
    }
  }

  async function handleCopyHash() {
    if (!lastSnapshot) return;
    try {
      await navigator.clipboard.writeText(lastSnapshot.snapshotHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 1500);
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <GlassCard hover={false} className="p-6">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-[var(--text-tertiary)] animate-spin" />
        </div>
      </GlassCard>
    );
  }

  if (error || !profile) {
    return null;
  }

  const completenessPercent = Math.round(profile.completeness * 100);
  const isComplete = profile.completeness >= 1;

  return (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
      <GlassCard hover={false} className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Satellite className="w-4 h-4 text-[var(--accent-primary)]" />
            <h3 className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              Operator Profile
            </h3>
          </div>
          {isComplete ? (
            <Badge variant="success" size="sm">
              Complete
            </Badge>
          ) : (
            <Badge variant="warning" size="sm">
              {completenessPercent}%
            </Badge>
          )}
        </div>

        {/* Completeness Progress */}
        <Progress
          value={completenessPercent}
          max={100}
          size="sm"
          color="emerald"
          className="mb-5"
        />

        {/* Profile Fields */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <ProfileField
            icon={Satellite}
            label="Operator Type"
            value={
              profile.operatorType
                ? OPERATOR_TYPE_LABELS[profile.operatorType] ||
                  profile.operatorType
                : null
            }
            trace={provenanceEnabled ? traces["operatorType"] : undefined}
            onPeek={setPeekTraceId}
          />
          <ProfileField
            icon={Orbit}
            label="Primary Orbit"
            value={
              profile.primaryOrbit
                ? ORBIT_LABELS[profile.primaryOrbit] || profile.primaryOrbit
                : null
            }
            trace={provenanceEnabled ? traces["primaryOrbit"] : undefined}
            onPeek={setPeekTraceId}
          />
          <ProfileField
            icon={Building2}
            label="Entity Size"
            value={
              profile.entitySize
                ? ENTITY_SIZE_LABELS[profile.entitySize] || profile.entitySize
                : null
            }
            trace={provenanceEnabled ? traces["entitySize"] : undefined}
            onPeek={setPeekTraceId}
          />
          <ProfileField
            icon={Globe}
            label="Establishment"
            value={
              profile.establishment ? profile.establishment.toUpperCase() : null
            }
            trace={provenanceEnabled ? traces["establishment"] : undefined}
            onPeek={setPeekTraceId}
          />
        </div>

        {/* CTA */}
        {!isComplete && (
          <Link
            href="/dashboard/settings?tab=profile"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg text-body font-medium transition-colors"
          >
            Complete Your Profile
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {/* Freeze & Sign — only rendered when the provenance flag is on
            and the profile is at least partially complete (hash isn't
            meaningful for an empty profile). */}
        {provenanceEnabled && completenessPercent > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--divider-color)]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-micro uppercase tracking-wider text-[var(--text-tertiary)]">
                  Signed Snapshot
                </span>
              </div>
              <button
                onClick={handleFreeze}
                disabled={freezeBusy}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-emerald-500/30 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50 transition-colors"
              >
                {freezeBusy ? "Signing…" : "Freeze & Sign"}
              </button>
            </div>
            {lastSnapshot ? (
              <div className="space-y-1 text-xs">
                <div className="text-[var(--text-secondary)]">
                  Last: {new Date(lastSnapshot.frozenAt).toLocaleString()}
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="font-mono text-[10px] text-[var(--text-tertiary)] truncate">
                    {lastSnapshot.snapshotHash.slice(0, 16)}…
                  </code>
                  <button
                    onClick={handleCopyHash}
                    aria-label="Copy snapshot hash"
                    className="p-0.5 rounded hover:bg-[var(--fill-soft)]"
                  >
                    {copiedHash ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-[var(--text-tertiary)]" />
                    )}
                  </button>
                  <a
                    href={`/verity/profile-snapshot/${lastSnapshot.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Verify →
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-tertiary)]">
                Sign your profile state to produce a verifiable snapshot.
              </p>
            )}
            {freezeError && (
              <p className="mt-2 text-xs text-red-500">{freezeError}</p>
            )}
          </div>
        )}
      </GlassCard>

      {/* Provenance side-peek — only rendered when flag is on. Managed
          at the card level so the panel state survives re-fetches. */}
      {provenanceEnabled && (
        <SidePeek
          traceId={peekTraceId}
          onClose={() => setPeekTraceId(null)}
          onNavigate={(id) => setPeekTraceId(id)}
        />
      )}
    </motion.div>
  );
}

/**
 * Single profile-field row. Optional `trace` prop drives the
 * ProvenanceChip rendered inline next to the label. When the trace is
 * undefined (feature flag off or no trace yet) the field renders exactly
 * like before — this is the backward-compatible overlay path.
 *
 * When `onPeek` is provided, clicking the chip triggers the SidePeek with
 * this trace's id.
 */
function ProfileField({
  icon: Icon,
  label,
  value,
  trace,
  onPeek,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  trace?: FieldTrace;
  onPeek?: (traceId: string) => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-[var(--text-tertiary)] mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-micro uppercase tracking-wider text-[var(--text-tertiary)]">
            {label}
          </p>
          {trace && (
            <ProvenanceChip
              origin={trace.origin}
              density="icon"
              confidence={trace.confidence}
              stale={isTraceStale(trace.expiresAt)}
              onClick={onPeek ? () => onPeek(trace.id) : undefined}
            />
          )}
        </div>
        <p className="text-body text-[var(--text-secondary)] truncate">
          {value ?? "--"}
        </p>
      </div>
    </div>
  );
}
