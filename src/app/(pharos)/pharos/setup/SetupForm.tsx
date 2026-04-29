"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * SetupForm — client form for AuthorityProfile create/edit.
 *
 * Behaviour: if `existing` is null, POSTs (create); otherwise PATCHes
 * (update). Non-admins see read-only state with a banner explaining
 * they can't edit (matches the API which 403s on non-OWNER/ADMIN).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

const AUTHORITY_TYPES = [
  { value: "BAFA", label: "BAFA" },
  { value: "BNETZA", label: "BNetzA" },
  { value: "BMWK", label: "BMWK" },
  { value: "BMVG", label: "BMVG" },
  { value: "BSI", label: "BSI" },
  { value: "BAFIN", label: "BaFin" },
  { value: "ESA_LIAISON", label: "ESA-Liaison" },
  { value: "EU_COMMISSION", label: "EU-Kommission" },
  { value: "NATO_NCIA", label: "NATO NCIA" },
  { value: "EU_MEMBER_STATE", label: "EU-Mitgliedstaat (sonstige)" },
  { value: "OTHER", label: "Sonstige" },
];

const SCOPE_CATEGORIES = [
  { value: "COMPLIANCE_ASSESSMENTS", label: "Compliance-Bewertungen" },
  { value: "AUTHORIZATION_WORKFLOWS", label: "Genehmigungs-Workflows" },
  { value: "DOCUMENTS", label: "Dokumente" },
  { value: "TIMELINE_DEADLINES", label: "Fristen & Zeitleiste" },
  { value: "INCIDENTS", label: "Vorfälle & NIS2-Phasen" },
  { value: "SPACECRAFT_REGISTRY", label: "Satelliten-Registry" },
  { value: "AUDIT_LOGS", label: "Audit-Logs" },
];

export interface SetupFormValues {
  authorityType: string;
  jurisdiction: string;
  oversightCategories: string[];
  contactEmail: string;
  publicWebsite: string | null;
  legalReference: string | null;
}

export function SetupForm({
  existing,
  canEdit,
}: {
  existing: SetupFormValues | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [authorityType, setAuthorityType] = useState(
    existing?.authorityType ?? "BAFA",
  );
  const [jurisdiction, setJurisdiction] = useState(
    existing?.jurisdiction ?? "DE",
  );
  const [oversightCategories, setOversightCategories] = useState<string[]>(
    existing?.oversightCategories ?? [
      "COMPLIANCE_ASSESSMENTS",
      "AUTHORIZATION_WORKFLOWS",
    ],
  );
  const [contactEmail, setContactEmail] = useState(
    existing?.contactEmail ?? "",
  );
  const [publicWebsite, setPublicWebsite] = useState(
    existing?.publicWebsite ?? "",
  );
  const [legalReference, setLegalReference] = useState(
    existing?.legalReference ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggleCategory = (cat: string) => {
    if (oversightCategories.includes(cat)) {
      setOversightCategories(oversightCategories.filter((c) => c !== cat));
    } else {
      setOversightCategories([...oversightCategories, cat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const body = {
        authorityType,
        jurisdiction: jurisdiction.trim(),
        oversightCategories,
        contactEmail: contactEmail.trim(),
        ...(publicWebsite.trim()
          ? { publicWebsite: publicWebsite.trim() }
          : {}),
        ...(legalReference.trim()
          ? { legalReference: legalReference.trim() }
          : {}),
      };
      const res = await fetch("/api/pharos/authority/profile", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Speichern fehlgeschlagen");
        return;
      }
      setSuccess(true);
      // After first-time setup, route back to the dashboard so the
      // setup-banner disappears.
      if (!existing) {
        setTimeout(() => router.push("/pharos"), 1200);
      } else {
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
        Nur Owner und Admins der Behörden-Organisation dürfen das Profil
        bearbeiten. Kontaktiere die Person, die diese Behörde in Caelex
        aufgesetzt hat.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Aufsichtstyp">
        <select
          value={authorityType}
          onChange={(e) => setAuthorityType(e.target.value)}
          className="w-full bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-md px-3 h-10 text-sm"
        >
          {AUTHORITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Jurisdiktion (ISO-Code)"
        hint="DE, FR, EU, INT, … bestimmt regulatorische Verortung."
      >
        <input
          type="text"
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value.toUpperCase())}
          maxLength={20}
          className="w-full bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-md px-3 h-10 text-sm font-mono"
          required
        />
      </Field>

      <Field
        label="Aufsichts-Kategorien"
        hint="Welche Datenbereiche fallen typischerweise in deinen gesetzlichen Aufsichtsbereich? Wird Operatoren beim Vergleich von Anfragen angezeigt."
      >
        <div className="grid grid-cols-2 gap-1.5">
          {SCOPE_CATEGORIES.map((c) => {
            const on = oversightCategories.includes(c.value);
            return (
              <button
                type="button"
                key={c.value}
                onClick={() => toggleCategory(c.value)}
                className={`text-xs px-3 py-2 rounded-md border text-left transition-colors ${
                  on
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900/40 text-slate-600 dark:text-slate-400 hover:border-white/20"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Kontakt-E-Mail">
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="aufsicht@behoerde.de"
          className="w-full bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-md px-3 h-10 text-sm"
          required
        />
      </Field>

      <Field
        label="Öffentliche Website (optional)"
        hint="Operatoren können hier Auth-Glaubwürdigkeit prüfen."
      >
        <input
          type="url"
          value={publicWebsite}
          onChange={(e) => setPublicWebsite(e.target.value)}
          placeholder="https://www.bafa.de"
          className="w-full bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-md px-3 h-10 text-sm"
        />
      </Field>

      <Field
        label="Rechtsgrundlage (optional, max 500 Zeichen)"
        hint="Standard-Rechtsgrundlage für Aufsichten dieser Behörde."
      >
        <textarea
          value={legalReference}
          onChange={(e) => setLegalReference(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="z.B. § 3 WRV (Weltraumgesetz, BGBl. 2025 I S. 1234)"
          className="w-full bg-white dark:bg-navy-900 border border-slate-200 dark:border-white/10 rounded-md px-3 py-2 text-sm"
        />
      </Field>

      {error && (
        <div className="text-sm text-red-400 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-emerald-300 px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
          Profil gespeichert.
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center h-10 px-5 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-medium disabled:opacity-50"
        >
          {submitting
            ? "Speichere…"
            : existing
              ? "Profil aktualisieren"
              : "Profil anlegen"}
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
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
