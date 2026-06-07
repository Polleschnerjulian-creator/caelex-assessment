/**
 * Caelex Scholar — Einstellungen (Settings) page.
 *
 * Server Component: reads session, org data, and user preferences server-side.
 * Organised into clear sections. Form islands delegate to SettingsForms.tsx
 * (client components) which use useActionState for inline success/error feedback.
 *
 * Sections:
 *   1. Konto            — Name (editable), E-Mail (read-only), Hochschule, Rolle
 *   2. Recherche        — Standard-Jurisdiktion, Zitationsformat, Semantische Suche,
 *                         Treffer pro Seite
 *   3. Quellsprache     — sourceLanguage preference
 *   4. Sicherheit       — password change, active sessions note, login history
 *   5. Datenschutz      — search history (log/view/clear/toggle), GDPR export,
 *                         account deletion request
 *   6. Über Scholar     — existing info + legal links
 *
 * WCAG 2.2 AA:
 *   - <main> landmark + lang="de" provided by ScholarPage (WCAG 3.1.1 / 4.1.2)
 *   - <h1> via PageHeader; every section uses <h2> (WCAG 1.3.1 / 2.4.6)
 *   - Every <input>/<select> has an associated <label> (WCAG 1.3.1 / 3.3.2)
 *   - focus-visible rings on all interactive elements (WCAG 2.4.7)
 *   - Contrast: gray-900 on white ≥15:1 ✓; gray-700 on white ≥7.4:1 ✓;
 *               gray-600 on white ≥5.7:1 ✓; submit-button bg-gray-900 on white ✓
 *   - Target size ≥24px on all inputs/buttons via py-2/py-2.5 (WCAG 2.5.8)
 *   - External links with visible underline + focus ring (WCAG 2.4.7)
 *   - Status messages: role="status" aria-live="polite" (SettingsForms.tsx)
 *   - Error messages: role="alert" (SettingsForms.tsx)
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
  Globe2,
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
  PasswordForm,
  HistoryToggleForm,
  ClearHistoryForm,
} from "../_components/SettingsForms";

// ─── Shared styles ────────────────────────────────────────────────────────────

const SECTION_LABEL_CLS =
  "flex items-center gap-2 text-[11px] font-semibold text-gray-500 tracking-[0.18em] uppercase mb-3";

const CARD_CLS =
  "bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden";

const FIELD_LABEL_CLS =
  "block text-[11px] font-semibold text-gray-700 tracking-wide uppercase mb-1";

// ─── Jurisdiction helpers ─────────────────────────────────────────────────────

const SPECIAL_NAMES: Record<string, string> = {
  INT: "International",
  EU: "European Union",
};

function jurisdictionLabel(code: string): string {
  return SPECIAL_NAMES[code] ?? getCountryName(code);
}

// ─── Security / login-history helpers ────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Erfolgreich",
  LOGIN_FAILED: "Fehlgeschlagen",
  LOGIN_BLOCKED: "Gesperrt",
  MFA_REQUIRED: "2FA erforderlich",
  MFA_SUCCESS: "2FA erfolgreich",
  MFA_FAILED: "2FA fehlgeschlagen",
  PASSKEY_SUCCESS: "Passkey",
  PASSKEY_FAILED: "Passkey fehlgeschlagen",
  BACKUP_CODE_USED: "Backup-Code",
  ACCOUNT_LOCKED: "Konto gesperrt",
  ACCOUNT_UNLOCKED: "Konto entsperrt",
  SUSPICIOUS_LOGIN: "Verdächtig",
};

function formatEventType(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}

function formatLoginDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSearchDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
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
  if (!userId) return { ok: false, message: "Nicht angemeldet." };

  const raw = formData.get("name");
  if (typeof raw !== "string")
    return { ok: false, message: "Ungültige Eingabe." };
  const name = raw.trim().slice(0, 100);
  if (!name) return { ok: false, message: "Name darf nicht leer sein." };

  try {
    await prisma.user.update({ where: { id: userId }, data: { name } });
    revalidatePath("/scholar/settings");
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Speichern fehlgeschlagen. Bitte erneut versuchen.",
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
  if (!userId) return { ok: false, message: "Nicht angemeldet." };

  const defaultJurisdiction =
    (formData.get("defaultJurisdiction") as string | null) || null;
  const citationFormat = formData.get("citationFormat") as string;
  const semanticSearch = formData.get("semanticSearch") === "on";
  const resultsPerPage = parseInt(formData.get("resultsPerPage") as string, 10);
  const sourceLanguage = formData.get("sourceLanguage") as string;

  const patch: Parameters<typeof updateScholarPreferences>[1] = {};
  if (defaultJurisdiction !== undefined)
    patch.defaultJurisdiction = defaultJurisdiction;
  if (citationFormat) patch.citationFormat = citationFormat;
  patch.semanticSearch = semanticSearch;
  if (!isNaN(resultsPerPage)) patch.resultsPerPage = resultsPerPage;
  if (sourceLanguage) patch.sourceLanguage = sourceLanguage;

  try {
    await updateScholarPreferences(userId, patch);
    revalidatePath("/scholar/settings");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
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
  if (!userId) return { ok: false, message: "Nicht angemeldet." };

  const current = (formData.get("currentPassword") as string) ?? "";
  const next = (formData.get("newPassword") as string) ?? "";
  const confirm = (formData.get("confirmPassword") as string) ?? "";

  if (next !== confirm) {
    return { ok: false, message: "Die Passwörter stimmen nicht überein." };
  }

  const result = await changePassword(userId, current, next);
  if (result.success) {
    revalidatePath("/scholar/settings");
    return { ok: true, message: "✓ Passwort geändert" };
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
  if (!userId) return { ok: false, message: "Nicht angemeldet." };

  const val = formData.get("searchHistoryEnabled");
  const searchHistoryEnabled = val === "on";

  try {
    await updateScholarPreferences(userId, { searchHistoryEnabled });
    revalidatePath("/scholar/settings");
    return {
      ok: true,
      message: searchHistoryEnabled
        ? "✓ Suchverlauf aktiviert"
        : "✓ Suchverlauf deaktiviert",
    };
  } catch {
    return { ok: false, message: "Speichern fehlgeschlagen." };
  }
}

async function handleClearHistory(
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, message: "Nicht angemeldet." };

  try {
    await clearSearchHistory(userId);
    revalidatePath("/scholar/settings");
    return { ok: true, message: "✓ Suchverlauf gelöscht" };
  } catch {
    return {
      ok: false,
      message: "Löschen fehlgeschlagen. Bitte erneut versuchen.",
    };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

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
    return jurisdictionLabel(a).localeCompare(jurisdictionLabel(b), "de");
  });

  // Pre-fill deletion mailto body
  const deletionMailto = `mailto:cs@caelex.eu?subject=${encodeURIComponent(
    "Löschantrag – Caelex Scholar",
  )}&body=${encodeURIComponent(
    `Sehr geehrtes Caelex-Team,\n\nhiermit beantrage ich die Löschung meines Caelex Scholar-Kontos.\n\nE-Mail-Adresse: ${user?.email ?? "(bitte eintragen)"}\n\nMit freundlichen Grüßen`,
  )}`;

  return (
    <ScholarPage>
      <PageHeader
        eyebrow="Caelex Scholar"
        title="Einstellungen"
        subtitle="Konto, Recherche-Präferenzen und Datenschutz verwalten."
        icon={Settings}
      />

      <div className="space-y-8 max-w-2xl">
        {/* ── 1. Konto ─────────────────────────────────────────────────── */}
        <section aria-labelledby="section-konto">
          <h2 id="section-konto" className={SECTION_LABEL_CLS}>
            <User size={13} className="text-gray-400" aria-hidden="true" />
            Konto
          </h2>

          <div className={CARD_CLS}>
            <NameForm
              action={handleUpdateName}
              defaultValue={user?.name ?? ""}
            />

            <dl className="divide-y divide-gray-100">
              <div className="flex items-baseline gap-4 px-5 py-4">
                <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                  E-Mail
                </dt>
                <dd className="text-[13px] text-gray-900">
                  {user?.email ?? <span className="text-gray-400">—</span>}
                </dd>
              </div>

              {superAdmin ? (
                <div className="flex items-baseline gap-4 px-5 py-4">
                  <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                    Rolle
                  </dt>
                  <dd className="text-[13px] text-gray-900 font-medium">
                    Plattform-Administrator · Vollzugriff
                  </dd>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-4 px-5 py-4">
                    <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                      Hochschule
                    </dt>
                    <dd className="text-[13px] text-gray-900 font-medium">
                      {orgName ?? (
                        <span className="text-gray-400 font-normal">—</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-4 px-5 py-4">
                    <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                      Rolle
                    </dt>
                    <dd className="text-[13px] text-gray-600">
                      Lizenziert über deine Hochschule
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </section>

        {/* ── 2. Recherche-Präferenzen ──────────────────────────────────── */}
        <section aria-labelledby="section-recherche">
          <h2 id="section-recherche" className={SECTION_LABEL_CLS}>
            <BookOpen size={13} className="text-gray-400" aria-hidden="true" />
            Recherche-Präferenzen
          </h2>

          <div className={`${CARD_CLS} px-5 py-5`}>
            <PrefsForm
              action={handleSavePrefs}
              jurisdictionCodes={jurisdictionCodes}
              jurisdictionLabel={jurisdictionLabel}
              defaultJurisdiction={prefs?.defaultJurisdiction ?? null}
              citationFormat={prefs?.citationFormat ?? "din"}
              semanticSearch={prefs?.semanticSearch !== false}
              resultsPerPage={prefs?.resultsPerPage ?? 20}
            />
          </div>
        </section>

        {/* ── 3. Quellsprache ───────────────────────────────────────────── */}
        <section aria-labelledby="section-sprache">
          <h2 id="section-sprache" className={SECTION_LABEL_CLS}>
            <Globe2 size={13} className="text-gray-400" aria-hidden="true" />
            Quellsprache
          </h2>

          <div className={`${CARD_CLS} px-5 py-5`}>
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

        {/* ── 4. Sicherheit ────────────────────────────────────────────── */}
        <section aria-labelledby="section-sicherheit">
          <h2 id="section-sicherheit" className={SECTION_LABEL_CLS}>
            <Shield size={13} className="text-gray-400" aria-hidden="true" />
            Sicherheit
          </h2>

          <div className={CARD_CLS}>
            {credentialsAccount ? (
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-[12px] font-semibold text-gray-700 tracking-wide uppercase mb-3">
                  Passwort ändern
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
                <p className="text-[13px] text-gray-600 leading-relaxed">
                  Deine Anmeldung wird über deine Hochschule (Single Sign-On)
                  verwaltet. Passwort und Zwei-Faktor-Authentifizierung änderst
                  du direkt bei deiner Hochschule.
                </p>
              </div>
            )}

            {/* Active sessions note */}
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[12px] font-semibold text-gray-700 tracking-wide uppercase mb-2">
                Aktive Sitzungen
              </p>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Scholar verwendet Sitzungs-Tokens (JWT). Server-seitige
                Einzelabmeldung ist technisch nicht möglich — zum Beenden aller
                Sitzungen nutze bitte{" "}
                <strong className="font-medium text-gray-700">Abmelden</strong>{" "}
                im Navigationsmenü.
              </p>
            </div>

            {/* Login history */}
            <div className="px-5 py-4">
              <p className="text-[12px] font-semibold text-gray-700 tracking-wide uppercase mb-3">
                Login-Verlauf
              </p>
              {loginHistory.length === 0 ? (
                <p className="text-[13px] text-gray-400">
                  Noch kein Login-Verlauf vorhanden.
                </p>
              ) : (
                <div
                  role="table"
                  aria-label="Login-Verlauf"
                  className="w-full text-[12px]"
                >
                  <div
                    role="row"
                    className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-x-4 pb-2 border-b border-gray-100 text-[11px] font-semibold text-gray-500 tracking-wide uppercase"
                  >
                    <span role="columnheader">Zeitpunkt</span>
                    <span role="columnheader">Gerät / Browser</span>
                    <span role="columnheader">IP (maskiert)</span>
                    <span role="columnheader">Status</span>
                  </div>

                  {loginHistory.map((entry) => {
                    const isSuccess =
                      entry.eventType === "LOGIN_SUCCESS" ||
                      entry.eventType === "MFA_SUCCESS" ||
                      entry.eventType === "PASSKEY_SUCCESS";
                    const label = formatEventType(entry.eventType);
                    const device = [entry.browser, entry.os]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <div
                        key={entry.id}
                        role="row"
                        className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-0.5 py-2.5 border-b border-gray-50 last:border-0"
                      >
                        <span
                          role="cell"
                          className="text-gray-700 tabular-nums"
                        >
                          {formatLoginDate(entry.createdAt)}
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
                            aria-label={`Status: ${label}`}
                          >
                            {entry.isSuspicious ? "Verdächtig" : label}
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

        {/* ── 5. Datenschutz ────────────────────────────────────────────── */}
        <section aria-labelledby="section-datenschutz">
          <h2 id="section-datenschutz" className={SECTION_LABEL_CLS}>
            <Lock size={13} className="text-gray-400" aria-hidden="true" />
            Datenschutz
          </h2>

          <div className={CARD_CLS}>
            {/* 5a. Search history list */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <History
                  size={13}
                  className="text-gray-400"
                  aria-hidden="true"
                />
                <p className="text-[12px] font-semibold text-gray-700 tracking-wide uppercase">
                  Suchverlauf
                </p>
              </div>

              {searchHistory.length === 0 ? (
                <p className="text-[13px] text-gray-400 mb-4">
                  Kein Suchverlauf gespeichert.
                </p>
              ) : (
                <ul
                  aria-label="Gespeicherte Suchen"
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
                        {formatSearchDate(entry.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Clear history */}
              <ClearHistoryForm
                action={handleClearHistory}
                hasHistory={searchHistory.length > 0}
              />
            </div>

            {/* 5b. History toggle */}
            <div className="px-5 py-4 border-b border-gray-100">
              <HistoryToggleForm
                action={handleToggleHistory}
                enabled={prefs?.searchHistoryEnabled !== false}
              />
            </div>

            {/* 5c. GDPR data export */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Download
                  size={13}
                  className="text-gray-400"
                  aria-hidden="true"
                />
                <p className="text-[12px] font-semibold text-gray-700 tracking-wide uppercase">
                  Meine Daten exportieren
                </p>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
                Lade eine JSON-Datei mit deinem Konto, deinen Einstellungen und
                deinem Suchverlauf herunter (Art. 20 DSGVO).
              </p>
              <a
                href="/api/scholar/account/export"
                download="caelex-scholar-data.json"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-900 border border-gray-300 hover:border-gray-500 rounded-lg px-4 py-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
              >
                <Download size={12} aria-hidden="true" />
                Daten herunterladen
              </a>
            </div>

            {/* 5d. Account deletion request */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail size={13} className="text-gray-400" aria-hidden="true" />
                <p className="text-[12px] font-semibold text-gray-700 tracking-wide uppercase">
                  Konto-Löschung anfragen
                </p>
              </div>
              <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
                Da dein Zugang über deine Hochschule bereitgestellt wird,
                erfolgt die Kontolöschung über den Support deiner Institution.
                Schreibe uns eine E-Mail — wir koordinieren die Löschung mit
                deiner Hochschule (Art. 17 DSGVO).
              </p>
              <a
                href={deletionMailto}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-lg px-4 py-2 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
              >
                <Mail size={12} aria-hidden="true" />
                Löschung anfragen (cs@caelex.eu)
              </a>
            </div>
          </div>
        </section>

        {/* ── 6. Über Caelex Scholar ────────────────────────────────────── */}
        <section aria-labelledby="section-about">
          <h2 id="section-about" className={SECTION_LABEL_CLS}>
            <Info size={13} className="text-gray-400" aria-hidden="true" />
            Über Caelex Scholar
          </h2>

          <div className={`${CARD_CLS} px-5 py-4 space-y-3`}>
            <p className="text-[13px] text-gray-700 leading-relaxed">
              Caelex Scholar ist powered by{" "}
              <span className="font-medium text-gray-900">Atlas</span> — der
              Rechtsrecherche-Engine von Caelex.
            </p>

            <nav
              aria-label="Rechtliche Informationen"
              className="flex flex-wrap gap-x-4 gap-y-1 pt-1"
            >
              <Link
                href="/legal/privacy"
                className="inline-block py-1 text-[12px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
              >
                Datenschutz
              </Link>
              <Link
                href="/legal/terms"
                className="inline-block py-1 text-[12px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
              >
                AGB
              </Link>
              <Link
                href="/legal/impressum"
                className="inline-block py-1 text-[12px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
              >
                Impressum
              </Link>
            </nav>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-gray-100 pb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-600 tracking-wider">
              SCHOLAR
            </span>
            <span className="text-[9px] text-gray-600">by Caelex</span>
          </div>
          <span className="text-[9px] text-gray-600">
            © {new Date().getFullYear()} Caelex
          </span>
        </div>
      </footer>
    </ScholarPage>
  );
}
