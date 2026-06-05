"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { VerdictPanel } from "./_components/VerdictPanel";
import { ItemPicker } from "./_components/ItemPicker";
import { PartyPicker } from "./_components/PartyPicker";

type Step = "was" | "anWen" | "wohin" | "ergebnis";

interface Draft {
  itemId: string;
  quantity: number;
  unitValue: number;
  counterpartyId: string;
  shipFromCountry: string;
  shipToCountry: string;
  declaredEndUse: "CIVIL" | "DUAL_USE" | "MILITARY" | "WMD_RELATED";
  endUserName: string;
}

const EMPTY: Draft = {
  itemId: "",
  quantity: 1,
  unitValue: 0,
  counterpartyId: "",
  shipFromCountry: "DE",
  shipToCountry: "",
  declaredEndUse: "CIVIL",
  endUserName: "",
};

export default function NewOperationWizardPage() {
  const [step, setStep] = useState<Step>("was");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  async function createOperationAndAssess() {
    setSubmitting(true);
    setError(null);
    try {
      const ref = `AV-${draft.shipToCountry || "XX"}-${Date.now().toString(36).toUpperCase()}`;
      const opRes = await fetch("/api/trade/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reference: ref,
          description: `Geführter Ausfuhrvorgang nach ${draft.shipToCountry}`,
          operationType: "EXPORT",
          counterpartyId: draft.counterpartyId,
          shipFromCountry: draft.shipFromCountry,
          shipToCountry: draft.shipToCountry,
          declaredEndUse: draft.declaredEndUse,
          endUserName: draft.endUserName || undefined,
        }),
      });
      if (!opRes.ok)
        throw new Error(
          (await opRes.json()).error ?? "Vorgang konnte nicht angelegt werden",
        );
      const { operation } = await opRes.json();

      const lineRes = await fetch(
        `/api/trade/operations/${operation.id}/lines`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            itemId: draft.itemId,
            quantity: draft.quantity,
            unitValue: draft.unitValue,
          }),
        },
      );
      if (!lineRes.ok)
        throw new Error(
          (await lineRes.json()).error ??
            "Artikel konnte nicht hinzugefügt werden",
        );

      setOperationId(operation.id);
      setStep("ergebnis");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unerwarteter Fehler");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="mx-auto max-w-3xl px-6 py-8"
      data-testid="ausfuhrvorgang-wizard"
    >
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/trade/operations"
          className="inline-flex items-center gap-1 text-sm text-trade-text-muted hover:text-trade-text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Pipeline
        </Link>
        <h1 className="text-xl font-semibold text-trade-text-primary">
          Neuer Ausfuhrvorgang
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border px-4 py-3 text-sm trade-chip-danger">
          {error}
        </div>
      )}

      {step === "was" && (
        <section className="space-y-4">
          <h2 className="text-lg text-trade-text-primary">Was lieferst du?</h2>
          <div className="block text-sm text-trade-text-muted">
            Artikel
            <div className="mt-1">
              <ItemPicker onSelect={(it) => patch({ itemId: it.id })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-trade-text-muted">
              Menge
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-trade-text-primary"
                value={draft.quantity}
                onChange={(e) => patch({ quantity: Number(e.target.value) })}
              />
            </label>
            <label className="block text-sm text-trade-text-muted">
              Stückwert (EUR)
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-trade-text-primary"
                value={draft.unitValue}
                onChange={(e) => patch({ unitValue: Number(e.target.value) })}
              />
            </label>
          </div>
          <button
            disabled={!draft.itemId}
            onClick={() => setStep("anWen")}
            className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-white transition hover:bg-trade-accent-strong disabled:opacity-40"
          >
            Weiter <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      )}

      {step === "anWen" && (
        <section className="space-y-4">
          <h2 className="text-lg text-trade-text-primary">An wen?</h2>
          <div className="block text-sm text-trade-text-muted">
            Gegenpartei
            <div className="mt-1">
              <PartyPicker onSelect={(p) => patch({ counterpartyId: p.id })} />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep("was")}
              className="rounded-lg border border-trade-border px-5 py-2.5 text-trade-text-primary transition hover:bg-trade-hover"
            >
              Zurück
            </button>
            <button
              disabled={!draft.counterpartyId}
              onClick={() => setStep("wohin")}
              className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-white transition hover:bg-trade-accent-strong disabled:opacity-40"
            >
              Weiter <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {step === "wohin" && (
        <section className="space-y-4">
          <h2 className="text-lg text-trade-text-primary">Wohin und wozu?</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm text-trade-text-muted">
              Zielland (ISO-2)
              <input
                maxLength={2}
                className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 uppercase text-trade-text-primary"
                value={draft.shipToCountry}
                onChange={(e) =>
                  patch({ shipToCountry: e.target.value.toUpperCase() })
                }
                placeholder="CN"
              />
            </label>
            <label className="block text-sm text-trade-text-muted">
              Verwendung
              <select
                className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-trade-text-primary"
                value={draft.declaredEndUse}
                onChange={(e) =>
                  patch({
                    declaredEndUse: e.target.value as Draft["declaredEndUse"],
                  })
                }
              >
                <option value="CIVIL">Zivil</option>
                <option value="DUAL_USE">Dual-Use</option>
                <option value="MILITARY">Militärisch</option>
                <option value="WMD_RELATED">WMD-bezogen</option>
              </select>
            </label>
          </div>
          <label className="block text-sm text-trade-text-muted">
            Endverwender (optional)
            <input
              className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-trade-text-primary"
              value={draft.endUserName}
              onChange={(e) => patch({ endUserName: e.target.value })}
            />
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setStep("anWen")}
              className="rounded-lg border border-trade-border px-5 py-2.5 text-trade-text-primary transition hover:bg-trade-hover"
            >
              Zurück
            </button>
            <button
              disabled={draft.shipToCountry.length !== 2 || submitting}
              onClick={createOperationAndAssess}
              className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-white transition hover:bg-trade-accent-strong disabled:opacity-40"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Prüfen: Darf ich liefern?
            </button>
          </div>
        </section>
      )}

      {step === "ergebnis" && operationId && (
        <VerdictPanel operationId={operationId} />
      )}
    </div>
  );
}
