"use client";

/**
 * /trade/operations/[id] — Operation detail (Sprint A3b).
 *
 * Replaces the A3a placeholder. Full light-Indigo port of Welt A's
 * 910-LOC dashboard detail page. Reads operation via
 * GET /api/trade/operations/[id]; renders header (reference +
 * status + risk-score), catch-all banner if any Article 4/5/9/10
 * triggered, BAFA PDF button, lifecycle pipeline + transition
 * buttons, counterparty + route panel, summary stats, lines panel,
 * and licenses panel.
 *
 * BafaPdfButton stays from src/components/trade/ — it's a download
 * trigger only (89 LOC, no themed content) so no light variant is
 * needed.
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Truck,
  Globe,
  AlertTriangle,
  RefreshCw,
  FileSignature,
  AlertOctagon,
  Sparkles,
} from "lucide-react";
import { TradeTable, type TradeColumn } from "../../_components/TradeTable";
import { OperationLinesPanel } from "../_components/OperationLinesPanel";
import { OperationLifecyclePanel } from "../_components/OperationLifecyclePanel";
import { OperationLicensesPanel } from "../_components/OperationLicensesPanel";
import { ShamRiskChip } from "../_components/ShamRiskChip";
import { ComplyBridgePanels } from "../_components/ComplyBridgePanels";
import { BafaPdfButton } from "@/components/trade/BafaPdfButton";
import { BafaXmlButton } from "@/components/trade/BafaXmlButton";
import { BafaXsdVersionWarning } from "@/components/trade/BafaXsdVersionWarning";
import { DcsGeneratorButton } from "@/components/trade/DcsGeneratorButton";
// Verdict surface (G2). The wizard's VerdictPanel is self-contained — it
// fetches /api/trade/operations/[id]/assess from its { operationId } prop —
// so we mount it cross-dir on the persistent detail page WITHOUT moving it
// (the new-operation wizard still imports it from its own dir).
import { VerdictPanel } from "../new/_components/VerdictPanel";
// Cross-lane self-contained components (mounted by agreed contract):
//   WhyThisDossierButton (Lane 2) props { operationId: string }
//   CustomsStagePanel    (Lane 3) props { operationId: string; status: string }
import { WhyThisDossierButton } from "@/components/trade/WhyThisDossierButton";
import { CustomsStagePanel } from "@/components/trade/CustomsStagePanel";

interface RiskFactorView {
  key: string;
  reason: string;
  weight: number;
  severity: "low" | "medium" | "high" | "critical";
}

interface RiskScoreView {
  score: number;
  band: "low" | "medium" | "high";
  factors: RiskFactorView[];
}

interface OperationLine {
  id: string;
  quantity: number;
  unitValue: number;
  unitCurrency: string;
  appliedLicenseId: string | null;
  item: {
    id: string;
    name: string;
    internalSku: string | null;
    manufacturerName: string | null;
    manufacturerPartNo: string | null;
    description: string;
    eccnEU: string | null;
    eccnUS: string | null;
    usmlCategory: string | null;
    mtcrCategory: string | null;
    germanAlEntry: string | null;
    status: string;
  };
  appliedLicense: {
    id: string;
    licenseType: string;
    licenseNumber: string | null;
    status: string;
  } | null;
}

interface OperationLicense {
  id: string;
  licenseType: string;
  licenseNumber: string | null;
  issuedAt: string | null;
  validUntil: string | null;
  status: string;
  drawnDownValue: number;
  totalCapValue: number | null;
  capCurrency: string;
}

interface OperationOrg {
  id: string;
  name: string;
  slug: string;
}

interface Operation {
  id: string;
  reference: string;
  description: string;
  operationType: string;
  organization?: OperationOrg;
  status:
    | "DRAFT"
    | "AWAITING_CLASSIFICATION"
    | "SCREENING"
    | "AWAITING_LICENSE"
    | "LICENSED"
    | "EXECUTED"
    | "BLOCKED"
    | "VOLUNTARY_DISCLOSURE_FILED";
  shipFromCountry: string;
  shipToCountry: string;
  endUseCountry: string | null;
  routeStops: string[];
  declaredEndUse: string;
  endUserName: string | null;
  endUserSector: string | null;
  riskScore: number | null;
  catchAllArt4Hit: boolean;
  catchAllArt5Hit: boolean;
  catchAllArt9Hit: boolean;
  catchAllArt10Hit: boolean;
  notificationDuty: boolean;
  scheduledShipDate: string | null;
  actualShipDate: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counterparty: {
    id: string;
    legalName: string;
    tradeName: string | null;
    countryCode: string;
    screeningStatus: string;
    status: string;
    isHighRiskCountry: boolean;
    lastScreenedAt: string | null;
  };
  intermediates: Array<{
    id: string;
    legalName: string;
    countryCode: string;
    screeningStatus: string;
  }>;
  lines: OperationLine[];
  licenses: OperationLicense[];
}

export default function OperationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [op, setOp] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState<RiskScoreView | null>(null);
  const [recomputingRisk, setRecomputingRisk] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  async function recomputeRisk() {
    setRecomputingRisk(true);
    setRiskError(null);
    try {
      const res = await fetch(`/api/trade/operations/${id}/recompute-risk`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setRiskError(data.error ?? "Failed to recompute risk");
        return;
      }
      setRisk(data.result);
      const refresh = await fetch(`/api/trade/operations/${id}`);
      if (refresh.ok) {
        const refreshData = await refresh.json();
        setOp(refreshData.operation ?? null);
      }
    } catch (e) {
      setRiskError(e instanceof Error ? e.message : "Network error");
    } finally {
      setRecomputingRisk(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/trade/operations/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setOp(data.operation ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading && !op) {
    return (
      <div className="mx-auto max-w-screen-2xl px-8 py-8 text-trade-text-secondary">
        Loading…
      </div>
    );
  }
  if (!op) {
    return (
      <div className="mx-auto max-w-screen-2xl px-8 py-8 text-trade-text-secondary">
        Operation not found.{" "}
        <Link
          href="/trade/operations"
          className="text-trade-accent underline decoration-dotted hover:text-trade-accent-strong"
        >
          ← back to list
        </Link>
      </div>
    );
  }

  const totalValue = op.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitValue,
    0,
  );
  const catchAllHits: { code: string; label: string }[] = [];
  if (op.catchAllArt4Hit)
    catchAllHits.push({
      code: "Art. 4 EU 2021/821",
      label: "WMD/Military end-use catch-all",
    });
  if (op.catchAllArt5Hit)
    catchAllHits.push({
      code: "Art. 5 EU 2021/821",
      label: "Cyber-surveillance / Human-Rights catch-all",
    });
  if (op.catchAllArt9Hit)
    catchAllHits.push({
      code: "§8 AWV (DE)",
      label: "National catch-all",
    });
  if (op.catchAllArt10Hit)
    catchAllHits.push({
      code: "Art. 10 EU 2021/821",
      label: "Intra-EU sensitive transfers (Annex IV)",
    });

  const isTerminal =
    op.status === "EXECUTED" ||
    op.status === "VOLUNTARY_DISCLOSURE_FILED" ||
    op.status === "BLOCKED";

  // Astra deep-link context — German operator-voiced prompt seeded with the
  // real operation reference + destination, asking for a verdict on open
  // licenses and catch-all/notify exposure (same /trade/astra?prefill=…
  // pattern used by EmptyStateRich + TradeHelpCenter).
  const astraQuery = `Bewerte den Ausfuhrvorgang "${op.reference}" nach ${op.shipToCountry} — Verdict, offene Lizenzen, Catch-all/Notify-Risiken: was muss ich tun?`;

  return (
    <div className="mx-auto max-w-screen-2xl px-8 py-8">
      <Link
        href="/trade/operations"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-trade-text-secondary transition hover:text-trade-text-primary"
      >
        <ArrowLeft className="h-3 w-3" /> Operations
      </Link>

      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-6 border-b border-trade-border-subtle pb-5">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            <span>{op.operationType.replace("_", " ")}</span>
            <span className="text-trade-border-strong">·</span>
            <StatusInlineBadge status={op.status} />
          </div>
          <h1 className="font-mono text-[28px] font-bold leading-tight tracking-tight text-trade-text-primary">
            {op.reference}
          </h1>
          {op.description && (
            <p className="mt-2 max-w-3xl text-[13px] text-trade-text-secondary">
              {op.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/trade/astra?prefill=${encodeURIComponent(astraQuery)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-[13px] text-trade-text-primary transition hover:bg-trade-hover"
            >
              <Sparkles className="h-4 w-4 text-trade-accent" /> Astra fragen
            </Link>
            {/* Lane 2 — "Warum dieses Ergebnis? — Dossier". Self-contained;
                fetches its own data from { operationId }. */}
            <WhyThisDossierButton operationId={op.id} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`text-[40px] font-bold leading-none tabular-nums ${
              op.riskScore === null
                ? "text-trade-text-muted"
                : op.riskScore >= 70
                  ? "text-trade-accent-danger"
                  : op.riskScore >= 40
                    ? "text-trade-accent-warn"
                    : "text-trade-accent-success"
            }`}
          >
            {op.riskScore ?? "—"}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-trade-text-muted">
            Risk Score
          </div>
          <button
            onClick={recomputeRisk}
            disabled={recomputingRisk}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-trade-border-subtle bg-trade-bg-panel px-2 py-1 text-[10px] font-semibold text-trade-text-secondary transition hover:bg-trade-hover hover:text-trade-text-primary disabled:opacity-50"
          >
            <RefreshCw
              className={`h-2.5 w-2.5 ${recomputingRisk ? "animate-spin" : ""}`}
            />
            {recomputingRisk ? "Computing…" : "Recompute"}
          </button>
        </div>
      </header>

      {riskError && (
        <div className="mb-6 rounded-md px-4 py-3 text-[13px] trade-chip-danger">
          {riskError}
        </div>
      )}

      {/* Risk Factors Breakdown */}
      {risk && risk.factors.length > 0 && <RiskFactorsPanel risk={risk} />}

      {/* Catch-all banner */}
      {(catchAllHits.length > 0 || op.notificationDuty) && (
        <div className="mb-6 rounded-md p-4 trade-chip-danger">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-current" />
            <h2 className="text-[12px] font-semibold uppercase tracking-widest text-current">
              Catch-all Triggered
            </h2>
          </div>
          <ul className="space-y-1.5 text-[12px] text-current">
            {catchAllHits.map((c) => (
              <li key={c.code}>
                <span className="mr-2 font-mono text-[11px] text-current">
                  {c.code}
                </span>
                {c.label}
              </li>
            ))}
            {op.notificationDuty && (
              <li>
                <span className="mr-2 font-mono text-[11px] text-trade-accent-warn">
                  §8 AWV
                </span>
                Anzeigepflicht — operator must notify BAFA before shipment
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Z16 — OFAC 2026 Sham-Transaction Doctrine detector chip. Pure
          read-only surface; clicking "Details" expands red-flags +
          enforcement citations. Auto-fetches once on mount. */}
      <ShamRiskChip operationId={op.id} />

      {/* Z5c — drift banner above the action bar when the serializer's
          XSD-version constant has diverged from the verified target. */}
      <BafaXsdVersionWarning />

      {/* Action bar — related-documents deep-links + BAFA PDF + XML download */}
      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <Link
          href={`/trade/reexport-consents?operation=${op.id}`}
          className="flex items-center gap-2 rounded-md border border-trade-border bg-trade-bg-page px-3 py-2.5 text-[12.5px] font-medium text-trade-text-primary transition hover:border-trade-accent hover:text-trade-accent-strong"
          title="Re-Export consent letters tied to this operation"
        >
          <FileSignature className="h-3.5 w-3.5" />
          Re-Exports
        </Link>
        <Link
          href={`/trade/vsd?operation=${op.id}`}
          className="flex items-center gap-2 rounded-md border border-trade-border bg-trade-bg-page px-3 py-2.5 text-[12.5px] font-medium text-trade-text-primary transition hover:border-trade-accent hover:text-trade-accent-strong"
          title="Voluntary self-disclosures originating from this operation"
        >
          <AlertOctagon className="h-3.5 w-3.5" />
          VSDs
        </Link>
        <BafaPdfButton
          operation={op}
          applicant={{
            legalName: op.organization?.name ?? "(Organisation unknown)",
          }}
        />
        <BafaXmlButton operationId={op.id} operationReference={op.reference} />
        {/* Z30 — US export documentation. Separated from BAFA by a
            divider; only shown when at least one line carries a US
            ECCN classification, which is what § 758.6 keys off. */}
        {(() => {
          const usEccns = Array.from(
            new Set(
              op.lines
                .map((l) => l.item.eccnUS)
                .filter((v): v is string => Boolean(v && v.trim().length > 0)),
            ),
          );
          if (usEccns.length === 0) return null;
          return (
            <>
              <span
                aria-hidden="true"
                className="h-6 w-px bg-trade-border-subtle"
              />
              <DcsGeneratorButton
                eccns={usEccns}
                destinationCountry={op.endUseCountry ?? op.shipToCountry}
                consigneeName={op.endUserName ?? op.counterparty.legalName}
                shipmentReference={op.reference}
              />
            </>
          );
        })()}
      </div>

      {/* Lifecycle */}
      <div className="mb-6">
        <OperationLifecyclePanel
          operationId={op.id}
          status={op.status}
          onStatusChanged={() => {
            fetch(`/api/trade/operations/${op.id}`)
              .then((r) => r.json())
              .then((data) => setOp(data.operation ?? null))
              .catch(() => {});
          }}
        />
      </div>

      {/* ── Bewertung / Verdict (G2) ───────────────────────────────
          The persistent detail page previously never surfaced the
          licence verdict — a returning operator could not see GO /
          REVIEW / BLOCKED, the licence type, the authority, or the
          WHY without re-running the wizard. VerdictPanel is the same
          self-contained component the new-operation wizard uses; it
          fetches /api/trade/operations/[id]/assess itself from the
          { operationId } prop and renders verdict + per-line licence
          determination + the "Was jetzt?" WHY/licence/authority. */}
      <section
        className="mb-6 rounded-md border border-trade-border-subtle bg-trade-bg-panel p-6"
        aria-label="Bewertung / Verdict"
      >
        <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
          Bewertung · Verdict
        </h2>
        <VerdictPanel operationId={op.id} />
      </section>

      {/* ── Caelex Comply Cross-Domain Panels ──────────────────────
          Read-only surface of the related spacecraft's Debris,
          Spectrum, and Authorization compliance lifecycle data from
          the main Caelex Comply platform. The panels are
          independently nullable — each renders an empty state when
          no Caelex Comply Spacecraft is linked. Linking happens via
          TradeOperation.missionRef → Mission → MissionSpacecraft →
          Spacecraft. */}
      <section className="mb-6" aria-label="Caelex Comply cross-domain status">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Caelex Comply · Cross-Domain
          </h2>
          <span className="text-[10px] text-trade-text-muted">
            Spacecraft lifecycle compliance (read-only)
          </span>
        </div>
        <ComplyBridgePanels operationId={op.id} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Counterparty + Route */}
        <section className="rounded-md border border-trade-border-subtle bg-trade-bg-panel p-6 lg:col-span-2">
          <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Counterparty + Route
          </h2>

          <div className="mb-4">
            <Link
              href={`/trade/parties/${op.counterparty.id}`}
              className="group flex items-center justify-between rounded-md border border-trade-border-subtle bg-trade-bg-subtle p-3 transition hover:bg-trade-hover"
            >
              <div>
                <div className="text-[14px] font-semibold text-trade-text-primary">
                  {op.counterparty.legalName}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-trade-text-muted">
                  <Globe className="h-3 w-3" />
                  {op.counterparty.countryCode}
                  {op.counterparty.isHighRiskCountry && (
                    <span className="text-trade-accent-warn">· high-risk</span>
                  )}
                  <span>·</span>
                  <span>
                    Screening:{" "}
                    {op.counterparty.screeningStatus
                      .toLowerCase()
                      .replace("_", " ")}
                  </span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-trade-text-secondary opacity-0 transition group-hover:opacity-100" />
            </Link>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-trade-border-subtle bg-trade-bg-subtle p-4">
            <Truck className="h-5 w-5 text-trade-text-secondary" />
            <div className="flex flex-1 items-center justify-around text-center">
              <CountryStop label="From" code={op.shipFromCountry} />
              {op.routeStops.map((c) => (
                <CountryStop key={c} label="Transit" code={c} muted />
              ))}
              <CountryStop label="Ship-to" code={op.shipToCountry} primary />
              {op.endUseCountry && op.endUseCountry !== op.shipToCountry && (
                <CountryStop label="End-use" code={op.endUseCountry} />
              )}
            </div>
          </div>

          {(op.endUserName || op.endUserSector) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <KV label="End User" value={op.endUserName ?? "—"} />
              <KV label="End-user Sector" value={op.endUserSector ?? "—"} />
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <KV
              label="Declared End-use"
              value={op.declaredEndUse.replace("_", " ")}
            />
            <KV
              label="Scheduled Ship"
              value={
                op.scheduledShipDate
                  ? new Date(op.scheduledShipDate).toLocaleDateString("en-GB")
                  : "—"
              }
            />
          </div>
        </section>

        {/* Summary */}
        <section className="rounded-md border border-trade-border-subtle bg-trade-bg-panel p-6">
          <h2 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Summary
          </h2>
          <div className="space-y-3">
            <KV label="Lines" value={op.lines.length.toString()} />
            <KV
              label="Total value"
              value={`${totalValue.toFixed(2)} EUR`}
              mono
            />
            <KV label="Licenses" value={op.licenses.length.toString()} />
            <KV
              label="Created"
              value={new Date(op.createdAt).toLocaleString("en-GB")}
            />
            {op.actualShipDate && (
              <KV
                label="Actually shipped"
                value={new Date(op.actualShipDate).toLocaleString("en-GB")}
              />
            )}
            {op.closedAt && (
              <KV
                label="Closed"
                value={new Date(op.closedAt).toLocaleString("en-GB")}
              />
            )}
          </div>
        </section>

        {/* Lines */}
        <div className="lg:col-span-3">
          <OperationLinesPanel
            operationId={op.id}
            initialLines={op.lines}
            isReadOnly={isTerminal}
            onLinesChanged={() => {
              fetch(`/api/trade/operations/${op.id}`)
                .then((r) => r.json())
                .then((data) => setOp(data.operation ?? null))
                .catch(() => {});
            }}
          />
        </div>

        {/* Licenses */}
        <div className="lg:col-span-3">
          <OperationLicensesPanel
            operationId={op.id}
            initialLicenses={op.licenses}
            isReadOnly={isTerminal}
            onLicensesChanged={() => {
              fetch(`/api/trade/operations/${op.id}`)
                .then((r) => r.json())
                .then((data) => setOp(data.operation ?? null))
                .catch(() => {});
            }}
          />
        </div>
      </div>

      {/* Lane 3 — customs/export-execution stage. Self-contained; mounted
          unconditionally because CustomsStagePanel returns null unless the
          operation status is "EXECUTED". */}
      <div className="mt-6">
        <CustomsStagePanel operationId={op.id} status={op.status} />
      </div>

      <p className="mt-8 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted">
        Status-Übergänge LICENSED → EXECUTED erfordern menschliche Bestätigung
        durch qualifizierten AV. Catch-all-Trigger nach Art. 4-10 EU 2021/821 /
        §8 AWV erfordern Antrags-Vorbereitung über BAFA-ELAN-K2 (siehe
        Download-Button oben).
      </p>
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function CountryStop({
  label,
  code,
  primary,
  muted,
}: {
  label: string;
  code: string;
  primary?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`text-[18px] font-bold tabular-nums ${
          muted
            ? "text-trade-text-muted"
            : primary
              ? "text-trade-accent-success"
              : "text-trade-text-primary"
        }`}
      >
        {code}
      </div>
      <div className="text-[9px] font-semibold uppercase tracking-widest text-trade-text-muted">
        {label}
      </div>
    </div>
  );
}

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
    <div className="flex items-baseline justify-between gap-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
        {label}
      </div>
      <div
        className={`text-[13px] text-trade-text-primary ${mono ? "font-mono" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

// Shared severity → swatch class (used by both the +weight badge and the
// severity pill, exactly as the legacy RiskFactorRow did).
function riskSeverityClass(severity: RiskFactorView["severity"]): string {
  switch (severity) {
    case "critical":
      return "trade-chip-danger";
    case "high":
      return "trade-chip-warn";
    case "medium":
      return "trade-chip-warn";
    default:
      return "trade-chip-neutral";
  }
}

// Ordinal for sorting the Severity column high→low (low=0 … critical=3).
const RISK_SEVERITY_RANK: Record<RiskFactorView["severity"], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

function RiskFactorsPanel({ risk }: { risk: RiskScoreView }) {
  const bandClass =
    risk.band === "high"
      ? "trade-chip-danger"
      : risk.band === "medium"
        ? "trade-chip-warn"
        : "trade-chip-success";
  const bandText = "text-current";

  const columns: TradeColumn<RiskFactorView>[] = [
    {
      key: "weight",
      header: "Weight",
      sortBy: (f) => f.weight,
      render: (f) => (
        <span
          className={`inline-block rounded px-2 py-1 text-center font-mono text-[12px] font-bold tabular-nums ${riskSeverityClass(
            f.severity,
          )}`}
          style={{ minWidth: "3.5ch" }}
        >
          +{f.weight}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Factor",
      sortBy: (f) => f.reason.toLowerCase(),
      render: (f) => (
        <span className="text-[12px] text-trade-text-primary">{f.reason}</span>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      align: "right",
      sortBy: (f) => RISK_SEVERITY_RANK[f.severity],
      render: (f) => (
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${riskSeverityClass(
            f.severity,
          )}`}
        >
          {f.severity}
        </span>
      ),
    },
  ];

  return (
    <section className={`mb-6 rounded-md border ${bandClass}`}>
      <div className="flex items-center justify-between border-b border-trade-border-subtle px-5 py-3">
        <h2
          className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${bandText}`}
        >
          Risk Score Breakdown — {risk.score}/100 ({risk.band.toUpperCase()})
        </h2>
        <span className="text-[11px] text-trade-text-secondary">
          {risk.factors.length}{" "}
          {risk.factors.length === 1 ? "contributing factor" : "factors"}
        </span>
      </div>
      <div className="p-3">
        <TradeTable<RiskFactorView>
          rows={risk.factors}
          columns={columns}
          getRowId={(f) => f.key}
        />
      </div>
    </section>
  );
}

function StatusInlineBadge({ status }: { status: Operation["status"] }) {
  const config: Record<
    Operation["status"],
    { className: string; label: string }
  > = {
    DRAFT: { className: "text-trade-text-secondary", label: "DRAFT" },
    AWAITING_CLASSIFICATION: {
      className: "text-trade-accent-warn",
      label: "AWAITING CLASSIFICATION",
    },
    SCREENING: { className: "text-trade-accent-warn", label: "SCREENING" },
    AWAITING_LICENSE: {
      className: "text-trade-accent-warn",
      label: "AWAITING LICENSE",
    },
    LICENSED: { className: "text-trade-link", label: "LICENSED" },
    EXECUTED: { className: "text-trade-accent-success", label: "EXECUTED" },
    BLOCKED: { className: "text-trade-accent-danger", label: "BLOCKED" },
    VOLUNTARY_DISCLOSURE_FILED: {
      className: "text-trade-accent-danger",
      label: "VOLUNTARY DISCLOSURE",
    },
  };
  const c = config[status];
  return <span className={c.className}>{c.label}</span>;
}
