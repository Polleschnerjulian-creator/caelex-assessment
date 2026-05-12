"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Create-Mandate form (Sprint 1, minimal).
 *
 * Submit → POST /api/atlas/mandate → redirect to homepage with the
 * mandate visible in the sidebar. Sprint 2 will add a dedicated
 * Mandate-Project page with files + members + a richer instructions
 * editor; Sprint 1 gives just the create surface so Baumann can stand
 * up his first persistent mandate.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const JURISDICTIONS = [
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

export function CreateMandateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [jurisdiction, setJurisdiction] = useState<string>("");
  const [operatorType, setOperatorType] = useState("");
  const [primaryAuthority, setPrimaryAuthority] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/atlas/mandate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clientName: clientName.trim() || undefined,
          jurisdiction: jurisdiction || undefined,
          operatorType: operatorType.trim() || undefined,
          primaryAuthority: primaryAuthority.trim() || undefined,
          customInstructions: customInstructions.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      window.dispatchEvent(new Event("atlas-v2-sidebar-refresh"));
      router.push("/atlas");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-slate-100">
      <div className="mb-6">
        <Link
          href="/atlas"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft size={12} /> Zurück zu Atlas
        </Link>
      </div>

      <h1 className="mb-2 text-xl font-semibold">Neues Mandat anlegen</h1>
      <p className="mb-8 text-sm text-slate-400">
        Mandate gruppieren Chats, Files und Custom-Instructions für eine Sache
        (z. B. „Spire Global · DE-Authorization SAT-2026"). Felder sind später
        beliebig editierbar.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="Name *"
          hint="Sichtbar in der Sidebar."
          input={
            <input
              type="text"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Spire Global · DE-Auth SAT-2026"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          }
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Klient"
            input={
              <input
                type="text"
                maxLength={200}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Spire Global Inc."
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            }
          />

          <Field
            label="Primary Jurisdiction"
            input={
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">— wählen —</option>
                {JURISDICTIONS.map((j) => (
                  <option key={j.code} value={j.code}>
                    {j.label}
                  </option>
                ))}
              </select>
            }
          />

          <Field
            label="Operator-Typ"
            input={
              <input
                type="text"
                maxLength={64}
                value={operatorType}
                onChange={(e) => setOperatorType(e.target.value)}
                placeholder="satellite_operator"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            }
          />

          <Field
            label="Primary Authority"
            input={
              <input
                type="text"
                maxLength={64}
                value={primaryAuthority}
                onChange={(e) => setPrimaryAuthority(e.target.value)}
                placeholder="BNetzA"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            }
          />
        </div>

        <Field
          label="Custom Instructions"
          hint="Werden bei jedem Chat in diesem Mandat als System-Prompt-Suffix injiziert. Max. ~4000 Zeichen empfohlen."
          input={
            <textarea
              rows={6}
              maxLength={8000}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Spire ist US-Operator mit DE-Tochter. Mission: Earth Observation, X-Band Downlink. Kunde will Cost-Optimum DE/LU. ITAR-Implikation immer einbeziehen."
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          }
        />

        {error && <p className="text-xs text-red-400">Fehler: {error}</p>}

        <div className="flex justify-end gap-2">
          <Link
            href="/atlas"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-md bg-emerald-500 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {submitting ? "Speichere…" : "Mandat anlegen"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  input,
}: {
  label: string;
  hint?: string;
  input: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-300">
        {label}
      </span>
      {input}
      {hint && (
        <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>
      )}
    </label>
  );
}
