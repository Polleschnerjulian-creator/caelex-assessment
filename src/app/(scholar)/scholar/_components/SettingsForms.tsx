"use client";
/**
 * Caelex Scholar — Settings form client wrappers.
 *
 * Each component wraps a single settings form with React 19 useActionState
 * to show inline success/error feedback without full page reloads.
 *
 * Server actions are passed as props (they are serialisable function
 * references thanks to Next.js 15 server action binding).
 *
 * WCAG 2.2 AA:
 *   - Success messages use role="status" aria-live="polite"
 *   - Error messages use role="alert" (live region, polite interruption)
 *   - Pending state disables the submit button (aria-disabled + visual cue)
 *   - Focus remains in-form throughout (no page scroll on submit)
 */

import { useActionState, useEffect, useRef } from "react";

// ─── Shared result type (matches what server actions return) ──────────────────

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string }
  | null; // initial state before first submit

// ─── Shared status banner ─────────────────────────────────────────────────────

function StatusBanner({ result }: { result: ActionResult }) {
  if (!result) return null;

  if (result.ok) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="mt-2 text-[12px] text-green-700 font-medium"
      >
        {result.message ?? "✓ Gespeichert"}
      </p>
    );
  }

  return (
    <p role="alert" className="mt-2 text-[12px] text-red-600 font-medium">
      {result.message}
    </p>
  );
}

// ─── Shared styles (duplicated from page.tsx to keep client bundle isolated) ──

const SAVE_BTN_CLS =
  "text-[12px] font-medium text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-4 py-2.5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2";

const INPUT_CLS =
  "w-full text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 motion-safe:transition-colors hover:border-gray-300";

const FIELD_LABEL_CLS =
  "block text-[11px] font-semibold text-gray-700 tracking-wide uppercase mb-1";

// ─── 1. Name form ──────────────────────────────────────────────────────────────

type NameFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  defaultValue: string;
};

export function NameForm({ action, defaultValue }: NameFormProps) {
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form
      action={dispatch}
      aria-label="Name ändern"
      className="px-5 py-4 border-b border-gray-100"
    >
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="settings-name" className={FIELD_LABEL_CLS}>
            Name
          </label>
          <input
            id="settings-name"
            name="name"
            type="text"
            defaultValue={defaultValue}
            maxLength={100}
            required
            autoComplete="name"
            className={INPUT_CLS}
            aria-describedby="settings-name-hint"
          />
          <p id="settings-name-hint" className="mt-1 text-[11px] text-gray-500">
            Maximal 100 Zeichen, darf nicht leer sein.
          </p>
          <StatusBanner result={result} />
        </div>
        <button
          type="submit"
          className={SAVE_BTN_CLS}
          disabled={isPending}
          aria-disabled={isPending}
        >
          {isPending ? "…" : "Speichern"}
        </button>
      </div>
    </form>
  );
}

// ─── 2. Research preferences form ─────────────────────────────────────────────

type PrefsFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  jurisdictions: { code: string; label: string }[];
  defaultJurisdiction: string | null;
  citationFormat: string;
  semanticSearch: boolean;
  resultsPerPage: number;
};

export function PrefsForm({
  action,
  jurisdictions,
  defaultJurisdiction,
  citationFormat,
  semanticSearch,
  resultsPerPage,
}: PrefsFormProps) {
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form
      action={dispatch}
      aria-label="Recherche-Präferenzen speichern"
      className="space-y-5"
    >
      {/* Standard-Jurisdiktion */}
      <div>
        <label htmlFor="pref-jurisdiction" className={FIELD_LABEL_CLS}>
          Standard-Jurisdiktion
        </label>
        <select
          id="pref-jurisdiction"
          name="defaultJurisdiction"
          defaultValue={defaultJurisdiction ?? ""}
          className={INPUT_CLS}
        >
          <option value="">Keine (alle Jurisdiktionen)</option>
          {jurisdictions.map((j) => (
            <option key={j.code} value={j.code}>
              {j.code} — {j.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-gray-500">
          Wird in der Bibliothek als vorausgewählter Filter verwendet.
        </p>
      </div>

      {/* Zitationsformat */}
      <div>
        <label htmlFor="pref-citation" className={FIELD_LABEL_CLS}>
          Zitationsformat
        </label>
        <select
          id="pref-citation"
          name="citationFormat"
          defaultValue={citationFormat}
          className={INPUT_CLS}
        >
          <option value="din">Deutsche Zitierweise (DIN 1505)</option>
          <option value="oscola">OSCOLA</option>
          <option value="bluebook">Bluebook</option>
        </select>
      </div>

      {/* Semantische Suche */}
      <div>
        <label htmlFor="pref-semantic" className={FIELD_LABEL_CLS}>
          Semantische Suche
        </label>
        <select
          id="pref-semantic"
          name="semanticSearch"
          defaultValue={semanticSearch ? "on" : "off"}
          className={INPUT_CLS}
        >
          <option value="on">Aktiviert</option>
          <option value="off">Deaktiviert (nur Keyword-Suche)</option>
        </select>
        <p className="mt-1 text-[11px] text-gray-500">
          Semantische Suche nutzt Embeddings für kontextbezogene Ergebnisse.
        </p>
      </div>

      {/* Treffer pro Seite */}
      <div>
        <label htmlFor="pref-results" className={FIELD_LABEL_CLS}>
          Treffer pro Seite
        </label>
        <select
          id="pref-results"
          name="resultsPerPage"
          defaultValue={String(resultsPerPage)}
          className={INPUT_CLS}
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="30">30</option>
          <option value="50">50</option>
        </select>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          className={SAVE_BTN_CLS}
          disabled={isPending}
          aria-disabled={isPending}
        >
          {isPending ? "…" : "Einstellungen speichern"}
        </button>
        <StatusBanner result={result} />
      </div>
    </form>
  );
}

// ─── 3. Source language form ───────────────────────────────────────────────────

type SourceLangFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  defaultJurisdiction: string | null;
  citationFormat: string;
  semanticSearch: boolean;
  resultsPerPage: number;
  sourceLanguage: string;
};

export function SourceLangForm({
  action,
  defaultJurisdiction,
  citationFormat,
  semanticSearch,
  resultsPerPage,
  sourceLanguage,
}: SourceLangFormProps) {
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form
      action={dispatch}
      aria-label="Quellsprache speichern"
      className="space-y-4"
    >
      {/* Hidden carry-fields so savePrefs gets all values */}
      <input
        type="hidden"
        name="defaultJurisdiction"
        value={defaultJurisdiction ?? ""}
      />
      <input type="hidden" name="citationFormat" value={citationFormat} />
      <input
        type="hidden"
        name="semanticSearch"
        value={semanticSearch ? "on" : "off"}
      />
      <input
        type="hidden"
        name="resultsPerPage"
        value={String(resultsPerPage)}
      />

      <div>
        <label htmlFor="pref-source-lang" className={FIELD_LABEL_CLS}>
          Quellsprache
        </label>
        <select
          id="pref-source-lang"
          name="sourceLanguage"
          defaultValue={sourceLanguage}
          className={INPUT_CLS}
        >
          <option value="original">Original (Sprache des Dokuments)</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
        <p className="mt-2 text-[12px] text-gray-600 leading-relaxed">
          Bestimmt, in welcher Sprache Quelltexte angezeigt werden, sofern
          Übersetzungen vorliegen.
        </p>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          className={SAVE_BTN_CLS}
          disabled={isPending}
          aria-disabled={isPending}
        >
          {isPending ? "…" : "Sprache speichern"}
        </button>
        <StatusBanner result={result} />
      </div>
    </form>
  );
}

// ─── 4. Password form ─────────────────────────────────────────────────────────

type PasswordFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function PasswordForm({ action }: PasswordFormProps) {
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  // Auto-clear password fields on success to prevent accidental re-submit
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (result?.ok) {
      formRef.current?.reset();
    }
  }, [result]);

  return (
    <form
      ref={formRef}
      action={dispatch}
      aria-label="Passwort ändern"
      className="space-y-3"
    >
      <div>
        <label htmlFor="sec-current-pw" className={FIELD_LABEL_CLS}>
          Aktuelles Passwort
        </label>
        <input
          id="sec-current-pw"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={INPUT_CLS}
        />
      </div>
      <div>
        <label htmlFor="sec-new-pw" className={FIELD_LABEL_CLS}>
          Neues Passwort
        </label>
        <input
          id="sec-new-pw"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={INPUT_CLS}
          aria-describedby="sec-new-pw-hint"
        />
        <p id="sec-new-pw-hint" className="mt-1 text-[11px] text-gray-500">
          Mindestens 8 Zeichen, muss sich vom aktuellen unterscheiden.
        </p>
      </div>
      <div>
        <label htmlFor="sec-confirm-pw" className={FIELD_LABEL_CLS}>
          Passwort bestätigen
        </label>
        <input
          id="sec-confirm-pw"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={INPUT_CLS}
        />
      </div>
      <div className="pt-1">
        <button
          type="submit"
          className={SAVE_BTN_CLS}
          disabled={isPending}
          aria-disabled={isPending}
        >
          {isPending ? "…" : "Passwort speichern"}
        </button>
        <StatusBanner result={result} />
      </div>
    </form>
  );
}

// ─── 5. Search history toggle ─────────────────────────────────────────────────

type HistoryToggleFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  enabled: boolean;
};

export function HistoryToggleForm({ action, enabled }: HistoryToggleFormProps) {
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form action={dispatch} aria-label="Suchverlauf-Einstellung">
      <input
        type="hidden"
        name="searchHistoryEnabled"
        value={enabled ? "off" : "on"}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-gray-900 font-medium">
            Suchverlauf aufzeichnen
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Aktuell:{" "}
            <span className={enabled ? "text-green-700" : "text-gray-500"}>
              {enabled ? "Aktiviert" : "Deaktiviert"}
            </span>
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          aria-disabled={isPending}
          className="text-[12px] font-medium text-gray-700 border border-gray-200 hover:border-gray-400 hover:text-gray-900 rounded-lg px-3 py-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isPending ? "…" : enabled ? "Deaktivieren" : "Aktivieren"}
        </button>
      </div>
      <StatusBanner result={result} />
    </form>
  );
}

// ─── 6. Clear search history ──────────────────────────────────────────────────

type ClearHistoryFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  hasHistory: boolean;
};

export function ClearHistoryForm({
  action,
  hasHistory,
}: ClearHistoryFormProps) {
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form action={dispatch} aria-label="Suchverlauf löschen">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-700">
          {hasHistory
            ? "Gespeicherte Suchen werden dauerhaft gelöscht."
            : "Kein Suchverlauf vorhanden."}
        </p>
        <button
          type="submit"
          disabled={isPending || !hasHistory}
          aria-disabled={isPending || !hasHistory}
          className="text-[12px] font-medium text-red-600 border border-red-200 hover:border-red-400 hover:text-red-700 rounded-lg px-3 py-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "…" : "Suchverlauf löschen"}
        </button>
      </div>
      <StatusBanner result={result} />
    </form>
  );
}
