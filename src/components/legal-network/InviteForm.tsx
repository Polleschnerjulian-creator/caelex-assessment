"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * InviteForm — form to create a new LegalMatter invitation. Shared
 * between Atlas (firm-invites-operator) and Caelex (operator-invites-
 * firm). The API handler resolves direction from the caller's org
 * type, so the UI doesn't need to know either.
 *
 * Phase-1 scope: counterparty by ID only (admin setup).
 * Phase 2 will add counterparty-lookup-by-email.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SCOPE_LEVEL_ADVISORY,
  SCOPE_LEVEL_ACTIVE_COUNSEL,
  SCOPE_LEVEL_FULL_COUNSEL,
  type ScopeItem,
  type ScopeLevel,
} from "@/lib/legal-network/scope";

const LEVELS: Array<{
  key: ScopeLevel;
  title: string;
  subtitle: string;
  scope: ScopeItem[];
}> = [
  {
    key: "advisory",
    title: "L1 · Advisory",
    subtitle: "Read + summaries. Einmalige Beratung.",
    scope: SCOPE_LEVEL_ADVISORY,
  },
  {
    key: "active_counsel",
    title: "L2 · Active Counsel",
    subtitle: "Lesen, Notizen, Incidents. Laufendes Mandat.",
    scope: SCOPE_LEVEL_ACTIVE_COUNSEL,
  },
  {
    key: "full_counsel",
    title: "L3 · Full Counsel",
    subtitle: "Alle Kategorien + Export. Vollständige Repräsentation.",
    scope: SCOPE_LEVEL_FULL_COUNSEL,
  },
];

export function InviteForm({
  returnHref,
  inviteLabel,
  counterpartyLabel,
}: {
  returnHref: string;
  inviteLabel: string;
  counterpartyLabel: string;
}) {
  const router = useRouter();

  const [counterpartyOrgId, setCounterpartyOrgId] = useState("");
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<ScopeLevel>("active_counsel");
  const [durationMonths, setDurationMonths] = useState(12);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    matterId: string;
    inviteToken: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const scope =
        LEVELS.find((l) => l.key === level)?.scope ??
        SCOPE_LEVEL_ACTIVE_COUNSEL;
      const res = await fetch("/api/network/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counterpartyOrgId,
          name,
          reference: reference || undefined,
          description: description || undefined,
          proposedScope: scope,
          proposedDurationMonths: durationMonths,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Einladung fehlgeschlagen");
        return;
      }
      setSuccess({ matterId: json.matterId, inviteToken: json.inviteToken });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/network/accept/${success.inviteToken}`;
    return (
      <div className="max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold mb-2">Einladung versandt.</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Kopiere den Link und sende ihn an die Gegenseite (Email-Versand kommt
          in einer späteren Iteration). Der Link läuft in 72 Stunden ab.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(inviteUrl)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
          >
            Kopieren
          </button>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => router.push(returnHref)}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            ← Zur Mandats-Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5"
    >
      {/* Counterparty */}
      <div>
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
          {counterpartyLabel}
        </label>
        <input
          required
          value={counterpartyOrgId}
          onChange={(e) => setCounterpartyOrgId(e.target.value)}
          placeholder="org_xxxxxxxxxxxxxxxxx"
          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-600 outline-none transition"
        />
        <p className="mt-1 text-xs text-slate-400">
          Org-ID der Gegenseite. Email-Lookup kommt in Phase 2.
        </p>
      </div>

      {/* Matter name */}
      <div>
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
          Mandatsname
        </label>
        <input
          required
          minLength={3}
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. SpaceCorp 2026 Launch Authorization"
          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-400 outline-none"
        />
      </div>

      {/* Reference + duration */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
            Referenz (optional)
          </label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="BHO-2026-112"
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
            Dauer (Monate)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={durationMonths}
            onChange={(e) =>
              setDurationMonths(parseInt(e.target.value, 10) || 12)
            }
            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
          Beschreibung (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-slate-400 outline-none resize-none"
        />
      </div>

      {/* Scope level */}
      <div>
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Scope-Level
        </label>
        <div className="space-y-2">
          {LEVELS.map((l) => (
            <label
              key={l.key}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                level === l.key
                  ? "border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <input
                type="radio"
                name="level"
                checked={level === l.key}
                onChange={() => setLevel(l.key)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {l.title}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {l.subtitle}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {l.scope.length} Kategorien
                </div>
              </div>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Die Gegenseite kann den Scope im Konsent-Schritt weiter einschränken.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.push(returnHref)}
          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-4 py-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Sende…" : inviteLabel}
        </button>
      </div>
    </form>
  );
}
