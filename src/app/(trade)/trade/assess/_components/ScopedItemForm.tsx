// ScopedItemForm.tsx
"use client";
import { useEffect, useState } from "react";
import { Check, AlertTriangle, ArrowRight, Pencil } from "lucide-react";
import type { AttributeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";
import {
  getCategory,
  renderedFields,
} from "@/lib/trade/intake/product-categories";
import {
  getAttributeField,
  validateAttributeValue,
} from "@/lib/trade/intake/attribute-fields";

export interface ScopedFieldValue {
  attribute: AttributeName;
  value: number | boolean | string;
  source: "prefill" | "operator";
  confidence: "high" | "medium" | "low";
}

export interface ScopedItemFormProps {
  categoryId: string;
  /** Pre-fill seeds keyed by attribute (from MergedExtraction; high-confidence only). */
  prefill: Record<
    string,
    {
      value: number | boolean | string;
      confidence: "high" | "medium" | "low";
      quote?: string;
      alternateValue?: { value: number | boolean | string; source: string };
    }
  >;
  name: string;
  onNameChange: (n: string) => void;
  onChangeCategory: () => void;
  /** Emitted on every edit so the parent can run the live preview (Task 13). */
  onAttributesChange: (attrs: ScopedFieldValue[]) => void;
  onStart: () => void;
  submitting: boolean;
}

/** v1 conjunction pair: the corpus's primary star-tracker entry (USML:XV(e)(16))
 *  gates on BOTH accuracy AND slew-rate — surface a "BEIDE nötig" badge on the
 *  two fields so the operator knows neither alone is decisive.
 *  TODO: derive from corpus entries with ≥2 threshold predicates. */
const CONJUNCTION_PAIR: ReadonlySet<AttributeName> = new Set<AttributeName>([
  "starTrackerAccuracyArcsec",
  "starTrackerSlewRateDegPerS",
]);

export function ScopedItemForm(props: ScopedItemFormProps) {
  const category = getCategory(props.categoryId);
  const fields = renderedFields(props.categoryId);
  const showConjunction =
    fields.filter((a) => CONJUNCTION_PAIR.has(a)).length >= 2;

  const [values, setValues] = useState<
    Record<string, number | boolean | string>
  >(() => {
    const seed: Record<string, number | boolean | string> = {};
    for (const a of fields)
      if (props.prefill[a]) seed[a] = props.prefill[a].value;
    return seed;
  });
  const [sd, setSd] = useState<"ja" | "nein" | "unbekannt">("unbekannt");

  useEffect(() => {
    const attrs: ScopedFieldValue[] = [];
    for (const a of fields) {
      if (values[a] !== undefined && values[a] !== "") {
        attrs.push({
          attribute: a,
          value: values[a],
          source: props.prefill[a] ? "prefill" : "operator",
          confidence: props.prefill[a]?.confidence ?? "high",
        });
      }
    }
    if (sd !== "unbekannt")
      attrs.push({
        attribute: "isSpeciallyDesigned",
        value: sd === "ja",
        source: "operator",
        confidence: "high",
      });
    props.onAttributesChange(attrs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, sd]);

  return (
    <section className="space-y-4" data-testid="assess-scoped-form">
      {/* category row — "falsche Klasse? ändern" */}
      <div className="flex items-center justify-between rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2">
        <div>
          <div className="text-caption uppercase tracking-wide text-trade-text-muted">
            Produktklasse
          </div>
          <div className="text-trade-text-primary">
            {category?.label ?? props.categoryId}
          </div>
        </div>
        <button
          type="button"
          data-testid="change-category"
          onClick={props.onChangeCategory}
          className="inline-flex items-center gap-1 text-sm text-trade-accent transition hover:underline"
        >
          <Pencil className="h-4 w-4" /> Falsche Klasse? Ändern
        </button>
      </div>

      {/* Artikelname */}
      <label className="block">
        <span className="text-sm text-trade-text-muted">
          Artikelbezeichnung
        </span>
        <input
          data-testid="item-name"
          className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-trade-text-primary outline-none focus:border-trade-accent"
          value={props.name}
          onChange={(e) => props.onNameChange(e.target.value)}
          placeholder="z. B. AstroSense ST-300"
        />
      </label>

      {/* scoped fields, decisiveness-ordered */}
      {fields.map((a: AttributeName) => {
        const def = getAttributeField(a);
        if (!def) return null;
        const pf = props.prefill[a];
        const raw = values[a];
        const validation =
          raw !== undefined && raw !== ""
            ? validateAttributeValue(a, raw)
            : { ok: true };
        return (
          <div
            key={a}
            data-testid={`field-${a}`}
            className="rounded-lg border border-trade-border bg-trade-bg-panel p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm text-trade-text-muted">
                {def.label}
                {def.unit ? ` (${def.unit})` : ""}
              </label>
              {showConjunction && CONJUNCTION_PAIR.has(a) && (
                <span
                  data-testid={`conjunction-${a}`}
                  className="rounded-full border border-trade-border px-2 py-0.5 text-micro uppercase tracking-wide text-trade-text-muted"
                >
                  Beide nötig
                </span>
              )}
            </div>
            {def.kind === "boolean" ? (
              <select
                data-testid={`input-${a}`}
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-panel px-2 py-1.5 text-trade-text-primary outline-none focus:border-trade-accent"
                value={String(raw ?? "")}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [a]: e.target.value === "" ? "" : e.target.value === "true",
                  }))
                }
              >
                <option value="">—</option>
                <option value="true">Ja</option>
                <option value="false">Nein</option>
              </select>
            ) : def.kind === "enum" && def.enumValues ? (
              <select
                data-testid={`input-${a}`}
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-panel px-2 py-1.5 text-trade-text-primary outline-none focus:border-trade-accent"
                value={String(raw ?? "")}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [a]: e.target.value }))
                }
              >
                <option value="">—</option>
                {def.enumValues.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
            ) : (
              <input
                data-testid={`input-${a}`}
                type={def.kind === "number" ? "number" : "text"}
                className="mt-1 w-full rounded-md border border-trade-border bg-trade-bg-panel px-2 py-1.5 text-trade-text-primary outline-none focus:border-trade-accent"
                value={String(raw ?? "")}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [a]:
                      def.kind === "number"
                        ? e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                        : e.target.value,
                  }))
                }
              />
            )}
            {pf?.quote && (
              <span className="mt-1 flex items-center gap-1 text-caption text-trade-text-muted">
                <Check className="h-3 w-3 text-trade-accent-success" /> aus: „
                {pf.quote}“
              </span>
            )}
            {!validation.ok && validation.reason && (
              <span className="mt-1 flex items-center gap-1 text-caption text-trade-accent-warning">
                <AlertTriangle className="h-3 w-3" /> {validation.reason}
              </span>
            )}
            {def.help && (
              <span className="mt-1 block text-caption text-trade-text-muted">
                {def.help}
              </span>
            )}
          </div>
        );
      })}

      {/* specially-designed tri-state */}
      <div
        data-testid="sd-tristate"
        className="rounded-lg border border-trade-border bg-trade-bg-panel p-3"
      >
        <div className="text-sm text-trade-text-muted">
          Speziell entworfen/modifiziert für eine kontrollierte Anwendung?
        </div>
        <div className="mt-2 flex gap-2">
          {(["ja", "nein", "unbekannt"] as const).map((opt) => (
            <label
              key={opt}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition ${
                sd === opt
                  ? "border-trade-accent text-trade-text-primary"
                  : "border-trade-border text-trade-text-muted hover:bg-trade-hover"
              }`}
            >
              <input
                type="radio"
                name="sd-tristate"
                className="sr-only"
                checked={sd === opt}
                onChange={() => setSd(opt)}
                data-testid={`sd-${opt}`}
              />
              {opt === "ja" ? "Ja" : opt === "nein" ? "Nein" : "Unbekannt"}
            </label>
          ))}
        </div>
      </div>

      {/* standing prompts */}
      <p className="text-caption text-trade-text-muted">
        Hinweis: die Korpus-Prüfung bewertet keine Endverwendung/Endnutzer —
        eine saubere Einstufung ist keine Endverwendungs-Freigabe.
      </p>
      <p className="text-caption text-trade-text-muted">
        Eine fehlende Einstufung ist keine Freigabe.
      </p>

      <button
        type="button"
        data-testid="start-vorgang"
        disabled={!props.name.trim() || props.submitting}
        onClick={props.onStart}
        className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-sm font-medium text-trade-bg disabled:cursor-not-allowed disabled:opacity-50"
      >
        Vorgang starten <ArrowRight className="inline h-4 w-4" />
      </button>
    </section>
  );
}
