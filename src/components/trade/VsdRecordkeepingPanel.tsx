"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * VsdRecordkeepingPanel — Caelex Passage P2, Lane C.
 *
 * Mounts on the operation detail page and carries TWO post-shipment duties that
 * a black-box product would silently drop after the goods leave:
 *
 *   1. RECORDKEEPING HAND-OFF (always, when EXECUTED)
 *      A short "Aufbewahrung: 5 Jahre" note citing the three regimes
 *      (22 CFR §122.5 / 15 CFR §762 / AWV), plus a one-click link to the
 *      court-ready verdict dossier as the PERMANENT RECORD of why this shipment
 *      was (or was not) cleared. Read-only — it points at the existing
 *      WhyThisDossierButton route; it computes + mutates nothing.
 *
 *   2. VSD PROMPT (LOUD, fail-closed)
 *      When the daily re-screen cron finds that this operation's counterparty
 *      flipped to a sanctions hit AFTER the shipment already executed, it raises
 *      a TradeVoluntaryDisclosure (status DISCOVERED, discoveredAt = flip time).
 *      This panel surfaces that as a RED alert: "Gegenpartei nachträglich
 *      getroffen — freiwillige Selbstanzeige (VSD) fällig bis <DATE>
 *      (22 CFR §127.12 / 15 CFR §764.5)", with the 60-day clock and a guided
 *      INFO panel (what a VSD is, who files it, the clock, the authority) via
 *      <ExplainedPanel>.
 *
 * THE INVARIANT: Caelex PREPARES + INFORMS — it does NOT file the VSD (no portal
 * API) and NEVER suppresses or auto-clears a post-hoc hit. The alert + clock +
 * guidance only; the human files and is recorded.
 *
 * Renders nothing chrome-heavy unless there is something to say: the
 * recordkeeping note shows only when EXECUTED; the VSD alert shows only when an
 * open post-hoc VSD exists.
 *
 * Dark-theme trade-* / glass tokens to match the Passage surface.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertOctagon, Archive, ExternalLink, FileText } from "lucide-react";

import { ExplainedPanel } from "@/components/trade/ExplainedPanel";
import { WhyThisDossierButton } from "@/components/trade/WhyThisDossierButton";
import {
  explainedResult,
  type ExplainedResult,
} from "@/lib/comply-v2/trade/explained-result";

// ─── VSD alert shape (from GET /api/trade/operations/[id]/vsd-alert) ────

interface VsdAlert {
  id: string;
  authority: string;
  violationType: string;
  title: string;
  status: string;
  discoveredAt: string;
  dueAt: string;
  daysRemaining: number;
  overdue: boolean;
  clockDays: number;
  party: { id: string; name: string; countryCode: string } | null;
}

// ─── The VSD guidance envelope — what a VSD IS, who files, the clock ────
//
// HIGH-confidence determined result: the disclosure duty + 60-day prompt-
// disclosure doctrine are published regulation, so the envelope carries real
// citations. The teaching value is in what/why/wherefore. The same content for
// expert + novice — transparency the auditor already requires.

function buildVsdGuidance(alert: VsdAlert): ExplainedResult<{ vsdId: string }> {
  const due = new Date(alert.dueAt).toLocaleDateString("de-DE");
  return explainedResult({
    value: { vsdId: alert.id },
    what:
      `Eine freiwillige Selbstanzeige (Voluntary Self-Disclosure, VSD) ist eine ` +
      `proaktive Meldung an die zuständige Behörde, dass möglicherweise gegen ` +
      `Exportkontroll-/Sanktionsrecht verstoßen wurde — hier: Lieferung an eine ` +
      `Gegenpartei, die ERST NACH dem Versand auf einer Sanktionsliste auftauchte.`,
    why:
      `Wer einen möglichen Verstoß selbst und zeitnah offenlegt, kann eine ` +
      `erhebliche Strafmilderung erhalten. OFAC behandelt eine Offenlegung ` +
      `binnen ~60 Tagen als „prompt“ (31 CFR §501.805(c)); BIS verlangt eine ` +
      `Meldung „so bald wie möglich“ (15 CFR §764.5); für ITAR-Sachverhalte ` +
      `gilt 22 CFR §127.12. Wer den Treffer hingegen verschweigt, riskiert das ` +
      `Gegenteil — verschärfte Sanktionen. Die Anzeige reicht der benannte ` +
      `Ausfuhrverantwortliche / Compliance-Officer ein, NICHT Caelex.`,
    wherefore:
      `Frist beachten: bis ${due} (${alert.clockDays}-Tage-Uhr ab Entdeckung). ` +
      `Sachverhalt mit dem/der Exportkontroll-Verantwortlichen + ggf. Rechtsrat ` +
      `prüfen, die Selbstanzeige vorbereiten (Caelex stellt den Entwurf bereit) ` +
      `und fristgerecht bei der Behörde einreichen. Den nachträglichen Treffer ` +
      `NICHT ignorieren oder auf „clear“ zurücksetzen.`,
    confidence: "HIGH",
    sources: [
      {
        label: "OFAC — Voluntary Self-Disclosure (60-Tage-Doktrin)",
        citation: "31 CFR §501.805(c)",
        url: "https://www.ecfr.gov/current/title-31/subtitle-B/chapter-V/part-501",
      },
      {
        label: "BIS — Voluntary Self-Disclosure",
        citation: "15 CFR §764.5",
        url: "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-764/section-764.5",
      },
      {
        label: "DDTC (ITAR) — Voluntary Disclosure",
        citation: "22 CFR §127.12",
        url: "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-127/section-127.12",
      },
    ],
  });
}

// ─── Public component ──────────────────────────────────────────────────

export interface VsdRecordkeepingPanelProps {
  operationId: string;
  /** The operation's current lifecycle status. */
  status: string;
}

export function VsdRecordkeepingPanel({
  operationId,
  status,
}: VsdRecordkeepingPanelProps) {
  const isExecuted =
    status === "EXECUTED" || status === "VOLUNTARY_DISCLOSURE_FILED";

  const [alerts, setAlerts] = useState<VsdAlert[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/trade/operations/${operationId}/vsd-alert`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { alerts?: VsdAlert[] } | null) => {
        if (!cancelled && data?.alerts) setAlerts(data.alerts);
      })
      .catch(() => {
        /* read-only enrichment — absence of the alert never blocks the page */
      });
    return () => {
      cancelled = true;
    };
  }, [operationId]);

  // Nothing to surface unless the shipment has executed OR a post-hoc VSD
  // exists (an EXECUTED operation later BLOCKED could still carry an alert).
  if (!isExecuted && alerts.length === 0) return null;

  return (
    <div className="space-y-6" data-testid="vsd-recordkeeping-panel">
      {/* ── VSD PROMPT — LOUD, fail-closed, one per post-hoc hit ── */}
      {alerts.map((alert) => {
        const due = new Date(alert.dueAt).toLocaleDateString("de-DE");
        return (
          <section
            key={alert.id}
            role="alert"
            data-testid="vsd-posthoc-alert"
            aria-label="Gegenpartei nachträglich getroffen — VSD fällig"
            className="overflow-hidden rounded-xl"
            style={{
              background: "rgba(239, 68, 68, 0.10)",
              border: "0.5px solid rgba(239, 68, 68, 0.40)",
            }}
          >
            <div
              className="flex items-start gap-3 px-5 py-4"
              style={{ borderBottom: "0.5px solid rgba(239, 68, 68, 0.25)" }}
            >
              <AlertOctagon
                className="mt-0.5 h-5 w-5 shrink-0"
                strokeWidth={2}
                style={{ color: "rgb(252, 165, 165)" }}
              />
              <div className="min-w-0">
                <h2
                  className="text-[15px] font-bold leading-snug"
                  style={{ color: "rgb(252, 165, 165)" }}
                >
                  Gegenpartei nachträglich getroffen — freiwillige Selbstanzeige
                  (VSD) fällig bis {due}
                </h2>
                <p
                  className="mt-1 text-[12.5px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.78)" }}
                >
                  {alert.party
                    ? `${alert.party.name} (${alert.party.countryCode})`
                    : "Die Gegenpartei dieses Vorgangs"}{" "}
                  wurde bei einer erneuten Prüfung als Sanktionstreffer
                  eingestuft — NACH Ausführung dieser bereits durchgeführten
                  Lieferung. {alert.authority} · {alert.clockDays}-Tage-Frist
                  (22 CFR §127.12 / 15 CFR §764.5).
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{
                      background: alert.overdue
                        ? "rgba(239,68,68,0.18)"
                        : "rgba(245,158,11,0.14)",
                      color: alert.overdue
                        ? "rgb(252,165,165)"
                        : "rgb(252,211,77)",
                    }}
                  >
                    {alert.overdue
                      ? `Frist überschritten (${Math.abs(alert.daysRemaining)} Tage)`
                      : `Noch ${alert.daysRemaining} Tage bis ${due}`}
                  </span>
                  <Link
                    href={`/trade/vsd?operation=${operationId}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold underline-offset-2 hover:underline"
                    style={{ color: "rgb(129, 220, 188)" }}
                  >
                    Selbstanzeige öffnen / vorbereiten
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Guided INFO — what a VSD is, who files, the clock, authority. */}
            <div className="px-5 py-4">
              <ExplainedPanel
                result={buildVsdGuidance(alert)}
                kind="Freiwillige Selbstanzeige (VSD) — Leitfaden"
                hardBanner="Caelex bereitet die Selbstanzeige als ENTWURF vor und reicht NICHTS ein. Ein Mensch entscheidet, reicht ein und wird protokolliert — der nachträgliche Treffer darf nicht ignoriert oder zurückgesetzt werden."
                defaultOpen
              />
            </div>
          </section>
        );
      })}

      {/* ── RECORDKEEPING HAND-OFF — 5-year retention + permanent record ── */}
      {isExecuted && (
        <section
          data-testid="recordkeeping-note"
          aria-label="Aufbewahrung & Nachweis-of-record"
          className="rounded-xl border border-trade-border-subtle bg-trade-bg-subtle p-5"
        >
          <div className="mb-2 flex items-center gap-2">
            <Archive className="h-4 w-4 text-trade-accent-strong" />
            <h2 className="text-[14px] font-semibold text-trade-text-primary">
              Aufbewahrung &amp; Nachweis-of-record
            </h2>
          </div>
          <p className="mb-3 max-w-3xl text-[12.5px] leading-relaxed text-trade-text-secondary">
            Die Lieferung ist ausgeführt. Die Unterlagen zu diesem Vorgang —
            Einstufung, Screening, Verdikt, Genehmigung und Zollabwicklung —
            sind aufbewahrungspflichtig.
          </p>

          <div
            role="note"
            className="mb-4 flex items-start gap-2 rounded-lg px-4 py-3"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "0.5px solid rgba(245,158,11,0.22)",
            }}
          >
            <FileText
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              style={{ color: "rgb(252,211,77)" }}
            />
            <p
              className="text-[12px] font-medium leading-relaxed"
              style={{ color: "rgb(252,211,77)" }}
            >
              Aufbewahrung: 5 Jahre (22 CFR §122.5 / 15 CFR §762 / AWV)
            </p>
          </div>

          <p className="mb-3 max-w-3xl text-[12px] leading-relaxed text-trade-text-muted">
            Das gerichtsfeste „Why this?“-Verdikt-Dossier ist der permanente
            Nachweis, auf welcher Grundlage diese Lieferung freigegeben (oder
            nicht freigegeben) wurde — mit Listen-Versionen, Snapshot-Hashes und
            einem selbst-attestierenden SHA-256. Lade es für die Akte herunter:
          </p>
          <WhyThisDossierButton operationId={operationId} />

          <p className="mt-3 text-[11px] leading-relaxed text-trade-text-muted">
            Den vollständigen, manipulationsgeschützten Verlauf siehst du im{" "}
            <Link
              href={`/trade/operations/${operationId}/audit-trail`}
              className="font-semibold text-trade-accent-strong underline-offset-2 hover:underline"
            >
              Audit-Trail (Hash-Kette)
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}

export default VsdRecordkeepingPanel;
