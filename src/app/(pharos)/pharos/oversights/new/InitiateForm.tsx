"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * InitiateForm — authority-side form to initiate a Pharos oversight.
 *
 * Two-screen flow: form → confirmation with the rawAcceptToken
 * (one-time, surfaced once) and the accept-URL the authority pastes
 * into an email to the operator's compliance officer.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import Link from "next/link";
import { Copy, Check } from "lucide-react";

interface OperatorOption {
  id: string;
  name: string;
  slug: string;
}

const SCOPE_CATEGORIES = [
  { value: "COMPLIANCE_ASSESSMENTS", label: "Compliance-Bewertungen" },
  { value: "AUTHORIZATION_WORKFLOWS", label: "Genehmigungs-Workflows" },
  { value: "DOCUMENTS", label: "Dokumente" },
  { value: "TIMELINE_DEADLINES", label: "Fristen & Zeitleiste" },
  { value: "INCIDENTS", label: "Vorfälle & NIS2-Phasen" },
  { value: "SPACECRAFT_REGISTRY", label: "Satelliten-Registry" },
  { value: "AUDIT_LOGS", label: "Audit-Logs (selten)" },
] as const;

const PERMISSION_OPTIONS = [
  { value: "READ", label: "Lesen" },
  { value: "READ_SUMMARY", label: "Nur Übersicht" },
  { value: "EXPORT", label: "Export" },
];

export function InitiateForm({
  operators,
  defaultLegalReference,
}: {
  operators: OperatorOption[];
  defaultLegalReference: string;
}) {
  const [operatorOrgId, setOperatorOrgId] = useState("");
  const [oversightTitle, setOversightTitle] = useState("");
  const [oversightReference, setOversightReference] = useState("");
  const [legalReference, setLegalReference] = useState(defaultLegalReference);
  const [mdfCategories, setMdfCategories] = useState<
    { category: string; permissions: string[] }[]
  >([{ category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ"] }]);
  const [vdfCategories, setVdfCategories] = useState<
    { category: string; permissions: string[] }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    oversightId: string;
    rawAcceptToken: string;
    expiresAt: string;
    acceptUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleMdfCategory = (cat: string) => {
    if (mdfCategories.some((c) => c.category === cat)) {
      setMdfCategories(mdfCategories.filter((c) => c.category !== cat));
    } else {
      setMdfCategories([
        ...mdfCategories,
        { category: cat, permissions: ["READ"] },
      ]);
    }
  };

  const setMdfPermissions = (cat: string, perms: string[]) => {
    setMdfCategories(
      mdfCategories.map((c) =>
        c.category === cat
          ? { ...c, permissions: perms.length === 0 ? ["READ"] : perms }
          : c,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/pharos/oversight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorOrgId,
          oversightTitle: oversightTitle.trim(),
          ...(oversightReference.trim()
            ? { oversightReference: oversightReference.trim() }
            : {}),
          legalReference: legalReference.trim(),
          mandatoryDisclosure: mdfCategories,
          ...(vdfCategories.length > 0
            ? { voluntaryDisclosure: vdfCategories }
            : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Initiierung fehlgeschlagen");
        return;
      }
      setResult(json);
    } finally {
      setSubmitting(false);
    }
  };

  const copyAcceptUrl = async () => {
    if (!result) return;
    const fullUrl = `${window.location.origin}${result.acceptUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // ─── render success view ────────────────────────────────────────────

  if (result) {
    const fullUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${result.acceptUrl}`
        : result.acceptUrl;
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="text-emerald-300 font-medium mb-1">
            Aufsicht ist initiiert.
          </div>
          <p className="text-sm text-emerald-100/80">
            Status: <span className="font-mono">PENDING_OPERATOR_ACCEPT</span>.
            Der Operator hat bis zur unten genannten Frist Zeit, die Aufsicht
            über den einmaligen Token-Link zu prüfen und zu akzeptieren oder
            anzufechten.
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="text-[10px] tracking-[0.18em] uppercase text-amber-300 font-semibold">
            Einladungs-Link · einmalig
          </div>
          <div className="rounded-md bg-navy-950/60 border border-amber-500/30 px-3 py-2 text-xs font-mono text-amber-100 break-all">
            {fullUrl}
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={copyAcceptUrl}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Kopiert
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  In Zwischenablage kopieren
                </>
              )}
            </button>
            <div className="text-[11px] text-slate-500">
              Läuft ab am {new Date(result.expiresAt).toLocaleString("de-DE")}
            </div>
          </div>
          <p className="text-[11px] text-amber-200/70 leading-relaxed">
            Schicke diesen Link per dienstlicher E-Mail an den Compliance-
            Verantwortlichen des Operators. Der Token wird beim ersten
            erfolgreichen Aufruf konsumiert.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/pharos/operators/${result.oversightId}`}
            className="inline-flex items-center h-9 px-4 rounded-md border border-white/10 hover:bg-white/[0.04] text-sm"
          >
            Zur Aufsichts-Detailansicht
          </Link>
          <Link
            href="/pharos/oversights/new"
            className="inline-flex items-center h-9 px-4 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-medium"
          >
            Weitere Aufsicht initiieren
          </Link>
        </div>
      </div>
    );
  }

  // ─── render form ────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Operator">
        <select
          value={operatorOrgId}
          onChange={(e) => setOperatorOrgId(e.target.value)}
          required
          className="w-full bg-navy-900 border border-white/10 rounded-md px-3 h-10 text-sm"
        >
          <option value="" disabled>
            — Operator wählen —
          </option>
          {operators.map((op) => (
            <option key={op.id} value={op.id}>
              {op.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Bezeichnung der Aufsicht">
        <input
          type="text"
          value={oversightTitle}
          onChange={(e) => setOversightTitle(e.target.value)}
          maxLength={200}
          minLength={3}
          required
          placeholder="z.B. EU-Space-Act Aufsicht 2026 — Galileo Operations"
          className="w-full bg-navy-900 border border-white/10 rounded-md px-3 h-10 text-sm"
        />
      </Field>

      <Field label="Aktenzeichen (optional)">
        <input
          type="text"
          value={oversightReference}
          onChange={(e) => setOversightReference(e.target.value)}
          maxLength={50}
          placeholder="z.B. BAFA-2026-LRSP-014"
          className="w-full bg-navy-900 border border-white/10 rounded-md px-3 h-10 text-sm font-mono"
        />
      </Field>

      <Field
        label="Rechtsgrundlage"
        hint="Wird in Audit-Log und Operator-Einladung mitgesendet — sollte präzise und prüfbar sein."
      >
        <input
          type="text"
          value={legalReference}
          onChange={(e) => setLegalReference(e.target.value)}
          maxLength={200}
          minLength={2}
          required
          placeholder="z.B. § 14 WRV i.V.m. Art. 7 EU Space Act"
          className="w-full bg-navy-900 border border-white/10 rounded-md px-3 h-10 text-sm"
        />
      </Field>

      <Field
        label="Pflicht-Offenlegung (MDF)"
        hint="Die nicht verhandelbaren Datenkategorien. Operator kann diese nicht abwählen — wer widerspricht, geht den Streitweg."
      >
        <div className="space-y-1.5">
          {SCOPE_CATEGORIES.map((c) => {
            const entry = mdfCategories.find((m) => m.category === c.value);
            const on = !!entry;
            return (
              <div
                key={c.value}
                className={`rounded-md border ${
                  on
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-white/10 bg-navy-900/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleMdfCategory(c.value)}
                  className="w-full text-left flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span className={on ? "text-amber-200" : "text-slate-300"}>
                    {c.label}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wide ${
                      on ? "text-amber-300" : "text-slate-500"
                    }`}
                  >
                    {on ? "MDF" : "—"}
                  </span>
                </button>
                {on && entry && (
                  <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                    {PERMISSION_OPTIONS.map((p) => {
                      const perm_on = entry.permissions.includes(p.value);
                      return (
                        <button
                          type="button"
                          key={p.value}
                          onClick={() => {
                            const next = perm_on
                              ? entry.permissions.filter((x) => x !== p.value)
                              : [...entry.permissions, p.value];
                            setMdfPermissions(c.value, next);
                          }}
                          className={`text-[11px] px-2 py-1 rounded border ${
                            perm_on
                              ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                              : "border-white/10 text-slate-400 hover:border-white/20"
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Field>

      <Field
        label="Freiwillige Erweiterung (VDF, optional)"
        hint="Vorgeschlagene Bereiche, die der Operator zusätzlich freigeben kann. Operator kann ergänzen, aber nicht zur Pflicht erklären."
      >
        <div className="grid grid-cols-2 gap-1.5">
          {SCOPE_CATEGORIES.filter(
            (c) => !mdfCategories.some((m) => m.category === c.value),
          ).map((c) => {
            const on = vdfCategories.some((v) => v.category === c.value);
            return (
              <button
                type="button"
                key={c.value}
                onClick={() => {
                  if (on) {
                    setVdfCategories(
                      vdfCategories.filter((v) => v.category !== c.value),
                    );
                  } else {
                    setVdfCategories([
                      ...vdfCategories,
                      { category: c.value, permissions: ["READ"] },
                    ]);
                  }
                }}
                className={`text-xs px-3 py-2 rounded-md border text-left transition-colors ${
                  on
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-white/10 bg-navy-900/40 text-slate-400 hover:border-white/20"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </Field>

      {error && (
        <div className="text-sm text-red-400 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-2 gap-3">
        <Link
          href="/pharos/oversights"
          className="inline-flex items-center h-10 px-4 rounded-md border border-white/10 text-sm text-slate-300 hover:bg-white/[0.04]"
        >
          Abbrechen
        </Link>
        <button
          type="submit"
          disabled={submitting || mdfCategories.length === 0}
          className="inline-flex items-center h-10 px-5 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Initiiere…" : "Aufsicht erstellen & Token erzeugen"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
