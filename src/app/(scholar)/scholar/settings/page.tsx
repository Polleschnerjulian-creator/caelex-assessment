/**
 * Caelex Scholar — Einstellungen (Settings) page.
 *
 * Server Component: reads session, org data, and user preferences server-side.
 * Renders a two-pane tabbed layout via <SettingsTabs> (client shell). Each
 * tab's content is a server-rendered ReactNode — the only valid way to pass
 * rich content across the RSC→Client boundary without passing functions.
 *
 * Tabs:
 *   1. Konto            — Name (editable), E-Mail (read-only), Hochschule, Rolle
 *   2. Recherche & Sprache — Standard-Jurisdiktion, Zitationsformat, Semantische
 *                            Suche, Treffer/Seite + Quellsprache (merged)
 *   3. Sicherheit       — password change / SSO note + session note + login history
 *   4. Datenschutz      — search history list + toggle + GDPR export + deletion
 *   5. Über Scholar     — powered-by, legal links, version note
 *
 * CRITICAL: NEVER pass a plain function as a prop to a client component.
 *   - Server actions (handleUpdateName, etc.) ARE safe as props — Next.js 15
 *     serialises them as action references at the RSC boundary.
 *   - jurisdictionLabel() helper MUST NOT be passed — pre-compute
 *     {code,label}[] on the server (already done below).
 *   - The `content` prop on each tab is ReactNode — valid RSC→Client transfer.
 *
 * WCAG 2.2 AA:
 *   - <main> landmark + lang="de" provided by ScholarPage (WCAG 3.1.1 / 4.1.2)
 *   - <h1> via PageHeader; every section uses <h2> (WCAG 1.3.1 / 2.4.6)
 *   - Every <input>/<select> has an associated <label> (WCAG 1.3.1 / 3.3.2)
 *   - focus-visible rings on all interactive elements (WCAG 2.4.7)
 *   - Contrast: gray-900 on white ≥15:1 ✓; gray-700 on white ≥7.4:1 ✓
 *   - Target size ≥24px on all inputs/buttons via py-2/py-2.5 (WCAG 2.5.8)
 *   - ARIA tabs pattern in SettingsTabs.tsx (role=tablist/tab/tabpanel)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  Settings,
  User,
  Info,
  BookOpen,
  Shield,
  Lock,
  Download,
  History,
  Mail,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { isSuperAdmin } from "@/lib/super-admin";
import { prisma } from "@/lib/prisma";
import {
  getScholarPreferences,
  updateScholarPreferences,
} from "@/lib/scholar/preferences.server";
import {
  changePassword,
  isCredentialsAccount,
  getLoginHistory,
} from "@/lib/scholar/account-security.server";
import {
  getSearchHistory,
  clearSearchHistory,
} from "@/lib/scholar/search-history.server";
import { getAvailableJurisdictions } from "@/data/legal-sources";
import { getCountryName } from "@/data/iso-3166-countries";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";
import type { ActionResult } from "../_components/SettingsForms";
import {
  NameForm,
  PrefsForm,
  SourceLangForm,
  InterfaceLangForm,
  PasswordForm,
  HistoryToggleForm,
  ClearHistoryForm,
} from "../_components/SettingsForms";
import { SettingsTabs } from "./_components/SettingsTabs";
import type { TabDefinition } from "./_components/SettingsTabs";
import {
  t,
  LOCALE_LABELS,
  SCHOLAR_LOCALES,
  type ScholarLocale,
} from "../_i18n/core";
import { SETTINGS } from "../_i18n/settings";
import { getScholarLocale } from "../_i18n/locale.server";

// ─── Shared panel styles ──────────────────────────────────────────────────────

const PANEL_HEADING_CLS =
  "text-[22px] font-semibold text-gray-900 tracking-[-0.02em] leading-[1.1]";
const PANEL_DESC_CLS = "mt-2 text-[13px] text-gray-500 leading-relaxed";
const CARD_CLS =
  "bg-white border border-gray-200/70 rounded-2xl shadow-sm overflow-hidden";
const SECTION_LABEL_CLS =
  "text-[13px] font-semibold text-gray-900 tracking-[-0.01em] mb-2";
const DIVIDER_CLS = "border-t border-gray-100 my-8";

// ─── Jurisdiction helpers ─────────────────────────────────────────────────────

const SPECIAL_NAMES: Record<string, string> = {
  INT: "International",
  EU: "European Union",
};

function jurisdictionLabel(code: string): string {
  return SPECIAL_NAMES[code] ?? getCountryName(code);
}

// ─── Security / login-history helpers ────────────────────────────────────────

// Login-event type → SETTINGS-namespace key. Anything unmapped falls back to the
// raw event string (never blank).
const EVENT_TYPE_KEYS: Record<string, keyof (typeof SETTINGS)["en"]> = {
  LOGIN_SUCCESS: "eventLoginSuccess",
  LOGIN_FAILED: "eventLoginFailed",
  LOGIN_BLOCKED: "eventLoginBlocked",
  MFA_REQUIRED: "eventMfaRequired",
  MFA_SUCCESS: "eventMfaSuccess",
  MFA_FAILED: "eventMfaFailed",
  PASSKEY_SUCCESS: "eventPasskeySuccess",
  PASSKEY_FAILED: "eventPasskeyFailed",
  BACKUP_CODE_USED: "eventBackupCodeUsed",
  ACCOUNT_LOCKED: "eventAccountLocked",
  ACCOUNT_UNLOCKED: "eventAccountUnlocked",
  SUSPICIOUS_LOGIN: "eventSuspiciousLogin",
};

function formatEventType(eventType: string, locale: ScholarLocale): string {
  const key = EVENT_TYPE_KEYS[eventType];
  return key ? t(locale, SETTINGS, key) : eventType;
}

// Map the Scholar UI locale to a BCP-47 tag so dates render in the reader's
// conventions (e.g. de-DE dd.mm.yyyy). Falls back to en-GB.
const DATE_LOCALE: Record<ScholarLocale, string> = {
  en: "en-GB",
  de: "de-DE",
  it: "it-IT",
  fr: "fr-FR",
  es: "es-ES",
};

function formatLoginDate(date: Date, locale: ScholarLocale): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSearchDate(date: Date, locale: ScholarLocale): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// ─── Server Actions ───────────────────────────────────────────────────────────

async function handleUpdateName(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return { ok: false, message: t("en", SETTINGS, "msgNotSignedIn") };
  const locale = await getScholarLocale(userId);

  const raw = formData.get("name");
  if (typeof raw !== "string")
    return { ok: false, message: t(locale, SETTINGS, "msgInvalidInput") };
  const name = raw.trim().slice(0, 100);
  if (!name) return { ok: false, message: t(locale, SETTINGS, "msgNameEmpty") };

  try {
    await prisma.user.update({ where: { id: userId }, data: { name } });
    revalidatePath("/scholar/settings");
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: t(locale, SETTINGS, "msgSaveFailed"),
    };
  }
}

async function handleSavePrefs(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return { ok: false, message: t("en", SETTINGS, "msgNotSignedIn") };
  const locale = await getScholarLocale(userId);

  const defaultJurisdiction =
    (formData.get("defaultJurisdiction") as string | null) || null;
  const citationFormat = formData.get("citationFormat") as string;
  const semanticSearch = formData.get("semanticSearch") === "on";
  const resultsPerPage = parseInt(formData.get("resultsPerPage") as string, 10);
  const sourceLanguage = formData.get("sourceLanguage") as string;
  // UI chrome locale (Interface language). Distinct from sourceLanguage
  // (the legal-TEXT display language). Only present when the interface-language
  // form is submitted; other prefs forms omit it, so it stays untouched.
  const uiLanguage = formData.get("uiLanguage") as string | null;

  const patch: Parameters<typeof updateScholarPreferences>[1] = {};
  if (defaultJurisdiction !== undefined)
    patch.defaultJurisdiction = defaultJurisdiction;
  if (citationFormat) patch.citationFormat = citationFormat;
  patch.semanticSearch = semanticSearch;
  if (!isNaN(resultsPerPage)) patch.resultsPerPage = resultsPerPage;
  if (sourceLanguage) patch.sourceLanguage = sourceLanguage;
  if (uiLanguage) patch.uiLanguage = uiLanguage;

  try {
    await updateScholarPreferences(userId, patch);
    revalidatePath("/scholar/settings");
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : t(locale, SETTINGS, "msgSaveFailedShort");
    return { ok: false, message: msg };
  }
}

async function handlePasswordChange(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return { ok: false, message: t("en", SETTINGS, "msgNotSignedIn") };
  const locale = await getScholarLocale(userId);

  const current = (formData.get("currentPassword") as string) ?? "";
  const next = (formData.get("newPassword") as string) ?? "";
  const confirm = (formData.get("confirmPassword") as string) ?? "";

  if (next !== confirm) {
    return { ok: false, message: t(locale, SETTINGS, "passwordMismatch") };
  }

  const result = await changePassword(userId, current, next);
  if (result.success) {
    revalidatePath("/scholar/settings");
    return { ok: true, message: t(locale, SETTINGS, "passwordChanged") };
  }
  return { ok: false, message: result.message };
}

async function handleToggleHistory(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return { ok: false, message: t("en", SETTINGS, "msgNotSignedIn") };
  const locale = await getScholarLocale(userId);

  const val = formData.get("searchHistoryEnabled");
  const searchHistoryEnabled = val === "on";

  try {
    await updateScholarPreferences(userId, { searchHistoryEnabled });
    revalidatePath("/scholar/settings");
    return {
      ok: true,
      message: searchHistoryEnabled
        ? t(locale, SETTINGS, "msgSearchHistoryEnabled")
        : t(locale, SETTINGS, "msgSearchHistoryDisabled"),
    };
  } catch {
    return { ok: false, message: t(locale, SETTINGS, "msgSaveFailedShort") };
  }
}

async function handleClearHistory(
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId)
    return { ok: false, message: t("en", SETTINGS, "msgNotSignedIn") };
  const locale = await getScholarLocale(userId);

  try {
    await clearSearchHistory(userId);
    revalidatePath("/scholar/settings");
    return {
      ok: true,
      message: t(locale, SETTINGS, "msgSearchHistoryCleared"),
    };
  } catch {
    return {
      ok: false,
      message: t(locale, SETTINGS, "msgDeleteFailed"),
    };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  // Resolve the UI locale once, server-side, and thread it down. Client form
  // components read the same locale from the LocaleProvider via useScholarLocale().
  const locale = await getScholarLocale(user?.id);

  const superAdmin = isSuperAdmin(user?.email);
  let orgName: string | null = null;
  if (!superAdmin && user?.id) {
    const org = await getCurrentOrganization(user.id);
    orgName = org?.organization?.name ?? null;
  }

  const prefs = user?.id ? await getScholarPreferences(user.id) : null;
  const credentialsAccount = user?.id
    ? await isCredentialsAccount(user.id)
    : false;
  const loginHistory = user?.id ? await getLoginHistory(user.id, 10) : [];
  const searchHistory = user?.id ? await getSearchHistory(user.id, 20) : [];

  const jurisdictionCodes = getAvailableJurisdictions().sort((a, b) => {
    if (a === "INT") return -1;
    if (b === "INT") return 1;
    if (a === "EU") return -1;
    if (b === "EU") return 1;
    return jurisdictionLabel(a).localeCompare(jurisdictionLabel(b), locale);
  });

  // Pre-compute serialisable {code,label}[] pairs.
  // CRITICAL: never pass jurisdictionLabel() (a function) to a client component.
  const jurisdictions = jurisdictionCodes.map((code) => ({
    code,
    label: jurisdictionLabel(code),
  }));

  // Interface-language selector options — native-language names from
  // LOCALE_LABELS, in the canonical SCHOLAR_LOCALES order. Pre-computed as
  // serialisable {value,label}[] for the client InterfaceLangForm.
  const uiLanguageOptions = SCHOLAR_LOCALES.map((code) => ({
    value: code,
    label: LOCALE_LABELS[code],
  }));

  // Pre-fill deletion mailto body (localized to the active UI locale)
  const deletionMailto = `mailto:cs@caelex.eu?subject=${encodeURIComponent(
    t(locale, SETTINGS, "deletionMailSubject"),
  )}&body=${encodeURIComponent(
    t(locale, SETTINGS, "deletionMailBody").replace(
      "{email}",
      user?.email ?? t(locale, SETTINGS, "deletionMailFallback"),
    ),
  )}`;

  // ── Build tab panels as server-rendered ReactNodes ──────────────────────────
  // These are ReactNodes (valid RSC→Client transfer), NOT functions.
  // The SettingsTabs client component receives them via the `content` field.

  // ── Tab 1: Konto ─────────────────────────────────────────────────────────
  const kontoPanel = (
    <section aria-labelledby="panel-heading-konto">
      <h2 id="panel-heading-konto" className={PANEL_HEADING_CLS}>
        {t(locale, SETTINGS, "accountHeading")}
      </h2>
      <p className={PANEL_DESC_CLS}>{t(locale, SETTINGS, "accountDesc")}</p>

      <div className={`${CARD_CLS} mt-6`}>
        {/* Name (editable) */}
        <NameForm action={handleUpdateName} defaultValue={user?.name ?? ""} />

        {/* Read-only fields */}
        <dl className="divide-y divide-gray-100">
          <div className="flex items-baseline gap-4 px-5 py-4">
            <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
              {t(locale, SETTINGS, "fieldEmail")}
            </dt>
            <dd className="text-[13px] text-gray-900">
              {user?.email ?? <span className="text-gray-400">—</span>}
            </dd>
          </div>

          {superAdmin ? (
            <div className="flex items-baseline gap-4 px-5 py-4">
              <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                {t(locale, SETTINGS, "fieldRole")}
              </dt>
              <dd className="text-[13px] text-gray-900 font-medium">
                {t(locale, SETTINGS, "roleSuperAdmin")}
              </dd>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-4 px-5 py-4">
                <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                  {t(locale, SETTINGS, "fieldUniversity")}
                </dt>
                <dd className="text-[13px] text-gray-900 font-medium">
                  {orgName ?? (
                    <span className="text-gray-400 font-normal">—</span>
                  )}
                </dd>
              </div>
              <div className="flex items-baseline gap-4 px-5 py-4">
                <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                  {t(locale, SETTINGS, "fieldRole")}
                </dt>
                <dd className="text-[13px] text-gray-600">
                  {t(locale, SETTINGS, "roleLicensed")}
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </section>
  );

  // ── Tab 2: Recherche & Sprache ────────────────────────────────────────────
  const recherchePanel = (
    <section aria-labelledby="panel-heading-recherche">
      <h2 id="panel-heading-recherche" className={PANEL_HEADING_CLS}>
        {t(locale, SETTINGS, "researchHeading")}
      </h2>
      <p className={PANEL_DESC_CLS}>{t(locale, SETTINGS, "researchDesc")}</p>

      {/* Research prefs */}
      <div className={`${CARD_CLS} mt-6 px-6 py-6`}>
        <p className={SECTION_LABEL_CLS}>
          {t(locale, SETTINGS, "searchBehaviourLabel")}
        </p>
        <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
          {t(locale, SETTINGS, "searchBehaviourDesc")}
        </p>
        {/* PrefsForm renders all four prefs fields + save button */}
        <PrefsForm
          action={handleSavePrefs}
          jurisdictions={jurisdictions}
          defaultJurisdiction={prefs?.defaultJurisdiction ?? null}
          citationFormat={prefs?.citationFormat ?? "din"}
          semanticSearch={prefs?.semanticSearch !== false}
          resultsPerPage={prefs?.resultsPerPage ?? 20}
        />
      </div>

      <hr className={DIVIDER_CLS} />

      {/* Interface language (UI chrome locale) — distinct from source language */}
      <div className={`${CARD_CLS} px-6 py-6`}>
        <p className={SECTION_LABEL_CLS}>
          {t(locale, SETTINGS, "interfaceSectionLabel")}
        </p>
        <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
          {t(locale, SETTINGS, "interfaceSectionDesc")}
        </p>
        {/*
          InterfaceLangForm carries the other prefs (incl. sourceLanguage) as
          hidden fields so the single handleSavePrefs action receives every
          value in one submit and only changes uiLanguage.
        */}
        <InterfaceLangForm
          action={handleSavePrefs}
          options={uiLanguageOptions}
          defaultJurisdiction={prefs?.defaultJurisdiction ?? null}
          citationFormat={prefs?.citationFormat ?? "din"}
          semanticSearch={prefs?.semanticSearch !== false}
          resultsPerPage={prefs?.resultsPerPage ?? 20}
          sourceLanguage={prefs?.sourceLanguage ?? "original"}
          uiLanguage={prefs?.uiLanguage ?? "en"}
        />
      </div>

      <hr className={DIVIDER_CLS} />

      {/* Source language (legal-TEXT display language) */}
      <div className={`${CARD_CLS} px-6 py-6`}>
        <p className={SECTION_LABEL_CLS}>
          {t(locale, SETTINGS, "sourceLanguageLabel")}
        </p>
        <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
          {t(locale, SETTINGS, "sourceLanguageDesc")}
        </p>
        {/*
          SourceLangForm carries the other prefs as hidden fields so the
          single handleSavePrefs action receives all values in one submit.
        */}
        <SourceLangForm
          action={handleSavePrefs}
          defaultJurisdiction={prefs?.defaultJurisdiction ?? null}
          citationFormat={prefs?.citationFormat ?? "din"}
          semanticSearch={prefs?.semanticSearch !== false}
          resultsPerPage={prefs?.resultsPerPage ?? 20}
          sourceLanguage={prefs?.sourceLanguage ?? "original"}
        />
      </div>
    </section>
  );

  // ── Tab 3: Sicherheit ─────────────────────────────────────────────────────
  const sicherheitPanel = (
    <section aria-labelledby="panel-heading-sicherheit">
      <h2 id="panel-heading-sicherheit" className={PANEL_HEADING_CLS}>
        {t(locale, SETTINGS, "securityHeading")}
      </h2>
      <p className={PANEL_DESC_CLS}>{t(locale, SETTINGS, "securityDesc")}</p>

      <div className={`${CARD_CLS} mt-6`}>
        {/* Password / SSO note */}
        {credentialsAccount ? (
          <div className="px-5 py-5 border-b border-gray-100">
            <p className={`${SECTION_LABEL_CLS} mb-3`}>
              {t(locale, SETTINGS, "changePasswordLabel")}
            </p>
            <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
              {t(locale, SETTINGS, "changePasswordDesc")}
            </p>
            <PasswordForm action={handlePasswordChange} />
          </div>
        ) : (
          <div className="px-5 py-4 border-b border-gray-100 flex gap-3">
            <Shield
              size={16}
              className="mt-0.5 flex-shrink-0 text-gray-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-[13px] font-medium text-gray-800 mb-1">
                {t(locale, SETTINGS, "ssoNoteTitle")}
              </p>
              <p className="text-[13px] text-gray-600 leading-relaxed">
                {t(locale, SETTINGS, "ssoNoteBody")}
              </p>
            </div>
          </div>
        )}

        {/* Active sessions note */}
        <div className="px-5 py-5 border-b border-gray-100">
          <p className={`${SECTION_LABEL_CLS} mb-2`}>
            {t(locale, SETTINGS, "activeSessionsLabel")}
          </p>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            {t(locale, SETTINGS, "activeSessionsBody1")}{" "}
            <strong className="font-medium text-gray-700">
              {t(locale, SETTINGS, "activeSessionsSignOut")}
            </strong>{" "}
            {t(locale, SETTINGS, "activeSessionsBody2")}
          </p>
        </div>

        {/* Login history */}
        <div className="px-5 py-5">
          <p className={`${SECTION_LABEL_CLS} mb-3`}>
            {t(locale, SETTINGS, "loginHistoryLabel")}
          </p>
          <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
            {t(locale, SETTINGS, "loginHistoryDesc")}
          </p>
          {loginHistory.length === 0 ? (
            <p className="text-[13px] text-gray-400">
              {t(locale, SETTINGS, "loginHistoryEmpty")}
            </p>
          ) : (
            <div
              role="table"
              aria-label={t(locale, SETTINGS, "loginHistoryTableLabel")}
              className="w-full text-[12px]"
            >
              <div
                role="row"
                className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-x-4 pb-2 border-b border-gray-100 text-[11px] font-semibold text-gray-500 tracking-[-0.01em]"
              >
                <span role="columnheader">
                  {t(locale, SETTINGS, "colTimestamp")}
                </span>
                <span role="columnheader">
                  {t(locale, SETTINGS, "colDevice")}
                </span>
                <span role="columnheader">{t(locale, SETTINGS, "colIp")}</span>
                <span role="columnheader">
                  {t(locale, SETTINGS, "colStatus")}
                </span>
              </div>

              {loginHistory.map((entry) => {
                const isSuccess =
                  entry.eventType === "LOGIN_SUCCESS" ||
                  entry.eventType === "MFA_SUCCESS" ||
                  entry.eventType === "PASSKEY_SUCCESS";
                const label = formatEventType(entry.eventType, locale);
                const device = [entry.browser, entry.os]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div
                    key={entry.id}
                    role="row"
                    className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-0.5 py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <span role="cell" className="text-gray-700 tabular-nums">
                      {formatLoginDate(entry.createdAt, locale)}
                    </span>
                    <span
                      role="cell"
                      className="text-gray-500 truncate max-w-[160px]"
                      title={device || "—"}
                    >
                      {device || <span className="text-gray-300">—</span>}
                    </span>
                    <span
                      role="cell"
                      className="text-gray-400 font-mono tabular-nums"
                    >
                      {entry.ipMasked ?? "—"}
                    </span>
                    <span role="cell">
                      <span
                        className={
                          entry.isSuspicious
                            ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            : isSuccess
                              ? "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 ring-1 ring-green-200"
                              : "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-50 text-red-700 ring-1 ring-red-200"
                        }
                        aria-label={`${t(locale, SETTINGS, "statusAriaPrefix")} ${label}`}
                      >
                        {entry.isSuspicious
                          ? t(locale, SETTINGS, "eventSuspiciousLogin")
                          : label}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );

  // ── Tab 4: Datenschutz ────────────────────────────────────────────────────
  const datenschutzPanel = (
    <section aria-labelledby="panel-heading-datenschutz">
      <h2 id="panel-heading-datenschutz" className={PANEL_HEADING_CLS}>
        {t(locale, SETTINGS, "privacyHeading")}
      </h2>
      <p className={PANEL_DESC_CLS}>{t(locale, SETTINGS, "privacyDesc")}</p>

      <div className={`${CARD_CLS} mt-6`}>
        {/* Search history list */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <History size={13} className="text-gray-400" aria-hidden="true" />
            <p className={SECTION_LABEL_CLS}>
              {t(locale, SETTINGS, "searchHistoryLabel")}
            </p>
          </div>
          <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
            {t(locale, SETTINGS, "searchHistoryDesc")}
          </p>

          {searchHistory.length === 0 ? (
            <p className="text-[13px] text-gray-400 mb-4">
              {t(locale, SETTINGS, "searchHistoryEmpty")}
            </p>
          ) : (
            <ul
              aria-label={t(locale, SETTINGS, "savedSearchesAriaLabel")}
              className="space-y-1 mb-4 max-h-48 overflow-y-auto"
            >
              {searchHistory.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-baseline justify-between gap-3 py-1 border-b border-gray-50 last:border-0"
                >
                  <span className="text-[13px] text-gray-800 truncate flex-1">
                    {entry.query}
                    {entry.jurisdiction && (
                      <span className="ml-1.5 text-[11px] text-gray-400">
                        [{entry.jurisdiction}]
                      </span>
                    )}
                  </span>
                  <span className="flex-shrink-0 text-[11px] text-gray-400 tabular-nums">
                    {formatSearchDate(entry.createdAt, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <ClearHistoryForm
            action={handleClearHistory}
            hasHistory={searchHistory.length > 0}
          />
        </div>

        {/* History toggle */}
        <div className="px-5 py-5 border-b border-gray-100">
          <p className={`${SECTION_LABEL_CLS} mb-3`}>
            {t(locale, SETTINGS, "recordingLabel")}
          </p>
          <HistoryToggleForm
            action={handleToggleHistory}
            enabled={prefs?.searchHistoryEnabled !== false}
          />
        </div>

        {/* GDPR data export */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Download size={13} className="text-gray-400" aria-hidden="true" />
            <p className={SECTION_LABEL_CLS}>
              {t(locale, SETTINGS, "exportLabel")}
            </p>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
            {t(locale, SETTINGS, "exportDesc")}
          </p>
          <a
            href="/api/scholar/account/export"
            download="caelex-scholar-data.json"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-900 border border-gray-300 hover:border-gray-500 rounded-lg px-4 py-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
          >
            <Download size={12} aria-hidden="true" />
            {t(locale, SETTINGS, "exportButton")}
          </a>
        </div>

        {/* Account deletion */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2 mb-2">
            <Mail size={13} className="text-gray-400" aria-hidden="true" />
            <p className={SECTION_LABEL_CLS}>
              {t(locale, SETTINGS, "deletionLabel")}
            </p>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
            {t(locale, SETTINGS, "deletionDesc")}
          </p>
          <a
            href={deletionMailto}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-lg px-4 py-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
          >
            <Mail size={12} aria-hidden="true" />
            {t(locale, SETTINGS, "deletionButton")}
          </a>
        </div>
      </div>
    </section>
  );

  // ── Tab 5: Über Scholar ───────────────────────────────────────────────────
  const uberPanel = (
    <section aria-labelledby="panel-heading-uber">
      <h2 id="panel-heading-uber" className={PANEL_HEADING_CLS}>
        {t(locale, SETTINGS, "aboutHeading")}
      </h2>
      <p className={PANEL_DESC_CLS}>{t(locale, SETTINGS, "aboutDesc")}</p>

      <div className={`${CARD_CLS} mt-6`}>
        {/* Powered by */}
        <div className="px-5 py-5 border-b border-gray-100">
          <p className={`${SECTION_LABEL_CLS} mb-3`}>
            {t(locale, SETTINGS, "platformLabel")}
          </p>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            {t(locale, SETTINGS, "platformBody1Prefix")}{" "}
            <span className="font-medium text-gray-900">Atlas</span>{" "}
            {t(locale, SETTINGS, "platformBody1Suffix")}
          </p>
          <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">
            {t(locale, SETTINGS, "platformBody2")}
          </p>
        </div>

        {/* Version */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className={`${SECTION_LABEL_CLS} mb-2`}>
            {t(locale, SETTINGS, "versionLabel")}
          </p>
          <p className="text-[13px] text-gray-600">
            {t(locale, SETTINGS, "versionValue")}
          </p>
        </div>

        {/* Legal links */}
        <div className="px-5 py-5">
          <p className={`${SECTION_LABEL_CLS} mb-3`}>
            {t(locale, SETTINGS, "legalLabel")}
          </p>
          <nav
            aria-label={t(locale, SETTINGS, "legalNavLabel")}
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            <Link
              href="/legal/privacy"
              className="inline-block py-1 text-[13px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
            >
              {t(locale, SETTINGS, "legalPrivacy")}
            </Link>
            <Link
              href="/legal/terms"
              className="inline-block py-1 text-[13px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
            >
              {t(locale, SETTINGS, "legalTerms")}
            </Link>
            <Link
              href="/legal/impressum"
              className="inline-block py-1 text-[13px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
            >
              {t(locale, SETTINGS, "legalImpressum")}
            </Link>
          </nav>
        </div>
      </div>
    </section>
  );

  // ── Assemble tab definitions (serialisable data + ReactNode content) ───────
  // CRITICAL: `content` is ReactNode (server-rendered nodes — valid RSC prop).
  //           `Icon` is the LucideIcon constructor — also valid as it is a
  //           module reference resolved at build time on the server, passed as
  //           a reference to the client component (Next.js serialises it).
  //
  //           handleUpdateName / handleSavePrefs / etc. are "use server"
  //           actions — they are serialisable action references, NOT plain
  //           functions. They appear here only inside the ReactNode panels
  //           (passed to NameForm, PrefsForm, etc.), not as direct props on
  //           SettingsTabs. SettingsTabs itself receives ONLY:
  //             - tabs[i].id     — string
  //             - tabs[i].label  — string
  //             - tabs[i].Icon   — LucideIcon (component reference)
  //             - tabs[i].content — ReactNode

  const tabs: TabDefinition[] = [
    {
      id: "konto",
      label: t(locale, SETTINGS, "tabAccount"),
      icon: <User size={14} />,
      content: kontoPanel,
    },
    {
      id: "recherche",
      label: t(locale, SETTINGS, "tabResearch"),
      icon: <BookOpen size={14} />,
      content: recherchePanel,
    },
    {
      id: "sicherheit",
      label: t(locale, SETTINGS, "tabSecurity"),
      icon: <Shield size={14} />,
      content: sicherheitPanel,
    },
    {
      id: "datenschutz",
      label: t(locale, SETTINGS, "tabPrivacy"),
      icon: <Lock size={14} />,
      content: datenschutzPanel,
    },
    {
      id: "uber",
      label: t(locale, SETTINGS, "tabAbout"),
      icon: <Info size={14} />,
      content: uberPanel,
    },
  ];

  return (
    <ScholarPage>
      <PageHeader
        eyebrow={t(locale, SETTINGS, "pageEyebrow")}
        title={t(locale, SETTINGS, "pageTitle")}
        subtitle={t(locale, SETTINGS, "pageSubtitle")}
        icon={Settings}
      />

      {/* Two-pane tabbed layout — max-w-5xl for a comfortable two-column feel */}
      <div className="mt-8 max-w-5xl">
        <SettingsTabs tabs={tabs} />
      </div>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-gray-100 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-600 tracking-[-0.01em]">
              Scholar
            </span>
            <span className="text-[9px] text-gray-600">
              {t(locale, SETTINGS, "footerBy")}
            </span>
          </div>
          <span className="text-[9px] text-gray-600">
            {t(locale, SETTINGS, "footerCopyright").replace(
              "{year}",
              String(new Date().getFullYear()),
            )}
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}
