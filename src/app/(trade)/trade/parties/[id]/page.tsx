"use client";

/**
 * /trade/parties/[id] — Counterparty detail + on-demand screening (Sprint A2).
 *
 * Light-Indigo port of /dashboard/trade/counterparties/[id]/page.tsx.
 *
 * Layout:
 *   Two-column grid (Identity | Status + History) +
 *   BeneficialOwnersPanel (50%-cascade) under both columns.
 *
 * Triage workflow preserved 1:1 — POTENTIAL_MATCH rows show
 * Confirm/Dismiss buttons; the chosen path opens a notes-form posting
 * to /api/trade/parties/[id]/screenings/[id]/decide. Cascade tree
 * (sanctioned + clean ancestors) renders identically in the new
 * theme.
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { BeneficialOwnersPanel } from "../_components/BeneficialOwnersPanel";
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
  FileSignature,
} from "lucide-react";

interface ScreeningHit {
  entryId: string;
  matchedName: string;
  score: number;
  list: string;
  matchedFields: string[];
}

interface CascadeAncestorView {
  ancestorId: string;
  ancestorName: string;
  countryCode: string;
  effectivePercent: number;
  screeningStatus:
    | "NOT_SCREENED"
    | "CLEAR"
    | "POTENTIAL_MATCH"
    | "CONFIRMED_HIT"
    | "STALE";
  isBlocked: boolean;
  pathCount: number;
}

interface CascadeView {
  ancestors: CascadeAncestorView[];
  aggregateSanctionedOwnership: number;
  cascadeHit: boolean;
  sanctionedAncestorCount: number;
  totalCascadedOwnership: number;
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
  cascade: CascadeView | null;
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
      await reload();
    } catch (err) {
      setScreenError(err instanceof Error ? err.message : "Network error");
    } finally {
      setScreening(false);
    }
  }

  if (loading && !party) {
    return (
      <div className="mx-auto max-w-screen-2xl px-8 py-8 text-trade-text-secondary">
        Loading…
      </div>
    );
  }
  if (!party) {
    return (
      <div className="mx-auto max-w-screen-2xl px-8 py-8 text-trade-text-secondary">
        Counterparty not found.{" "}
        <Link
          href="/trade/parties"
          className="text-trade-accent underline decoration-dotted hover:text-trade-accent-strong"
        >
          ← back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-8">
      <Link
        href="/trade/parties"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-trade-text-secondary transition hover:text-trade-text-primary"
      >
        <ArrowLeft className="h-3 w-3" /> Counterparties
      </Link>

      <header className="mb-6 flex items-start justify-between gap-6 border-b border-trade-border-subtle pb-5">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-trade-text-primary">
            {party.legalName}
          </h1>
          {party.tradeName && (
            <p className="mt-1 text-[13px] text-trade-text-secondary">
              d/b/a {party.tradeName}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 text-[12px] text-trade-text-secondary">
            <span className="flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> {party.countryCode}
              {party.isHighRiskCountry && (
                <span className="text-amber-600">· high-risk</span>
              )}
            </span>
            {party.isUSPerson && <span>· US person</span>}
            {party.status === "BLOCKED" && (
              <span className="text-red-600">
                · Blocked: {party.blockedReason ?? "no reason given"}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/trade/euc?party=${party.id}`}
            className="flex items-center gap-2 rounded-md border border-trade-border bg-trade-bg-page px-4 py-3 text-[13px] font-medium text-trade-text-primary transition hover:border-trade-accent hover:text-trade-accent-strong"
            title="View end-use certificates for this counterparty"
          >
            <FileSignature className="h-3.5 w-3.5" />
            EUCs
          </Link>
          <button
            onClick={runScreen}
            disabled={screening}
            className="flex items-center gap-2 rounded-md bg-trade-accent px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${screening ? "animate-spin" : ""}`}
            />
            {screening ? "Screening…" : "Screen now"}
          </button>
        </div>
      </header>

      {screenError && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {screenError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Identity & Identifiers */}
        <section className="rounded-md border border-trade-border-subtle bg-trade-bg-panel p-6">
          <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
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
          <div
            className={`rounded-md border p-6 ${statusPanelClass(party.screeningStatus)}`}
          >
            <div className="mb-3 flex items-center gap-3">
              <ScreeningIcon status={party.screeningStatus} />
              <div>
                <div className="text-[15px] font-semibold text-trade-text-primary">
                  {statusLabel(party.screeningStatus)}
                </div>
                <div className="text-[11px] text-trade-text-muted">
                  {party.lastScreenedAt
                    ? `Last screened ${new Date(party.lastScreenedAt).toLocaleString("en-GB")}`
                    : "Has never been screened"}
                </div>
              </div>
            </div>
            <p className="text-[12px] leading-relaxed text-trade-text-secondary">
              {statusExplain(party.screeningStatus)}
            </p>
          </div>

          <div className="rounded-md border border-trade-border-subtle bg-trade-bg-panel">
            <div className="border-b border-trade-border-subtle px-5 py-3">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
                Screening History
              </h2>
            </div>
            {party.screenings.length === 0 ? (
              <div className="px-5 py-6 text-center text-[12px] text-trade-text-muted">
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

      <div className="mt-6">
        <BeneficialOwnersPanel partyId={party.id} partyName={party.legalName} />
      </div>

      <p className="mt-8 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted">
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
    <div className="flex items-baseline justify-between gap-4 border-b border-trade-border-subtle py-2 last:border-0">
      <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
        {label}
      </div>
      <div
        className={`min-w-0 truncate text-right text-[13px] text-trade-text-primary ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ScreeningIcon({ status }: { status: PartyDetail["screeningStatus"] }) {
  const className = "h-7 w-7 shrink-0";
  if (status === "CLEAR")
    return (
      <ShieldCheck
        className={`${className} text-emerald-600`}
        strokeWidth={1.75}
      />
    );
  if (status === "POTENTIAL_MATCH")
    return (
      <AlertTriangle
        className={`${className} text-amber-500`}
        strokeWidth={1.75}
      />
    );
  if (status === "CONFIRMED_HIT")
    return (
      <ShieldAlert className={`${className} text-red-600`} strokeWidth={1.75} />
    );
  if (status === "STALE")
    return (
      <Clock className={`${className} text-orange-500`} strokeWidth={1.75} />
    );
  return (
    <Shield
      className={`${className} text-trade-text-muted`}
      strokeWidth={1.75}
    />
  );
}

function statusPanelClass(status: PartyDetail["screeningStatus"]): string {
  switch (status) {
    case "CLEAR":
      return "border-emerald-200 bg-emerald-50";
    case "POTENTIAL_MATCH":
      return "border-amber-300 bg-amber-50";
    case "CONFIRMED_HIT":
      return "border-red-300 bg-red-50";
    case "STALE":
      return "border-orange-300 bg-orange-50";
    case "NOT_SCREENED":
    default:
      return "border-trade-border-subtle bg-trade-bg-panel";
  }
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
    <li className="border-b border-trade-border-subtle px-5 py-3 last:border-0">
      <button
        onClick={() => setExpanded((s) => !s)}
        className="flex w-full items-center gap-3 text-left"
      >
        <DecisionPill decision={row.decision} />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] text-trade-text-primary">
            {new Date(row.createdAt).toLocaleString("en-GB")}{" "}
            <span className="text-trade-text-muted">
              · {row.hits.length} {row.hits.length === 1 ? "hit" : "hits"}
              {row.hits.length > 0 && ` · top ${topScore.toFixed(3)}`}
            </span>
            {isPending && (
              <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-700 ring-1 ring-amber-200">
                Needs review
              </span>
            )}
            {row.decidedBy && row.decidedAt && (
              <span className="ml-2 text-[10px] text-trade-text-muted">
                · decided by {row.decidedBy.name ?? row.decidedBy.email}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-trade-text-muted">
            <Hash className="h-2.5 w-2.5" />
            {row.snapshotHash.slice(0, 16)}…
          </div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 text-trade-text-muted" />
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {row.hits.slice(0, 10).map((h, i) => (
            <div
              key={`${h.list}-${h.entryId}-${i}`}
              className="flex items-center gap-2 rounded-md border border-trade-border-subtle bg-trade-bg-subtle px-3 py-2 text-[11px] text-trade-text-primary"
            >
              <span className="rounded bg-trade-bg-panel px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-trade-text-secondary ring-1 ring-trade-border-subtle">
                {h.list.replace("_", " ")}
              </span>
              <span className="flex-1 truncate">{h.matchedName}</span>
              <span
                className={
                  h.score >= 0.95
                    ? "font-mono text-red-600"
                    : h.score >= 0.85
                      ? "font-mono text-amber-600"
                      : "font-mono text-trade-text-secondary"
                }
              >
                {h.score.toFixed(3)}
              </span>
            </div>
          ))}

          {row.cascade && row.cascade.ancestors.length > 0 && (
            <CascadeChainView cascade={row.cascade} />
          )}

          {row.notes && (
            <div className="rounded-md border border-trade-border-subtle bg-trade-bg-subtle px-3 py-2 text-[11px] text-trade-text-secondary">
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-trade-text-muted">
                Reviewer notes
              </div>
              {row.notes}
            </div>
          )}

          {isPending && triageMode === null && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setTriageMode("CONFIRMED_HIT")}
                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-100"
              >
                Confirm sanctions hit (block)
              </button>
              <button
                onClick={() => setTriageMode("FALSE_POSITIVE_DISMISSED")}
                className="rounded-md border border-trade-border-subtle bg-trade-bg-panel px-3 py-1.5 text-[11px] font-semibold text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary"
              >
                Dismiss as false positive
              </button>
            </div>
          )}

          {triageMode && (
            <div className="rounded-md border border-trade-border bg-trade-bg-subtle p-3">
              <div className="mb-2 text-[11px] text-trade-text-primary">
                {triageMode === "CONFIRMED_HIT"
                  ? "Confirming a sanctions match will BLOCK this counterparty. Document your reasoning (entity matched on name + identifier X, address verified via Y, etc):"
                  : "Dismissing as false positive returns this counterparty to CLEAR. Document why this hit is NOT the same person/entity (different DOB, different address, different identifier, etc):"}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Required: reasoning for the audit trail (1-2000 chars)"
                className="w-full resize-y rounded-md border border-trade-border bg-trade-bg-panel px-3 py-2 text-[12px] text-trade-text-primary outline-none transition focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30"
              />
              {err && (
                <div className="mt-2 text-[11px] text-red-600">{err}</div>
              )}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setTriageMode(null);
                    setNotes("");
                    setErr(null);
                  }}
                  className="rounded-md px-3 py-1.5 text-[11px] text-trade-text-secondary transition hover:text-trade-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={submitDecision}
                  disabled={submitting || notes.trim().length === 0}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    triageMode === "CONFIRMED_HIT"
                      ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-trade-accent text-white hover:bg-trade-accent-strong"
                  }`}
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
  const config: Record<
    ScreeningRow["decision"],
    { className: string; label: string }
  > = {
    CLEAR: {
      className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      label: "✓",
    },
    POTENTIAL_MATCH: {
      className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      label: "?",
    },
    CONFIRMED_HIT: {
      className: "bg-red-100 text-red-700 ring-1 ring-red-200",
      label: "!",
    },
    FALSE_POSITIVE_DISMISSED: {
      className:
        "bg-trade-bg-subtle text-trade-text-muted ring-1 ring-trade-border-subtle",
      label: "ø",
    },
  };
  const c = config[decision];
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function CascadeChainView({ cascade }: { cascade: CascadeView }) {
  const sanctionedAncestors = cascade.ancestors.filter(
    (a) => a.screeningStatus === "CONFIRMED_HIT" || a.isBlocked,
  );
  const cleanAncestors = cascade.ancestors.filter(
    (a) => a.screeningStatus !== "CONFIRMED_HIT" && !a.isBlocked,
  );

  return (
    <div
      className={`rounded-md border p-3 ${
        cascade.cascadeHit
          ? "border-red-300 bg-red-50"
          : sanctionedAncestors.length > 0
            ? "border-amber-200 bg-amber-50"
            : "border-trade-border-subtle bg-trade-bg-subtle"
      }`}
    >
      <div
        className={`mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest ${
          cascade.cascadeHit ? "text-red-700" : "text-trade-text-secondary"
        }`}
      >
        <span>50%-Rule Cascade</span>
        <span className="text-trade-text-secondary">
          {(cascade.aggregateSanctionedOwnership * 100).toFixed(1)}% sanctioned
          {cascade.cascadeHit && " · TRIGGERED"}
        </span>
      </div>

      {sanctionedAncestors.length > 0 && (
        <div className="mb-2 space-y-1">
          {sanctionedAncestors.map((a) => (
            <CascadeAncestorRow
              key={a.ancestorId}
              ancestor={a}
              tone="sanctioned"
            />
          ))}
        </div>
      )}

      {cleanAncestors.length > 0 && (
        <div className="space-y-1">
          {cleanAncestors.slice(0, 5).map((a) => (
            <CascadeAncestorRow key={a.ancestorId} ancestor={a} tone="clean" />
          ))}
          {cleanAncestors.length > 5 && (
            <div className="px-2 text-[10px] text-trade-text-muted">
              +{cleanAncestors.length - 5} more clean ancestors
            </div>
          )}
        </div>
      )}

      {cascade.totalCascadedOwnership < 0.999 && (
        <div className="mt-2 text-[10px] text-trade-text-muted">
          {(cascade.totalCascadedOwnership * 100).toFixed(1)}% of equity modeled
          in graph; remainder held by parties not (yet) added as counterparties.
        </div>
      )}
    </div>
  );
}

function CascadeAncestorRow({
  ancestor,
  tone,
}: {
  ancestor: CascadeAncestorView;
  tone: "sanctioned" | "clean";
}) {
  const isSanctioned = tone === "sanctioned";
  return (
    <div
      className={`flex items-center gap-2 rounded px-2 py-1.5 text-[11px] ${
        isSanctioned
          ? "bg-red-100 text-red-700"
          : "bg-trade-bg-panel text-trade-text-primary ring-1 ring-trade-border-subtle"
      }`}
    >
      <span
        className={`font-mono ${
          isSanctioned ? "text-red-700" : "text-trade-text-muted"
        }`}
        style={{ minWidth: "4ch" }}
      >
        {(ancestor.effectivePercent * 100).toFixed(1)}%
      </span>
      <span className="flex-1 truncate">{ancestor.ancestorName}</span>
      <span className="text-[10px] text-trade-text-muted">
        {ancestor.countryCode}
        {ancestor.pathCount > 1 && ` · ${ancestor.pathCount} paths`}
      </span>
    </div>
  );
}
