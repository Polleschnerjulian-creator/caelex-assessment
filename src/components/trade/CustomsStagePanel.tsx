"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * CustomsStagePanel — Caelex Passage P1, Lane 3 (the 6th stage: G3).
 *
 * The journey ends at the customs filing. After an operation reaches
 * EXECUTED, the human still has to FILE the export with the authorities —
 * and that step is exactly where a black-box product would quietly fail
 * the operator. This panel completes the journey by TEACHING the three
 * customs/end-stage filings that travel with a space-hardware shipment:
 *
 *   1. DE Ausfuhranmeldung (ATLAS / EZT)            — the German export
 *      declaration, filed in the ATLAS-Ausfuhr portal.
 *   2. US AES filing (ACE / AESDirect)              — Electronic Export
 *      Information for US-origin / EAR/ITAR items.
 *   3. Destination Control Statement (15 CFR §758.6) — the statement that
 *      must travel ON the commercial documents.
 *
 * Each stage is a {what the law requires / who / what you do next} block,
 * and each carries its "why" through the canonical Explanation Envelope
 * (<ExplainedPanel>) so the legal basis is never a bare assertion.
 *
 * THE DECISIVE TRUST LINE (carried verbatim, un-collapsible):
 *   "Caelex bereitet einen ENTWURF vor und reicht NICHTS ein; du bleibst
 *    verantwortlich."
 * Caelex prepares a DRAFT and submits NOTHING — the human files. We do NOT
 * integrate any ATLAS/AES portal API: those portals expose no public API,
 * and the end-state is by design "prepare everything; the human clicks
 * submit." AI proposes, the human decides + is recorded.
 *
 * Returns null unless `status === "EXECUTED"` — it keys off the EXISTING
 * lifecycle status and adds NO new enum value (state-machine-safe).
 *
 * Dark-theme trade-* tokens to match the Passage surface.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  AlertTriangle,
  Download,
  FileText,
  Landmark,
  Loader2,
  Lock,
  ShieldCheck,
  Ship,
  X,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { ExplainedPanel } from "@/components/trade/ExplainedPanel";
import { BafaXmlButton } from "@/components/trade/BafaXmlButton";
import { DcsGeneratorButton } from "@/components/trade/DcsGeneratorButton";
import { MISSING_IDENTIFIER_PLACEHOLDER } from "@/lib/trade/customs-filing/export-identifier";
import {
  explainedResult,
  type ExplainedResult,
} from "@/lib/comply-v2/trade/explained-result";

// ─── The decisive trust line ─────────────────────────────────────────

const TRUST_LINE =
  "Caelex bereitet einen ENTWURF vor und reicht NICHTS ein; du bleibst verantwortlich.";

// ─── Operation slice the panel needs (from GET /api/trade/operations/[id]) ──

interface OperationSlice {
  id: string;
  reference: string;
  shipToCountry: string;
  endUseCountry: string | null;
  counterparty: {
    legalName: string;
    countryCode: string;
  } | null;
  lines: Array<{
    item: {
      eccnUS: string | null;
    };
  }>;
}

// ─── "Why" envelopes — statutory teaching facts, citation-backed ──────
//
// Each stage's "why" is a HIGH-confidence determined result: the legal
// duty is a published statute/regulation, so we can carry it with a real
// source. The envelope's `value` is intentionally trivial — the teaching
// value is in what/why/wherefore, surfaced through <ExplainedPanel>.

const ATLAS_WHY: ExplainedResult<{ stage: "ATLAS" }> = explainedResult({
  value: { stage: "ATLAS" },
  what: "Die Ausfuhr ist in ATLAS-Ausfuhr (Zoll) anzumelden, bevor die Ware das Zollgebiet der Union verlässt.",
  why: "Art. 263 UZK (VO (EU) 952/2013) verlangt für Drittland-Ausfuhren eine Ausfuhranmeldung; die Abgabe erfolgt elektronisch über das deutsche IT-Verfahren ATLAS-Ausfuhr. Die Anmeldung referenziert die ggf. erforderliche BAFA-Genehmigung (X002/EZG) im Unterlagencode.",
  wherefore:
    "Lade unten den ATLAS-Entwurf (XML) herunter, prüfe ihn auf dem Bildschirm und reiche ihn in ATLAS-Ausfuhr ein — Caelex reicht nichts für dich ein.",
  confidence: "HIGH",
  sources: [
    {
      label: "Unionszollkodex — Ausfuhranmeldung",
      citation: "Art. 263 UZK, VO (EU) Nr. 952/2013",
      listVersion: "konsolidiert",
      url: "https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32013R0952",
    },
    {
      label: "Zoll — ATLAS-Ausfuhr",
      citation: "IT-Verfahren ATLAS, GZD (DE)",
      url: "https://www.zoll.de/DE/Fachthemen/Zoelle/ATLAS/atlas_node.html",
    },
  ],
});

const AES_WHY: ExplainedResult<{ stage: "AES" }> = explainedResult({
  value: { stage: "AES" },
  what: "Für US-Ursprungswaren bzw. EAR/ITAR-gelistete Artikel ist Electronic Export Information (EEI) über AES (ACE / AESDirect) abzugeben.",
  why: "Die Foreign Trade Regulations (15 CFR Part 30) verlangen die EEI-Abgabe in AES, u. a. wenn eine Position einer ECCN unterliegt, die eine Lizenz erfordert, oder den Wert-Schwellenwert je Schedule-B überschreitet. Die Abgabe erfolgt im CBP-Portal ACE/AESDirect.",
  wherefore:
    "Bereite den AES-Entwurf vor, prüfe USPPI-Block + ECCN/Lizenzcode, und reiche ihn in ACE/AESDirect ein. Caelex erstellt nur den Entwurf.",
  confidence: "HIGH",
  sources: [
    {
      label: "Foreign Trade Regulations — EEI / AES",
      citation: "15 CFR Part 30 (FTR)",
      listVersion: "e-CFR",
      url: "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-I/part-30",
    },
    {
      label: "CBP — Automated Export System (ACE/AESDirect)",
      citation: "CBP ACE / AESDirect",
      url: "https://www.cbp.gov/trade/aes",
    },
  ],
});

const DCS_WHY: ExplainedResult<{ stage: "DCS" }> = explainedResult({
  value: { stage: "DCS" },
  what: "Ein Destination Control Statement (DCS) muss auf den Handelsdokumenten der Sendung erscheinen.",
  why: "15 CFR §758.6 verlangt für Artikel, die dem EAR unterliegen (außer EAR99 / bestimmte Ausnahmen), die DCS-Erklärung auf der Handelsrechnung bzw. dem Frachtbrief; für 9x515- und 600-Serien-Positionen gilt die erweiterte Sprachfassung (§758.6(b)).",
  wherefore:
    "Generiere unten die DCS-Erklärung, prüfe sie in der Vorschau und füge sie der Handelsrechnung / dem Luftfrachtbrief bei.",
  confidence: "HIGH",
  sources: [
    {
      label: "EAR — Destination Control Statement",
      citation: "15 CFR §758.6",
      listVersion: "e-CFR",
      url: "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-758/section-758.6",
    },
  ],
});

// ─── BAFA payload PREVIEW (on-screen before download) ─────────────────
//
// The DCS modal already previews. This adds the equivalent for the BAFA
// payload: fetch the EXACT XML the download produces and show it on
// screen first, so nothing is downloaded sight-unseen.

function BafaPayloadPreview({ operationId }: { operationId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xml, setXml] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setXml(null);
    try {
      const res = await fetch(`/api/trade/operations/${operationId}/bafa-xml`, {
        method: "GET",
        headers: { Accept: "application/xml" },
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) detail = body.error;
        } catch {
          // non-JSON body — keep HTTP detail
        }
        throw new Error(detail);
      }
      setXml(await res.text());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorschau fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  function handleOpen() {
    setOpen(true);
    void fetchPreview();
  }

  function handleClose() {
    setOpen(false);
    setXml(null);
    setError(null);
  }

  // Does the previewed payload still carry the honest missing-identifier
  // placeholder? If so, surface a loud not-fileable banner — the draft must
  // not be filed until the org sets its EORI. Couple to the canonical
  // constant rather than sniffing a bare glyph, so the detection can't drift
  // if the placeholder text changes.
  const hasMissingIdentifier =
    xml?.includes(MISSING_IDENTIFIER_PLACEHOLDER) ?? false;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all"
        style={{
          background: "rgba(148,163,184,0.12)",
          color: "rgb(203,213,225)",
          boxShadow: "inset 0 0 0 0.5px rgba(148,163,184,0.30)",
        }}
        title="BAFA-Payload auf dem Bildschirm prüfen, bevor du herunterlädst"
      >
        <FileText className="h-3.5 w-3.5" />
        BAFA-Payload Vorschau
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="BAFA-Payload Vorschau"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={handleClose}
        >
          <div
            className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgb(15,23,42)",
              boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10)",
            }}
          >
            <div
              className="flex items-start justify-between gap-4 px-6 py-4"
              style={{ borderBottom: "0.5px solid rgba(255,255,255,0.10)" }}
            >
              <div>
                <h2 className="text-[15px] font-semibold text-white">
                  BAFA-Payload — Vorschau
                </h2>
                <p
                  className="mt-0.5 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  Das ist exakt der Entwurf, der heruntergeladen würde. Caelex
                  reicht nichts ein.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Schließen"
                className="rounded-md p-1 transition-colors"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
              {loading && (
                <div
                  className="flex items-center gap-2 py-8 text-[13px]"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vorschau wird erzeugt…
                </div>
              )}

              {error && !loading && (
                <div
                  role="alert"
                  className="rounded-lg px-3 py-2 text-[12.5px]"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    color: "rgb(252,165,165)",
                    border: "0.5px solid rgba(239,68,68,0.30)",
                  }}
                >
                  {error}
                </div>
              )}

              {xml && !loading && !error && (
                <>
                  {hasMissingIdentifier && (
                    <div
                      role="alert"
                      className="mb-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[12px]"
                      style={{
                        background: "rgba(245,158,11,0.12)",
                        color: "rgb(252,211,77)",
                        border: "0.5px solid rgba(245,158,11,0.30)",
                      }}
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Dieser Entwurf enthält einen fehlenden Identifikator (⚠
                        FEHLT). Hinterlege EORI/EIN im Org-Profil, bevor du
                        einreichst — der Entwurf ist so nicht abgabefähig.
                      </span>
                    </div>
                  )}
                  <pre
                    className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-lg px-4 py-3 font-mono text-[11.5px] leading-relaxed"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    {xml}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Stage card ───────────────────────────────────────────────────────

function StageCard({
  icon,
  index,
  title,
  lawRequires,
  who,
  next,
  why,
  whyKind,
  actions,
}: {
  icon: ReactNode;
  index: number;
  title: string;
  lawRequires: string;
  who: string;
  next: string;
  why: ExplainedResult<unknown>;
  whyKind: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-trade-border-subtle bg-trade-bg-elevated p-5">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-trade-accent-soft text-[12px] font-bold text-trade-accent-strong"
          aria-hidden
        >
          {index}
        </span>
        <span className="text-trade-text-muted">{icon}</span>
        <h3 className="text-[14px] font-semibold text-trade-text-primary">
          {title}
        </h3>
      </div>

      <dl className="mb-4 space-y-2.5">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-trade-text-muted">
            Was das Gesetz verlangt
          </dt>
          <dd className="mt-0.5 text-[12.5px] leading-relaxed text-trade-text-secondary">
            {lawRequires}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-trade-text-muted">
            Wer
          </dt>
          <dd className="mt-0.5 text-[12.5px] leading-relaxed text-trade-text-secondary">
            {who}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-trade-text-muted">
            Was du als Nächstes tust
          </dt>
          <dd className="mt-0.5 text-[12.5px] leading-relaxed text-trade-text-secondary">
            {next}
          </dd>
        </div>
      </dl>

      {/* The "why" — carried through the canonical Explanation Envelope. */}
      <div className="mb-4">
        <ExplainedPanel result={why} kind={whyKind} />
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      )}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────

export interface CustomsStagePanelProps {
  operationId: string;
  status: string;
}

export function CustomsStagePanel({
  operationId,
  status,
}: CustomsStagePanelProps) {
  // Key off the EXISTING lifecycle status — no new enum (state-machine-safe).
  const isExecuted = status === "EXECUTED";

  const [op, setOp] = useState<OperationSlice | null>(null);

  useEffect(() => {
    if (!isExecuted) return;
    let cancelled = false;
    void fetch(`/api/trade/operations/${operationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { operation?: OperationSlice } | null) => {
        if (!cancelled && data?.operation) setOp(data.operation);
      })
      .catch(() => {
        /* read-only enrichment; the panel still teaches without it */
      });
    return () => {
      cancelled = true;
    };
  }, [isExecuted, operationId]);

  // CONTRACT: returns null unless status === "EXECUTED".
  if (!isExecuted) return null;

  // Derive DCS / button inputs from the operation slice (honest fallbacks).
  const reference = op?.reference ?? operationId;
  const destinationCountry =
    op?.endUseCountry ??
    op?.shipToCountry ??
    op?.counterparty?.countryCode ??
    "";
  const consigneeName = op?.counterparty?.legalName ?? undefined;
  const eccns = Array.from(
    new Set(
      (op?.lines ?? [])
        .map((l) => l.item.eccnUS)
        .filter((e): e is string => typeof e === "string" && e.trim() !== ""),
    ),
  );

  return (
    <section
      data-testid="customs-stage-panel"
      aria-label="Zollanmeldung — was jetzt?"
      className="rounded-xl border border-trade-border-subtle bg-trade-bg-subtle p-6"
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <Landmark className="h-4 w-4 text-trade-accent-strong" />
        <h2 className="text-[16px] font-semibold text-trade-text-primary">
          Zollanmeldung — was jetzt?
        </h2>
      </div>
      <p className="mb-4 max-w-3xl text-[12.5px] leading-relaxed text-trade-text-secondary">
        Die Operation ist <span className="font-semibold">EXECUTED</span> — die
        Genehmigungs- und Screening-Stufen sind durch. Jetzt folgt die
        eigentliche Zoll-/Ausfuhrabwicklung. Diese drei Schritte begleiten die
        Sendung; Caelex bereitet jeden Entwurf vor, eingereicht wird von einem
        Menschen.
      </p>

      {/* Decisive trust line — un-collapsible. */}
      <div
        role="note"
        className="mb-6 flex items-start gap-2 rounded-lg px-4 py-3"
        style={{
          background: "rgba(245,158,11,0.10)",
          border: "0.5px solid rgba(245,158,11,0.28)",
        }}
      >
        <Lock
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ color: "rgb(252,211,77)" }}
        />
        <p
          className="text-[12.5px] font-medium leading-relaxed"
          style={{ color: "rgb(252,211,77)" }}
        >
          {TRUST_LINE}
        </p>
      </div>

      <div className="space-y-5">
        {/* Stage 1 — DE Ausfuhranmeldung (ATLAS) */}
        <StageCard
          index={1}
          icon={<Landmark className="h-4 w-4" />}
          title="DE Ausfuhranmeldung (ATLAS / EZT)"
          lawRequires="Drittland-Ausfuhren erfordern eine elektronische Ausfuhranmeldung (Art. 263 UZK), abgegeben über ATLAS-Ausfuhr; eine erforderliche BAFA-Genehmigung wird im Unterlagencode referenziert."
          who="Der Ausführer / Anmelder (bzw. ein bevollmächtigter Zollvertreter) — verantwortlich bleibt die im Unternehmen benannte Person."
          next="BAFA-Antrag (XML) erzeugen, in der Vorschau prüfen, dann in ATLAS-Ausfuhr hochladen / die Ausfuhranmeldung abgeben."
          why={ATLAS_WHY}
          whyKind="Ausfuhranmeldung — Rechtsgrundlage"
          actions={
            <>
              <BafaXmlButton
                operationId={operationId}
                operationReference={reference}
              />
              <BafaPayloadPreview operationId={operationId} />
            </>
          }
        />

        {/* Stage 2 — US AES (ACE/AESDirect) */}
        <StageCard
          index={2}
          icon={<Ship className="h-4 w-4" />}
          title="US AES-Meldung (ACE / AESDirect)"
          lawRequires="Für US-Ursprungswaren / EAR-ITAR-gelistete Artikel ist Electronic Export Information über AES abzugeben (15 CFR Part 30)."
          who="Der USPPI (US Principal Party in Interest) bzw. ein bevollmächtigter Filing-Agent — die Verantwortung trägt der benannte Mensch."
          next="AES-Entwurf prüfen (USPPI-Block, ECCN, Lizenzcode) und in ACE/AESDirect einreichen. Caelex stellt nur den Entwurf bereit; es gibt keine öffentliche AES-API."
          why={AES_WHY}
          whyKind="AES / EEI — Rechtsgrundlage"
        />

        {/* Stage 3 — Destination Control Statement */}
        <StageCard
          index={3}
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Destination Control Statement (15 CFR §758.6)"
          lawRequires="Für EAR-unterliegende Artikel muss die DCS-Erklärung auf der Handelsrechnung bzw. dem Frachtbrief erscheinen; für 9x515- / 600-Serien-Positionen gilt die erweiterte Sprachfassung."
          who="Der Exporteur erstellt die Erklärung und sorgt dafür, dass sie die Sendung auf den Handelsdokumenten begleitet."
          next="DCS-Erklärung generieren, in der Vorschau prüfen und auf Handelsrechnung / Luftfrachtbrief übernehmen."
          why={DCS_WHY}
          whyKind="DCS — Rechtsgrundlage"
          actions={
            eccns.length > 0 && destinationCountry ? (
              <DcsGeneratorButton
                eccns={eccns}
                destinationCountry={destinationCountry}
                consigneeName={consigneeName}
                shipmentReference={reference}
              />
            ) : (
              <p className="flex items-center gap-2 text-[12px] text-trade-text-muted">
                <AlertTriangle className="h-3.5 w-3.5" />
                DCS verfügbar, sobald eine US-ECCN und ein Zielland auf der
                Operation hinterlegt sind.
              </p>
            )
          }
        />
      </div>

      {/* Identifier honesty footer — fail-closed link to set real identifiers. */}
      <div
        className="mt-6 flex items-start gap-2 rounded-lg px-4 py-3"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <Download
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trade-text-muted"
          aria-hidden
        />
        <p className="text-[11.5px] leading-relaxed text-trade-text-muted">
          Die Entwürfe verwenden die im Org-Profil hinterlegten echten
          Identifikatoren (EORI, US-EIN, Ausfuhrzollstelle). Fehlt ein Wert,
          trägt der Entwurf einen sichtbaren{" "}
          <span className="font-mono text-amber-400">⚠ FEHLT</span>-Platzhalter
          (nie eine erfundene Null-Nummer) und ist so nicht abgabefähig.{" "}
          <Link
            href="/trade/settings"
            className="font-semibold text-trade-accent-strong underline-offset-2 hover:underline"
          >
            Identifikatoren im Org-Profil hinterlegen
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

export default CustomsStagePanel;
