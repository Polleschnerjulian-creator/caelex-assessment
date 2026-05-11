"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Client island for the § 203 admin page — POSTs a new commitment to
 * /api/admin/section203 and reloads on success.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Section203NewForm() {
  const router = useRouter();
  const [signerName, setSignerName] = useState("");
  const [role, setRole] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [scope, setScope] = useState(
    "Vollzugriff auf alle Caelex-Postgres-Datenbanken, R2-Object-Storage, " +
      "Vercel-Deployments, Anthropic-API-Key, OpenAI-API-Key. Operativer " +
      "Zugriff auf Mandanten-Daten und Astra-Kontext.",
  );
  const [notes, setNotes] = useState("");
  const [signedAt, setSignedAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/section203", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          signerName,
          role,
          signerEmail: signerEmail || undefined,
          scope,
          notes: notes || undefined,
          signedAt: new Date(signedAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setSignerName("");
      setRole("");
      setSignerEmail("");
      setNotes("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-slate-700/60 bg-slate-900/60 p-5"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-300">
            Voller Name *
          </span>
          <input
            type="text"
            required
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            placeholder="z. B. Julian Polleschner"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-300">
            Funktion / Verhältnis *
          </span>
          <input
            type="text"
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            placeholder="Founder & Managing Director"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-300">
            E-Mail (optional)
          </span>
          <input
            type="email"
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            placeholder="name@example.com"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-300">
            Datum der Unterschrift *
          </span>
          <input
            type="date"
            required
            value={signedAt}
            onChange={(e) => setSignedAt(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-300">
          Zugriffs-Scope *
        </span>
        <textarea
          required
          rows={4}
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-300">
          Notizen (optional)
        </span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
          placeholder="z. B. „Wet-ink Original im Berliner Office hinterlegt"
        />
      </label>

      {error ? <p className="text-xs text-red-400">Fehler: {error}</p> : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-emerald-500 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {submitting ? "Speichere…" : "Anlegen"}
        </button>
      </div>
    </form>
  );
}
