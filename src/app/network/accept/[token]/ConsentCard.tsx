"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * ConsentCard — client component that loads the invitation preview
 * and lets the user accept, amend, or reject. Visually equal buttons
 * (no dark patterns) per the phase-1 design doc.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ScopeItem, ScopeCategory } from "@/lib/legal-network/scope";

interface Preview {
  matter: {
    id: string;
    name: string;
    reference: string | null;
    description: string | null;
    invitedFrom: "ATLAS" | "CAELEX";
  };
  lawFirm: { id: string; name: string; logoUrl: string | null; slug: string };
  client: { id: string; name: string; logoUrl: string | null; slug: string };
  proposedScope: ScopeItem[];
  proposedDurationMonths: number;
  expiresAt: string;
}

const CATEGORY_LABEL: Record<ScopeCategory, string> = {
  COMPLIANCE_ASSESSMENTS:
    "Compliance-Bewertungen (Cyber, Debris, NIS2, Versicherung, Umwelt)",
  AUTHORIZATION_WORKFLOWS: "Genehmigungs-Workflows",
  DOCUMENTS: "Dokumenten-Vault",
  TIMELINE_DEADLINES: "Fristen & Zeitleiste",
  INCIDENTS: "Vorfälle & NIS2-Phasen",
  SPACECRAFT_REGISTRY: "Satelliten-Registry",
  AUDIT_LOGS: "Audit-Logs (selten gewährt)",
};

const PERMISSION_LABEL: Record<string, string> = {
  READ: "Lesen",
  READ_SUMMARY: "Nur Übersicht",
  EXPORT: "Export/Download",
  ANNOTATE: "Anwalts-Notizen anhängen",
};

export function ConsentCard({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<
    "ACCEPT" | "REJECT" | "AMEND" | null
  >(null);
  const [result, setResult] = useState<{
    matterId: string;
    counterToken?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/network/accept?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) setError(json.error ?? "Einladung nicht ladbar");
          else setPreview(json);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = useCallback(
    async (action: "ACCEPT" | "REJECT") => {
      setSubmitting(action);
      setError(null);
      try {
        const res = await fetch("/api/network/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, action }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Aktion fehlgeschlagen");
          return;
        }
        setResult({ matterId: json.matterId, counterToken: json.counterToken });
        // Redirect after a beat so user sees confirmation
        setTimeout(
          () =>
            router.push(`/dashboard/network/legal-counsel/${json.matterId}`),
          2400,
        );
      } finally {
        setSubmitting(null);
      }
    },
    [router, token],
  );

  if (loading) {
    return <div className="text-slate-500">Lade Einladungsdetails…</div>;
  }

  if (error && !preview) {
    return (
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <h1 className="text-xl font-semibold mb-3">
          Diese Einladung ist nicht verfügbar
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
        <Link
          href="/dashboard"
          className="text-emerald-600 hover:underline text-sm"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto mb-4 flex items-center justify-center text-emerald-700 dark:text-emerald-300 text-2xl">
          ✓
        </div>
        <h1 className="text-xl font-semibold mb-2">Bestätigt.</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Das Mandat wurde {result.counterToken ? "mit Änderungen" : ""}{" "}
          beidseitig signiert.
        </p>
      </div>
    );
  }

  if (!preview) return null;

  const {
    lawFirm,
    client,
    matter,
    proposedScope,
    proposedDurationMonths,
    expiresAt,
  } = preview;

  // Determine who is asking whom, so the text stays unambiguous.
  const requester = matter.invitedFrom === "ATLAS" ? lawFirm : client;
  const recipient = matter.invitedFrom === "ATLAS" ? client : lawFirm;

  return (
    <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800">
        <div className="text-[10px] tracking-[0.22em] uppercase text-slate-500 mb-2">
          Mandatsanfrage · Legal Network
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {requester.name} möchte mit {recipient.name} zusammenarbeiten
        </h1>
        {matter.reference && (
          <p className="text-sm text-slate-500 mt-1">
            Mandats-Referenz: {matter.reference}
          </p>
        )}
      </div>

      {/* Matter info */}
      <div className="px-8 py-6 space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Mandat
          </div>
          <p className="text-base text-slate-900 dark:text-slate-100 font-medium">
            {matter.name}
          </p>
          {matter.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {matter.description}
            </p>
          )}
        </div>

        {/* Scope */}
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Was {requester.name} sehen wird
          </div>
          <ul className="space-y-2">
            {proposedScope.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {CATEGORY_LABEL[item.category]}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {item.permissions
                      .map((p) => PERMISSION_LABEL[p] ?? p)
                      .join(" · ")}
                    {item.resourceFilter?.jurisdictions &&
                      ` · nur ${item.resourceFilter.jurisdictions.join(", ")}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Duration */}
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Dauer
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {proposedDurationMonths} Monate, Verlängerung möglich. Jede Seite
            kann jederzeit beenden — aktive Arbeitsdokumente bleiben 24h lesbar.
          </p>
        </div>

        {/* Audit promise */}
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 p-3">
          <p className="text-xs text-emerald-900 dark:text-emerald-300">
            Jeder Zugriff wird mit Hash-Chain signiert und ist in deiner
            Audit-Ansicht sichtbar. Keine stille Erweiterung des Umfangs
            möglich.
          </p>
        </div>

        {/* P0-Compliance · DSGVO-Hinweis: Mit Akzeptieren erteilst du
            die Genehmigung zur Drittlandverarbeitung über die im AVV
            gelisteten Sub-Auftragsverarbeiter (Anthropic, OpenAI über
            Vercel AI Gateway) auf Basis EU-US-DPF + SCC + Zero-Data-
            Retention. Caelex verpflichtet alle Sub-Processoren auf
            § 203 StGB / § 43e BRAO. */}
        <div className="rounded-lg bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 p-3 space-y-2">
          <p className="text-[10px] tracking-[0.18em] uppercase font-semibold text-slate-500 dark:text-slate-400">
            Datenschutz · Verarbeitungs-Hinweis
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Mit Akzeptieren erteilst du die allgemeine Genehmigung nach Art. 28
            Abs. 2 DSGVO für die Verarbeitung mandatsbezogener Daten durch
            Caelex und die im{" "}
            <a
              href="/legal/sub-processors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-slate-900 dark:hover:text-slate-200"
            >
              Sub-Processor-Register
            </a>{" "}
            gelisteten Anbieter — insbesondere KI-Inferenz (Anthropic, USA,
            EU-US-DPF) und Embeddings (OpenAI über Vercel AI Gateway).
            Drittlandtransfer auf Basis EU-US Data Privacy Framework + SCC +
            Zero-Data-Retention.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Bei Berufsgeheimnisträgern (§ 203 StGB) gilt zusätzlich der
            Berufsgeheimnisträger-Annex § 10a im{" "}
            <a
              href="/legal/dpa"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-slate-900 dark:hover:text-slate-200"
            >
              AVV
            </a>
            : alle Sub-Processoren werden ausdrücklich auf § 43e Abs. 3 BRAO
            verpflichtet. Need-to-know-Prinzip wird per Scope-Gate technisch
            durchgesetzt.
          </p>
        </div>

        <p className="text-xs text-slate-400">
          Token läuft ab am {new Date(expiresAt).toLocaleString("de-DE")}.
        </p>
      </div>

      {error && (
        <div className="px-8 pb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Actions — explicitly equal weight */}
      <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700/50 flex gap-3">
        <button
          onClick={() => submit("REJECT")}
          disabled={submitting !== null}
          className="flex-1 h-11 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {submitting === "REJECT" ? "…" : "Ablehnen"}
        </button>
        <button
          disabled
          title="Anpassen kommt in Phase 2 UI — für jetzt bitte volle Zustimmung oder Ablehnung"
          className="flex-1 h-11 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-400 text-sm font-medium cursor-not-allowed"
        >
          Anpassen (Phase 2)
        </button>
        <button
          onClick={() => submit("ACCEPT")}
          disabled={submitting !== null}
          className="flex-1 h-11 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {submitting === "ACCEPT" ? "…" : "Akzeptieren"}
        </button>
      </div>
    </div>
  );
}
