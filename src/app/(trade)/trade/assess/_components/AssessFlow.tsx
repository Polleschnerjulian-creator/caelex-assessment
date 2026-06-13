"use client";

/**
 * Caelex Passage — /trade/assess wizard orchestrator.
 *
 * A four-screen state machine: `upload → classify → landscape → verdict`.
 * Task 5 ships Screens 1–2 (upload + classify-confirm) and advances into a
 * landscape *placeholder*; Task 6 fills the Liefer-Landkarte and Task 7 the
 * single verdict.
 *
 * SAFETY (spec §7):
 *  - NO verdict is synthesised here. Nothing downstream runs until the human
 *    confirms the classification on Screen 2.
 *  - On confirm we persist EXACTLY the code the human picked (the top
 *    suggestion) via POST /api/trade/assess/from-datasheet (Task 4) — the
 *    route synthesises nothing either.
 *  - A no-extraction / low-confidence path offers an honest manual fallback
 *    rather than a guessed code (handled in ClassifyConfirm, §7.4).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { DatasheetDropzone } from "../../_components/DatasheetDropzone";
import type { DatasheetApplyPayload } from "../../_components/DatasheetDropzone";
import {
  ClassifyConfirm,
  type ClassifyConfirmSuggestion,
} from "./ClassifyConfirm";
import { LandscapeView } from "./LandscapeView";
import { PartyPicker } from "../../operations/new/_components/PartyPicker";
import { VerdictPanel } from "../../operations/new/_components/VerdictPanel";
import type { LandscapeResult } from "@/lib/trade/landscape";

type Step = "upload" | "classify" | "landscape" | "verdict";

/** Declared end-use options, mirroring the operations wizard. */
type EndUse = "CIVIL" | "DUAL_USE" | "MILITARY" | "WMD_RELATED";

/**
 * Exporter seat for the landscape engine call. v1 defaults to DE, matching the
 * operations wizard's `shipFromCountry` default; the engine resolves the origin
 * regime from it. (Org-derived seat is a fast-follow — spec §10.)
 */
const EXPORTER_SEAT = "DE";

/** The classification-relevant item carried forward once confirmed. */
interface ConfirmedItem {
  name: string;
  description: string;
  apertureMeters?: number;
  rangeKm?: number;
  payloadKg?: number;
  isRadHardened?: boolean;
  isMilSpec?: boolean;
  isAntiJam?: boolean;
}

/** ItemSignals keys we lift verbatim from the extraction into the item. */
const NUMERIC_ATTRS = ["apertureMeters", "rangeKm", "payloadKg"] as const;
const BOOLEAN_ATTRS = ["isRadHardened", "isMilSpec", "isAntiJam"] as const;

/** Fold the extracted attributes into the classifiable-item shape. */
function itemFromPayload(
  payload: DatasheetApplyPayload,
  name: string,
): ConfirmedItem {
  const extra: Record<string, number | boolean> = {};
  for (const a of payload.attributes) {
    if (
      NUMERIC_ATTRS.includes(a.attribute as (typeof NUMERIC_ATTRS)[number]) &&
      typeof a.value === "number"
    ) {
      extra[a.attribute] = a.value;
    } else if (
      BOOLEAN_ATTRS.includes(a.attribute as (typeof BOOLEAN_ATTRS)[number]) &&
      typeof a.value === "boolean"
    ) {
      extra[a.attribute] = a.value;
    }
  }
  return { name, description: "", ...extra };
}

/**
 * Derive an editable item-name DEFAULT from the datasheet the operator
 * uploaded — never from a matched control-code title.
 *
 * Source of truth = the uploaded datasheet's file name (the closest thing to
 * a product name we have client-side), with the file extension stripped and
 * the common separators normalised to spaces ("Star-Tracker_ST400.pdf" →
 * "Star Tracker ST400"). When no file name is available (attribute-only /
 * programmatic callers) we return "" so the input keeps its placeholder and
 * the operator types the real name. We deliberately do NOT fall back to
 * `suggestions[0].title`: a code title is a classification, not a name.
 */
function productNameFromPayload(p: DatasheetApplyPayload): string {
  const raw = p.fileName?.trim();
  if (!raw) return "";
  // Strip a trailing extension (".pdf", ".PDF", etc.) then tidy separators.
  const base = raw.replace(/\.[a-z0-9]+$/i, "");
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned;
}

export function AssessFlow() {
  const [step, setStep] = useState<Step>("upload");
  const [payload, setPayload] = useState<DatasheetApplyPayload | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carried into the landscape + verdict screens once persisted.
  const [itemId, setItemId] = useState<string | null>(null);
  const [confirmedItem, setConfirmedItem] = useState<ConfirmedItem | null>(
    null,
  );

  // Screen 3 (landscape) state.
  const [landscape, setLandscape] = useState<LandscapeResult | null>(null);
  const [landscapeLoading, setLandscapeLoading] = useState(false);

  // Screen 4 (verdict) — chosen destination + the real buyer + end-use.
  const [destination, setDestination] = useState<string | null>(null);
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);
  const [declaredEndUse, setDeclaredEndUse] = useState<EndUse>("CIVIL");
  const [operationId, setOperationId] = useState<string | null>(null);

  function handleApply(p: DatasheetApplyPayload) {
    setPayload(p);
    setError(null);
    // Seed the editable Artikelname from the PRODUCT the operator uploaded —
    // never from a matched control-code title. A code title like "Complete
    // rocket systems (MTCR Item-1.A.1)" is a CLASSIFICATION, not the item's
    // name; defaulting to it mislabels e.g. a star tracker as a rocket.
    // Best available product-name source = the uploaded datasheet's file name
    // (sans extension). When absent, leave the field EMPTY so the placeholder
    // prompts the operator to type the real name.
    if (!name) setName(productNameFromPayload(p));
    setStep("classify");
  }

  async function handleConfirm(suggestion: ClassifyConfirmSuggestion) {
    if (!payload) return;
    setSubmitting(true);
    setError(null);
    try {
      // Persist the operator-entered name. When blank, fall back to the
      // product name derived from the datasheet (file name) — NEVER the
      // matched code's title, which is a classification, not the item name.
      // A final neutral placeholder keeps the persisted item named when even
      // the file name is absent.
      const resolvedName =
        name.trim() || productNameFromPayload(payload) || "Datenblatt-Artikel";
      const item = itemFromPayload(payload, resolvedName);
      const res = await fetch("/api/trade/assess/from-datasheet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          item,
          // Persist EXACTLY the confirmed code — no synthesis. The route routes
          // the canonicalId prefix onto the right TradeItem regime cell.
          confirmedCode: {
            canonicalId: suggestion.canonicalId,
            regime: suggestion.regime,
            confidence: suggestion.confidence,
          },
          evidence: { suggestions: payload.suggestions },
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ?? "Klassifizierung konnte nicht gespeichert werden.",
        );
      }
      const { itemId } = (await res.json()) as { itemId: string };
      setItemId(itemId);
      setConfirmedItem(item);
      setStep("landscape");
      void loadLandscape(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unerwarteter Fehler");
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Fetch the GO/REVIEW/BLOCKED buckets for the confirmed item. The buckets are
   * engine-derived server-side (runDestinationLandscape) — nothing GO is
   * synthesised in the client; we only render what the route returns.
   */
  async function loadLandscape(item: ConfirmedItem) {
    setLandscapeLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trade/assess/landscape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item, exporterSeat: EXPORTER_SEAT }),
      });
      if (!res.ok) {
        throw new Error("Liefer-Landkarte konnte nicht geladen werden.");
      }
      setLandscape((await res.json()) as LandscapeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unerwarteter Fehler");
    } finally {
      setLandscapeLoading(false);
    }
  }

  function handleChooseDestination(country: string) {
    // No verdict is computed here — Screen 4 runs the engine against the real
    // buyer for the chosen destination.
    setDestination(country);
    setOperationId(null);
    setStep("verdict");
  }

  /**
   * Screen 4 — create a real TradeOperation for {chosen destination + screened
   * buyer + the persisted item}, then mount the EXISTING VerdictPanel against
   * it. The verdict is engine-derived (VerdictPanel fetches /[id]/assess) — we
   * synthesise nothing here; the clean-buyer landscape is now tightened with the
   * real buyer. Bodies mirror the operations wizard (operations/new/page.tsx)
   * 1:1 so the two paths produce identical operations.
   */
  async function createOperationAndAssess() {
    if (!itemId || !destination || !counterpartyId) return;
    setSubmitting(true);
    setError(null);
    try {
      const ref = `AV-${destination}-${Date.now().toString(36).toUpperCase()}`;
      const opRes = await fetch("/api/trade/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reference: ref,
          description: `Datenblatt-Prüfung — Ausfuhr nach ${destination}`,
          operationType: "EXPORT",
          counterpartyId,
          shipFromCountry: EXPORTER_SEAT,
          shipToCountry: destination,
          declaredEndUse,
        }),
      });
      if (!opRes.ok) {
        const body = (await opRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Vorgang konnte nicht angelegt werden.");
      }
      const { operation } = (await opRes.json()) as {
        operation: { id: string };
      };

      const lineRes = await fetch(
        `/api/trade/operations/${operation.id}/lines`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId, quantity: 1, unitValue: 0 }),
        },
      );
      if (!lineRes.ok) {
        const body = (await lineRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ?? "Artikel konnte nicht hinzugefügt werden.",
        );
      }

      setOperationId(operation.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unerwarteter Fehler");
    } finally {
      setSubmitting(false);
    }
  }

  function handleManual() {
    // Honest fallback: hand off to the manual classification surface rather
    // than confirm a guessed code (spec §7.4). v1 routes to the item creator.
    setError(null);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8" data-testid="assess-wizard">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/trade"
          className="inline-flex items-center gap-1 text-sm text-trade-text-muted hover:text-trade-text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Passage
        </Link>
        <h1 className="text-xl font-semibold text-trade-text-primary">
          Datenblatt prüfen
        </h1>
      </div>

      {step === "upload" && (
        <section className="space-y-4" data-testid="assess-upload-step">
          <h2 className="text-lg text-trade-text-primary">
            Datenblatt hochladen
          </h2>
          <p className="text-sm text-trade-text-muted">
            Lade das Produkt-Datenblatt (PDF) hoch. Wir lesen die
            Spezifikationen und schlagen eine Klassifizierung vor — die du
            bestätigst, bevor wir prüfen, wohin du liefern darfst.
          </p>
          <DatasheetDropzone onApply={handleApply} />
        </section>
      )}

      {step === "classify" && payload && (
        <div className="space-y-4">
          <label className="block text-sm text-trade-text-muted">
            Artikelname
            <input
              className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-trade-text-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Reaction Wheel RW-250"
            />
          </label>
          <ClassifyConfirm
            payload={payload}
            submitting={submitting}
            error={error}
            onConfirm={handleConfirm}
            onManual={handleManual}
          />
        </div>
      )}

      {step === "landscape" &&
        (landscape ? (
          <LandscapeView
            result={landscape}
            onChoose={handleChooseDestination}
          />
        ) : (
          <section className="space-y-3" data-testid="assess-landscape-step">
            <h2 className="text-lg text-trade-text-primary">
              Liefer-Landkarte
            </h2>
            <p className="text-sm text-trade-text-muted">
              {error ??
                (landscapeLoading
                  ? "Klassifizierung bestätigt. Wir prüfen, wohin du liefern darfst …"
                  : "Klassifizierung bestätigt.")}
            </p>
            {error && confirmedItem && (
              <button
                type="button"
                onClick={() => loadLandscape(confirmedItem)}
                className="inline-flex items-center gap-2 rounded-lg border border-trade-border px-5 py-2.5 text-trade-text-primary transition hover:bg-trade-hover"
              >
                Erneut versuchen
              </button>
            )}
          </section>
        ))}

      {step === "verdict" && (
        <section className="space-y-5" data-testid="assess-verdict-step">
          {operationId ? (
            // The engine-derived verdict for the real {destination + buyer}.
            <VerdictPanel operationId={operationId} />
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg text-trade-text-primary">
                  Wer ist der Käufer?
                </h2>
                <p className="mt-1 text-sm text-trade-text-muted">
                  Ziel{" "}
                  <span className="font-semibold text-trade-text-primary">
                    {destination}
                  </span>{" "}
                  — wähle den Endkunden, damit wir mit dem echten Käufer prüfen
                  (statt der Landkarten-Annahme).
                </p>
              </div>

              {error && (
                <div className="rounded-lg border px-4 py-3 text-sm trade-chip-danger">
                  {error}
                </div>
              )}

              <div className="block text-sm text-trade-text-muted">
                Endkunde
                <div className="mt-1">
                  <PartyPicker onSelect={(p) => setCounterpartyId(p.id)} />
                </div>
              </div>

              <label className="block text-sm text-trade-text-muted">
                Verwendung (optional)
                <select
                  className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-trade-text-primary"
                  value={declaredEndUse}
                  onChange={(e) => setDeclaredEndUse(e.target.value as EndUse)}
                >
                  <option value="CIVIL">Zivil</option>
                  <option value="DUAL_USE">Dual-Use</option>
                  <option value="MILITARY">Militärisch</option>
                  <option value="WMD_RELATED">WMD-bezogen</option>
                </select>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("landscape")}
                  className="rounded-lg border border-trade-border px-5 py-2.5 text-trade-text-primary transition hover:bg-trade-hover"
                >
                  <ArrowLeft className="mr-1 inline h-4 w-4" /> Landkarte
                </button>
                <button
                  type="button"
                  disabled={!counterpartyId || submitting}
                  onClick={createOperationAndAssess}
                  className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-white transition hover:bg-trade-accent-strong disabled:opacity-40"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Prüfen: Darf ich liefern?
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
