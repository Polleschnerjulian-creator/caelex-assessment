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
import { t } from "../_i18n/core";
import { COMMON } from "../_i18n/common";
import { SETTINGS } from "../_i18n/settings";
import { useScholarLocale } from "../_i18n/LocaleProvider";

// ─── Shared result type (matches what server actions return) ──────────────────

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string }
  | null; // initial state before first submit

// ─── Shared status banner ─────────────────────────────────────────────────────

function StatusBanner({ result }: { result: ActionResult }) {
  const locale = useScholarLocale();
  if (!result) return null;

  if (result.ok) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="mt-2 text-[12px] text-green-700 font-medium"
      >
        {result.message ?? t(locale, SETTINGS, "bannerSavedDefault")}
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
  "block text-[12px] font-semibold text-gray-700 tracking-[-0.01em] mb-1";

// ─── 1. Name form ──────────────────────────────────────────────────────────────

type NameFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  defaultValue: string;
};

export function NameForm({ action, defaultValue }: NameFormProps) {
  const locale = useScholarLocale();
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form
      action={dispatch}
      aria-label={t(locale, SETTINGS, "nameFormAriaLabel")}
      className="px-5 py-4 border-b border-gray-100"
    >
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="settings-name" className={FIELD_LABEL_CLS}>
            {t(locale, SETTINGS, "nameLabel")}
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
            {t(locale, SETTINGS, "nameHint")}
          </p>
          <StatusBanner result={result} />
        </div>
        <button
          type="submit"
          className={SAVE_BTN_CLS}
          disabled={isPending}
          aria-disabled={isPending}
        >
          {isPending
            ? t(locale, SETTINGS, "pendingEllipsis")
            : t(locale, COMMON, "save")}
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
  const locale = useScholarLocale();
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form
      action={dispatch}
      aria-label={t(locale, SETTINGS, "prefsFormAriaLabel")}
      className="space-y-5"
    >
      {/* Standard-Jurisdiktion */}
      <div>
        <label htmlFor="pref-jurisdiction" className={FIELD_LABEL_CLS}>
          {t(locale, SETTINGS, "defaultJurisdictionLabel")}
        </label>
        <select
          id="pref-jurisdiction"
          name="defaultJurisdiction"
          defaultValue={defaultJurisdiction ?? ""}
          className={INPUT_CLS}
        >
          <option value="">
            {t(locale, SETTINGS, "defaultJurisdictionNone")}
          </option>
          {jurisdictions.map((j) => (
            <option key={j.code} value={j.code}>
              {j.code} — {j.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-gray-500">
          {t(locale, SETTINGS, "defaultJurisdictionHint")}
        </p>
      </div>

      {/* Zitationsformat */}
      <div>
        <label htmlFor="pref-citation" className={FIELD_LABEL_CLS}>
          {t(locale, SETTINGS, "citationFormatLabel")}
        </label>
        <select
          id="pref-citation"
          name="citationFormat"
          defaultValue={citationFormat}
          className={INPUT_CLS}
        >
          <option value="din">
            {t(locale, SETTINGS, "citationFormatDin")}
          </option>
          <option value="oscola">
            {t(locale, SETTINGS, "citationFormatOscola")}
          </option>
          <option value="bluebook">
            {t(locale, SETTINGS, "citationFormatBluebook")}
          </option>
        </select>
      </div>

      {/* Semantische Suche */}
      <div>
        <label htmlFor="pref-semantic" className={FIELD_LABEL_CLS}>
          {t(locale, SETTINGS, "semanticSearchLabel")}
        </label>
        <select
          id="pref-semantic"
          name="semanticSearch"
          defaultValue={semanticSearch ? "on" : "off"}
          className={INPUT_CLS}
        >
          <option value="on">{t(locale, SETTINGS, "semanticSearchOn")}</option>
          <option value="off">
            {t(locale, SETTINGS, "semanticSearchOff")}
          </option>
        </select>
        <p className="mt-1 text-[11px] text-gray-500">
          {t(locale, SETTINGS, "semanticSearchHint")}
        </p>
        {/* Just-in-time privacy note (G6): what is processed, off by default. */}
        <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
          {t(locale, SETTINGS, "semanticSearchJitNote")}
        </p>
      </div>

      {/* Treffer pro Seite */}
      <div>
        <label htmlFor="pref-results" className={FIELD_LABEL_CLS}>
          {t(locale, SETTINGS, "resultsPerPageLabel")}
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
          {isPending
            ? t(locale, SETTINGS, "pendingEllipsis")
            : t(locale, SETTINGS, "savePrefs")}
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
  const locale = useScholarLocale();
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form
      action={dispatch}
      aria-label={t(locale, SETTINGS, "sourceLangFormAriaLabel")}
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
          {t(locale, SETTINGS, "sourceLanguageLabel")}
        </label>
        <select
          id="pref-source-lang"
          name="sourceLanguage"
          defaultValue={sourceLanguage}
          className={INPUT_CLS}
        >
          <option value="original">
            {t(locale, SETTINGS, "sourceLangOriginal")}
          </option>
          <option value="de">{t(locale, SETTINGS, "sourceLangDe")}</option>
          <option value="fr">{t(locale, SETTINGS, "sourceLangFr")}</option>
          <option value="en">{t(locale, SETTINGS, "sourceLangEn")}</option>
        </select>
        <p className="mt-2 text-[12px] text-gray-600 leading-relaxed">
          {t(locale, SETTINGS, "sourceLangHint")}
        </p>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          className={SAVE_BTN_CLS}
          disabled={isPending}
          aria-disabled={isPending}
        >
          {isPending
            ? t(locale, SETTINGS, "pendingEllipsis")
            : t(locale, SETTINGS, "saveSourceLang")}
        </button>
        <StatusBanner result={result} />
      </div>
    </form>
  );
}

// ─── 3b. Interface (UI chrome) language form ──────────────────────────────────
// Distinct from SourceLangForm: this controls the language of the Scholar
// INTERFACE (menus/labels/buttons), persisted as ScholarUserPreferences.
// uiLanguage. Options come from LOCALE_LABELS (native-language names). The
// single handleSavePrefs action receives the existing prefs as hidden carry-
// fields plus the chosen uiLanguage.

type InterfaceLangFormProps = {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  /** Native-language labels for each selectable UI locale (from LOCALE_LABELS). */
  options: { value: string; label: string }[];
  defaultJurisdiction: string | null;
  citationFormat: string;
  semanticSearch: boolean;
  resultsPerPage: number;
  sourceLanguage: string;
  uiLanguage: string;
};

export function InterfaceLangForm({
  action,
  options,
  defaultJurisdiction,
  citationFormat,
  semanticSearch,
  resultsPerPage,
  sourceLanguage,
  uiLanguage,
}: InterfaceLangFormProps) {
  const locale = useScholarLocale();
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form
      action={dispatch}
      aria-label={t(locale, SETTINGS, "interfaceFormAriaLabel")}
      className="space-y-4"
    >
      {/* Hidden carry-fields so savePrefs receives every existing value */}
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
      <input type="hidden" name="sourceLanguage" value={sourceLanguage} />

      <div>
        <label htmlFor="pref-ui-lang" className={FIELD_LABEL_CLS}>
          {t(locale, SETTINGS, "interfaceLanguageLabel")}
        </label>
        <select
          id="pref-ui-lang"
          name="uiLanguage"
          defaultValue={uiLanguage}
          className={INPUT_CLS}
          aria-describedby="pref-ui-lang-hint"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <p
          id="pref-ui-lang-hint"
          className="mt-2 text-[12px] text-gray-600 leading-relaxed"
        >
          {t(locale, SETTINGS, "interfaceLanguageHint")}
        </p>
      </div>

      <div className="pt-1">
        <button
          type="submit"
          className={SAVE_BTN_CLS}
          disabled={isPending}
          aria-disabled={isPending}
        >
          {isPending
            ? t(locale, SETTINGS, "pendingEllipsis")
            : t(locale, SETTINGS, "saveInterfaceLanguage")}
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
  const locale = useScholarLocale();
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
      aria-label={t(locale, SETTINGS, "passwordFormAriaLabel")}
      className="space-y-3"
    >
      <div>
        <label htmlFor="sec-current-pw" className={FIELD_LABEL_CLS}>
          {t(locale, SETTINGS, "currentPasswordLabel")}
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
          {t(locale, SETTINGS, "newPasswordLabel")}
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
          {t(locale, SETTINGS, "newPasswordHint")}
        </p>
      </div>
      <div>
        <label htmlFor="sec-confirm-pw" className={FIELD_LABEL_CLS}>
          {t(locale, SETTINGS, "confirmPasswordLabel")}
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
          {isPending
            ? t(locale, SETTINGS, "pendingEllipsis")
            : t(locale, SETTINGS, "savePassword")}
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
  const locale = useScholarLocale();
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form
      action={dispatch}
      aria-label={t(locale, SETTINGS, "historyToggleAriaLabel")}
    >
      <input
        type="hidden"
        name="searchHistoryEnabled"
        value={enabled ? "off" : "on"}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-gray-900 font-medium">
            {t(locale, SETTINGS, "recordSearchHistory")}
          </p>
          <p className="text-[12px] text-gray-500 mt-0.5">
            {t(locale, SETTINGS, "currentlyPrefix")}{" "}
            <span className={enabled ? "text-green-700" : "text-gray-500"}>
              {enabled
                ? t(locale, COMMON, "enabled")
                : t(locale, COMMON, "disabled")}
            </span>
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          aria-disabled={isPending}
          className="text-[12px] font-medium text-gray-700 border border-gray-200 hover:border-gray-400 hover:text-gray-900 rounded-lg px-3 py-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isPending
            ? t(locale, SETTINGS, "pendingEllipsis")
            : enabled
              ? t(locale, COMMON, "deactivate")
              : t(locale, COMMON, "activate")}
        </button>
      </div>
      {/* Just-in-time privacy note (G5): what is stored, off by default. */}
      <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
        {t(locale, SETTINGS, "historyJitNote")}
      </p>
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
  const locale = useScholarLocale();
  const [result, dispatch, isPending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  return (
    <form
      action={dispatch}
      aria-label={t(locale, SETTINGS, "clearHistoryAriaLabel")}
    >
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-700">
          {hasHistory
            ? t(locale, SETTINGS, "clearHistoryWarn")
            : t(locale, SETTINGS, "clearHistoryEmpty")}
        </p>
        <button
          type="submit"
          disabled={isPending || !hasHistory}
          aria-disabled={isPending || !hasHistory}
          className="text-[12px] font-medium text-red-600 border border-red-200 hover:border-red-400 hover:text-red-700 rounded-lg px-3 py-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending
            ? t(locale, SETTINGS, "pendingEllipsis")
            : t(locale, SETTINGS, "clearHistoryButton")}
        </button>
      </div>
      <StatusBanner result={result} />
    </form>
  );
}
