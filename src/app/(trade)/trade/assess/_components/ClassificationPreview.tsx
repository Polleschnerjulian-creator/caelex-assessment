// ClassificationPreview.tsx
"use client";
import { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  suggestionsFromAttributesAndText,
  type SuggestInputAttribute,
} from "@/lib/trade/classify-suggest";
import { classificationInputForCategory } from "@/lib/trade/intake/classification-input";
import type { ScopedFieldValue } from "./ScopedItemForm";

export function ClassificationPreview({
  categoryId,
  attributes,
  text,
}: {
  categoryId: string;
  attributes: ScopedFieldValue[];
  text: string;
}) {
  const suggestions = useMemo(() => {
    // Inject the chosen category's itemClass so the matcher scopes to the
    // class (else a 10-arcsec star tracker matches a gyro on a numeric overlap).
    const scoped: SuggestInputAttribute[] = attributes.map((a) => ({
      attribute: a.attribute,
      value: a.value,
      confidence: a.confidence,
    }));
    const input = classificationInputForCategory(categoryId, scoped);
    return suggestionsFromAttributesAndText(input, text);
  }, [categoryId, attributes, text]);
  const top = suggestions[0];
  // A boundary-MEDIUM matched only because a predicate sat within 1% of the
  // threshold cutoff — it is NOT a confident determination and must carry a
  // distinct caveat, never the green success check. The matcher tags this in
  // its rationale ("at the threshold boundary"); the phrase is propagated
  // verbatim through the draft builder.
  const boundary =
    top?.confidence === "MEDIUM" && /threshold boundary/i.test(top.rationale);
  // Determinate = a confident parametric agreement (HIGH, or a solid MEDIUM
  // that did NOT match at the threshold boundary).
  const determinate = Boolean(
    top &&
    (top.confidence === "HIGH" || (top.confidence === "MEDIUM" && !boundary)),
  );
  // B18 — a LOW candidate is an itemClass-prefix-only match. ClassifyConfirm
  // presents it (behind an affirm gate); the preview must agree by surfacing
  // the code framed as "kann nicht ausgeschlossen werden", never hiding it.
  const lowCandidate = top?.confidence === "LOW" ? top : undefined;
  return (
    <div
      className="rounded-lg border border-trade-border bg-trade-bg-panel p-4"
      data-testid="assess-preview"
    >
      {determinate ? (
        <>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-trade-accent-success" />
            <span
              data-testid="preview-code"
              className="text-trade-text-primary"
            >
              {top!.canonicalId}
            </span>
            <span
              data-testid="certainty-enough"
              className="text-caption text-trade-text-muted"
            >
              genug für eine Einschätzung
            </span>
          </div>
          <p className="mt-1 text-caption text-trade-text-muted">
            {top!.rationale}
          </p>
        </>
      ) : boundary ? (
        <div data-testid="preview-boundary">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-trade-accent-warn" />
            <span className="text-trade-text-primary">{top!.canonicalId}</span>
            <span className="text-caption text-trade-accent-warn">
              Grenzwert-Treffer — vor einer bindenden Einstufung prüfen
            </span>
          </div>
          <p className="mt-1 text-caption text-trade-text-muted">
            {top!.rationale}
          </p>
        </div>
      ) : lowCandidate ? (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-trade-accent-warn" />
          <span className="text-trade-text-muted">
            kann nicht ausgeschlossen werden:{" "}
            <span
              data-testid="preview-low-code"
              className="text-trade-text-primary"
            >
              {lowCandidate.canonicalId}
            </span>{" "}
            — schwacher Treffer, relevante Felder ergänzen. Eine fehlende
            Einstufung ist keine Freigabe.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-trade-accent-warn" />
          <span className="text-trade-text-muted">
            Noch nicht ausschließbar — relevante Felder ergänzen. Eine fehlende
            Einstufung ist keine Freigabe.
          </span>
        </div>
      )}
    </div>
  );
}
