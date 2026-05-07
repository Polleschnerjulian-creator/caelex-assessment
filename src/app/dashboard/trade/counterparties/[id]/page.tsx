/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /dashboard/trade/counterparties/[id] — TradeParty detail + on-demand screening.
 *
 * Two-column layout:
 *   left: identity, identifiers, risk markers
 *   right: screening status panel + "Screen now" button + recent screening history
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { BeneficialOwnersPanel } from "@/components/trade/BeneficialOwnersPanel";
import {
  ArrowLeft,
  Globe,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Clock,
  Hash,
  ExternalLink,
} from "lucide-react";

interface ScreeningHit {
  entryId: string;
  matchedName: string;
  score: number;
  list: string;
  matchedFields: string[];
}

interface ScreeningRow {
  id: string;
  decision:
    | "CLEAR"
    | "POTENTIAL_MATCH"
    | "CONFIRMED_HIT"
    | "FALSE_POSITIVE_DISMISSED";
  decidedAt: string | null;
  createdAt: string;
  snapshotHash: string;
  hits: ScreeningHit[];
  notes: string | null;
  decidedBy: { id: string; name: string | null; email: string } | null;
}

interface PartyDetail {
  id: string;
  legalName: string;
  tradeName: string | null;
  countryCode: string;
  addressLines: string[];
  canonicalName: string;
  vatNumber: string | null;
  ducnsNumber: string | null;
  leiCode: string | null;
  cageCode: string | null;
  isUSPerson: boolean;
  isHighRiskCountry: boolean;
  status: "ACTIVE" | "ARCHIVED" | "BLOCKED";
  screeningStatus:
    | "NOT_SCREENED"
    | "CLEAR"
    | "POTENTIAL_MATCH"
    | "CONFIRMED_HIT"
    | "STALE";
  blockedReason: string | null;
  lastScreenedAt: string | null;
  createdAt: string;
  updatedAt: string;
  screenings: ScreeningRow[];
}

const SANS =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
const DISPLAY =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

export default function CounterpartyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [party, setParty] = useState<PartyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [screening, setScreening] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/trade/parties/${id}`);
      if (res.ok) {
        const data = await res.json();
        setParty(data.party);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runScreen() {
    setScreening(true);
    setScreenError(null);
    try {
      const res = await fetch(`/api/trade/parties/${id}/screen`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setScreenError(data.error ?? "Screening failed");
        return;
      }
      // Reload to get fresh screening history
      await reload();
    } catch (err) {
      setScreenError(err instanceof Error ? err.message : "Network error");
    } finally {
      setScreening(false);
    }
  }

  if (loading && !party) {
    return (
      <div
        className="mx-auto max-w-screen-2xl px-8 py-8"
        style={{ fontFamily: SANS, color: "rgba(255,255,255,0.5)" }}
      >
        Loading…
      </div>
    );
  }
  if (!party) {
    return (
      <div
        className="mx-auto max-w-screen-2xl px-8 py-8"
        style={{ fontFamily: SANS, color: "rgba(255,255,255,0.5)" }}
      >
        Counterparty not found.{" "}
        <Link
          href="/dashboard/trade/counterparties"
          className="underline decoration-dotted"
        >
          ← back to list
        </Link>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-screen-2xl px-8 py-8"
      style={{ fontFamily: SANS, letterSpacing: "-0.005em" }}
    >
      <Link
        href="/dashboard/trade/counterparties"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px]"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        <ArrowLeft className="h-3 w-3" /> Counterparties
      </Link>

      <header
        className="mb-6 flex items-start justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="min-w-0">
          <h1
            className="text-[28px] font-semibold text-white"
            style={{
              fontFamily: DISPLAY,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            {party.legalName}
          </h1>
          {party.tradeName && (
            <p
              className="mt-1 text-[13px]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              d/b/a {party.tradeName}
            </p>
          )}
          <div
            className="mt-3 flex items-center gap-3 text-[12px]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            <span className="flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> {party.countryCode}
              {party.isHighRiskCountry && (
                <span style={{ color: "rgb(251,191,36)" }}>· high-risk</span>
              )}
            </span>
            {party.isUSPerson && <span>· US person</span>}
            {party.status === "BLOCKED" && (
              <span style={{ color: "rgb(248,113,113)" }}>
                · Blocked: {party.blockedReason ?? "no reason given"}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={runScreen}
          disabled={screening}
          className="flex shrink-0 items-center gap-2 rounded-lg px-5 py-3 text-[13px] font-semibold transition-all disabled:opacity-60"
          style={{
            background: "rgba(16, 185, 129, 0.16)",
            color: "rgb(52,211,153)",
            boxShadow: "inset 0 0 0 0.5px rgba(16,185,129,0.4)",
          }}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${screening ? "animate-spin" : ""}`}
          />
          {screening ? "Screening…" : "Screen now"}
        </button>
      </header>

      {screenError && (
        <div
          className="mb-6 rounded-lg px-4 py-3 text-[13px]"
          style={{
            background: "rgba(239,68,68,0.12)",
            color: "rgb(248,113,113)",
          }}
        >
          {screenError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Identity & Identifiers */}
        <section
          className="rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.025)",
            boxShadow:
              "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 0 0.5px rgba(255,255,255,0.06)",
          }}
        >
          <h2
            className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Identity
          </h2>
          <KV
            label="Canonical (fuzzy-match)"
            value={party.canonicalName || "—"}
            mono
          />
          <KV
            label="Address"
            value={
              party.addressLines.length > 0
                ? party.addressLines.join(", ")
                : "—"
            }
          />
          <KV label="VAT" value={party.vatNumber ?? "—"} mono />
          <KV label="D-U-N-S" value={party.ducnsNumber ?? "—"} mono />
          <KV label="LEI" value={party.leiCode ?? "—"} mono />
          <KV label="CAGE" value={party.cageCode ?? "—"} mono />
          <KV
            label="Created"
            value={new Date(party.createdAt).toLocaleString("en-GB")}
          />
        </section>

        {/* Right: Screening status + history */}
        <section className="space-y-6">
          {/* Status panel */}
          <div
            className="rounded-2xl p-6"
            style={statusPanelStyle(party.screeningStatus)}
          >
            <div className="mb-3 flex items-center gap-3">
              <ScreeningIcon status={party.screeningStatus} />
              <div>
                <div
                  className="text-[15px] font-semibold"
                  style={{ color: "rgba(255,255,255,0.95)" }}
                >
                  {statusLabel(party.screeningStatus)}
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {party.lastScreenedAt
                    ? `Last screened ${new Date(party.lastScreenedAt).toLocaleString("en-GB")}`
                    : "Has never been screened"}
                </div>
              </div>
            </div>
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              {statusExplain(party.screeningStatus)}
            </p>
          </div>

          {/* Recent screening history */}
          <div
            className="rounded-2xl"
            style={{
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)",
            }}
          >
            <div
              className="border-b px-5 py-3"
              style={{
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <h2
                className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Screening History
              </h2>
            </div>
            {party.screenings.length === 0 ? (
              <div
                className="px-5 py-6 text-center text-[12px]"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                No screening runs yet. Click <strong>Screen now</strong> to
                check this counterparty against the latest sanctions snapshots.
              </div>
            ) : (
              <ul>
                {party.screenings.map((s) => (
                  <ScreeningRowItem
                    key={s.id}
                    row={s}
                    partyId={party.id}
                    onDecided={reload}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Beneficial Owners — Wave A Sprint A6 (50%-rule cascade input) */}
      <div className="mt-6">
        <BeneficialOwnersPanel partyId={party.id} partyName={party.legalName} />
      </div>

      {/* Disclaimer */}
      <p
        className="mt-8 max-w-3xl text-[11px] leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.4)" }}
      >
        Sanctions-Treffer erfordern menschliche Triage durch qualifizierten AV.
        Score-Bänder folgen FATF/Wolfsberg-Standard: ≥0.95 confirmed, ≥0.85
        potential, ≥0.75 weak. Snapshot-Hash dokumentiert die exakte
        List-Version zum Screening-Zeitpunkt für Audit-Anforderungen (5+ Jahre
        Aufbewahrung per §22 AWV / 15 CFR Part 762).
      </p>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 border-b py-2 last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      <div
        className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {label}
      </div>
      <div
        className={`min-w-0 truncate text-right text-[13px] ${
          mono ? "font-mono" : ""
        }`}
        style={{ color: "rgba(255,255,255,0.85)" }}
      >
        {value}
      </div>
    </div>
  );
}

function ScreeningIcon({ status }: { status: PartyDetail["screeningStatus"] }) {
  const common = { className: "h-7 w-7 shrink-0", strokeWidth: 1.75 };
  if (status === "CLEAR")
    return <ShieldCheck {...common} style={{ color: "rgb(52,211,153)" }} />;
  if (status === "POTENTIAL_MATCH")
    return <AlertTriangle {...common} style={{ color: "rgb(251,191,36)" }} />;
  if (status === "CONFIRMED_HIT")
    return <ShieldAlert {...common} style={{ color: "rgb(248,113,113)" }} />;
  if (status === "STALE")
    return <Clock {...common} style={{ color: "rgb(251,146,60)" }} />;
  return <Shield {...common} style={{ color: "rgba(255,255,255,0.4)" }} />;
}

function statusPanelStyle(
  status: PartyDetail["screeningStatus"],
): React.CSSProperties {
  const colors: Record<PartyDetail["screeningStatus"], string> = {
    NOT_SCREENED: "rgba(255,255,255,0.06)",
    CLEAR: "rgba(16, 185, 129, 0.20)",
    POTENTIAL_MATCH: "rgba(251, 191, 36, 0.30)",
    CONFIRMED_HIT: "rgba(239, 68, 68, 0.30)",
    STALE: "rgba(251, 146, 60, 0.25)",
  };
  return {
    background: "rgba(255,255,255,0.03)",
    boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 0 0.5px ${colors[status]}`,
  };
}

function statusLabel(status: PartyDetail["screeningStatus"]): string {
  return {
    NOT_SCREENED: "Not screened yet",
    CLEAR: "Clear — no sanctions match",
    POTENTIAL_MATCH: "Potential match — review required",
    CONFIRMED_HIT: "Confirmed hit — block transactions",
    STALE: "Stale — last screen >30 days ago",
  }[status];
}

function statusExplain(status: PartyDetail["screeningStatus"]): string {
  return {
    NOT_SCREENED:
      "This counterparty has not been screened against any sanctions list yet. Run a screening before any transaction.",
    CLEAR:
      "Latest screening run found no name matches above the FATF/Wolfsberg weak-match threshold (0.75) across OFAC SDN, BIS Entity, and DDTC Debarred.",
    POTENTIAL_MATCH:
      "One or more sanctions entries scored ≥0.75 against this counterparty's canonical name. Human triage required: confirm whether the hit is the same person/entity as our counterparty, or a false positive. Do not transact until decided.",
    CONFIRMED_HIT:
      "A reviewer has confirmed the sanctions hit is a real match. This counterparty is BLOCKED. Existing operations need re-evaluation; contact qualified export-control counsel before any further action.",
    STALE:
      "The last screening run is older than 30 days. Sanctions lists update frequently — re-screen before any new transaction. The continuous-monitoring cron will refresh this on its next pass.",
  }[status];
}

function ScreeningRowItem({
  row,
  partyId,
  onDecided,
}: {
  row: ScreeningRow;
  partyId: string;
  onDecided: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [triageMode, setTriageMode] = useState<
    "CONFIRMED_HIT" | "FALSE_POSITIVE_DISMISSED" | null
  >(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const topScore =
    row.hits.length > 0 ? Math.max(...row.hits.map((h) => h.score)) : 0;
  const isPending = row.decision === "POTENTIAL_MATCH" && !row.decidedAt;

  async function submitDecision() {
    if (!triageMode || notes.trim().length === 0) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/trade/parties/${partyId}/screenings/${row.id}/decide`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision: triageMode, notes: notes.trim() }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Failed to record decision");
        return;
      }
      setTriageMode(null);
      setNotes("");
      onDecided();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li
      className="border-b px-5 py-3 last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      <button
        onClick={() => setExpanded((s) => !s)}
        className="flex w-full items-center gap-3 text-left"
      >
        <DecisionPill decision={row.decision} />
        <div className="min-w-0 flex-1">
          <div
            className="text-[12px]"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            {new Date(row.createdAt).toLocaleString("en-GB")}{" "}
            <span style={{ color: "rgba(255,255,255,0.4)" }}>
              · {row.hits.length} {row.hits.length === 1 ? "hit" : "hits"}
              {row.hits.length > 0 && ` · top ${topScore.toFixed(3)}`}
            </span>
            {isPending && (
              <span
                className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(251,191,36,0.15)",
                  color: "rgb(251,191,36)",
                }}
              >
                Needs review
              </span>
            )}
            {row.decidedBy && row.decidedAt && (
              <span
                className="ml-2 text-[10px]"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                · decided by {row.decidedBy.name ?? row.decidedBy.email}
              </span>
            )}
          </div>
          <div
            className="mt-0.5 flex items-center gap-1.5 text-[10px] font-mono"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <Hash className="h-2.5 w-2.5" />
            {row.snapshotHash.slice(0, 16)}…
          </div>
        </div>
        <ExternalLink
          className="h-3.5 w-3.5"
          style={{ color: "rgba(255,255,255,0.3)" }}
        />
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {row.hits.slice(0, 10).map((h, i) => (
            <div
              key={`${h.list}-${h.entryId}-${i}`}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-[11px]"
              style={{
                background: "rgba(0,0,0,0.20)",
                color: "rgba(255,255,255,0.75)",
              }}
            >
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {h.list.replace("_", " ")}
              </span>
              <span className="flex-1 truncate">{h.matchedName}</span>
              <span
                className="font-mono"
                style={{
                  color:
                    h.score >= 0.95
                      ? "rgb(248,113,113)"
                      : h.score >= 0.85
                        ? "rgb(251,191,36)"
                        : "rgba(255,255,255,0.5)",
                }}
              >
                {h.score.toFixed(3)}
              </span>
            </div>
          ))}

          {row.notes && (
            <div
              className="rounded-md px-3 py-2 text-[11px]"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.65)",
              }}
            >
              <div
                className="mb-1 text-[9px] font-semibold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Reviewer notes
              </div>
              {row.notes}
            </div>
          )}

          {isPending && triageMode === null && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setTriageMode("CONFIRMED_HIT")}
                className="rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "rgb(248,113,113)",
                  boxShadow: "inset 0 0 0 0.5px rgba(239,68,68,0.3)",
                }}
              >
                Confirm sanctions hit (block)
              </button>
              <button
                onClick={() => setTriageMode("FALSE_POSITIVE_DISMISSED")}
                className="rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.7)",
                  boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.1)",
                }}
              >
                Dismiss as false positive
              </button>
            </div>
          )}

          {triageMode && (
            <div
              className="rounded-md p-3"
              style={{
                background: "rgba(0,0,0,0.25)",
                boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="mb-2 text-[11px]"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                {triageMode === "CONFIRMED_HIT"
                  ? "Confirming a sanctions match will BLOCK this counterparty. Document your reasoning (entity matched on name + identifier X, address verified via Y, etc):"
                  : "Dismissing as false positive returns this counterparty to CLEAR. Document why this hit is NOT the same person/entity (different DOB, different address, different identifier, etc):"}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Required: reasoning for the audit trail (1-2000 chars)"
                className="w-full rounded-md px-3 py-2 text-[12px] outline-none"
                style={{
                  background: "rgba(0,0,0,0.30)",
                  boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.92)",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
              {err && (
                <div
                  className="mt-2 text-[11px]"
                  style={{ color: "rgb(248,113,113)" }}
                >
                  {err}
                </div>
              )}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setTriageMode(null);
                    setNotes("");
                    setErr(null);
                  }}
                  className="rounded-md px-3 py-1.5 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitDecision}
                  disabled={submitting || notes.trim().length === 0}
                  className="rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50"
                  style={{
                    background:
                      triageMode === "CONFIRMED_HIT"
                        ? "rgba(239,68,68,0.18)"
                        : "rgba(16,185,129,0.18)",
                    color:
                      triageMode === "CONFIRMED_HIT"
                        ? "rgb(248,113,113)"
                        : "rgb(52,211,153)",
                    boxShadow:
                      triageMode === "CONFIRMED_HIT"
                        ? "inset 0 0 0 0.5px rgba(239,68,68,0.4)"
                        : "inset 0 0 0 0.5px rgba(16,185,129,0.4)",
                  }}
                >
                  {submitting
                    ? "Saving…"
                    : triageMode === "CONFIRMED_HIT"
                      ? "Confirm hit & block"
                      : "Dismiss as false positive"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function DecisionPill({ decision }: { decision: ScreeningRow["decision"] }) {
  const styles: Record<
    ScreeningRow["decision"],
    { bg: string; fg: string; label: string }
  > = {
    CLEAR: { bg: "rgba(16,185,129,0.15)", fg: "rgb(52,211,153)", label: "✓" },
    POTENTIAL_MATCH: {
      bg: "rgba(251,191,36,0.15)",
      fg: "rgb(251,191,36)",
      label: "?",
    },
    CONFIRMED_HIT: {
      bg: "rgba(239,68,68,0.15)",
      fg: "rgb(248,113,113)",
      label: "!",
    },
    FALSE_POSITIVE_DISMISSED: {
      bg: "rgba(255,255,255,0.06)",
      fg: "rgba(255,255,255,0.5)",
      label: "ø",
    },
  };
  const s = styles[decision];
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}
