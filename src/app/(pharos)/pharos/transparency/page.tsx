/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /pharos/transparency — public transparency dashboard.
 *
 * Aggregates the Glass-Box guarantees of Pharos onto one page:
 *   - witness-quorum status (3-of-5 cosigning live)
 *   - hash-chain tree-size + tip
 *   - norm-anchor index size
 *   - drift-alert open count
 *   - layer-by-layer architecture overview with verify links
 *
 * Public-readable WITHIN the authority workspace (not a citizen-facing
 * route). The /api/pharos/witness-checkpoint and /api/pharos/citizen-audit
 * endpoints are the citizen-facing public surfaces.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Database,
  ExternalLink,
  FileSearch,
  Fingerprint,
  Network,
  Scale,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function loadStats() {
  const [
    accessLogCount,
    normAnchorCount,
    openDriftAlerts,
    activeOversights,
    authorityCount,
    workflowOpen,
    approvalOpen,
    webhookActive,
  ] = await Promise.all([
    prisma.oversightAccessLog.count(),
    prisma.normAnchor.count(),
    prisma.normDriftAlert.count({ where: { status: "OPEN" } }),
    prisma.oversightRelationship.count({ where: { status: "ACTIVE" } }),
    prisma.authorityProfile.count(),
    prisma.workflowCase.count({ where: { closedAt: null } }),
    prisma.approvalRequest.count({
      where: { status: "OPEN", expiresAt: { gt: new Date() } },
    }),
    prisma.pharosWebhookEndpoint.count({ where: { status: "ACTIVE" } }),
  ]);
  const latest = await prisma.oversightAccessLog.findFirst({
    orderBy: { createdAt: "desc" },
    select: { entryHash: true, createdAt: true },
  });
  return {
    accessLogCount,
    normAnchorCount,
    openDriftAlerts,
    activeOversights,
    authorityCount,
    workflowOpen,
    approvalOpen,
    webhookActive,
    chainTip: latest?.entryHash ?? null,
    chainTipAt: latest?.createdAt ?? null,
  };
}

const PILLARS = [
  {
    icon: Fingerprint,
    title: "Citation-Pflicht",
    description:
      "Jede sachliche Aussage referenziert eine Norm oder einen DB-Datensatz. Ohne Citation: keine Antwort, sondern strukturierte Abstention.",
    layer: "1",
    verifyHref: null,
  },
  {
    icon: Sparkles,
    title: "LLM-as-a-Judge",
    description:
      "Eine zweite Inferenz prüft jede Pharos-Antwort gegen die gelieferten Citations. Bei Halluzinations-Verdacht wird die Antwort verworfen.",
    layer: "2",
    verifyHref: null,
  },
  {
    icon: CheckCircle2,
    title: "Triple-Hash + Ed25519",
    description:
      "inputHash || contextHash || outputHash → receiptHash, mit Authority-Key signiert. Externe via npx pharos-verify <entryId>.",
    layer: "3",
    verifyHref: "/api/pharos/witness-checkpoint",
    verifyLabel: "Tree-Head",
  },
  {
    icon: Network,
    title: "Hash-Chain",
    description:
      "Jeder Receipt verkettet sich an den vorherigen. Tamper-evidente, append-only Log-Struktur in Postgres.",
    layer: "4",
    verifyHref: null,
  },
  {
    icon: Scale,
    title: "Witness-Quorum 3-of-5",
    description:
      "Tree-Heads werden von 5 unabhängigen Schlüsseln cosigniert. Quorum 3 schützt gegen Split-View-Attacken.",
    layer: "5",
    verifyHref: "/api/pharos/witness-checkpoint",
    verifyLabel: "Live-Status",
  },
  {
    icon: FileSearch,
    title: "Time-Travel",
    description:
      "Jede historische Aussage ist byte-identisch reproduzierbar. /api/pharos/time-travel?ts=...",
    layer: "6",
    verifyHref: "/api/pharos/time-travel?ts=2026-04-29T00:00:00Z",
    verifyLabel: "API",
  },
] as const;

export default async function TransparencyPage() {
  const stats = await loadStats();
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <div className="text-[10px] tracking-[0.22em] uppercase text-amber-700 dark:text-amber-400/70 font-semibold">
          Glass Lighthouse · Transparenz-Dashboard
        </div>
        <h1 className="text-2xl font-semibold mt-1 text-slate-900 dark:text-slate-100">
          Verifiable Refusal — live verifizierbar.
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Pharos macht jede AI-Antwort kryptografisch überprüfbar. Diese Seite
          fasst die sechs Schichten zusammen, die das garantieren.
        </p>
      </div>

      {/* Live-Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Behörden" value={stats.authorityCount} />
        <Stat label="Aktive Aufsichten" value={stats.activeOversights} />
        <Stat label="Hash-Chain-Größe" value={stats.accessLogCount} />
        <Stat label="Norm-Anchors" value={stats.normAnchorCount} />
        <Stat label="Offene Workflows" value={stats.workflowOpen} />
        <Stat label="Offene Mitzeichnungen" value={stats.approvalOpen} />
        <Stat label="Aktive Webhooks" value={stats.webhookActive} />
        <Stat
          label="Offene Drift-Alerts"
          value={stats.openDriftAlerts}
          tone={stats.openDriftAlerts > 0 ? "warn" : "ok"}
        />
      </div>

      {/* Chain-Tip */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-navy-900/30">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Hash-Chain-Tip
          </h2>
        </div>
        {stats.chainTip ? (
          <>
            <code className="block text-[11px] font-mono break-all text-slate-700 dark:text-slate-300">
              {stats.chainTip}
            </code>
            <div className="text-[10px] text-slate-500 mt-1">
              Letzter Eintrag:{" "}
              {stats.chainTipAt
                ? new Date(stats.chainTipAt).toLocaleString()
                : "—"}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Hash-Chain ist noch leer (Genesis-State).
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="/api/pharos/witness-checkpoint"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <ExternalLink className="w-3 h-3" />
            Witness-Checkpoint JSON
          </a>
          <a
            href="/api/pharos/citizen-audit"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
          >
            <ExternalLink className="w-3 h-3" />
            DSGVO-Auskunft
          </a>
        </div>
      </div>

      {/* Pillars */}
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Sechs Schichten
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-navy-900/30"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] tracking-wider uppercase text-slate-500 font-semibold">
                        Schicht {p.layer}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {p.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {p.description}
                    </p>
                    {p.verifyHref && (
                      <a
                        href={p.verifyHref}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {p.verifyLabel}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CLI hint */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Externe Verifikation
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Jeder Pharos-Receipt ist mit reinen Node.js-Stdlib-Mitteln lokal
          verifizierbar — ohne Caelex-Software:
        </p>
        <pre className="mt-2 px-3 py-2 rounded bg-slate-900 text-emerald-300 text-[11px] font-mono overflow-x-auto">
          npx pharos-verify &lt;entryId&gt;
        </pre>
        <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-2">
          Source:{" "}
          <Link
            href="https://github.com/Polleschnerjulian-creator/caelex-assessment/tree/main/packages/pharos-verify"
            target="_blank"
            className="underline hover:text-amber-700 dark:hover:text-amber-300"
          >
            github · packages/pharos-verify
          </Link>
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "ok" | "warn";
}) {
  const valueClasses = {
    default: "text-slate-900 dark:text-slate-100",
    ok: "text-emerald-700 dark:text-emerald-300",
    warn: "text-amber-700 dark:text-amber-300",
  }[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/5 dark:bg-navy-900/30">
      <div className="text-[11px] tracking-wider uppercase text-slate-500 font-medium">
        {label}
      </div>
      <div
        className={`text-2xl font-semibold mt-1 tabular-nums ${valueClasses}`}
      >
        {value}
      </div>
    </div>
  );
}
