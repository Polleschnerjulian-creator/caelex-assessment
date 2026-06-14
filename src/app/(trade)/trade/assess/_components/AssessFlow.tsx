"use client";

/**
 * Caelex Passage — /trade/assess wizard orchestrator.
 *
 * A SCOPED-INTAKE state machine:
 *   entry → (upload | category) → form → classify → landscape → verdict
 *
 * Two front-half paths converge on the same scoped `form` step:
 *  - MANUAL:  entry → category (CategoryPicker) → form (empty prefill)
 *  - UPLOAD:  entry → upload (DatasheetDropzone) → form (extraction pre-fills the
 *             decisive fields + the detected category is pre-selected)
 *
 * The form's "Vorgang starten" hands the live top suggestion to ClassifyConfirm
 * (the human sign-off), and from there the EXISTING tail runs unchanged:
 * confirm → POST /from-datasheet → loadLandscape → choose destination → verdict.
 *
 * SAFETY (spec §7) — FAIL-CLOSED:
 *  - NO verdict is synthesised here. Nothing downstream runs until the human
 *    confirms the classification on the classify step.
 *  - The live ClassificationPreview may only UNDER-claim: a blank decisive field
 *    renders "noch nicht ausschließbar", never a confident state.
 *  - On confirm we persist EXACTLY the code the human picked — the route
 *    synthesises nothing either. The scoped attribute bag rides along verbatim
 *    in `parametricAttributes` (audit / re-classification), not the verdict.
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
import { EntryChoice } from "./EntryChoice";
import { CategoryPicker } from "./CategoryPicker";
import { ScopedItemForm, type ScopedFieldValue } from "./ScopedItemForm";
import { ClassificationPreview } from "./ClassificationPreview";
import { PartyPicker } from "../../operations/new/_components/PartyPicker";
import { VerdictPanel } from "../../operations/new/_components/VerdictPanel";
import { rankCategories } from "@/lib/trade/intake/detect-category";
import { suggestionsFromAttributesAndText } from "@/lib/trade/classify-suggest";
import { classificationInputForCategory } from "@/lib/trade/intake/classification-input";
import { confirmedCodeCell } from "@/lib/trade/intake/confirmed-code-cell";
import type { LandscapeResult } from "@/lib/trade/landscape";

type Step =
  | "entry"
  | "upload"
  | "category"
  | "form"
  | "classify"
  | "landscape"
  | "verdict";

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
  /**
   * The confirmed control code on the regime-appropriate cell — threaded on at
   * sign-off via `confirmedCodeCell`. LOAD-BEARING: the landscape engine
   * (classifyItemForOperation) reads these TYPED fields, NOT
   * parametricAttributes. Without them a confirmed controlled item classifies
   * as UNCONTROLLED → fail-open GO to embargoed destinations.
   */
  eccnEU?: string;
  eccnUS?: string;
  usmlCategory?: string;
  mtcrCategory?: string;
  germanAlEntry?: string;
  /** Extended decisive attributes (Z3e+) — persisted verbatim by the route. */
  parametricAttributes?: Record<string, number | boolean | string>;
}

/** Scoped-attribute keys we lift onto the item's TYPED columns. Anything else
 *  is routed into `parametricAttributes` (the matcher reads it via fallthrough,
 *  the route persists it verbatim — see Task 15). */
const NUMERIC_ATTRS = ["apertureMeters", "rangeKm", "payloadKg"] as const;
const BOOLEAN_ATTRS = ["isRadHardened", "isMilSpec", "isAntiJam"] as const;

/** Fold the operator-confirmed scoped attributes into the classifiable-item
 *  shape: typed columns where we have them, everything else into the
 *  `parametricAttributes` bag (verbatim). `itemClass` is metadata, not a column;
 *  it is intentionally dropped here (the confirmed code is the determination). */
function itemFromScoped(
  attrs: ScopedFieldValue[],
  name: string,
): ConfirmedItem {
  const typed: Record<string, number | boolean> = {};
  const parametric: Record<string, number | boolean | string> = {};
  for (const a of attrs) {
    // itemClass is injected for CLASSIFICATION via classificationInputForCategory
    // (the suggestion/preview path), not persisted: it is not a TradeItem typed
    // column / parametricAttributes entry — the verdict keys off the confirmed code.
    if (a.attribute === "itemClass") continue;
    if (
      NUMERIC_ATTRS.includes(a.attribute as (typeof NUMERIC_ATTRS)[number]) &&
      typeof a.value === "number"
    ) {
      typed[a.attribute] = a.value;
    } else if (
      BOOLEAN_ATTRS.includes(a.attribute as (typeof BOOLEAN_ATTRS)[number]) &&
      typeof a.value === "boolean"
    ) {
      typed[a.attribute] = a.value;
    } else {
      parametric[a.attribute] = a.value;
    }
  }
  const item: ConfirmedItem = { name, description: "", ...typed };
  if (Object.keys(parametric).length > 0)
    item.parametricAttributes = parametric;
  return item;
}

/** Build the ScopedItemForm `prefill` map from an upload extraction. High- and
 *  medium-confidence extracted attributes seed the form (the operator can edit);
 *  `itemClass` is steering metadata for category detection, not a rendered field,
 *  so it is excluded from the prefill. */
function prefillFromPayload(
  payload: DatasheetApplyPayload,
): Record<
  string,
  { value: number | boolean | string; confidence: "high" | "medium" | "low" }
> {
  const prefill: Record<
    string,
    { value: number | boolean | string; confidence: "high" | "medium" | "low" }
  > = {};
  for (const a of payload.attributes) {
    if (a.attribute === "itemClass") continue;
    prefill[a.attribute] = { value: a.value, confidence: a.confidence };
  }
  return prefill;
}

/**
 * Derive an editable item-name DEFAULT from the datasheet the operator
 * uploaded — never from a matched control-code title. Source of truth = the
 * uploaded datasheet's file name (sans extension, separators tidied). When
 * absent we return "" so the operator types the real name. We deliberately do
 * NOT fall back to a code title: a code title is a classification, not a name.
 */
function productNameFromPayload(p: DatasheetApplyPayload): string {
  const raw = p.fileName?.trim();
  if (!raw) return "";
  const base = raw.replace(/\.[a-z0-9]+$/i, "");
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Pull the extracted `itemClass` (if any) so the upload path can pre-select a
 *  category — `rankCategories` never decides; it only ranks. */
function detectedCategoryId(payload: DatasheetApplyPayload): string | null {
  const cls = payload.attributes.find((a) => a.attribute === "itemClass");
  const itemClass = typeof cls?.value === "string" ? cls.value : null;
  const ranked = rankCategories({ itemClass, text: "" });
  return ranked[0]?.id ?? null;
}

export function AssessFlow() {
  const [step, setStep] = useState<Step>("entry");

  // Scoped-intake state — shared by both front-half paths.
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [scopedAttributes, setScopedAttributes] = useState<ScopedFieldValue[]>(
    [],
  );
  const [rawText] = useState("");
  const [prefill, setPrefill] = useState<
    Record<
      string,
      {
        value: number | boolean | string;
        confidence: "high" | "medium" | "low";
        quote?: string;
      }
    >
  >({});

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carried into the landscape + verdict screens once persisted.
  const [itemId, setItemId] = useState<string | null>(null);
  const [confirmedItem, setConfirmedItem] = useState<ConfirmedItem | null>(
    null,
  );

  // Landscape state.
  const [landscape, setLandscape] = useState<LandscapeResult | null>(null);
  const [landscapeLoading, setLandscapeLoading] = useState(false);

  // Verdict step — chosen destination + the real buyer + end-use.
  const [destination, setDestination] = useState<string | null>(null);
  const [counterpartyId, setCounterpartyId] = useState<string | null>(null);
  const [declaredEndUse, setDeclaredEndUse] = useState<EndUse>("CIVIL");
  const [operationId, setOperationId] = useState<string | null>(null);

  // ── Entry → path selection ─────────────────────────────────────────────
  function handleChooseUpload() {
    setError(null);
    setStep("upload");
  }
  function handleChooseManual() {
    setError(null);
    setStep("category");
  }

  // ── Manual: category chosen → empty-prefill form ──────────────────────
  function handlePickCategory(id: string) {
    setCategoryId(id);
    setPrefill({});
    setScopedAttributes([]);
    setError(null);
    setStep("form");
  }

  // ── Upload: extraction → pre-filled form with detected category ────────
  function handleApply(p: DatasheetApplyPayload) {
    setError(null);
    if (!name) setName(productNameFromPayload(p));
    setPrefill(prefillFromPayload(p));
    setScopedAttributes([]);
    const detected = detectedCategoryId(p);
    if (detected) setCategoryId(detected);
    // Even when nothing is detected we still land on the form — the operator
    // picks the class via "Falsche Klasse? Ändern" rather than being dumped
    // into a guessed classification.
    setStep(detected ? "form" : "category");
  }

  // ── Scoped form → human sign-off ──────────────────────────────────────
  function handleStart() {
    setError(null);
    setStep("classify");
  }

  function handleChangeCategory() {
    setError(null);
    setStep("category");
  }

  async function handleConfirm(suggestion: ClassifyConfirmSuggestion) {
    setSubmitting(true);
    setError(null);
    try {
      // Persist the operator-entered name. When blank, a neutral placeholder
      // keeps the item named — NEVER the matched code's title.
      const resolvedName = name.trim() || "Datenblatt-Artikel";
      const item = itemFromScoped(scopedAttributes, resolvedName);
      // FAIL-CLOSED: thread the CONFIRMED code onto the in-memory item's
      // regime-appropriate cell BEFORE handing it to the landscape engine. The
      // engine (classifyItemForOperation) keys the verdict off these TYPED
      // fields — without the merge a confirmed controlled item reaches the
      // landscape code-less → classified UNCONTROLLED → fail-open GO to
      // embargoed destinations (RU/BY). `confirmedCodeCell` is the SAME mapper
      // the /from-datasheet route uses to persist, so the cell the client
      // classifies against == the cell the route persists (one source of truth).
      const landscapeItem: ConfirmedItem = {
        ...item,
        ...confirmedCodeCell({
          canonicalId: suggestion.canonicalId,
          regime: suggestion.regime,
        }),
      };
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
          // Audit-only snapshot of what the operator was shown at sign-off: the
          // live scoped suggestions the preview ranked + the entered attribute
          // bag. Persisted on the draft for re-classification — NOT the verdict.
          evidence: {
            suggestions: scopedSuggestions(
              categoryId,
              scopedAttributes,
              rawText,
            ),
            scopedAttributes,
          },
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
      // Carry the CODE-BEARING item forward — both the landscape fetch and any
      // retry (loadLandscape(confirmedItem)) must classify with the confirmed
      // code, never the code-less scoped item.
      setConfirmedItem(landscapeItem);
      setStep("landscape");
      void loadLandscape(landscapeItem);
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
    // No verdict is computed here — the verdict step runs the engine against the
    // real buyer for the chosen destination.
    setDestination(country);
    setOperationId(null);
    setStep("verdict");
  }

  /**
   * Verdict step — create a real TradeOperation for {chosen destination +
   * screened buyer + the persisted item}, then mount the EXISTING VerdictPanel
   * against it. The verdict is engine-derived (VerdictPanel fetches
   * /[id]/assess) — we synthesise nothing here. Bodies mirror the operations
   * wizard (operations/new/page.tsx) 1:1 so the two paths produce identical
   * operations.
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

  /** Honest fallback when there is nothing trustworthy to confirm: hand back to
   *  the scoped form so the operator can supply more decisive fields rather than
   *  confirm a guessed code (spec §7.4). */
  function handleManual() {
    setError(null);
    setStep("form");
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
          Artikel prüfen
        </h1>
      </div>

      {step === "entry" && (
        <EntryChoice
          onUpload={handleChooseUpload}
          onManual={handleChooseManual}
        />
      )}

      {step === "upload" && (
        <section className="space-y-4" data-testid="assess-upload-step">
          <h2 className="text-lg text-trade-text-primary">
            Datenblatt hochladen
          </h2>
          <p className="text-sm text-trade-text-muted">
            Lade das Produkt-Datenblatt (PDF) hoch. Wir lesen die
            Spezifikationen und füllen die relevanten Felder vor — du bestätigst
            die Klassifizierung, bevor wir prüfen, wohin du liefern darfst.
          </p>
          <DatasheetDropzone onApply={handleApply} />
        </section>
      )}

      {step === "category" && <CategoryPicker onSelect={handlePickCategory} />}

      {step === "form" && categoryId && (
        <div className="space-y-4" data-testid="assess-form-step">
          <ScopedItemForm
            categoryId={categoryId}
            prefill={prefill}
            name={name}
            onNameChange={setName}
            onChangeCategory={handleChangeCategory}
            onAttributesChange={setScopedAttributes}
            onStart={handleStart}
            submitting={submitting}
          />
          <ClassificationPreview
            categoryId={categoryId}
            attributes={scopedAttributes}
            text={rawText}
          />
        </div>
      )}

      {step === "classify" && (
        <div className="space-y-4" data-testid="assess-classify-wrap">
          <ClassifyConfirm
            payload={{
              attributes: [],
              suggestions: scopedSuggestions(
                categoryId,
                scopedAttributes,
                rawText,
              ),
            }}
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

/** Run the live suggestion engine over the confirmed scoped attributes so the
 *  classify step shows the human EXACTLY the candidates the preview ranked — no
 *  synthesis, the suggestions are pure-derived from the corpus. The chosen
 *  category's itemClass is injected (classificationInputForCategory) so the
 *  matcher scopes to the class — same input the live preview ranks. */
function scopedSuggestions(
  categoryId: string | null,
  attrs: ScopedFieldValue[],
  text: string,
): ClassifyConfirmSuggestion[] {
  // suggestionsFromAttributesAndText is a static top-level import — it is pure +
  // client-safe (see classify-suggest), so no dynamic import is needed here.
  const scoped = attrs.map((a) => ({
    attribute: a.attribute,
    value: a.value,
    confidence: a.confidence,
  }));
  const input = classificationInputForCategory(categoryId ?? "", scoped);
  return suggestionsFromAttributesAndText(input, text).map((s) => ({
    code: s.code,
    canonicalId: s.canonicalId,
    regime: s.regime,
    title: s.title,
    confidence: s.confidence,
    rationale: s.rationale,
  }));
}
