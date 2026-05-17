"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Custom-Instructions editor (UI refresh, theme-aware).
 *
 * Inline-editable. Save button enabled iff dirty. PATCH /api/atlas/mandate/[id]
 * persists; the parent receives the new value via onSaved so the local
 * state can stay coherent without a full reload.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  mandateId: string;
  initialValue: string;
  onSaved: (value: string) => void;
}

export function MandateInstructionsEditor({
  mandateId,
  initialValue,
  onSaved,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const dirty = value !== initialValue;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customInstructions: value || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onSaved(value);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
      {/* AUDIT-FIX M39 — visually-hidden label gives screen-reader users
          a clear name for the textarea (sr-only sibling, no visual change). */}
      <label htmlFor={`mandate-instructions-${mandateId}`} className="sr-only">
        Custom-Instructions für dieses Mandat
      </label>
      <textarea
        id={`mandate-instructions-${mandateId}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={8}
        maxLength={8000}
        placeholder={`Werden bei jedem Chat in diesem Mandat als System-Prompt-Suffix injiziert. Zum Beispiel: „Spire ist US-Operator mit DE-Tochter. Mission: Earth Observation, X-Band. Kunde will Cost-Optimum DE/LU. ITAR-Implikation immer einbeziehen."`}
        className="block w-full resize-none bg-transparent text-[13px] text-slate-900 outline-none focus-visible:outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-600"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-500">
          {value.length} / 8000
        </span>
        {/* AUDIT-FIX M14 (2026-05-17): aria-live polite so screen-reader
            users hear the save-confirmation when it briefly appears
            (auto-hides after 3s). Empty live-region keeps the assistive
            text-channel hot. */}
        <div className="flex items-center gap-2" aria-live="polite">
          {savedAt && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={11} /> Gespeichert
            </span>
          )}
          {error && (
            <span className="text-[11px] text-red-500 dark:text-red-400">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {saving ? (
              <Loader2
                size={11}
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Save size={11} />
            )}
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
