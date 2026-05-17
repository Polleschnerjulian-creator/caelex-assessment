"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Header Editor (modal).
 *
 * Closes the audit-finding "Mandat-Header is read-only" — the API
 * supports PATCH /api/atlas/mandate/[id] for every mutable field
 * (name, clientName, clientContact, jurisdiction, operatorType,
 * primaryAuthority, status), but no UI surface exposed it. A lawyer
 * who misspelled a client name could not fix it without backend
 * access.
 *
 * Trigger: pencil icon next to the mandate name in MandateDetailView.
 * Mounts as a fixed-overlay modal (z-50), keyboard-dismissable, calls
 * the parent's onSaved callback with the updated detail so the page
 * doesn't need a full reload.
 *
 * Jurisdiction dropdown mirrors CreateMandateForm.tsx's JURISDICTIONS
 * list to keep the two paths in sync.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { MandateDetail } from "./mandate-types";

const JURISDICTIONS = [
  { code: "", label: "— ohne —" },
  { code: "DE", label: "Deutschland" },
  { code: "FR", label: "Frankreich" },
  { code: "IT", label: "Italien" },
  { code: "UK", label: "Vereinigtes Königreich" },
  { code: "LU", label: "Luxemburg" },
  { code: "ES", label: "Spanien" },
  { code: "NL", label: "Niederlande" },
  { code: "AT", label: "Österreich" },
  { code: "CH", label: "Schweiz" },
  { code: "SE", label: "Schweden" },
  { code: "EU", label: "EU-übergreifend" },
  { code: "INT", label: "International" },
];

const INPUT_CLASS =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition-colors focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500";

interface Props {
  mandate: MandateDetail;
  onClose: () => void;
  onSaved: (updated: MandateDetail) => void;
}

export function MandateHeaderEditor({ mandate, onClose, onSaved }: Props) {
  const [name, setName] = useState(mandate.name);
  const [clientName, setClientName] = useState(mandate.clientName ?? "");
  const [clientContact, setClientContact] = useState(
    mandate.clientContact ?? "",
  );
  const [jurisdiction, setJurisdiction] = useState(mandate.jurisdiction ?? "");
  const [operatorType, setOperatorType] = useState(mandate.operatorType ?? "");
  const [primaryAuthority, setPrimaryAuthority] = useState(
    mandate.primaryAuthority ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Escape-key to close — common-courtesy modal UX. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name darf nicht leer sein.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          /* Send empty strings as null so the server clears the field
             instead of storing "". The API schema accepts nullable. */
          clientName: clientName.trim() || null,
          clientContact: clientContact.trim() || null,
          jurisdiction: jurisdiction.trim() || null,
          operatorType: operatorType.trim() || null,
          primaryAuthority: primaryAuthority.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { mandate: MandateDetail };
      /* Refresh sidebar so the (potentially renamed) mandate updates
         in the list right away — same event the create flow dispatches. */
      window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
      onSaved(data.mandate);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mandate-header-editor-title"
      onClick={(e) => {
        /* Backdrop click closes (only when click started on backdrop). */
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <h2
            id="mandate-header-editor-title"
            className="text-[14px] font-medium text-slate-800 dark:text-slate-100"
          >
            Mandat bearbeiten
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Schließen"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className={INPUT_CLASS}
              placeholder="z.B. BNetzA Genehmigungsverfahren OrbitCo"
              autoFocus
            />
          </Field>

          <Field label="Klient">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={200}
              className={INPUT_CLASS}
              placeholder="z.B. OrbitCo GmbH"
            />
          </Field>

          <Field label="Klient Kontakt (optional)">
            <input
              type="text"
              value={clientContact}
              onChange={(e) => setClientContact(e.target.value)}
              maxLength={200}
              className={INPUT_CLASS}
              placeholder="z.B. anna.lee@orbitco.com"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Jurisdiktion">
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className={INPUT_CLASS}
              >
                {JURISDICTIONS.map((j) => (
                  <option key={j.code} value={j.code}>
                    {j.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Operatortyp">
              <input
                type="text"
                value={operatorType}
                onChange={(e) => setOperatorType(e.target.value)}
                maxLength={80}
                className={INPUT_CLASS}
                placeholder="z.B. Satellitenbetreiber"
              />
            </Field>
          </div>

          <Field label="Primäre Behörde">
            <input
              type="text"
              value={primaryAuthority}
              onChange={(e) => setPrimaryAuthority(e.target.value)}
              maxLength={120}
              className={INPUT_CLASS}
              placeholder="z.B. BNetzA, BMWK"
            />
          </Field>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md px-3 py-1.5 text-[12px] text-slate-600 hover:bg-slate-200 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving && (
              <Loader2
                size={11}
                className="animate-spin motion-reduce:animate-none"
              />
            )}
            {saving ? "Speichert…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
