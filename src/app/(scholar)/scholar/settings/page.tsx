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
  PasswordForm,
  HistoryToggleForm,
  ClearHistoryForm,
} from "../_components/SettingsForms";
import { SettingsTabs } from "./_components/SettingsTabs";
import type { TabDefinition } from "./_components/SettingsTabs";

// ─── Shared panel styles ──────────────────────────────────────────────────────

const PANEL_HEADING_CLS =
  "text-[18px] font-semibold text-gray-900 leading-tight";
const PANEL_DESC_CLS = "mt-1 text-[13px] text-gray-500 leading-relaxed";
const CARD_CLS =
  "bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden";
const SECTION_LABEL_CLS =
  "text-[11px] font-semibold text-gray-500 tracking-[0.18em] uppercase mb-2";
const DIVIDER_CLS = "border-t border-gray-100 my-6";

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

  // Pre-compute serialisable {code,label}[] pairs.
  // CRITICAL: never pass jurisdictionLabel() (a function) to a client component.
  const jurisdictions = jurisdictionCodes.map((code) => ({
    code,
    label: jurisdictionLabel(code),
  }));

  // Pre-fill deletion mailto body
  const deletionMailto = `mailto:cs@caelex.eu?subject=${encodeURIComponent(
    "Löschantrag – Caelex Scholar",
  )}&body=${encodeURIComponent(
    `Sehr geehrtes Caelex-Team,\n\nhiermit beantrage ich die Löschung meines Caelex Scholar-Kontos.\n\nE-Mail-Adresse: ${user?.email ?? "(bitte eintragen)"}\n\nMit freundlichen Grüßen`,
  )}`;

  // ── Build tab panels as server-rendered ReactNodes ──────────────────────────
  // These are ReactNodes (valid RSC→Client transfer), NOT functions.
  // The SettingsTabs client component receives them via the `content` field.

  // ── Tab 1: Konto ─────────────────────────────────────────────────────────
  const kontoPanel = (
    <section aria-labelledby="panel-heading-konto">
      <h2 id="panel-heading-konto" className={PANEL_HEADING_CLS}>
        Konto
      </h2>
      <p className={PANEL_DESC_CLS}>
        Verwalte deinen Anzeigenamen und sieh deine Kontodaten ein. E-Mail- und
        Institutsangaben werden von deiner Hochschule verwaltet.
      </p>

      <div className={`${CARD_CLS} mt-5`}>
        {/* Name (editable) */}
        <NameForm action={handleUpdateName} defaultValue={user?.name ?? ""} />

        {/* Read-only fields */}
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
  );

  // ── Tab 2: Recherche & Sprache ────────────────────────────────────────────
  const recherchePanel = (
    <section aria-labelledby="panel-heading-recherche">
      <h2 id="panel-heading-recherche" className={PANEL_HEADING_CLS}>
        Recherche &amp; Sprache
      </h2>
      <p className={PANEL_DESC_CLS}>
        Passe die Voreinstellungen für deine Suchen an — Standard-Jurisdiktion,
        Zitationsformat, semantische Suche und die bevorzugte Quellsprache.
      </p>

      {/* Research prefs */}
      <div className={`${CARD_CLS} mt-5 px-5 py-5`}>
        <p className={SECTION_LABEL_CLS}>Suchverhalten</p>
        <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
          Diese Einstellungen gelten für alle Recherchen in der
          Scholar-Bibliothek. Du kannst sie jederzeit pro Suchanfrage
          überschreiben.
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

      {/* Source language */}
      <div className={`${CARD_CLS} px-5 py-5`}>
        <p className={SECTION_LABEL_CLS}>Quellsprache</p>
        <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
          Bestimmt, in welcher Sprache Quelltexte angezeigt werden, sofern
          Übersetzungen vorliegen. Wähle „Original", um stets den authentischen
          Gesetzestext zu sehen.
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
        Sicherheit
      </h2>
      <p className={PANEL_DESC_CLS}>
        Passwort ändern, aktive Sitzungen verstehen und den Login-Verlauf deines
        Kontos einsehen.
      </p>

      <div className={`${CARD_CLS} mt-5`}>
        {/* Password / SSO note */}
        {credentialsAccount ? (
          <div className="px-5 py-5 border-b border-gray-100">
            <p className={`${SECTION_LABEL_CLS} mb-3`}>Passwort ändern</p>
            <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
              Wähle ein starkes Passwort mit mindestens 8 Zeichen. Es wird
              sicher gehasht und niemals im Klartext gespeichert.
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
                Anmeldung über Single Sign-On
              </p>
              <p className="text-[13px] text-gray-600 leading-relaxed">
                Deine Anmeldung wird über deine Hochschule verwaltet. Passwort
                und Zwei-Faktor-Authentifizierung änderst du direkt bei deiner
                Hochschule.
              </p>
            </div>
          </div>
        )}

        {/* Active sessions note */}
        <div className="px-5 py-5 border-b border-gray-100">
          <p className={`${SECTION_LABEL_CLS} mb-2`}>Aktive Sitzungen</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            Scholar verwendet kurzlebige Sitzungs-Tokens (JWT). Eine
            serverseitige Einzelabmeldung ist technisch nicht vorgesehen — zum
            Beenden aller Sitzungen nutze{" "}
            <strong className="font-medium text-gray-700">Abmelden</strong> im
            Navigationsmenü. Neue Logins auf unbekannten Geräten erscheinen im
            Login-Verlauf unten.
          </p>
        </div>

        {/* Login history */}
        <div className="px-5 py-5">
          <p className={`${SECTION_LABEL_CLS} mb-3`}>Login-Verlauf</p>
          <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
            Die letzten 10 Anmeldeversuche deines Kontos. Verdächtige Einträge
            sind amber markiert.
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
                    <span role="cell" className="text-gray-700 tabular-nums">
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
  );

  // ── Tab 4: Datenschutz ────────────────────────────────────────────────────
  const datenschutzPanel = (
    <section aria-labelledby="panel-heading-datenschutz">
      <h2 id="panel-heading-datenschutz" className={PANEL_HEADING_CLS}>
        Datenschutz
      </h2>
      <p className={PANEL_DESC_CLS}>
        Steuere, was Scholar über dich speichert, exportiere deine Daten (Art.
        20 DSGVO) oder beantrage die Löschung deines Kontos (Art. 17 DSGVO).
      </p>

      <div className={`${CARD_CLS} mt-5`}>
        {/* Search history list */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <History size={13} className="text-gray-400" aria-hidden="true" />
            <p className={SECTION_LABEL_CLS}>Suchverlauf</p>
          </div>
          <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
            Scholar speichert deine letzten Suchanfragen, um die
            Bibliotheksfilter vorzubelegen. Du kannst den Verlauf jederzeit
            einsehen, löschen oder die Aufzeichnung deaktivieren.
          </p>

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

          <ClearHistoryForm
            action={handleClearHistory}
            hasHistory={searchHistory.length > 0}
          />
        </div>

        {/* History toggle */}
        <div className="px-5 py-5 border-b border-gray-100">
          <p className={`${SECTION_LABEL_CLS} mb-3`}>Aufzeichnung</p>
          <HistoryToggleForm
            action={handleToggleHistory}
            enabled={prefs?.searchHistoryEnabled !== false}
          />
        </div>

        {/* GDPR data export */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Download size={13} className="text-gray-400" aria-hidden="true" />
            <p className={SECTION_LABEL_CLS}>Meine Daten exportieren</p>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
            Lade eine JSON-Datei mit deinem Konto, deinen Einstellungen und
            deinem Suchverlauf herunter. Das Recht auf Datenübertragbarkeit ist
            in Art.&nbsp;20 DSGVO geregelt.
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

        {/* Account deletion */}
        <div className="px-5 py-5">
          <div className="flex items-center gap-2 mb-2">
            <Mail size={13} className="text-gray-400" aria-hidden="true" />
            <p className={SECTION_LABEL_CLS}>Konto-Löschung anfragen</p>
          </div>
          <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
            Da dein Zugang über deine Hochschule bereitgestellt wird, erfolgt
            die Kontolöschung über den Support deiner Institution. Schreibe uns
            eine E-Mail — wir koordinieren die Löschung mit deiner Hochschule
            (Art.&nbsp;17 DSGVO, Recht auf Vergessenwerden).
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
  );

  // ── Tab 5: Über Scholar ───────────────────────────────────────────────────
  const uberPanel = (
    <section aria-labelledby="panel-heading-uber">
      <h2 id="panel-heading-uber" className={PANEL_HEADING_CLS}>
        Über Caelex Scholar
      </h2>
      <p className={PANEL_DESC_CLS}>
        Technische Details, Version und rechtliche Informationen zur
        Scholar-Plattform.
      </p>

      <div className={`${CARD_CLS} mt-5`}>
        {/* Powered by */}
        <div className="px-5 py-5 border-b border-gray-100">
          <p className={`${SECTION_LABEL_CLS} mb-3`}>Plattform</p>
          <p className="text-[13px] text-gray-700 leading-relaxed">
            Caelex Scholar ist powered by{" "}
            <span className="font-medium text-gray-900">Atlas</span> — der
            Rechtsrecherche-Engine von Caelex. Atlas indiziert Gesetze,
            Verordnungen und Urteile aus 10+ europäischen Jurisdiktionen und
            stellt sie über semantische Suche und strukturierte Filter zur
            Verfügung.
          </p>
          <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">
            Scholar richtet sich an Hochschulnutzerinnen und -nutzer für die
            juristische Recherche im Studium und in der Forschung. Die Plattform
            ersetzt keine Rechtsberatung.
          </p>
        </div>

        {/* Version */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className={`${SECTION_LABEL_CLS} mb-2`}>Version</p>
          <p className="text-[13px] text-gray-600">
            Scholar · Atlas Engine · Caelex Platform
          </p>
        </div>

        {/* Legal links */}
        <div className="px-5 py-5">
          <p className={`${SECTION_LABEL_CLS} mb-3`}>Rechtliches</p>
          <nav
            aria-label="Rechtliche Informationen"
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            <Link
              href="/legal/privacy"
              className="inline-block py-1 text-[13px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
            >
              Datenschutzerklärung
            </Link>
            <Link
              href="/legal/terms"
              className="inline-block py-1 text-[13px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
            >
              Allgemeine Geschäftsbedingungen
            </Link>
            <Link
              href="/legal/impressum"
              className="inline-block py-1 text-[13px] text-gray-600 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-600 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded"
            >
              Impressum
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
      label: "Konto",
      icon: <User size={14} />,
      content: kontoPanel,
    },
    {
      id: "recherche",
      label: "Recherche & Sprache",
      icon: <BookOpen size={14} />,
      content: recherchePanel,
    },
    {
      id: "sicherheit",
      label: "Sicherheit",
      icon: <Shield size={14} />,
      content: sicherheitPanel,
    },
    {
      id: "datenschutz",
      label: "Datenschutz",
      icon: <Lock size={14} />,
      content: datenschutzPanel,
    },
    {
      id: "uber",
      label: "Über Scholar",
      icon: <Info size={14} />,
      content: uberPanel,
    },
  ];

  return (
    <ScholarPage>
      <PageHeader
        eyebrow="Caelex Scholar"
        title="Einstellungen"
        subtitle="Konto, Recherche-Präferenzen und Datenschutz verwalten."
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
