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
  const determinate =
    top && (top.confidence === "HIGH" || top.confidence === "MEDIUM");
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
