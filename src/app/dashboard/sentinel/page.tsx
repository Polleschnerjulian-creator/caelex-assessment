"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Satellite,
  Shield,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  ChevronDown,
  ChevronRight,
  Activity,
  Database,
  FileCheck,
  Key,
  Eye,
  EyeOff,
  Loader2,
  Radio,
  Link2,
  Clock,
  Fingerprint,
  ArrowRight,
  Check,
  Zap,
  BarChart3,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ──────────────────────────────────────────────────────────────────

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
  public_key: string;
}

interface EvidencePacket {
  id: string;
  packet_id: string;
  data_point: string;
  values: Record<string, unknown>;
  source_system: string;
  collection_method: string;
  collected_at: string;
  compliance_notes: string[];
  regulation_mapping: Record<string, unknown>;
  content_hash?: string;
  previous_hash?: string;
  chain_position: number;
  signature_valid: boolean;
  chain_valid: boolean;
  cross_verified: boolean;
  trust_score: number | null;
  satellite_norad: string | null;
  agent_sentinel_id?: string;
  agent_name?: string;
}

interface ChainVerification {
  agent_sentinel_id: string;
  agent_name: string;
  valid: boolean;
  total_packets: number;
  breaks: Array<{ position: number; expected: string; actual: string }>;
}

interface HealthData {
  agents: number;
  activeAgents: number;
  recentPackets: number;
  unverifiedCount: number;
  invalidSignatures: number;
}

type ViewMode = "overview" | "agents" | "feed" | "setup";

// ─── Constants ──────────────────────────────────────────────────────────────

const DATA_POINT_LABELS: Record<string, string> = {
  orbital_parameters: "Orbital Parameters",
  cyber_posture: "Cybersecurity Posture",
  ground_station_metrics: "Ground Station Metrics",
  document_event: "Document Event",
  fuel_status: "Fuel Status",
  telemetry: "Telemetry",
};

const DATA_POINT_ICONS: Record<string, typeof Satellite> = {
  orbital_parameters: Satellite,
  cyber_posture: Shield,
  ground_station_metrics: Radio,
  document_event: FileCheck,
  fuel_status: Activity,
  telemetry: BarChart3,
};

const COLLECTOR_LABELS: Record<string, string> = {
  orbit_debris: "Orbit & Debris",
  cybersecurity: "Cybersecurity",
  ground_station: "Ground Station",
  document_watch: "Document Watch",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SentinelPage() {
  const [agents, setAgents] = useState<SentinelAgent[]>([]);
  const [packets, setPackets] = useState<EvidencePacket[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [chainResult, setChainResult] = useState<ChainVerification | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("overview");

  // Setup state
  const [setupOpen, setSetupOpen] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  // Chain verification state
  const [verifyingChain, setVerifyingChain] = useState(false);

  // Cross-verify state
  const [crossVerifying, setCrossVerifying] = useState(false);
  const [crossResult, setCrossResult] = useState<{
    total: number;
    verified: number;
    failed: number;
  } | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, packetsRes, healthRes] = await Promise.all([
        fetch("/api/v1/sentinel/agents"),
        fetch(
          `/api/v1/sentinel/packets?limit=50${selectedAgentId ? `&agent_id=${selectedAgentId}` : ""}`,
        ),
        fetch("/api/v1/sentinel/health"),
      ]);

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.data || []);
      }
      if (packetsRes.ok) {
        const data = await packetsRes.json();
        setPackets(data.data || []);
      }
      if (healthRes.ok) {
        const data = await healthRes.json();
        const h = data.data;
        if (h) {
          setHealth({
            agents: h.agents?.total ?? 0,
            activeAgents: h.agents?.active ?? 0,
            recentPackets: h.packets_24h ?? 0,
            unverifiedCount: h.pending_verification ?? 0,
            invalidSignatures: h.invalid_signatures ?? 0,
          });
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ─── Actions ────────────────────────────────────────────────────────────

  const generateToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await fetch("/api/v1/sentinel/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedToken(data.token);
      }
    } catch {
      // silent
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const verifyChain = async (agentId: string) => {
    setVerifyingChain(true);
    setChainResult(null);
    try {
      const res = await fetch(
        `/api/v1/sentinel/chain/verify?agent_id=${agentId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setChainResult(data.data);
      }
    } catch {
      // silent
    } finally {
      setVerifyingChain(false);
    }
  };

  const crossVerify = async (agentId: string) => {
    setCrossVerifying(true);
    setCrossResult(null);
    try {
      const res = await fetch("/api/v1/sentinel/cross-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCrossResult(data.data);
      }
    } catch {
      // silent
    } finally {
      setCrossVerifying(false);
    }
  };

  const toggleAgentStatus = async (
    agentId: string,
    action: "activate" | "revoke",
  ) => {
    try {
      await fetch("/api/v1/sentinel/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ agent_id: agentId, action }),
      });
      fetchData();
    } catch {
      // silent
    }
  };

  // ─── Derived Data ───────────────────────────────────────────────────────

  const activeAgents = agents.filter((a) => a.status === "ACTIVE");
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const avgTrustScore =
    packets.length > 0
      ? packets.reduce((sum, p) => sum + (p.trust_score ?? 0), 0) /
        packets.filter((p) => p.trust_score !== null).length
      : 0;

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
          <p className="text-body text-[var(--text-secondary)]">
            Loading Sentinel...
          </p>
        </div>
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────────────────────────────

  if (agents.length === 0 && !setupOpen) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-primary-soft)] flex items-center justify-center mx-auto mb-5">
            <Satellite className="w-8 h-8 text-[var(--accent-primary)]" />
          </div>
          <h1 className="text-display-sm font-semibold text-[var(--text-primary)] mb-2">
            Sentinel Telemetry Network
          </h1>
          <p className="text-body-lg text-[var(--text-secondary)] max-w-md mx-auto">
            Deploy cryptographic evidence agents on your ground infrastructure
            to continuously prove compliance without revealing sensitive data.
          </p>
        </div>

        <Card variant="elevated">
          <CardContent className="py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                {
                  icon: Fingerprint,
                  title: "Cryptographic Proof",
                  desc: "Ed25519 signed evidence packets with SHA-256 hash chains",
                },
                {
                  icon: Link2,
                  title: "Tamper-Evident",
                  desc: "Hash-chained evidence trail — any modification breaks the chain",
                },
                {
                  icon: ShieldCheck,
                  title: "Cross-Verified",
                  desc: "Multi-agent verification for maximum trust scores",
                },
              ].map((item) => (
                <div key={item.title} className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-[var(--fill-light)] flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-5 h-5 text-[var(--text-secondary)]" />
                  </div>
                  <p className="text-body font-medium text-[var(--text-primary)] mb-1">
                    {item.title}
                  </p>
                  <p className="text-caption text-[var(--text-tertiary)]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setSetupOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent-primary)] text-white text-body font-medium hover:opacity-90 transition-opacity"
              >
                <Zap className="w-4 h-4" />
                Deploy First Agent
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Setup Guide Modal */}
        <AnimatePresence>
          {setupOpen && (
            <SetupGuide
              onClose={() => setSetupOpen(false)}
              onGenerateToken={generateToken}
              generatingToken={generatingToken}
              generatedToken={generatedToken}
              tokenCopied={tokenCopied}
              onCopyToken={copyToken}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── Main Dashboard ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm font-semibold text-[var(--text-primary)]">
            Sentinel
          </h1>
          <p className="text-body text-[var(--text-secondary)] mt-0.5">
            Cryptographic evidence telemetry network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSetupOpen(!setupOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--fill-light)] transition-colors"
          >
            <Terminal className="w-4 h-4" />
            Setup
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--fill-light)] transition-colors disabled:opacity-40"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Setup Guide (collapsible) */}
      <AnimatePresence>
        {setupOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <SetupGuide
              onClose={() => setSetupOpen(false)}
              onGenerateToken={generateToken}
              generatingToken={generatingToken}
              generatedToken={generatedToken}
              tokenCopied={tokenCopied}
              onCopyToken={copyToken}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Active Agents"
          value={activeAgents.length}
          total={agents.length}
          icon={Satellite}
          color="emerald"
        />
        <StatCard
          label="Evidence Packets"
          value={health?.recentPackets ?? packets.length}
          icon={Database}
          color="blue"
        />
        <StatCard
          label="Avg Trust Score"
          value={
            avgTrustScore > 0 ? `${(avgTrustScore * 100).toFixed(0)}%` : "—"
          }
          icon={ShieldCheck}
          color={
            avgTrustScore >= 0.8
              ? "emerald"
              : avgTrustScore >= 0.5
                ? "amber"
                : "slate"
          }
        />
        <StatCard
          label="Unverified"
          value={health?.unverifiedCount ?? 0}
          icon={AlertCircle}
          color={(health?.unverifiedCount ?? 0) > 0 ? "amber" : "emerald"}
        />
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-1 p-1 rounded-lg glass-surface">
        {(
          [
            { id: "overview" as ViewMode, label: "Overview", icon: Activity },
            { id: "agents" as ViewMode, label: "Agents", icon: Satellite },
            { id: "feed" as ViewMode, label: "Evidence Feed", icon: Database },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-body font-medium transition-all duration-200 ${
              viewMode === tab.id
                ? "glass-elevated text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--fill-light)]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ─── */}
      {viewMode === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent List (left 2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-body font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Connected Agents
            </h2>
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selected={selectedAgentId === agent.id}
                onSelect={() => {
                  setSelectedAgentId(
                    selectedAgentId === agent.id ? null : agent.id,
                  );
                  setChainResult(null);
                  setCrossResult(null);
                }}
                onVerifyChain={() => verifyChain(agent.id)}
                onCrossVerify={() => crossVerify(agent.id)}
                onToggleStatus={(action) => toggleAgentStatus(agent.id, action)}
                verifyingChain={verifyingChain}
                crossVerifying={crossVerifying}
                chainResult={
                  chainResult?.agent_sentinel_id === agent.sentinel_id
                    ? chainResult
                    : null
                }
                crossResult={selectedAgentId === agent.id ? crossResult : null}
              />
            ))}
          </div>

          {/* Recent Activity (right col) */}
          <div className="space-y-3">
            <h2 className="text-body font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Recent Evidence
            </h2>
            <Card variant="elevated">
              <CardContent className="p-0">
                {packets.slice(0, 8).map((packet, i) => (
                  <MiniPacketRow
                    key={packet.id}
                    packet={packet}
                    isLast={i === Math.min(packets.length - 1, 7)}
                  />
                ))}
                {packets.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-caption text-[var(--text-tertiary)]">
                      No evidence packets yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── Agents Tab ─── */}
      {viewMode === "agents" && (
        <div className="space-y-4">
          {agents.map((agent) => (
            <AgentDetailCard
              key={agent.id}
              agent={agent}
              onVerifyChain={() => verifyChain(agent.id)}
              onCrossVerify={() => crossVerify(agent.id)}
              onToggleStatus={(action) => toggleAgentStatus(agent.id, action)}
              verifyingChain={verifyingChain}
              crossVerifying={crossVerifying}
              chainResult={
                chainResult?.agent_sentinel_id === agent.sentinel_id
                  ? chainResult
                  : null
              }
              crossResult={selectedAgentId === agent.id ? crossResult : null}
              onSelect={() => setSelectedAgentId(agent.id)}
            />
          ))}
        </div>
      )}

      {/* ─── Evidence Feed Tab ─── */}
      {viewMode === "feed" && (
        <div className="space-y-4">
          {/* Agent Filter */}
          <div className="flex items-center gap-3">
            <select
              value={selectedAgentId ?? ""}
              onChange={(e) => setSelectedAgentId(e.target.value || null)}
              className="px-3 py-2 rounded-lg text-body bg-[var(--fill-light)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none"
            >
              <option value="">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="text-caption text-[var(--text-tertiary)]">
              {packets.length} packet{packets.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Packet List */}
          <Card variant="elevated">
            <CardContent className="p-0">
              {packets.map((packet, i) => (
                <PacketRow
                  key={packet.id}
                  packet={packet}
                  isLast={i === packets.length - 1}
                />
              ))}
              {packets.length === 0 && (
                <div className="py-12 text-center">
                  <Database className="w-6 h-6 text-[var(--text-tertiary)] mx-auto mb-2" />
                  <p className="text-body text-[var(--text-secondary)]">
                    No evidence packets
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  total,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  total?: number;
  icon: typeof Activity;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-500 bg-emerald-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    red: "text-red-500 bg-red-500/10",
    slate: "text-slate-400 bg-slate-500/10",
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <Card variant="elevated">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${c}`}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-caption text-[var(--text-tertiary)] uppercase tracking-wider">
              {label}
            </p>
            <p className="text-title font-semibold text-[var(--text-primary)] tabular-nums">
              {value}
              {total !== undefined && (
                <span className="text-caption font-normal text-[var(--text-tertiary)] ml-1">
                  / {total}
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentCard({
  agent,
  selected,
  onSelect,
  onVerifyChain,
  onCrossVerify,
  onToggleStatus,
  verifyingChain,
  crossVerifying,
  chainResult,
  crossResult,
}: {
  agent: SentinelAgent;
  selected: boolean;
  onSelect: () => void;
  onVerifyChain: () => void;
  onCrossVerify: () => void;
  onToggleStatus: (action: "activate" | "revoke") => void;
  verifyingChain: boolean;
  crossVerifying: boolean;
  chainResult: ChainVerification | null;
  crossResult: { total: number; verified: number; failed: number } | null;
}) {
  const isActive = agent.status === "ACTIVE";
  const isOnline =
    agent.last_seen &&
    Date.now() - new Date(agent.last_seen).getTime() < 5 * 60 * 1000;

  return (
    <Card variant={selected ? "elevated" : "default"}>
      <CardContent className="py-3">
        <button onClick={onSelect} className="w-full text-left">
          <div className="flex items-center gap-3">
            {/* Status dot */}
            <div className="relative">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-500"
                    : agent.status === "PENDING"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-slate-500/10 text-slate-400"
                }`}
              >
                <Satellite className="w-4.5 h-4.5" />
              </div>
              {isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--bg-primary)]" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-body font-medium text-[var(--text-primary)] truncate">
                  {agent.name}
                </p>
                <Badge
                  variant={
                    isActive
                      ? "success"
                      : agent.status === "PENDING"
                        ? "warning"
                        : "default"
                  }
                >
                  {agent.status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-caption text-[var(--text-tertiary)]">
                  {agent.sentinel_id}
                </span>
                <span className="text-caption text-[var(--text-tertiary)]">
                  {agent.chain_position} packets
                </span>
                <span className="text-caption text-[var(--text-tertiary)]">
                  {timeAgo(agent.last_seen)}
                </span>
              </div>
            </div>

            <ChevronRight
              className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${selected ? "rotate-90" : ""}`}
            />
          </div>
        </button>

        {/* Expanded Detail */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]">
                {/* Collectors */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {agent.enabled_collectors.map((c) => (
                    <span
                      key={c}
                      className="text-micro px-2 py-0.5 rounded-md bg-[var(--fill-light)] text-[var(--text-secondary)]"
                    >
                      {COLLECTOR_LABELS[c] || c}
                    </span>
                  ))}
                  {agent.version && (
                    <span className="text-micro px-2 py-0.5 rounded-md bg-[var(--fill-light)] text-[var(--text-tertiary)] font-mono">
                      v{agent.version}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onVerifyChain();
                    }}
                    disabled={verifyingChain}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium bg-[var(--fill-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
                  >
                    {verifyingChain ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Link2 className="w-3 h-3" />
                    )}
                    Verify Chain
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCrossVerify();
                    }}
                    disabled={crossVerifying}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium bg-[var(--fill-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40"
                  >
                    {crossVerifying ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3 h-3" />
                    )}
                    Cross-Verify
                  </button>
                  {isActive ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus("revoke");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                    >
                      <XCircle className="w-3 h-3" />
                      Revoke
                    </button>
                  ) : agent.status === "REVOKED" ? null : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStatus("activate");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors ml-auto"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Activate
                    </button>
                  )}
                </div>

                {/* Chain Result */}
                {chainResult && (
                  <div
                    className={`mt-3 px-3 py-2 rounded-lg text-caption ${
                      chainResult.valid
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {chainResult.valid ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      <span className="font-medium">
                        {chainResult.valid
                          ? `Chain intact — ${chainResult.total_packets} packets verified`
                          : `Chain broken — ${chainResult.breaks.length} break${chainResult.breaks.length > 1 ? "s" : ""} detected`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Cross-Verify Result */}
                {crossResult && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-caption">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        Cross-verified: {crossResult.verified}/
                        {crossResult.total} packets
                        {crossResult.failed > 0 && (
                          <span className="text-red-400 ml-1">
                            ({crossResult.failed} failed)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function AgentDetailCard(props: {
  agent: SentinelAgent;
  onVerifyChain: () => void;
  onCrossVerify: () => void;
  onToggleStatus: (action: "activate" | "revoke") => void;
  verifyingChain: boolean;
  crossVerifying: boolean;
  chainResult: ChainVerification | null;
  crossResult: { total: number; verified: number; failed: number } | null;
  onSelect: () => void;
}) {
  return (
    <AgentCard
      agent={props.agent}
      selected={true}
      onSelect={props.onSelect}
      onVerifyChain={props.onVerifyChain}
      onCrossVerify={props.onCrossVerify}
      onToggleStatus={props.onToggleStatus}
      verifyingChain={props.verifyingChain}
      crossVerifying={props.crossVerifying}
      chainResult={props.chainResult}
      crossResult={props.crossResult}
    />
  );
}

function MiniPacketRow({
  packet,
  isLast,
}: {
  packet: EvidencePacket;
  isLast: boolean;
}) {
  const Icon = DATA_POINT_ICONS[packet.data_point] || Database;
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 ${!isLast ? "border-b border-[var(--border-subtle)]" : ""}`}
    >
      <Icon className="w-3.5 h-3.5 text-[var(--text-tertiary)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-caption text-[var(--text-primary)] truncate">
          {DATA_POINT_LABELS[packet.data_point] || packet.data_point}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {packet.signature_valid ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        ) : (
          <AlertCircle className="w-3 h-3 text-red-400" />
        )}
        <span className="text-micro text-[var(--text-tertiary)] tabular-nums">
          {timeAgo(packet.collected_at)}
        </span>
      </div>
    </div>
  );
}

function PacketRow({
  packet,
  isLast,
}: {
  packet: EvidencePacket;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = DATA_POINT_ICONS[packet.data_point] || Database;

  return (
    <div
      className={`${!isLast ? "border-b border-[var(--border-subtle)]" : ""}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--fill-light)] transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--fill-light)] flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-body font-medium text-[var(--text-primary)]">
              {DATA_POINT_LABELS[packet.data_point] || packet.data_point}
            </p>
            {packet.satellite_norad && (
              <span className="text-micro px-1.5 py-0.5 rounded bg-[var(--fill-light)] text-[var(--text-tertiary)] font-mono">
                {packet.satellite_norad}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-caption text-[var(--text-tertiary)]">
              #{packet.chain_position}
            </span>
            <span className="text-caption text-[var(--text-tertiary)]">
              {packet.source_system}
            </span>
            <span className="text-caption text-[var(--text-tertiary)]">
              {timeAgo(packet.collected_at)}
            </span>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center gap-2">
          {packet.trust_score !== null && (
            <span
              className={`text-micro font-medium px-1.5 py-0.5 rounded ${
                packet.trust_score >= 0.8
                  ? "bg-emerald-500/10 text-emerald-400"
                  : packet.trust_score >= 0.5
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-red-500/10 text-red-400"
              }`}
            >
              {(packet.trust_score * 100).toFixed(0)}%
            </span>
          )}
          {packet.signature_valid ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
          {packet.cross_verified && (
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Expanded Detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-lg bg-[var(--fill-light)]">
                <DetailItem
                  label="Content Hash"
                  value={
                    packet.content_hash
                      ? truncateHash(packet.content_hash)
                      : "—"
                  }
                  mono
                />
                <DetailItem
                  label="Previous Hash"
                  value={
                    packet.previous_hash
                      ? truncateHash(packet.previous_hash)
                      : "—"
                  }
                  mono
                />
                <DetailItem
                  label="Chain Valid"
                  value={packet.chain_valid ? "Yes" : "No"}
                  color={packet.chain_valid ? "emerald" : "red"}
                />
                <DetailItem
                  label="Collection"
                  value={packet.collection_method}
                />
              </div>
              {packet.compliance_notes?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {packet.compliance_notes.map((note, i) => (
                    <span
                      key={i}
                      className="text-micro px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
  color,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}) {
  const colorClass =
    color === "emerald"
      ? "text-emerald-400"
      : color === "red"
        ? "text-red-400"
        : "text-[var(--text-primary)]";
  return (
    <div>
      <p className="text-micro text-[var(--text-tertiary)] uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className={`text-caption ${mono ? "font-mono" : ""} ${colorClass}`}>
        {value}
      </p>
    </div>
  );
}

function SetupGuide({
  onClose,
  onGenerateToken,
  generatingToken,
  generatedToken,
  tokenCopied,
  onCopyToken,
}: {
  onClose: () => void;
  onGenerateToken: () => void;
  generatingToken: boolean;
  generatedToken: string | null;
  tokenCopied: boolean;
  onCopyToken: () => void;
}) {
  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            <Terminal className="w-4 h-4 inline mr-2" />
            Deploy Sentinel Agent
          </CardTitle>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Step 1: Generate Token */}
        <div className="flex gap-4">
          <div className="w-7 h-7 rounded-full bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] flex items-center justify-center text-caption font-semibold flex-shrink-0">
            1
          </div>
          <div className="flex-1">
            <p className="text-body font-medium text-[var(--text-primary)] mb-1">
              Generate Authentication Token
            </p>
            <p className="text-caption text-[var(--text-secondary)] mb-3">
              This token authenticates your agent with the Sentinel API. Store
              it securely — it is shown only once.
            </p>

            {!generatedToken ? (
              <button
                onClick={onGenerateToken}
                disabled={generatingToken}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-caption font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {generatingToken ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Key className="w-3.5 h-3.5" />
                )}
                Generate Token
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--fill-light)] text-caption font-mono text-[var(--text-primary)] truncate border border-[var(--border-subtle)]">
                  {generatedToken}
                </code>
                <button
                  onClick={onCopyToken}
                  className="p-2 rounded-lg bg-[var(--fill-light)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {tokenCopied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Install Agent */}
        <div className="flex gap-4">
          <div className="w-7 h-7 rounded-full bg-[var(--fill-light)] text-[var(--text-secondary)] flex items-center justify-center text-caption font-semibold flex-shrink-0">
            2
          </div>
          <div className="flex-1">
            <p className="text-body font-medium text-[var(--text-primary)] mb-1">
              Install the Agent
            </p>
            <p className="text-caption text-[var(--text-secondary)] mb-3">
              Deploy on your ground infrastructure (GCS, mission control, CI/CD
              pipeline).
            </p>
            <div className="px-3 py-2 rounded-lg bg-[var(--fill-light)] font-mono text-caption text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              <span className="text-[var(--text-tertiary)]">$</span> npm install
              @caelex/sentinel-agent
            </div>
          </div>
        </div>

        {/* Step 3: Configure */}
        <div className="flex gap-4">
          <div className="w-7 h-7 rounded-full bg-[var(--fill-light)] text-[var(--text-secondary)] flex items-center justify-center text-caption font-semibold flex-shrink-0">
            3
          </div>
          <div className="flex-1">
            <p className="text-body font-medium text-[var(--text-primary)] mb-1">
              Configure &amp; Run
            </p>
            <div className="px-3 py-2 rounded-lg bg-[var(--fill-light)] font-mono text-micro text-[var(--text-secondary)] border border-[var(--border-subtle)] space-y-0.5">
              <p>
                <span className="text-[var(--accent-primary)]">
                  SENTINEL_TOKEN
                </span>
                =&quot;snt_...&quot;
              </p>
              <p>
                <span className="text-[var(--accent-primary)]">
                  SENTINEL_ENDPOINT
                </span>
                =&quot;https://caelex.eu/api/v1/sentinel&quot;
              </p>
              <p>
                <span className="text-[var(--accent-primary)]">
                  SENTINEL_COLLECTORS
                </span>
                =&quot;orbit_debris,cybersecurity&quot;
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
