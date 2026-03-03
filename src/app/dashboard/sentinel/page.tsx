"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Satellite,
  Shield,
  Link2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  Terminal,
  ChevronDown,
  ChevronRight,
  Activity,
  Database,
  FileCheck,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { csrfHeaders } from "@/lib/csrf-client";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface SentinelAgent {
  id: string;
  sentinel_id: string;
  name: string;
  status: string;
  last_seen: string | null;
  last_packet_at: string | null;
  chain_position: number;
  version: string | null;
  enabled_collectors: string[];
  packets_total: number;
  cross_checks_total: number;
  created_at: string;
}

interface EvidencePacket {
  id: string;
  packet_id: string;
  agent_sentinel_id: string;
  agent_name: string;
  satellite_norad: string | null;
  data_point: string;
  values: Record<string, unknown>;
  source_system: string;
  collection_method: string;
  collected_at: string;
  compliance_notes: string[];
  regulation_mapping: Array<{ ref: string; status: string; note: string }>;
  chain_position: number;
  signature_valid: boolean;
  chain_valid: boolean;
  trust_score: number | null;
  cross_verified: boolean;
  created_at: string;
}

interface ChainVerification {
  agent_sentinel_id: string;
  agent_name: string;
  valid: boolean;
  total_packets: number;
  first_position?: number;
  last_position?: number;
  breaks: Array<{ position: number; expected: string; actual: string }>;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "INACTIVE":
      return "warning";
    case "ERROR":
    case "REVOKED":
      return "error";
    default:
      return "default";
  }
}

function trustBadge(score: number | null): { label: string; variant: string } {
  if (score === null) return { label: "Pending", variant: "default" };
  if (score >= 0.95)
    return { label: `L5 ${(score * 100).toFixed(0)}%`, variant: "success" };
  if (score >= 0.9)
    return { label: `L4 ${(score * 100).toFixed(0)}%`, variant: "success" };
  if (score >= 0.8)
    return { label: `L3 ${(score * 100).toFixed(0)}%`, variant: "info" };
  if (score >= 0.7)
    return { label: `L2 ${(score * 100).toFixed(0)}%`, variant: "warning" };
  return { label: `L1 ${(score * 100).toFixed(0)}%`, variant: "error" };
}

const DATA_POINT_LABELS: Record<string, string> = {
  orbital_parameters: "Orbital Parameters",
  cyber_posture: "Cybersecurity Posture",
  ground_station_metrics: "Ground Station Metrics",
  document_event: "Document Event",
};

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function SentinelDashboard() {
  const [agents, setAgents] = useState<SentinelAgent[]>([]);
  const [packets, setPackets] = useState<EvidencePacket[]>([]);
  const [chainResult, setChainResult] = useState<ChainVerification | null>(
    null,
  );
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/sentinel/agents");
      if (res.ok) {
        const json = await res.json();
        setAgents(json.data || []);
        if (json.data?.length > 0 && !selectedAgent) {
          setSelectedAgent(json.data[0].id);
        }
      }
    } catch {
      // silent
    }
  }, [selectedAgent]);

  const fetchPackets = useCallback(async () => {
    if (!selectedAgent) return;
    try {
      const res = await fetch(
        `/api/v1/sentinel/packets?agent_id=${selectedAgent}&limit=25`,
      );
      if (res.ok) {
        const json = await res.json();
        setPackets(json.data || []);
      }
    } catch {
      // silent
    }
  }, [selectedAgent]);

  const verifyChain = useCallback(async () => {
    if (!selectedAgent) return;
    setIsVerifying(true);
    try {
      const res = await fetch(
        `/api/v1/sentinel/chain/verify?agent_id=${selectedAgent}`,
      );
      if (res.ok) {
        const json = await res.json();
        setChainResult(json.data);
      }
    } catch {
      // silent
    } finally {
      setIsVerifying(false);
    }
  }, [selectedAgent]);

  const triggerCrossVerify = useCallback(async () => {
    if (!selectedAgent) return;
    try {
      await fetch("/api/v1/sentinel/cross-verify", {
        method: "POST",
        headers: { ...csrfHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: selectedAgent }),
      });
      // Refresh packets to show updated trust scores
      await fetchPackets();
    } catch {
      // silent
    }
  }, [selectedAgent, fetchPackets]);

  useEffect(() => {
    setIsLoading(true);
    fetchAgents().finally(() => setIsLoading(false));
  }, [fetchAgents]);

  useEffect(() => {
    if (selectedAgent) {
      fetchPackets();
      verifyChain();
    }
  }, [selectedAgent, fetchPackets, verifyChain]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgents();
      if (selectedAgent) fetchPackets();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAgents, fetchPackets, selectedAgent]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const currentAgent = agents.find((a) => a.id === selectedAgent);

  // ─────────────────────────────────────────────────────────────────────
  // EMPTY STATE — Setup guide
  // ─────────────────────────────────────────────────────────────────────

  if (!isLoading && agents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-display font-semibold text-slate-900 dark:text-white flex items-center gap-3">
            <Satellite
              size={28}
              strokeWidth={1.5}
              className="text-emerald-500"
            />
            Sentinel
          </h1>
          <p className="text-body-lg text-slate-600 dark:text-white/60 mt-1">
            Autonomous compliance evidence collection with tamper-evident hash
            chains
          </p>
        </div>

        <Card variant="default">
          <CardContent>
            <div className="py-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <Satellite
                  size={32}
                  strokeWidth={1.5}
                  className="text-emerald-500"
                />
              </div>
              <h2 className="text-heading font-semibold text-slate-900 dark:text-white mb-2">
                No Sentinel Agents Connected
              </h2>
              <p className="text-body text-slate-500 dark:text-white/45 max-w-lg mx-auto mb-8">
                Deploy a Sentinel agent at your operations site to begin
                automated compliance evidence collection. Each agent
                cryptographically signs and chains evidence packets.
              </p>
              <Button
                variant="primary"
                onClick={() => setShowSetup(!showSetup)}
                icon={<Terminal size={16} />}
              >
                View Setup Instructions
              </Button>
            </div>

            <AnimatePresence>
              {showSetup && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <SetupGuide
                    onCopy={copyToClipboard}
                    copiedField={copiedField}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // MAIN DASHBOARD
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display font-semibold text-slate-900 dark:text-white flex items-center gap-3">
            <Satellite
              size={28}
              strokeWidth={1.5}
              className="text-emerald-500"
            />
            Sentinel
          </h1>
          <p className="text-body-lg text-slate-600 dark:text-white/60 mt-1">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} connected
            {currentAgent &&
              ` \u00B7 ${currentAgent.packets_total} evidence packets`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              fetchAgents();
              fetchPackets();
            }}
            icon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSetup(!showSetup)}
            icon={<Terminal size={14} />}
          >
            Setup
          </Button>
        </div>
      </div>

      {/* Setup Guide (collapsible) */}
      <AnimatePresence>
        {showSetup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card variant="default">
              <CardContent>
                <SetupGuide
                  onCopy={copyToClipboard}
                  copiedField={copiedField}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chain Integrity Banner */}
      {chainResult && (
        <ChainIntegrityBanner
          result={chainResult}
          onRecheck={verifyChain}
          isVerifying={isVerifying}
        />
      )}

      {/* Agent Selector + Stats */}
      {agents.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`px-3 py-1.5 rounded-lg text-small font-medium transition-all ${
                selectedAgent === agent.id
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/50 border border-transparent hover:border-slate-200 dark:hover:border-white/10"
              }`}
            >
              {agent.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats Row */}
      {currentAgent && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Status"
            value={currentAgent.status}
            icon={<Activity size={16} />}
            badge={
              <Badge
                variant={
                  statusColor(currentAgent.status) as
                    | "success"
                    | "warning"
                    | "error"
                    | "default"
                }
                size="sm"
              >
                {currentAgent.status}
              </Badge>
            }
          />
          <StatCard
            label="Evidence Packets"
            value={currentAgent.packets_total.toLocaleString()}
            icon={<Database size={16} />}
            sub={`Last: ${timeAgo(currentAgent.last_packet_at)}`}
          />
          <StatCard
            label="Chain Position"
            value={`#${currentAgent.chain_position}`}
            icon={<Link2 size={16} />}
            sub={chainResult?.valid ? "Chain intact" : "Check chain"}
          />
          <StatCard
            label="Cross-Checks"
            value={currentAgent.cross_checks_total.toLocaleString()}
            icon={<FileCheck size={16} />}
            action={
              <button
                onClick={triggerCrossVerify}
                className="text-micro text-emerald-500 hover:text-emerald-400 font-medium"
              >
                Run verification
              </button>
            }
          />
        </div>
      )}

      {/* Agent Details */}
      {currentAgent && (
        <Card variant="default">
          <CardHeader>
            <CardTitle>Agent Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <DetailRow
                label="Sentinel ID"
                value={currentAgent.sentinel_id}
                mono
              />
              <DetailRow label="Version" value={currentAgent.version || "—"} />
              <DetailRow
                label="Last Seen"
                value={timeAgo(currentAgent.last_seen)}
              />
              <DetailRow
                label="Created"
                value={new Date(currentAgent.created_at).toLocaleDateString()}
              />
              <div className="md:col-span-2">
                <span className="text-caption text-slate-500 dark:text-white/40">
                  Collectors
                </span>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {(currentAgent.enabled_collectors || []).map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded text-micro font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/10"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evidence Feed */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Evidence Feed</CardTitle>
            <span className="text-caption text-slate-400 dark:text-white/30">
              Latest 25 packets
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {packets.length === 0 ? (
            <div className="py-8 text-center text-body text-slate-400 dark:text-white/30">
              No evidence packets yet. Deploy and start a Sentinel agent to
              begin collection.
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-slate-100 dark:divide-white/5">
              {packets.map((pkt) => (
                <PacketRow key={pkt.id} packet={pkt} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon,
  sub,
  badge,
  action,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card variant="default">
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-caption text-slate-500 dark:text-white/40">
              {label}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {badge || (
                <p className="text-heading font-semibold text-slate-900 dark:text-white">
                  {value}
                </p>
              )}
            </div>
            {sub && (
              <p className="text-micro text-slate-400 dark:text-white/25 mt-1">
                {sub}
              </p>
            )}
            {action && <div className="mt-1">{action}</div>}
          </div>
          <div className="text-slate-300 dark:text-white/15">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-caption text-slate-500 dark:text-white/40">
        {label}
      </span>
      <p
        className={`text-body text-slate-900 dark:text-white mt-0.5 ${
          mono ? "font-mono text-small" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ChainIntegrityBanner({
  result,
  onRecheck,
  isVerifying,
}: {
  result: ChainVerification;
  onRecheck: () => void;
  isVerifying: boolean;
}) {
  const isValid = result.valid;

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
        isValid
          ? "bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20"
          : "bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20"
      }`}
    >
      <div className="flex items-center gap-3">
        {isValid ? (
          <CheckCircle2 size={18} className="text-emerald-500" />
        ) : (
          <XCircle size={18} className="text-red-500" />
        )}
        <div>
          <p
            className={`text-body font-medium ${
              isValid
                ? "text-emerald-800 dark:text-emerald-400"
                : "text-red-800 dark:text-red-400"
            }`}
          >
            {isValid
              ? `Hash chain intact \u00B7 ${result.total_packets} packets verified`
              : `Chain integrity broken \u00B7 ${result.breaks.length} break${result.breaks.length !== 1 ? "s" : ""} detected`}
          </p>
          {!isValid && result.breaks.length > 0 && (
            <p className="text-small text-red-600 dark:text-red-400/70 mt-0.5">
              First break at position {result.breaks[0]!.position}
            </p>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRecheck}
        loading={isVerifying}
        icon={<RefreshCw size={12} />}
      >
        Recheck
      </Button>
    </div>
  );
}

function PacketRow({ packet }: { packet: EvidencePacket }) {
  const [expanded, setExpanded] = useState(false);
  const trust = trustBadge(packet.trust_score);

  return (
    <div className="py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center gap-3 group"
      >
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronDown
              size={14}
              className="text-slate-400 dark:text-white/30"
            />
          ) : (
            <ChevronRight
              size={14}
              className="text-slate-400 dark:text-white/30"
            />
          )}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="text-body font-medium text-slate-900 dark:text-white truncate">
            {DATA_POINT_LABELS[packet.data_point] || packet.data_point}
          </span>
          <span className="text-micro text-slate-400 dark:text-white/25 font-mono">
            #{packet.chain_position}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Signature */}
          {packet.signature_valid ? (
            <Shield size={14} className="text-emerald-500" />
          ) : (
            <AlertTriangle size={14} className="text-amber-500" />
          )}
          {/* Chain */}
          {packet.chain_valid ? (
            <Link2 size={14} className="text-emerald-500" />
          ) : (
            <Link2 size={14} className="text-red-500" />
          )}
          {/* Trust */}
          <Badge
            variant={
              trust.variant as
                | "success"
                | "warning"
                | "error"
                | "info"
                | "default"
            }
            size="sm"
          >
            {trust.label}
          </Badge>
          {/* Cross-verified */}
          {packet.cross_verified && (
            <CheckCircle2 size={14} className="text-blue-500" />
          )}
          {/* Time */}
          <span className="text-micro text-slate-400 dark:text-white/25 w-16 text-right">
            {timeAgo(packet.collected_at)}
          </span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-7 mt-3 p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniDetail label="Packet ID" value={packet.packet_id} mono />
                <MiniDetail label="Agent" value={packet.agent_name} />
                <MiniDetail label="Source" value={packet.source_system} />
                <MiniDetail label="Method" value={packet.collection_method} />
              </div>

              {packet.satellite_norad && (
                <MiniDetail
                  label="Satellite NORAD"
                  value={packet.satellite_norad}
                />
              )}

              {/* Values */}
              <div>
                <span className="text-micro text-slate-400 dark:text-white/30 uppercase tracking-wide">
                  Values
                </span>
                <pre className="mt-1 text-micro font-mono text-slate-600 dark:text-white/50 bg-slate-100 dark:bg-black/20 rounded p-2 overflow-x-auto">
                  {JSON.stringify(packet.values, null, 2)}
                </pre>
              </div>

              {/* Regulation Mapping */}
              {packet.regulation_mapping &&
                (
                  packet.regulation_mapping as Array<{
                    ref: string;
                    status: string;
                    note: string;
                  }>
                ).length > 0 && (
                  <div>
                    <span className="text-micro text-slate-400 dark:text-white/30 uppercase tracking-wide">
                      Regulation Mapping
                    </span>
                    <div className="mt-1 space-y-1">
                      {(
                        packet.regulation_mapping as Array<{
                          ref: string;
                          status: string;
                          note: string;
                        }>
                      ).map((rm, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-small"
                        >
                          <Badge
                            variant={
                              rm.status === "COMPLIANT"
                                ? "success"
                                : rm.status === "NON_COMPLIANT"
                                  ? "error"
                                  : "warning"
                            }
                            size="sm"
                          >
                            {rm.status}
                          </Badge>
                          <span className="font-mono text-slate-500 dark:text-white/40">
                            {rm.ref}
                          </span>
                          <span className="text-slate-600 dark:text-white/50">
                            {rm.note}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Compliance Notes */}
              {packet.compliance_notes &&
                (packet.compliance_notes as string[]).length > 0 && (
                  <div>
                    <span className="text-micro text-slate-400 dark:text-white/30 uppercase tracking-wide">
                      Compliance Notes
                    </span>
                    <ul className="mt-1 space-y-0.5">
                      {(packet.compliance_notes as string[]).map((note, i) => (
                        <li
                          key={i}
                          className="text-small text-slate-600 dark:text-white/50 flex items-start gap-1.5"
                        >
                          <span className="text-emerald-500 mt-0.5">
                            &bull;
                          </span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniDetail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-micro text-slate-400 dark:text-white/30 uppercase tracking-wide">
        {label}
      </span>
      <p
        className={`text-small text-slate-700 dark:text-white/60 mt-0.5 truncate ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SetupGuide({
  onCopy,
  copiedField,
}: {
  onCopy: (text: string, field: string) => void;
  copiedField: string | null;
}) {
  return (
    <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-white/5">
      <h3 className="text-title font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <Terminal size={18} className="text-emerald-500" />
        Quick Start
      </h3>

      <div className="space-y-4">
        <SetupStep
          number={1}
          title="Generate a Sentinel token"
          description="Create an API token for your agent in your organization settings, or use the register endpoint."
        />

        <SetupStep
          number={2}
          title="Configure the agent"
          code={`# config.yaml
operator_id: "your-org-id"
satellite:
  norad_id: "58421"
  name: "Your Satellite"
collectors:
  orbit_debris:
    enabled: true
    cron: "*/15 * * * *"
  cybersecurity:
    enabled: true
    cron: "*/30 * * * *"
  ground_station:
    enabled: true
    cron: "0 * * * *"
  document_watch:
    enabled: true
    cron: "0 */6 * * *"`}
          onCopy={onCopy}
          copiedField={copiedField}
        />

        <SetupStep
          number={3}
          title="Run with Docker"
          code={`docker run -d \\
  --name sentinel \\
  -e SENTINEL_TOKEN=snt_your_token \\
  -e CAELEX_API_URL=https://app.caelex.eu \\
  -v sentinel-data:/data \\
  -v ./config.yaml:/config/config.yaml \\
  ghcr.io/caelex/sentinel:latest`}
          onCopy={onCopy}
          copiedField={copiedField}
        />

        <SetupStep
          number={4}
          title="Verify connection"
          description="The agent will register itself and begin collecting evidence. You'll see packets appear in the feed above within minutes."
        />
      </div>
    </div>
  );
}

function SetupStep({
  number,
  title,
  description,
  code,
  onCopy,
  copiedField,
}: {
  number: number;
  title: string;
  description?: string;
  code?: string;
  onCopy?: (text: string, field: string) => void;
  copiedField?: string | null;
}) {
  const fieldId = `step-${number}`;

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 text-micro font-bold flex items-center justify-center">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body font-medium text-slate-900 dark:text-white">
          {title}
        </p>
        {description && (
          <p className="text-small text-slate-500 dark:text-white/45 mt-1">
            {description}
          </p>
        )}
        {code && (
          <div className="mt-2 relative group">
            <pre className="text-micro font-mono text-slate-600 dark:text-white/50 bg-slate-50 dark:bg-black/20 rounded-lg p-3 overflow-x-auto border border-slate-100 dark:border-white/5">
              {code}
            </pre>
            {onCopy && (
              <button
                onClick={() => onCopy(code, fieldId)}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-200/60 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/40 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedField === fieldId ? (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
