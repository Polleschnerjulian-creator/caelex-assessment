"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * /trade/operations/[id]/audit-trail — Caelex Passage P2, Lane C.
 *
 * The tamper-evident HASH-CHAIN VIEWER for one Ausfuhrvorgang. Export control
 * attaches personal, criminal liability to a NAMED HUMAN; when a regulator asks
 * "prove these records weren't edited after the fact", this page is the answer.
 *
 * It renders THIS operation's AuditLog entries as a CHAIN — each entry shows its
 * own entryHash and the previousHash it links back to, so the SHA-256 linkage is
 * visible top-to-bottom. A "Kette verifizieren" action POSTs to the verify
 * endpoint, which recomputes every hash server-side (the existing verifyChain)
 * and returns the canonical Explanation Envelope; the result renders through
 * <ExplainedPanel> so an INTACT chain reads as a determined HIGH-confidence
 * result and a BROKEN one fails closed to UNVERIFIED (amber, blocking — never a
 * silent green).
 *
 * READ-ONLY surface. The only write the verify action performs is an audit-log
 * OF THE VERIFICATION itself — it never mutates a verdict or clears anything.
 *
 * Dark-theme trade-* tokens to match the Passage surface.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, Loader2, ShieldCheck, KeyRound } from "lucide-react";

import { ExplainedPanel } from "@/components/trade/ExplainedPanel";
import type { ExplainedResult } from "@/lib/comply-v2/trade/explained-result";

interface ChainEntry {
  id: string;
  action: string;
  description: string | null;
  timestamp: string;
  entryHash: string | null;
  previousHash: string | null;
  actor: string | null;
}

interface OperationMeta {
  id: string;
  reference: string;
  status: string;
  closedAt: string | null;
}

interface ChainVerification {
  valid: boolean;
  checkedEntries: number;
  brokenAtEntryId?: string;
  brokenAtTimestamp?: string;
}

function shortHash(h: string | null): string {
  if (!h) return "—";
  if (h.length <= 20) return h;
  return `${h.slice(0, 12)}…${h.slice(-6)}`;
}

export default function OperationAuditTrailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [op, setOp] = useState<OperationMeta | null>(null);
  const [entries, setEntries] = useState<ChainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] =
    useState<ExplainedResult<ChainVerification> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/trade/operations/${id}/audit-trail`)
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(
            r.status === 404
              ? "Vorgang nicht gefunden."
              : r.status === 403
                ? "Kein Zugriff auf diesen Vorgang."
                : `Laden fehlgeschlagen (HTTP ${r.status}).`,
          );
        }
        return r.json();
      })
      .then((data: { operation: OperationMeta; entries: ChainEntry[] }) => {
        if (cancelled) return;
        setOp(data.operation ?? null);
        setEntries(data.entries ?? []);
        setLoadError(null);
      })
      .catch((e) => {
        if (!cancelled)
          setLoadError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const verifyChain = useCallback(async () => {
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch(`/api/trade/operations/${id}/audit-trail`, {
        method: "POST",
      });
      if (!res.ok) {
        let message = `Verifizierung fehlgeschlagen (HTTP ${res.status}).`;
        if (res.status === 429)
          message =
            "Zu viele Anfragen — bitte kurz warten und erneut versuchen.";
        else {
          try {
            const body = (await res.json()) as { error?: string };
            if (body?.error) message = body.error;
          } catch {
            /* keep generic */
          }
        }
        throw new Error(message);
      }
      const data = (await res.json()) as {
        explained: ExplainedResult<ChainVerification>;
      };
      setVerifyResult(data.explained);
    } catch (e) {
      setVerifyError(
        e instanceof Error ? e.message : "Verifizierung fehlgeschlagen",
      );
    } finally {
      setVerifying(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-lg px-8 py-8 text-trade-text-secondary">
        Laden…
      </div>
    );
  }

  if (loadError || !op) {
    return (
      <div className="mx-auto max-w-screen-lg px-8 py-8 text-trade-text-secondary">
        {loadError ?? "Vorgang nicht gefunden."}{" "}
        <Link
          href={`/trade/operations/${id}`}
          className="text-trade-accent underline decoration-dotted hover:text-trade-accent-strong"
        >
          ← zurück zum Vorgang
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-lg px-8 py-8">
      <Link
        href={`/trade/operations/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-trade-text-secondary transition hover:text-trade-text-primary"
      >
        <ArrowLeft className="h-3 w-3" /> Vorgang {op.reference}
      </Link>

      {/* Header */}
      <header className="mb-6 border-b border-trade-border-subtle pb-5">
        <div className="mb-2 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-trade-accent-strong" />
          <h1 className="text-[22px] font-bold tracking-tight text-trade-text-primary">
            Audit-Trail — Manipulationsschutz
          </h1>
        </div>
        <p className="max-w-3xl text-[13px] leading-relaxed text-trade-text-secondary">
          Jede protokollierte Handlung an diesem Vorgang ist über eine
          SHA-256-Hash-Kette mit ihrem Vorgänger verknüpft. Wird ein Eintrag
          nachträglich verändert oder gelöscht, bricht die Kette ab diesem Punkt
          — das macht den Nachweis manipulationsgeschützt (Nachweis-of-record
          gegenüber Zoll / BAFA / BIS).
        </p>
      </header>

      {/* Verify action + result */}
      <section className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Integritätsprüfung
          </h2>
          <button
            type="button"
            onClick={verifyChain}
            disabled={verifying}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-60"
            style={{
              background: "rgba(129, 220, 188, 0.14)",
              color: "rgb(129, 220, 188)",
              boxShadow: "inset 0 0 0 0.5px rgba(52, 211, 153, 0.40)",
            }}
            title="Die Hash-Kette serverseitig neu berechnen und auf Manipulation prüfen"
          >
            {verifying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {verifying ? "Kette wird verifiziert…" : "Kette verifizieren"}
          </button>
        </div>

        {verifyError && (
          <div
            role="alert"
            className="mb-3 rounded-md px-4 py-3 text-[13px] trade-chip-danger"
          >
            {verifyError}
          </div>
        )}

        {verifyResult ? (
          <ExplainedPanel
            result={verifyResult}
            kind="Hash-Ketten-Verifizierung"
            defaultOpen
          />
        ) : (
          <p className="text-[12px] leading-relaxed text-trade-text-muted">
            Noch nicht geprüft. „Kette verifizieren“ berechnet jeden
            Eintrag-Hash neu und meldet, ob die Kette intakt ist oder ab welchem
            Eintrag sie bricht.
          </p>
        )}
      </section>

      {/* Chain */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-secondary">
            Hash-Kette · {entries.length}{" "}
            {entries.length === 1 ? "Eintrag" : "Einträge"}
          </h2>
          <span className="text-[10px] text-trade-text-muted">
            älteste zuerst — Hashes verknüpfen nach unten
          </span>
        </div>

        {entries.length === 0 ? (
          <p className="rounded-md border border-trade-border-subtle bg-trade-bg-panel p-6 text-[12.5px] text-trade-text-muted">
            Für diesen Vorgang sind noch keine Audit-Einträge protokolliert.
          </p>
        ) : (
          <ol className="space-y-0">
            {entries.map((e, i) => (
              <li key={e.id} className="relative">
                {/* Connector to the previous entry's hash */}
                {i > 0 && (
                  <div
                    aria-hidden
                    className="ml-5 flex items-center gap-1.5 py-1 text-[10px] text-trade-text-muted"
                  >
                    <Link2 className="h-3 w-3" />
                    previousHash ↑
                  </div>
                )}
                <div className="rounded-md border border-trade-border-subtle bg-trade-bg-panel p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-trade-bg-subtle px-2 py-0.5 font-mono text-[11px] font-semibold text-trade-text-primary">
                          {e.action}
                        </span>
                        <span className="text-[11px] text-trade-text-muted">
                          {new Date(e.timestamp).toLocaleString("de-DE")}
                        </span>
                        {e.actor && (
                          <span className="text-[11px] text-trade-text-muted">
                            · {e.actor}
                          </span>
                        )}
                      </div>
                      {e.description && (
                        <p className="mt-1.5 text-[12.5px] leading-relaxed text-trade-text-secondary">
                          {e.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-widest text-trade-text-muted">
                      #{i + 1}
                    </span>
                  </div>

                  {/* The two hashes — the visible chain links */}
                  <dl className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <div className="rounded bg-trade-bg-subtle px-3 py-2">
                      <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-trade-text-muted">
                        previousHash
                      </dt>
                      <dd
                        className="mt-0.5 font-mono text-[11px] text-trade-text-secondary"
                        title={e.previousHash ?? "—"}
                      >
                        {shortHash(e.previousHash)}
                      </dd>
                    </div>
                    <div className="rounded bg-trade-bg-subtle px-3 py-2">
                      <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-trade-text-muted">
                        entryHash
                      </dt>
                      <dd
                        className={`mt-0.5 font-mono text-[11px] ${
                          e.entryHash
                            ? "text-trade-text-primary"
                            : "text-trade-accent-warn"
                        }`}
                        title={e.entryHash ?? "(nicht gehasht)"}
                      >
                        {e.entryHash
                          ? shortHash(e.entryHash)
                          : "(nicht gehasht)"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="mt-8 max-w-3xl text-[11px] leading-relaxed text-trade-text-muted">
        Die Kette ist organisationsweit; diese Ansicht filtert auf die Einträge
        dieses Vorgangs, die Verifizierung prüft jedoch die gesamte
        Organisations-Kette. Caelex zeigt und prüft — entschieden und
        protokolliert wird durch einen Menschen.
      </p>
    </div>
  );
}
