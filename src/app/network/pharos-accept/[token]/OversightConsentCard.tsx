"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * OversightConsentCard — operator-side client component for accepting
 * (or disputing) an inbound Pharos oversight invitation.
 *
 * Two key UX departures from Atlas's matter ConsentCard:
 *
 *  1. MDF and VDF are visually separated. The MDF list is rendered as
 *     a sealed block (no edit affordance, "Gesetzlich vorgeschrieben"
 *     badge). The VDF list is editable — operator can add categories
 *     to extend voluntary cooperation, but cannot remove anything from
 *     MDF (the service-layer also enforces this).
 *
 *  2. The negative path is DISPUTE, not REJECT. A dispute is not a
 *     "no thanks" — it's a formal contest of the MDF that the
 *     authority must resolve. Status goes to DISPUTED, not closed,
 *     because the operator's legal duty doesn't disappear with a
 *     button click.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Plus, X } from "lucide-react";
import type { ScopeItem, ScopeCategory } from "@/lib/legal-network/scope";

interface Preview {
  oversight: {
    id: string;
    oversightTitle: string;
    oversightReference: string | null;
    legalReference: string;
    mandatoryDisclosure: ScopeItem[];
    voluntaryDisclosure: ScopeItem[];
    initiatedAt: string;
    expiresAt: string | null;
  };
  authority: {
    id: string;
    name: string;
    authorityType: string;
    jurisdiction: string;
  };
  operator: { id: string; name: string; slug: string };
}

const CATEGORY_LABEL: Record<ScopeCategory, string> = {
  COMPLIANCE_ASSESSMENTS: "Compliance-Bewertungen",
  AUTHORIZATION_WORKFLOWS: "Genehmigungs-Workflows",
  DOCUMENTS: "Dokumente",
  TIMELINE_DEADLINES: "Fristen & Zeitleiste",
  INCIDENTS: "Vorfälle & NIS2-Phasen",
  SPACECRAFT_REGISTRY: "Satelliten-Registry",
  AUDIT_LOGS: "Audit-Logs",
};

const CATEGORY_DESC: Record<ScopeCategory, string> = {
  COMPLIANCE_ASSESSMENTS: "Cyber, Debris, NIS2, Versicherung, Umwelt",
  AUTHORIZATION_WORKFLOWS: "Anträge, Genehmigungen, Statuswechsel",
  DOCUMENTS: "Vault-Inhalte mit Dokumenten-Hashes",
  TIMELINE_DEADLINES: "Fristen, Reminders, Erfüllungsstatus",
  INCIDENTS: "Vorfälle, NIS2-Phasen, Reports an NCA",
  SPACECRAFT_REGISTRY: "Satelliten-Stammdaten, Orbital-Parameter",
  AUDIT_LOGS: "Hash-Chain Zugriff (selten gewährt)",
};

const PERMISSION_LABEL: Record<string, string> = {
  READ: "Lesen",
  READ_SUMMARY: "Nur Übersicht",
  EXPORT: "Export/Download",
  ANNOTATE: "Notizen anhängen",
};

const ALL_CATEGORIES: ScopeCategory[] = [
  "COMPLIANCE_ASSESSMENTS",
  "AUTHORIZATION_WORKFLOWS",
  "DOCUMENTS",
  "TIMELINE_DEADLINES",
  "INCIDENTS",
  "SPACECRAFT_REGISTRY",
  "AUDIT_LOGS",
];

export function OversightConsentCard({ token }: { token: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"ACCEPT" | "DISPUTE" | null>(
    null,
  );
  const [result, setResult] = useState<{
    oversightId: string;
    status: "ACTIVE" | "DISPUTED";
  } | null>(null);

  // VDF amendment state — local copy operator can edit
  const [editedVdf, setEditedVdf] = useState<ScopeItem[]>([]);
  const [editingVdf, setEditingVdf] = useState(false);

  // Dispute flow
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/pharos/oversight/accept?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Einladung nicht ladbar");
        } else {
          setPreview(json);
          setEditedVdf(json.oversight.voluntaryDisclosure ?? []);
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

  const submitAccept = useCallback(async () => {
    if (!preview) return;
    setSubmitting("ACCEPT");
    setError(null);
    try {
      const vdfChanged =
        JSON.stringify(editedVdf) !==
        JSON.stringify(preview.oversight.voluntaryDisclosure ?? []);
      const res = await fetch("/api/pharos/oversight/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "ACCEPT",
          ...(vdfChanged ? { amendedVoluntaryDisclosure: editedVdf } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Annahme fehlgeschlagen");
        return;
      }
      setResult({ oversightId: json.oversightId, status: "ACTIVE" });
      setTimeout(() => router.push(`/dashboard/network`), 2400);
    } finally {
      setSubmitting(null);
    }
  }, [preview, editedVdf, router, token]);

  const submitDispute = useCallback(async () => {
    if (!preview) return;
    if (disputeReason.trim().length < 10) {
      setError(
        "Begründung erforderlich (min. 10 Zeichen) — wird im Audit-Log festgehalten",
      );
      return;
    }
    setSubmitting("DISPUTE");
    setError(null);
    try {
      const res = await fetch("/api/pharos/oversight/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "DISPUTE",
          reason: disputeReason.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Widerspruch fehlgeschlagen");
        return;
      }
      setResult({ oversightId: json.oversightId, status: "DISPUTED" });
    } finally {
      setSubmitting(null);
    }
  }, [preview, disputeReason, token]);

  const addToVdf = (category: ScopeCategory) => {
    if (editedVdf.some((s) => s.category === category)) return;
    setEditedVdf([...editedVdf, { category, permissions: ["READ"] }]);
  };
  const removeFromVdf = (category: ScopeCategory) => {
    setEditedVdf(editedVdf.filter((s) => s.category !== category));
  };

  // ─── render branches ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-slate-500 dark:text-slate-400">
        Lade Aufsichts-Einladung…
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <h1 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">
          Diese Aufsichts-Einladung ist nicht verfügbar
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
        <div
          className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl ${
            result.status === "ACTIVE"
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
          }`}
        >
          {result.status === "ACTIVE" ? "✓" : "⚠"}
        </div>
        <h1 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
          {result.status === "ACTIVE"
            ? "Aufsicht ist jetzt aktiv."
            : "Widerspruch eingereicht."}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          {result.status === "ACTIVE"
            ? "Die Behörde hat ab sofort den vereinbarten Lese-Zugriff. Jeder Zugriff ist im Hash-Chain-Audit festgehalten."
            : "Die Behörde wurde benachrichtigt. Die Aufsicht bleibt bis zur Klärung im Status DISPUTED."}
        </p>
      </div>
    );
  }

  if (!preview) return null;

  const { oversight, authority } = preview;
  const mdf = oversight.mandatoryDisclosure;

  return (
    <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800">
        <div className="text-[10px] tracking-[0.22em] uppercase text-amber-600 dark:text-amber-400 mb-2 font-semibold">
          Aufsichts-Einladung · Pharos
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          {authority.name} richtet Aufsicht ein
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {authority.authorityType.replace("_", " ")} · {authority.jurisdiction}
        </p>
      </div>

      {/* Oversight info */}
      <div className="px-8 py-6 space-y-5">
        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Bezeichnung der Aufsicht
          </div>
          <p className="text-base text-slate-900 dark:text-slate-100 font-medium">
            {oversight.oversightTitle}
          </p>
          {oversight.oversightReference && (
            <p className="text-sm text-slate-500 mt-1">
              Aktenzeichen: {oversight.oversightReference}
            </p>
          )}
        </div>

        <div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Rechtsgrundlage
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 font-mono">
            {oversight.legalReference}
          </p>
        </div>

        {/* MDF — sealed, mandatory */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <div className="text-xs font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide">
              Pflicht-Offenlegung (MDF) · gesetzlich vorgeschrieben
            </div>
          </div>
          <div className="rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 divide-y divide-amber-200/60 dark:divide-amber-900/30">
            {mdf.map((item, i) => (
              <div key={i} className="p-3 flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {CATEGORY_LABEL[item.category]}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {CATEGORY_DESC[item.category]} ·{" "}
                    {item.permissions
                      .map((p) => PERMISSION_LABEL[p] ?? p)
                      .join(" / ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-2">
            Diese Punkte basieren auf {oversight.legalReference}. Sie können
            nicht abgewählt werden — bei begründetem Widerspruch nutze die
            Dispute-Funktion unten.
          </p>
        </div>

        {/* VDF — operator may extend */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
              Freiwillige Erweiterung (VDF) · operator-kontrolliert
            </div>
            <button
              type="button"
              onClick={() => setEditingVdf(!editingVdf)}
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {editingVdf ? "Fertig" : "Erweitern"}
            </button>
          </div>
          {editedVdf.length === 0 && !editingVdf ? (
            <div className="text-xs text-slate-500 dark:text-slate-400 italic px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50">
              Keine freiwilligen Punkte. Du kannst proaktiv weitere Bereiche
              freigeben — das beschleunigt typischerweise Genehmigungen.
            </div>
          ) : (
            <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 divide-y divide-emerald-200/50 dark:divide-emerald-900/20">
              {editedVdf.map((item) => (
                <div key={item.category} className="p-3 flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {CATEGORY_LABEL[item.category]}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {CATEGORY_DESC[item.category]}
                    </div>
                  </div>
                  {editingVdf && (
                    <button
                      type="button"
                      onClick={() => removeFromVdf(item.category)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600"
                      aria-label="Entfernen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {editingVdf && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.filter(
                (c) =>
                  !editedVdf.some((s) => s.category === c) &&
                  !mdf.some((s) => s.category === c),
              ).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => addToVdf(cat)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {CATEGORY_LABEL[cat]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Audit promise */}
        <div className="rounded-lg bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 p-3 space-y-1.5">
          <p className="text-[10px] tracking-[0.18em] uppercase font-semibold text-slate-500 dark:text-slate-400">
            Audit-Garantie
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Jeder Behörden-Zugriff wird mit SHA-256-Hash-Chain signiert und ist
            in deinem Audit-Log live sichtbar. Die Behörde kann nicht außerhalb
            dieses Scopes lesen — die Plattform setzt den Scope technisch durch.
            Die Aufsicht endet automatisch nach 12 Monaten, kann aber bei Bedarf
            vorzeitig angefochten werden.
          </p>
        </div>

        {oversight.expiresAt && (
          <p className="text-xs text-slate-400">
            Token läuft ab am{" "}
            {new Date(oversight.expiresAt).toLocaleString("de-DE")}.
          </p>
        )}

        {/* Dispute reason area — shown after Dispute click */}
        {showDispute && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-2">
            <div className="text-xs font-medium text-amber-800 dark:text-amber-200">
              Widerspruchs-Begründung
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300/80">
              Erkläre, warum du die MDF-Auslegung der Behörde für nicht
              zutreffend hältst (z. B. Rechtsgrundlage greift nicht, Scope
              überschreitet § X, andere Behörde zuständig). Wird im Audit-Log
              und an die Behörde übermittelt.
            </p>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Mind. 10 Zeichen…"
              className="w-full text-sm bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-md p-2 placeholder:text-slate-400"
            />
            <div className="text-[10px] text-amber-600 dark:text-amber-400">
              {disputeReason.length} / 2000 Zeichen
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="px-8 pb-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700/50 flex gap-3">
        {showDispute ? (
          <>
            <button
              type="button"
              onClick={() => {
                setShowDispute(false);
                setDisputeReason("");
                setError(null);
              }}
              disabled={submitting !== null}
              className="flex-1 h-11 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              Zurück
            </button>
            <button
              type="button"
              onClick={submitDispute}
              disabled={submitting !== null}
              className="flex-1 h-11 rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {submitting === "DISPUTE" ? "…" : "Widerspruch abschicken"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowDispute(true)}
              disabled={submitting !== null}
              className="flex-1 h-11 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              Widerspruch einlegen
            </button>
            <button
              type="button"
              onClick={submitAccept}
              disabled={submitting !== null}
              className="flex-1 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {submitting === "ACCEPT" ? "…" : "Aufsicht akzeptieren"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
