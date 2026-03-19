"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  FileCheck,
  Award,
  Search,
  Plus,
  BookMarked,
  BarChart2,
  Users,
  GitBranch,
  Copy,
  Check,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import GlassMotion from "@/components/ui/GlassMotion";
import AttestationGenerator from "./components/attestation-generator";
import AttestationExplainer from "./components/attestation-explainer";
import CertificateList from "./components/certificate-list";
import VerificationWidget from "./components/verification-widget";
import { REGULATION_THRESHOLDS } from "@/lib/verity/evaluation/regulation-thresholds";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Satellite {
  noradId: string;
  name: string;
}

interface PassportEntry {
  passportId: string;
  label: string;
  complianceScore: number;
  shareUrl: string;
  expiresAt: string;
  generatedAt: string;
}

interface ScoreBreakdown {
  debris: number;
  cybersecurity: number;
  authorization: number;
  environmental: number;
  spectrum: number;
  insurance: number;
}

interface ComplianceScore {
  overall: number;
  breakdown: ScoreBreakdown;
  attestationCount: number;
  passingCount: number;
  failingCount: number;
  expiredCount: number;
  coveragePercent: number;
  trend: string;
  computedAt: string;
}

interface ChainVerificationResult {
  valid: boolean;
  totalEntries: number;
  brokenAt: number | null;
  firstEntry: string;
  lastEntry: string;
  errors: string[];
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type TabId =
  | "generate"
  | "certificates"
  | "verify"
  | "passport"
  | "score"
  | "p2p"
  | "audit";

// ─── Helper: score colour ─────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score < 40) return "text-red-400";
  if (score < 70) return "text-amber-400";
  return "text-emerald-400";
}

function scoreBg(score: number): string {
  if (score < 40) return "bg-red-500";
  if (score < 70) return "bg-amber-500";
  return "bg-emerald-500";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VerityDashboard() {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("generate");

  // Passport state
  const [passports, setPassports] = useState<PassportEntry[]>([]);
  const [generatingPassport, setGeneratingPassport] = useState(false);
  const [passportError, setPassportError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Score state
  const [score, setScore] = useState<ComplianceScore | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  // P2P state
  const [p2pTargetOrgId, setP2pTargetOrgId] = useState("");
  const [p2pRegRefs, setP2pRegRefs] = useState<string[]>([]);
  const [p2pPurpose, setP2pPurpose] = useState("compliance_check");
  const [p2pMessage, setP2pMessage] = useState("");
  const [p2pSubmitting, setP2pSubmitting] = useState(false);
  const [p2pResult, setP2pResult] = useState<{
    requestId: string;
    status: string;
  } | null>(null);
  const [p2pError, setP2pError] = useState<string | null>(null);

  // Audit chain state
  const [chainResult, setChainResult] =
    useState<ChainVerificationResult | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [chainError, setChainError] = useState<string | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  useEffect(() => {
    loadSatellites();
  }, []);

  const loadSatellites = async () => {
    try {
      const res = await fetch("/api/v1/spacecraft", {
        headers: csrfHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSatellites(
          (data.spacecraft ?? []).map(
            (s: { noradId: string; name: string }) => ({
              noradId: s.noradId,
              name: s.name,
            }),
          ),
        );
      }
    } catch {
      // Silently fail
    }
  };

  const fetchScore = useCallback(async () => {
    setScoreLoading(true);
    setScoreError(null);
    try {
      // Use "me" as a placeholder org ID — the API accepts any operatorId
      const res = await fetch("/api/v1/verity/score/me");
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to load score");
      }
      const data = (await res.json()) as { score: ComplianceScore };
      setScore(data.score);
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setScoreLoading(false);
    }
  }, []);

  const verifyChain = useCallback(async () => {
    setChainLoading(true);
    setChainError(null);
    try {
      const res = await fetch("/api/v1/verity/audit-chain/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ operatorId: "me" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to verify chain");
      }
      const data = (await res.json()) as ChainVerificationResult;
      setChainResult(data);
    } catch (err) {
      setChainError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setChainLoading(false);
    }
  }, []);

  // Load score when Score tab is activated; load audit chain when Audit tab is activated
  useEffect(() => {
    if (activeTab === "score" && !score) {
      void fetchScore();
    }
    if (activeTab === "audit" && !chainResult) {
      void verifyChain();
    }
  }, [activeTab, score, chainResult, fetchScore, verifyChain]);

  // ── Passport handlers ──────────────────────────────────────────────────────

  const handleGeneratePassport = async () => {
    setGeneratingPassport(true);
    setPassportError(null);
    try {
      const res = await fetch("/api/v1/verity/passport/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ label: "Compliance Passport", isPublic: true }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to generate passport");
      }
      const data = (await res.json()) as {
        passport: {
          passportId: string;
          label: string;
          complianceScore: number;
          generatedAt: string;
          expiresAt: string;
        };
        shareUrl: string;
      };
      setPassports((prev) => [
        {
          passportId: data.passport.passportId,
          label: data.passport.label,
          complianceScore: data.passport.complianceScore,
          shareUrl: data.shareUrl,
          expiresAt: data.passport.expiresAt,
          generatedAt: data.passport.generatedAt,
        },
        ...prev,
      ]);
    } catch (err) {
      setPassportError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGeneratingPassport(false);
    }
  };

  const handleCopy = (id: string, url: string) => {
    void navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── P2P handlers ───────────────────────────────────────────────────────────

  const handleP2PSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setP2pSubmitting(true);
    setP2pError(null);
    setP2pResult(null);
    try {
      const res = await fetch("/api/v1/verity/p2p/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          targetOrgId: p2pTargetOrgId,
          regulationRefs: p2pRegRefs,
          purpose: p2pPurpose,
          message: p2pMessage || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to submit request");
      }
      const data = (await res.json()) as { requestId: string; status: string };
      setP2pResult(data);
      // Reset form
      setP2pTargetOrgId("");
      setP2pRegRefs([]);
      setP2pMessage("");
    } catch (err) {
      setP2pError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setP2pSubmitting(false);
    }
  };

  const toggleRegRef = (ref: string) => {
    setP2pRegRefs((prev) =>
      prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref],
    );
  };

  // ── Tab definitions ────────────────────────────────────────────────────────

  const regulations = REGULATION_THRESHOLDS.map((t) => ({
    id: t.id,
    regulation_ref: t.regulation_ref,
    regulation_name: t.regulation_name,
  }));

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "generate", label: "Generate Attestation", icon: Shield },
    { id: "certificates", label: "Certificates", icon: Award },
    { id: "verify", label: "Verify", icon: Search },
    { id: "passport", label: "Passport", icon: BookMarked },
    { id: "score", label: "Score", icon: BarChart2 },
    { id: "p2p", label: "P2P", icon: Users },
    { id: "audit", label: "Audit Trail", icon: GitBranch },
  ];

  const CATEGORY_LABELS: Record<keyof ScoreBreakdown, string> = {
    debris: "Debris Mitigation",
    cybersecurity: "Cybersecurity (NIS2)",
    authorization: "Authorization",
    environmental: "Environmental",
    spectrum: "Spectrum / ITU",
    insurance: "Insurance",
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-sm font-semibold text-white">Verity</h1>
          <p className="text-body text-[var(--text-tertiary)] mt-1">
            Privacy-Preserving Compliance Attestation
          </p>
        </div>
        <a
          href="/verity/verify"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 text-small text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <FileCheck className="w-4 h-4" />
          Public Verification
        </a>
      </div>

      {/* Explainer */}
      <AttestationExplainer />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-[var(--surface-sunken)] rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-small font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[var(--surface-sunken)] text-white"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Generate Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "generate" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Generate Attestation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttestationGenerator
              satellites={satellites}
              regulations={regulations}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Certificates Tab ─────────────────────────────────────────────────── */}
      {activeTab === "certificates" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CertificateList />
          </CardContent>
        </Card>
      )}

      {/* ── Verify Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "verify" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Verify Attestation or Certificate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VerificationWidget />
          </CardContent>
        </Card>
      )}

      {/* ── Passport Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "passport" && (
        <GlassMotion>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookMarked className="w-5 h-5" />
                Compliance Passport
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Generate button */}
              <div className="flex items-center gap-4">
                <Button
                  variant="primary"
                  onClick={() => void handleGeneratePassport()}
                  loading={generatingPassport}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Generate Passport
                </Button>
                <p className="text-small text-[var(--text-tertiary)]">
                  Creates a shareable passport from your active attestations.
                </p>
              </div>

              {/* Error */}
              {passportError && (
                <p className="text-small text-red-400">{passportError}</p>
              )}

              {/* Passport list */}
              {passports.length === 0 ? (
                <p className="text-body text-[var(--text-tertiary)]">
                  No passports generated yet. Click above to create one.
                </p>
              ) : (
                <div className="space-y-3">
                  {passports.map((p) => (
                    <div
                      key={p.passportId}
                      className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-body font-medium text-white">
                          {p.label}
                        </span>
                        <span
                          className={`text-heading font-bold ${scoreColor(p.complianceScore)}`}
                        >
                          {p.complianceScore}
                        </span>
                      </div>

                      {/* Share URL row */}
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={p.shareUrl}
                          className="flex-1 text-small bg-transparent border border-[var(--border-subtle)] rounded px-3 py-1.5 text-[var(--text-secondary)] focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopy(p.passportId, p.shareUrl)}
                          className="flex items-center gap-1 text-small text-[var(--text-tertiary)] hover:text-white transition-colors px-2 py-1.5"
                          title="Copy link"
                        >
                          {copiedId === p.passportId ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-4 text-caption text-[var(--text-tertiary)]">
                        <span>
                          Expires:{" "}
                          {new Date(p.expiresAt).toLocaleDateString("en-GB")}
                        </span>
                        <span>
                          Generated:{" "}
                          {new Date(p.generatedAt).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </GlassMotion>
      )}

      {/* ── Score Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === "score" && (
        <GlassMotion>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5" />
                  Compliance Score
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void fetchScore()}
                  loading={scoreLoading}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {scoreLoading && !score && (
                <p className="text-body text-[var(--text-tertiary)]">
                  Loading score…
                </p>
              )}

              {scoreError && (
                <p className="text-small text-red-400">{scoreError}</p>
              )}

              {score && (
                <>
                  {/* Overall score */}
                  <div className="flex items-end gap-4">
                    <span
                      className={`text-[72px] font-bold leading-none ${scoreColor(score.overall)}`}
                    >
                      {score.overall}
                    </span>
                    <div className="pb-2 space-y-0.5">
                      <p className="text-small text-[var(--text-tertiary)]">
                        / 100
                      </p>
                      <p className="text-caption text-[var(--text-tertiary)] capitalize">
                        Trend: {score.trend}
                      </p>
                    </div>
                  </div>

                  {/* Category breakdown bars */}
                  <div className="space-y-3">
                    {(
                      Object.keys(CATEGORY_LABELS) as (keyof ScoreBreakdown)[]
                    ).map((cat) => {
                      const val = score.breakdown[cat];
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-small">
                            <span className="text-[var(--text-secondary)]">
                              {CATEGORY_LABELS[cat]}
                            </span>
                            <span className={scoreColor(val)}>{val}</span>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--surface-sunken)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${scoreBg(val)}`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    {[
                      {
                        label: "Attestations",
                        value: score.attestationCount,
                        color: "text-white",
                      },
                      {
                        label: "Passing",
                        value: score.passingCount,
                        color: "text-emerald-400",
                      },
                      {
                        label: "Failing",
                        value: score.failingCount,
                        color: "text-red-400",
                      },
                      {
                        label: "Expired",
                        value: score.expiredCount,
                        color: "text-amber-400",
                      },
                      {
                        label: "Coverage",
                        value: `${score.coveragePercent}%`,
                        color: scoreColor(score.coveragePercent),
                      },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="p-3 rounded-lg bg-[var(--surface-sunken)] text-center"
                      >
                        <p className={`text-heading font-bold ${color}`}>
                          {value}
                        </p>
                        <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </GlassMotion>
      )}

      {/* ── P2P Tab ────────────────────────────────────────────────────────────── */}
      {activeTab === "p2p" && (
        <GlassMotion>
          <div className="space-y-4">
            {/* New request form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  New Verification Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => void handleP2PSubmit(e)}
                  className="space-y-4"
                >
                  {/* Target org ID */}
                  <div className="space-y-1.5">
                    <label className="text-small font-medium text-[var(--text-secondary)]">
                      Target Organisation ID
                    </label>
                    <input
                      required
                      value={p2pTargetOrgId}
                      onChange={(e) => setP2pTargetOrgId(e.target.value)}
                      placeholder="org_…"
                      className="w-full text-body bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)]"
                    />
                  </div>

                  {/* Regulation refs */}
                  <div className="space-y-1.5">
                    <label className="text-small font-medium text-[var(--text-secondary)]">
                      Regulation References
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {regulations.slice(0, 8).map((r) => (
                        <label
                          key={r.id}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={p2pRegRefs.includes(r.regulation_ref)}
                            onChange={() => toggleRegRef(r.regulation_ref)}
                            className="accent-emerald-500"
                          />
                          <span className="text-caption text-[var(--text-secondary)]">
                            {r.regulation_ref}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Purpose */}
                  <div className="space-y-1.5">
                    <label className="text-small font-medium text-[var(--text-secondary)]">
                      Purpose
                    </label>
                    <select
                      value={p2pPurpose}
                      onChange={(e) => setP2pPurpose(e.target.value)}
                      className="w-full text-body bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[var(--border-focus)]"
                    >
                      <option value="compliance_check">Compliance Check</option>
                      <option value="due_diligence">Due Diligence</option>
                      <option value="partnership">
                        Partnership Onboarding
                      </option>
                      <option value="regulatory">Regulatory Submission</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="text-small font-medium text-[var(--text-secondary)]">
                      Message{" "}
                      <span className="text-[var(--text-tertiary)]">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      value={p2pMessage}
                      onChange={(e) => setP2pMessage(e.target.value)}
                      rows={3}
                      placeholder="Provide context for the verification request…"
                      className="w-full text-body bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-focus)] resize-none"
                    />
                  </div>

                  {p2pError && (
                    <p className="text-small text-red-400">{p2pError}</p>
                  )}

                  {p2pResult && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <p className="text-small text-emerald-300">
                        Request sent — ID:{" "}
                        <span className="font-mono">{p2pResult.requestId}</span>{" "}
                        · Status: {p2pResult.status}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    loading={p2pSubmitting}
                    disabled={p2pRegRefs.length === 0}
                    icon={<Send className="w-4 h-4" />}
                  >
                    Send Request
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Incoming requests placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Incoming Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-body text-[var(--text-tertiary)]">
                  Verification requests from other operators will appear here.
                </p>
              </CardContent>
            </Card>
          </div>
        </GlassMotion>
      )}

      {/* ── Audit Trail Tab ───────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <GlassMotion>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Audit Trail
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void verifyChain()}
                  loading={chainLoading}
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Verify Chain
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {chainLoading && !chainResult && (
                <p className="text-body text-[var(--text-tertiary)]">
                  Verifying chain integrity…
                </p>
              )}

              {chainError && (
                <p className="text-small text-red-400">{chainError}</p>
              )}

              {chainResult && (
                <>
                  {/* Integrity status */}
                  <div
                    className={`flex items-center gap-3 p-4 rounded-lg border ${
                      chainResult.valid
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-red-500/10 border-red-500/20"
                    }`}
                  >
                    {chainResult.valid ? (
                      <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                    )}
                    <div>
                      <p
                        className={`text-body font-medium ${
                          chainResult.valid
                            ? "text-emerald-300"
                            : "text-red-300"
                        }`}
                      >
                        {chainResult.valid
                          ? "Chain integrity verified"
                          : "Chain integrity compromised"}
                      </p>
                      {!chainResult.valid && chainResult.brokenAt !== null && (
                        <p className="text-small text-red-400 mt-0.5">
                          Break detected at entry #{chainResult.brokenAt}
                        </p>
                      )}
                      {!chainResult.valid && chainResult.errors.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {chainResult.errors.map((e, i) => (
                            <li
                              key={i}
                              className="text-small text-red-400 list-disc list-inside"
                            >
                              {e}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Chain stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-[var(--surface-sunken)] text-center">
                      <p className="text-heading font-bold text-white">
                        {chainResult.totalEntries}
                      </p>
                      <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
                        Total Entries
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--surface-sunken)] text-center">
                      <p className="text-small font-medium text-white truncate">
                        {chainResult.firstEntry
                          ? new Date(chainResult.firstEntry).toLocaleString(
                              "en-GB",
                            )
                          : "—"}
                      </p>
                      <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
                        First Entry
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[var(--surface-sunken)] text-center">
                      <p className="text-small font-medium text-white truncate">
                        {chainResult.lastEntry
                          ? new Date(chainResult.lastEntry).toLocaleString(
                              "en-GB",
                            )
                          : "—"}
                      </p>
                      <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
                        Last Entry
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </GlassMotion>
      )}
    </div>
  );
}
