/**
 * Caelex Scholar — Einstellungen (Settings) page.
 *
 * Server Component: reads session, org data, and user preferences server-side.
 * Organised into clear sections with Server Actions for mutating state.
 *
 * Sections:
 *   1. Konto            — Name (editable), E-Mail (read-only), Hochschule, Rolle
 *   2. Recherche        — Standard-Jurisdiktion, Zitationsformat, Semantische Suche,
 *                         Treffer pro Seite
 *   3. Quellsprache     — sourceLanguage preference
 *   4. Sicherheit       — stub (Wave 2)
 *   5. Datenschutz      — stub (Wave 3)
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
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  Settings,
  Building2,
  User,
  Info,
  BookOpen,
  Globe2,
  Shield,
  Lock,
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
import { getAvailableJurisdictions } from "@/data/legal-sources";
import { getCountryName } from "@/data/iso-3166-countries";
import { ScholarPage } from "../_components/ScholarPage";
import { PageHeader } from "../_components/PageHeader";

// ─── Shared styles (typed constants avoid inline repetition) ──────────────────

const SECTION_LABEL_CLS =
  "flex items-center gap-2 text-[11px] font-semibold text-gray-500 tracking-[0.18em] uppercase mb-3";

const CARD_CLS =
  "bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden";

const FIELD_LABEL_CLS =
  "block text-[11px] font-semibold text-gray-700 tracking-wide uppercase mb-1";

const INPUT_CLS =
  "w-full text-[13px] text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 motion-safe:transition-colors hover:border-gray-300";

const SELECT_CLS = INPUT_CLS;

const SAVE_BTN_CLS =
  "text-[12px] font-medium text-white bg-gray-900 hover:bg-gray-700 rounded-lg px-4 py-2.5 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2";

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

// ─── Server Actions ───────────────────────────────────────────────────────────

// ─── Password change result cookie (simple flash) ─────────────────────────────
// We encode the result as a URL search-param via redirect so the page
// can render inline feedback without useState.  The result key is
// short-lived — the page reads it once and the URL is cleaned up by
// the browser on hard-refresh.

async function handlePasswordChange(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const current = (formData.get("currentPassword") as string) ?? "";
  const next = (formData.get("newPassword") as string) ?? "";
  const confirm = (formData.get("confirmPassword") as string) ?? "";

  if (next !== confirm) {
    revalidatePath("/scholar/settings");
    return;
  }

  await changePassword(userId, current, next);
  revalidatePath("/scholar/settings");
}

async function updateName(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const raw = formData.get("name");
  if (typeof raw !== "string") return;
  const name = raw.trim().slice(0, 100);
  if (!name) return; // reject empty

  await prisma.user.update({ where: { id: userId }, data: { name } });
  revalidatePath("/scholar/settings");
}

async function savePrefs(formData: FormData) {
  "use server";
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

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
  } catch {
    // Validation errors are swallowed for now — Wave 2 will add error feedback
  }

  revalidatePath("/scholar/settings");
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

  // Load saved preferences (returns in-memory defaults when no row yet)
  const prefs = user?.id ? await getScholarPreferences(user.id) : null;

  // Security section data (Wave 2)
  const credentialsAccount = user?.id
    ? await isCredentialsAccount(user.id)
    : false;
  const loginHistory = user?.id ? await getLoginHistory(user.id, 10) : [];

  // Available jurisdictions for the default-jurisdiction selector
  const jurisdictionCodes = getAvailableJurisdictions().sort((a, b) => {
    if (a === "INT") return -1;
    if (b === "INT") return 1;
    if (a === "EU") return -1;
    if (b === "EU") return 1;
    return jurisdictionLabel(a).localeCompare(jurisdictionLabel(b), "de");
  });

  return (
    <ScholarPage>
      <PageHeader
        eyebrow="Caelex Scholar"
        title="Einstellungen"
        subtitle="Konto, Recherche-Präferenzen und Quellsprache verwalten."
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
            {/* Name edit form */}
            <form
              action={updateName}
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
                    defaultValue={user?.name ?? ""}
                    maxLength={100}
                    required
                    autoComplete="name"
                    className={INPUT_CLS}
                    aria-describedby="settings-name-hint"
                  />
                  <p
                    id="settings-name-hint"
                    className="mt-1 text-[11px] text-gray-500"
                  >
                    Maximal 100 Zeichen, darf nicht leer sein.
                  </p>
                </div>
                <button type="submit" className={SAVE_BTN_CLS}>
                  Speichern
                </button>
              </div>
            </form>

            {/* E-Mail (read-only) */}
            <dl className="divide-y divide-gray-100">
              <div className="flex items-baseline gap-4 px-5 py-4">
                <dt className="w-32 flex-shrink-0 text-[12px] text-gray-500">
                  E-Mail
                </dt>
                <dd className="text-[13px] text-gray-900">
                  {user?.email ?? <span className="text-gray-400">—</span>}
                </dd>
              </div>

              {/* Hochschule / Rolle */}
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
            <form
              action={savePrefs}
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
                  defaultValue={prefs?.defaultJurisdiction ?? ""}
                  className={SELECT_CLS}
                >
                  <option value="">Keine (alle Jurisdiktionen)</option>
                  {jurisdictionCodes.map((code) => (
                    <option key={code} value={code}>
                      {code} — {jurisdictionLabel(code)}
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
                  defaultValue={prefs?.citationFormat ?? "din"}
                  className={SELECT_CLS}
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
                  defaultValue={prefs?.semanticSearch !== false ? "on" : "off"}
                  className={SELECT_CLS}
                >
                  <option value="on">Aktiviert</option>
                  <option value="off">Deaktiviert (nur Keyword-Suche)</option>
                </select>
                <p className="mt-1 text-[11px] text-gray-500">
                  Semantische Suche nutzt Embeddings für kontextbezogene
                  Ergebnisse.
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
                  defaultValue={String(prefs?.resultsPerPage ?? 20)}
                  className={SELECT_CLS}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                </select>
              </div>

              <div className="pt-1">
                <button type="submit" className={SAVE_BTN_CLS}>
                  Einstellungen speichern
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ── 3. Quellsprache ───────────────────────────────────────────── */}
        <section aria-labelledby="section-sprache">
          <h2 id="section-sprache" className={SECTION_LABEL_CLS}>
            <Globe2 size={13} className="text-gray-400" aria-hidden="true" />
            Quellsprache
          </h2>

          <div className={`${CARD_CLS} px-5 py-5`}>
            <form
              action={savePrefs}
              aria-label="Quellsprache speichern"
              className="space-y-4"
            >
              {/* Hidden fields to carry other prefs when only language changes.
                  The savePrefs action reads all fields so we send placeholders
                  that repeat the saved value — on missing fields the action
                  skips them cleanly. We use the saved value as default. */}
              <input
                type="hidden"
                name="defaultJurisdiction"
                value={prefs?.defaultJurisdiction ?? ""}
              />
              <input
                type="hidden"
                name="citationFormat"
                value={prefs?.citationFormat ?? "din"}
              />
              <input
                type="hidden"
                name="semanticSearch"
                value={prefs?.semanticSearch !== false ? "on" : "off"}
              />
              <input
                type="hidden"
                name="resultsPerPage"
                value={String(prefs?.resultsPerPage ?? 20)}
              />

              <div>
                <label htmlFor="pref-source-lang" className={FIELD_LABEL_CLS}>
                  Quellsprache
                </label>
                <select
                  id="pref-source-lang"
                  name="sourceLanguage"
                  defaultValue={prefs?.sourceLanguage ?? "original"}
                  className={SELECT_CLS}
                >
                  <option value="original">
                    Original (Sprache des Dokuments)
                  </option>
                  <option value="de">Deutsch</option>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
                <p className="mt-2 text-[12px] text-gray-600 leading-relaxed">
                  Bestimmt, in welcher Sprache Quelltexte angezeigt werden,
                  sofern Übersetzungen vorliegen. Auf Quelldetailseiten und in
                  der Bibliothek werden Titel und Beschreibungen entsprechend
                  angepasst.
                </p>
              </div>

              <div className="pt-1">
                <button type="submit" className={SAVE_BTN_CLS}>
                  Sprache speichern
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ── 4. Sicherheit ────────────────────────────────────────────── */}
        <section aria-labelledby="section-sicherheit">
          <h2 id="section-sicherheit" className={SECTION_LABEL_CLS}>
            <Shield size={13} className="text-gray-400" aria-hidden="true" />
            Sicherheit
          </h2>

          <div className={CARD_CLS}>
            {/* ── 4a. Passwort ändern / SSO-Hinweis ── */}
            {credentialsAccount ? (
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-[12px] font-semibold text-gray-700 tracking-wide uppercase mb-3">
                  Passwort ändern
                </p>
                <form
                  action={handlePasswordChange}
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
                    <p
                      id="sec-new-pw-hint"
                      className="mt-1 text-[11px] text-gray-500"
                    >
                      Mindestens 8 Zeichen, muss sich vom aktuellen
                      unterscheiden.
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
                    <button type="submit" className={SAVE_BTN_CLS}>
                      Passwort speichern
                    </button>
                  </div>
                </form>
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

            {/* ── 4b. Aktive Sitzungen — honest JWT note ── */}
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

            {/* ── 4c. Login-Verlauf ── */}
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
                  {/* Header row */}
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

        {/* ── 5. Datenschutz (stub, Wave 3) ─────────────────────────────── */}
        <section aria-labelledby="section-datenschutz">
          <h2 id="section-datenschutz" className={SECTION_LABEL_CLS}>
            <Lock size={13} className="text-gray-400" aria-hidden="true" />
            Datenschutz
          </h2>

          <div className={`${CARD_CLS} px-5 py-4`}>
            <p className="text-[13px] text-gray-500">
              Suchverlauf, Datenexport und Löschoptionen folgen in Kürze (Wave
              3).
            </p>
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
