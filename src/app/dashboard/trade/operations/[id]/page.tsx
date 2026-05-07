/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /dashboard/trade/operations/[id] — TradeOperation detail (Sprint C2 read-only).
 *
 * Sprint C3 will add:
 *  - Status-transition buttons (DRAFT → AWAITING_CLASSIFICATION → ...)
 *  - Add-line action (link items to operation with quantity)
 *  - Add-license action (attach licenses, assign to lines)
 *  - Risk-score panel with breakdown
 *  - Catch-all-evaluation panel with regulation cites
 *
 * For C2 we ship a clean read-only view so the list-page click target
 * works and the user can inspect the operation as it exists today.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Truck,
  FileText,
  Globe,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { OperationLinesPanel } from "@/components/trade/OperationLinesPanel";

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

interface Operation {
  id: string;
  reference: string;
  description: string;
  operationType: string;
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

const SANS =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
const DISPLAY =
  'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

export default function OperationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [op, setOp] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div
        className="mx-auto max-w-screen-2xl px-8 py-8"
        style={{ fontFamily: SANS, color: "rgba(255,255,255,0.5)" }}
      >
        Loading…
      </div>
    );
  }
  if (!op) {
    return (
      <div
        className="mx-auto max-w-screen-2xl px-8 py-8"
        style={{ fontFamily: SANS, color: "rgba(255,255,255,0.5)" }}
      >
        Operation not found.{" "}
        <Link
          href="/dashboard/trade/operations"
          className="underline decoration-dotted"
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

  return (
    <div
      className="mx-auto max-w-screen-2xl px-8 py-8"
      style={{ fontFamily: SANS, letterSpacing: "-0.005em" }}
    >
      <Link
        href="/dashboard/trade/operations"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px]"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        <ArrowLeft className="h-3 w-3" /> Operations
      </Link>

      {/* Header */}
      <header
        className="mb-6 flex items-start justify-between gap-6 pb-5"
        style={{ borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)" }}
      >
        <div className="min-w-0">
          <div
            className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            <span>{op.operationType.replace("_", " ")}</span>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>·</span>
            <StatusInlineBadge status={op.status} />
          </div>
          <h1
            className="font-mono text-[28px] font-semibold text-white"
            style={{
              fontFamily: DISPLAY,
              letterSpacing: "-0.022em",
              lineHeight: 1.15,
            }}
          >
            {op.reference}
          </h1>
          {op.description && (
            <p
              className="mt-2 max-w-3xl text-[13px]"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              {op.description}
            </p>
          )}
        </div>
        {op.riskScore !== null && (
          <div className="shrink-0 text-right">
            <div
              className="text-[40px] font-bold leading-none tabular-nums"
              style={{
                color:
                  op.riskScore >= 70
                    ? "rgb(248,113,113)"
                    : op.riskScore >= 40
                      ? "rgb(251,191,36)"
                      : "rgb(52,211,153)",
              }}
            >
              {op.riskScore}
            </div>
            <div
              className="mt-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Risk Score
            </div>
          </div>
        )}
      </header>

      {/* Catch-all banner if any triggered */}
      {(catchAllHits.length > 0 || op.notificationDuty) && (
        <div
          className="mb-6 rounded-2xl p-4"
          style={{
            background: "rgba(239,68,68,0.08)",
            boxShadow: "inset 0 0 0 0.5px rgba(239,68,68,0.25)",
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle
              className="h-4 w-4"
              style={{ color: "rgb(248,113,113)" }}
            />
            <h2
              className="text-[12px] font-semibold uppercase tracking-widest"
              style={{ color: "rgb(248,113,113)" }}
            >
              Catch-all Triggered
            </h2>
          </div>
          <ul className="space-y-1.5 text-[12px]">
            {catchAllHits.map((c) => (
              <li key={c.code} style={{ color: "rgba(255,255,255,0.85)" }}>
                <span
                  className="mr-2 font-mono text-[11px]"
                  style={{ color: "rgb(248,113,113)" }}
                >
                  {c.code}
                </span>
                {c.label}
              </li>
            ))}
            {op.notificationDuty && (
              <li style={{ color: "rgba(255,255,255,0.85)" }}>
                <span
                  className="mr-2 font-mono text-[11px]"
                  style={{ color: "rgb(251,191,36)" }}
                >
                  §8 AWV
                </span>
                Anzeigepflicht — operator must notify BAFA before shipment
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left col: Counterparty + Route */}
        <section
          className="lg:col-span-2 rounded-2xl p-6"
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
            Counterparty + Route
          </h2>

          <div className="mb-4">
            <Link
              href={`/dashboard/trade/counterparties/${op.counterparty.id}`}
              className="group flex items-center justify-between rounded-lg p-3 transition-colors"
              style={{ background: "rgba(0,0,0,0.20)" }}
            >
              <div>
                <div
                  className="text-[14px] font-semibold"
                  style={{ color: "rgba(255,255,255,0.92)" }}
                >
                  {op.counterparty.legalName}
                </div>
                <div
                  className="mt-0.5 flex items-center gap-2 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  <Globe className="h-3 w-3" />
                  {op.counterparty.countryCode}
                  {op.counterparty.isHighRiskCountry && (
                    <span style={{ color: "rgb(251,191,36)" }}>
                      · high-risk
                    </span>
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
              <ArrowRight
                className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: "rgba(255,255,255,0.55)" }}
              />
            </Link>
          </div>

          <div
            className="flex items-center gap-3 rounded-lg p-4"
            style={{ background: "rgba(0,0,0,0.15)" }}
          >
            <Truck
              className="h-5 w-5"
              style={{ color: "rgba(255,255,255,0.55)" }}
            />
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

        {/* Right col: Stats */}
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

        {/* Lines — managed by OperationLinesPanel (Sprint C3a) */}
        <div className="lg:col-span-3">
          <OperationLinesPanel
            operationId={op.id}
            initialLines={op.lines}
            isReadOnly={
              op.status === "EXECUTED" ||
              op.status === "VOLUNTARY_DISCLOSURE_FILED" ||
              op.status === "BLOCKED"
            }
            onLinesChanged={() => {
              // Reload to refresh denormalized counts + summary stats
              fetch(`/api/trade/operations/${op.id}`)
                .then((r) => r.json())
                .then((data) => setOp(data.operation ?? null))
                .catch(() => {});
            }}
          />
        </div>

        {/* Licenses */}
        <section
          className="lg:col-span-3 rounded-2xl"
          style={{
            boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="border-b px-5 py-3"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <h2
              className="text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              License Stack ({op.licenses.length})
            </h2>
          </div>
          {op.licenses.length === 0 ? (
            <div
              className="px-5 py-8 text-center text-[12px]"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <FileText
                className="mx-auto mb-2 h-6 w-6 opacity-50"
                strokeWidth={1.5}
              />
              No licenses attached. License-stack management lands in Sprint C3.
            </div>
          ) : (
            <ul>
              {op.licenses.map((lic) => (
                <LicenseRow key={lic.id} license={lic} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <p
        className="mt-8 max-w-3xl text-[11px] leading-relaxed"
        style={{ color: "rgba(255, 255, 255, 0.4)" }}
      >
        Status-Übergänge LICENSED → EXECUTED erfordern menschliche Bestätigung
        durch qualifizierten AV (Sprint C3). Catch-all-Trigger nach Art. 4-10 EU
        2021/821 / §8 AWV erfordern Antrags-Vorbereitung über BAFA-ELAN-K2
        (Sprint C4).
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
        className="text-[18px] font-bold tabular-nums"
        style={{
          color: muted
            ? "rgba(255,255,255,0.4)"
            : primary
              ? "rgb(52,211,153)"
              : "rgba(255,255,255,0.92)",
        }}
      >
        {code}
      </div>
      <div
        className="text-[9px] font-semibold uppercase tracking-widest"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
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
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {label}
      </div>
      <div
        className={`text-[13px] ${mono ? "font-mono" : ""}`}
        style={{ color: "rgba(255,255,255,0.85)" }}
      >
        {value}
      </div>
    </div>
  );
}

function LicenseRow({ license }: { license: OperationLicense }) {
  const drawdown = license.totalCapValue
    ? (license.drawnDownValue / license.totalCapValue) * 100
    : null;

  return (
    <li
      className="flex items-center gap-4 border-b px-5 py-3 last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      <FileText
        className="h-4 w-4 shrink-0"
        strokeWidth={1.75}
        style={{ color: "rgba(255,255,255,0.55)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[12px] font-semibold"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            {license.licenseType.replace(/_/g, " ")}
          </span>
          {license.licenseNumber && (
            <span
              className="text-[11px]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              #{license.licenseNumber}
            </span>
          )}
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
            style={{
              background: "rgba(255,255,255,0.06)",
              color:
                license.status === "ACTIVE"
                  ? "rgb(52,211,153)"
                  : license.status === "EXPIRED" || license.status === "REVOKED"
                    ? "rgb(248,113,113)"
                    : "rgba(255,255,255,0.55)",
            }}
          >
            {license.status}
          </span>
        </div>
        <div
          className="mt-0.5 flex items-center gap-2 text-[11px]"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {license.issuedAt && (
            <>
              <Calendar className="h-3 w-3" />
              <span>
                Issued {new Date(license.issuedAt).toLocaleDateString("en-GB")}
              </span>
            </>
          )}
          {license.validUntil && (
            <>
              <span>·</span>
              <span>
                Valid until{" "}
                {new Date(license.validUntil).toLocaleDateString("en-GB")}
              </span>
            </>
          )}
        </div>
      </div>
      {drawdown !== null && (
        <div className="shrink-0 text-right">
          <div
            className="text-[12px] font-mono tabular-nums"
            style={{
              color:
                drawdown >= 90
                  ? "rgb(248,113,113)"
                  : drawdown >= 70
                    ? "rgb(251,191,36)"
                    : "rgba(255,255,255,0.85)",
            }}
          >
            {drawdown.toFixed(1)}%
          </div>
          <div
            className="text-[9px]"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            drawn down
          </div>
        </div>
      )}
    </li>
  );
}

function StatusInlineBadge({ status }: { status: Operation["status"] }) {
  const config: Record<Operation["status"], { color: string; label: string }> =
    {
      DRAFT: { color: "rgba(255,255,255,0.55)", label: "DRAFT" },
      AWAITING_CLASSIFICATION: {
        color: "rgb(251,191,36)",
        label: "AWAITING CLASSIFICATION",
      },
      SCREENING: { color: "rgb(251,191,36)", label: "SCREENING" },
      AWAITING_LICENSE: {
        color: "rgb(251,191,36)",
        label: "AWAITING LICENSE",
      },
      LICENSED: { color: "rgb(96,165,250)", label: "LICENSED" },
      EXECUTED: { color: "rgb(52,211,153)", label: "EXECUTED" },
      BLOCKED: { color: "rgb(248,113,113)", label: "BLOCKED" },
      VOLUNTARY_DISCLOSURE_FILED: {
        color: "rgb(248,113,113)",
        label: "VOLUNTARY DISCLOSURE",
      },
    };
  const c = config[status];
  return <span style={{ color: c.color }}>{c.label}</span>;
}
