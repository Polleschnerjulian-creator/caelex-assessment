/**
 * Caelex Scholar — settings namespace (`settings`).
 *
 * Every user-visible UI string of the Scholar settings surface: the settings
 * page (page.tsx — tab panels for Konto / Recherche & Sprache / Sicherheit /
 * Datenschutz / Über Scholar, plus login-/search-history chrome and server
 * action messages), the settings tab shell (SettingsTabs.tsx), and the client
 * form wrappers (SettingsForms.tsx — Name, prefs, source-language, password,
 * history-toggle, clear-history).
 *
 * EN is the source of truth; the `de` values are the strings previously
 * hardcoded in those files. it/fr/es are domain-appropriate academic/legal
 * translations. Legal CONTENT is NOT translated here — only UI chrome.
 *
 * Shared terms (Save, Cancel, Activate/Deactivate, status words, …) live in the
 * `common` namespace and are reused via t(locale, COMMON, "key"); this file only
 * adds settings-specific keys. A few labels that COMMON also carries are kept
 * here too (e.g. the deactivate/activate verbs on the history toggle, the
 * enabled/disabled words) so each consuming form can read from a single
 * self-contained dictionary where the call site already passes SETTINGS.
 *
 * The {n} / {email} / {year} placeholders are substituted at the call site.
 *
 * Resolve with: t(locale, SETTINGS, "key")
 */
import type { ScholarNamespace } from "./core";

export const SETTINGS = {
  en: {
    // ── PageHeader ──
    pageEyebrow: "Caelex Scholar",
    pageTitle: "Settings",
    pageSubtitle: "Manage your account, research preferences and privacy.",

    // ── Tab labels (rail) ──
    tabAccount: "Account",
    tabResearch: "Research & language",
    tabSecurity: "Security",
    tabPrivacy: "Privacy",
    tabAbout: "About Scholar",

    // ── Tab shell (SettingsTabs) ──
    tablistLabel: "Settings categories",

    // ── Tab 1: Account ──
    accountHeading: "Account",
    accountDesc:
      "Manage your display name and review your account details. Email and institution information are managed by your university.",
    fieldEmail: "Email",
    fieldRole: "Role",
    fieldUniversity: "University",
    roleSuperAdmin: "Platform administrator · Full access",
    roleLicensed: "Licensed through your university",

    // ── NameForm ──
    nameFormAriaLabel: "Change name",
    nameLabel: "Name",
    nameHint: "Maximum 100 characters; must not be empty.",

    // ── Tab 2: Research & language ──
    researchHeading: "Research & language",
    researchDesc:
      "Adjust the defaults for your searches — default jurisdiction, citation format, semantic search and your preferred source language.",
    searchBehaviourLabel: "Search behaviour",
    searchBehaviourDesc:
      "These settings apply to every search in the Scholar library. You can override them per query at any time.",
    sourceLanguageLabel: "Source language",
    sourceLanguageDesc:
      "Determines the language source texts are shown in, where translations exist. Choose “Original” to always see the authentic legal text.",

    // ── Interface-language selector (UI chrome locale) ──
    interfaceSectionLabel: "Interface",
    interfaceSectionDesc:
      "Choose the language of the Scholar interface — menus, labels and buttons. This is separate from the source language of legal texts.",
    interfaceLanguageLabel: "Interface language",
    interfaceLanguageHint:
      "Changes the language of the Scholar interface, not the legal source texts.",
    interfaceFormAriaLabel: "Save interface language",
    saveInterfaceLanguage: "Save language",

    // ── PrefsForm ──
    prefsFormAriaLabel: "Save research preferences",
    defaultJurisdictionLabel: "Default jurisdiction",
    defaultJurisdictionNone: "None (all jurisdictions)",
    defaultJurisdictionHint: "Used as the pre-selected filter in the library.",
    citationFormatLabel: "Citation format",
    citationFormatDin: "German citation style (DIN 1505)",
    citationFormatOscola: "OSCOLA",
    citationFormatBluebook: "Bluebook",
    semanticSearchLabel: "Semantic search",
    semanticSearchOn: "Enabled",
    semanticSearchOff: "Disabled (keyword search only)",
    semanticSearchHint:
      "Semantic search uses embeddings for context-aware results.",
    resultsPerPageLabel: "Results per page",
    savePrefs: "Save settings",

    // ── SourceLangForm ──
    sourceLangFormAriaLabel: "Save source language",
    sourceLangOriginal: "Original (language of the document)",
    sourceLangDe: "German",
    sourceLangFr: "French",
    sourceLangEn: "English",
    sourceLangHint:
      "Determines the language source texts are shown in, where translations exist.",
    saveSourceLang: "Save language",

    // ── Tab 3: Security ──
    securityHeading: "Security",
    securityDesc:
      "Change your password, understand active sessions and review your account's login history.",
    changePasswordLabel: "Change password",
    changePasswordDesc:
      "Choose a strong password with at least 8 characters. It is securely hashed and never stored in plain text.",
    ssoNoteTitle: "Sign-in via single sign-on",
    ssoNoteBody:
      "Your sign-in is managed by your university. Change your password and two-factor authentication directly with your university.",
    activeSessionsLabel: "Active sessions",
    activeSessionsBody1:
      "Scholar uses short-lived session tokens (JWT). Server-side single sign-out is not available by design — to end all sessions use",
    activeSessionsSignOut: "Sign out",
    activeSessionsBody2:
      "in the navigation menu. New logins on unknown devices appear in the login history below.",
    loginHistoryLabel: "Login history",
    loginHistoryDesc:
      "The last 10 sign-in attempts on your account. Suspicious entries are marked in amber.",
    loginHistoryEmpty: "No login history yet.",
    loginHistoryTableLabel: "Login history",
    colTimestamp: "Time",
    colDevice: "Device / browser",
    colIp: "IP (masked)",
    colStatus: "Status",
    statusAriaPrefix: "Status:",

    // ── Login-event type labels ──
    eventLoginSuccess: "Successful",
    eventLoginFailed: "Failed",
    eventLoginBlocked: "Blocked",
    eventMfaRequired: "2FA required",
    eventMfaSuccess: "2FA successful",
    eventMfaFailed: "2FA failed",
    eventPasskeySuccess: "Passkey",
    eventPasskeyFailed: "Passkey failed",
    eventBackupCodeUsed: "Backup code",
    eventAccountLocked: "Account locked",
    eventAccountUnlocked: "Account unlocked",
    eventSuspiciousLogin: "Suspicious",

    // ── PasswordForm ──
    passwordFormAriaLabel: "Change password",
    currentPasswordLabel: "Current password",
    newPasswordLabel: "New password",
    newPasswordHint: "At least 8 characters; must differ from the current one.",
    confirmPasswordLabel: "Confirm password",
    savePassword: "Save password",
    passwordChanged: "✓ Password changed",
    passwordMismatch: "The passwords do not match.",

    // ── Tab 4: Privacy ──
    privacyHeading: "Privacy",
    privacyDesc:
      "Control what Scholar stores about you, export your data (Art. 20 GDPR) or request deletion of your account (Art. 17 GDPR).",
    searchHistoryLabel: "Search history",
    searchHistoryDesc:
      "Scholar stores your recent searches to pre-fill the library filters. You can view, clear or disable recording at any time.",
    searchHistoryEmpty: "No search history stored.",
    savedSearchesAriaLabel: "Saved searches",
    recordingLabel: "Recording",

    // ── HistoryToggleForm ──
    historyToggleAriaLabel: "Search-history setting",
    recordSearchHistory: "Record search history",
    currentlyPrefix: "Currently:",

    // ── ClearHistoryForm ──
    clearHistoryAriaLabel: "Clear search history",
    clearHistoryWarn: "Saved searches will be permanently deleted.",
    clearHistoryEmpty: "No search history.",
    clearHistoryButton: "Clear search history",

    // ── GDPR export ──
    exportLabel: "Export my data",
    exportDesc:
      "Download a JSON file with your account, your settings and your search history. The right to data portability is set out in Art. 20 GDPR.",
    exportButton: "Download data",

    // ── Account deletion ──
    deletionLabel: "Request account deletion",
    deletionDesc:
      "Since your access is provided through your university, account deletion is handled by your institution's support. Send us an email — we coordinate the deletion with your university (Art. 17 GDPR, right to be forgotten).",
    deletionButton: "Request deletion (cs@caelex.eu)",
    deletionMailSubject: "Deletion request – Caelex Scholar",
    deletionMailBody:
      "Dear Caelex team,\n\nI hereby request the deletion of my Caelex Scholar account.\n\nEmail address: {email}\n\nKind regards",
    deletionMailFallback: "(please fill in)",

    // ── Tab 5: About Scholar ──
    aboutHeading: "About Caelex Scholar",
    aboutDesc:
      "Technical details, version and legal information about the Scholar platform.",
    platformLabel: "Platform",
    platformBody1Prefix: "Caelex Scholar is powered by",
    platformBody1Suffix:
      "— the legal-research engine from Caelex. Atlas indexes laws, regulations and judgments from 10+ European jurisdictions and makes them available through semantic search and structured filters.",
    platformBody2:
      "Scholar is aimed at university users for legal research in study and research. The platform is not a substitute for legal advice.",
    versionLabel: "Version",
    versionValue: "Scholar · Atlas Engine · Caelex Platform",
    legalLabel: "Legal",
    legalNavLabel: "Legal information",
    legalPrivacy: "Privacy policy",
    legalTerms: "Terms and conditions",
    legalImpressum: "Legal notice",

    // ── Footer ──
    footerBy: "by Caelex",
    footerCopyright: "© {year} Caelex",

    // ── Server action messages ──
    msgNotSignedIn: "Not signed in.",
    msgInvalidInput: "Invalid input.",
    msgNameEmpty: "Name must not be empty.",
    msgSaveFailed: "Saving failed. Please try again.",
    msgSaveFailedShort: "Saving failed.",
    msgDeleteFailed: "Deletion failed. Please try again.",
    msgSearchHistoryEnabled: "✓ Search history enabled",
    msgSearchHistoryDisabled: "✓ Search history disabled",
    msgSearchHistoryCleared: "✓ Search history cleared",

    // ── Shared status banner ──
    bannerSavedDefault: "✓ Saved",

    // ── Generic pending indicator ──
    pendingEllipsis: "…",
  },

  de: {
    // ── PageHeader ──
    pageEyebrow: "Caelex Scholar",
    pageTitle: "Einstellungen",
    pageSubtitle: "Konto, Recherche-Präferenzen und Datenschutz verwalten.",

    // ── Tab labels (rail) ──
    tabAccount: "Konto",
    tabResearch: "Recherche & Sprache",
    tabSecurity: "Sicherheit",
    tabPrivacy: "Datenschutz",
    tabAbout: "Über Scholar",

    // ── Tab shell (SettingsTabs) ──
    tablistLabel: "Einstellungs-Kategorien",

    // ── Tab 1: Konto ──
    accountHeading: "Konto",
    accountDesc:
      "Verwalte deinen Anzeigenamen und sieh deine Kontodaten ein. E-Mail- und Institutsangaben werden von deiner Hochschule verwaltet.",
    fieldEmail: "E-Mail",
    fieldRole: "Rolle",
    fieldUniversity: "Hochschule",
    roleSuperAdmin: "Plattform-Administrator · Vollzugriff",
    roleLicensed: "Lizenziert über deine Hochschule",

    // ── NameForm ──
    nameFormAriaLabel: "Name ändern",
    nameLabel: "Name",
    nameHint: "Maximal 100 Zeichen, darf nicht leer sein.",

    // ── Tab 2: Recherche & Sprache ──
    researchHeading: "Recherche & Sprache",
    researchDesc:
      "Passe die Voreinstellungen für deine Suchen an — Standard-Jurisdiktion, Zitationsformat, semantische Suche und die bevorzugte Quellsprache.",
    searchBehaviourLabel: "Suchverhalten",
    searchBehaviourDesc:
      "Diese Einstellungen gelten für alle Recherchen in der Scholar-Bibliothek. Du kannst sie jederzeit pro Suchanfrage überschreiben.",
    sourceLanguageLabel: "Quellsprache",
    sourceLanguageDesc:
      "Bestimmt, in welcher Sprache Quelltexte angezeigt werden, sofern Übersetzungen vorliegen. Wähle „Original“, um stets den authentischen Gesetzestext zu sehen.",

    // ── Interface-language selector (UI chrome locale) ──
    interfaceSectionLabel: "Oberfläche",
    interfaceSectionDesc:
      "Wähle die Sprache der Scholar-Oberfläche — Menüs, Beschriftungen und Schaltflächen. Dies ist unabhängig von der Quellsprache der Gesetzestexte.",
    interfaceLanguageLabel: "Sprache der Oberfläche",
    interfaceLanguageHint:
      "Ändert die Sprache der Scholar-Oberfläche, nicht die der Gesetzesquellen.",
    interfaceFormAriaLabel: "Sprache der Oberfläche speichern",
    saveInterfaceLanguage: "Sprache speichern",

    // ── PrefsForm ──
    prefsFormAriaLabel: "Recherche-Präferenzen speichern",
    defaultJurisdictionLabel: "Standard-Jurisdiktion",
    defaultJurisdictionNone: "Keine (alle Jurisdiktionen)",
    defaultJurisdictionHint:
      "Wird in der Bibliothek als vorausgewählter Filter verwendet.",
    citationFormatLabel: "Zitationsformat",
    citationFormatDin: "Deutsche Zitierweise (DIN 1505)",
    citationFormatOscola: "OSCOLA",
    citationFormatBluebook: "Bluebook",
    semanticSearchLabel: "Semantische Suche",
    semanticSearchOn: "Aktiviert",
    semanticSearchOff: "Deaktiviert (nur Keyword-Suche)",
    semanticSearchHint:
      "Semantische Suche nutzt Embeddings für kontextbezogene Ergebnisse.",
    resultsPerPageLabel: "Treffer pro Seite",
    savePrefs: "Einstellungen speichern",

    // ── SourceLangForm ──
    sourceLangFormAriaLabel: "Quellsprache speichern",
    sourceLangOriginal: "Original (Sprache des Dokuments)",
    sourceLangDe: "Deutsch",
    sourceLangFr: "Français",
    sourceLangEn: "English",
    sourceLangHint:
      "Bestimmt, in welcher Sprache Quelltexte angezeigt werden, sofern Übersetzungen vorliegen.",
    saveSourceLang: "Sprache speichern",

    // ── Tab 3: Sicherheit ──
    securityHeading: "Sicherheit",
    securityDesc:
      "Passwort ändern, aktive Sitzungen verstehen und den Login-Verlauf deines Kontos einsehen.",
    changePasswordLabel: "Passwort ändern",
    changePasswordDesc:
      "Wähle ein starkes Passwort mit mindestens 8 Zeichen. Es wird sicher gehasht und niemals im Klartext gespeichert.",
    ssoNoteTitle: "Anmeldung über Single Sign-On",
    ssoNoteBody:
      "Deine Anmeldung wird über deine Hochschule verwaltet. Passwort und Zwei-Faktor-Authentifizierung änderst du direkt bei deiner Hochschule.",
    activeSessionsLabel: "Aktive Sitzungen",
    activeSessionsBody1:
      "Scholar verwendet kurzlebige Sitzungs-Tokens (JWT). Eine serverseitige Einzelabmeldung ist technisch nicht vorgesehen — zum Beenden aller Sitzungen nutze",
    activeSessionsSignOut: "Abmelden",
    activeSessionsBody2:
      "im Navigationsmenü. Neue Logins auf unbekannten Geräten erscheinen im Login-Verlauf unten.",
    loginHistoryLabel: "Login-Verlauf",
    loginHistoryDesc:
      "Die letzten 10 Anmeldeversuche deines Kontos. Verdächtige Einträge sind amber markiert.",
    loginHistoryEmpty: "Noch kein Login-Verlauf vorhanden.",
    loginHistoryTableLabel: "Login-Verlauf",
    colTimestamp: "Zeitpunkt",
    colDevice: "Gerät / Browser",
    colIp: "IP (maskiert)",
    colStatus: "Status",
    statusAriaPrefix: "Status:",

    // ── Login-event type labels ──
    eventLoginSuccess: "Erfolgreich",
    eventLoginFailed: "Fehlgeschlagen",
    eventLoginBlocked: "Gesperrt",
    eventMfaRequired: "2FA erforderlich",
    eventMfaSuccess: "2FA erfolgreich",
    eventMfaFailed: "2FA fehlgeschlagen",
    eventPasskeySuccess: "Passkey",
    eventPasskeyFailed: "Passkey fehlgeschlagen",
    eventBackupCodeUsed: "Backup-Code",
    eventAccountLocked: "Konto gesperrt",
    eventAccountUnlocked: "Konto entsperrt",
    eventSuspiciousLogin: "Verdächtig",

    // ── PasswordForm ──
    passwordFormAriaLabel: "Passwort ändern",
    currentPasswordLabel: "Aktuelles Passwort",
    newPasswordLabel: "Neues Passwort",
    newPasswordHint:
      "Mindestens 8 Zeichen, muss sich vom aktuellen unterscheiden.",
    confirmPasswordLabel: "Passwort bestätigen",
    savePassword: "Passwort speichern",
    passwordChanged: "✓ Passwort geändert",
    passwordMismatch: "Die Passwörter stimmen nicht überein.",

    // ── Tab 4: Datenschutz ──
    privacyHeading: "Datenschutz",
    privacyDesc:
      "Steuere, was Scholar über dich speichert, exportiere deine Daten (Art. 20 DSGVO) oder beantrage die Löschung deines Kontos (Art. 17 DSGVO).",
    searchHistoryLabel: "Suchverlauf",
    searchHistoryDesc:
      "Scholar speichert deine letzten Suchanfragen, um die Bibliotheksfilter vorzubelegen. Du kannst den Verlauf jederzeit einsehen, löschen oder die Aufzeichnung deaktivieren.",
    searchHistoryEmpty: "Kein Suchverlauf gespeichert.",
    savedSearchesAriaLabel: "Gespeicherte Suchen",
    recordingLabel: "Aufzeichnung",

    // ── HistoryToggleForm ──
    historyToggleAriaLabel: "Suchverlauf-Einstellung",
    recordSearchHistory: "Suchverlauf aufzeichnen",
    currentlyPrefix: "Aktuell:",

    // ── ClearHistoryForm ──
    clearHistoryAriaLabel: "Suchverlauf löschen",
    clearHistoryWarn: "Gespeicherte Suchen werden dauerhaft gelöscht.",
    clearHistoryEmpty: "Kein Suchverlauf vorhanden.",
    clearHistoryButton: "Suchverlauf löschen",

    // ── GDPR export ──
    exportLabel: "Meine Daten exportieren",
    exportDesc:
      "Lade eine JSON-Datei mit deinem Konto, deinen Einstellungen und deinem Suchverlauf herunter. Das Recht auf Datenübertragbarkeit ist in Art. 20 DSGVO geregelt.",
    exportButton: "Daten herunterladen",

    // ── Account deletion ──
    deletionLabel: "Konto-Löschung anfragen",
    deletionDesc:
      "Da dein Zugang über deine Hochschule bereitgestellt wird, erfolgt die Kontolöschung über den Support deiner Institution. Schreibe uns eine E-Mail — wir koordinieren die Löschung mit deiner Hochschule (Art. 17 DSGVO, Recht auf Vergessenwerden).",
    deletionButton: "Löschung anfragen (cs@caelex.eu)",
    deletionMailSubject: "Löschantrag – Caelex Scholar",
    deletionMailBody:
      "Sehr geehrtes Caelex-Team,\n\nhiermit beantrage ich die Löschung meines Caelex Scholar-Kontos.\n\nE-Mail-Adresse: {email}\n\nMit freundlichen Grüßen",
    deletionMailFallback: "(bitte eintragen)",

    // ── Tab 5: Über Scholar ──
    aboutHeading: "Über Caelex Scholar",
    aboutDesc:
      "Technische Details, Version und rechtliche Informationen zur Scholar-Plattform.",
    platformLabel: "Plattform",
    platformBody1Prefix: "Caelex Scholar ist powered by",
    platformBody1Suffix:
      "— der Rechtsrecherche-Engine von Caelex. Atlas indiziert Gesetze, Verordnungen und Urteile aus 10+ europäischen Jurisdiktionen und stellt sie über semantische Suche und strukturierte Filter zur Verfügung.",
    platformBody2:
      "Scholar richtet sich an Hochschulnutzerinnen und -nutzer für die juristische Recherche im Studium und in der Forschung. Die Plattform ersetzt keine Rechtsberatung.",
    versionLabel: "Version",
    versionValue: "Scholar · Atlas Engine · Caelex Platform",
    legalLabel: "Rechtliches",
    legalNavLabel: "Rechtliche Informationen",
    legalPrivacy: "Datenschutzerklärung",
    legalTerms: "Allgemeine Geschäftsbedingungen",
    legalImpressum: "Impressum",

    // ── Footer ──
    footerBy: "by Caelex",
    footerCopyright: "© {year} Caelex",

    // ── Server action messages ──
    msgNotSignedIn: "Nicht angemeldet.",
    msgInvalidInput: "Ungültige Eingabe.",
    msgNameEmpty: "Name darf nicht leer sein.",
    msgSaveFailed: "Speichern fehlgeschlagen. Bitte erneut versuchen.",
    msgSaveFailedShort: "Speichern fehlgeschlagen.",
    msgDeleteFailed: "Löschen fehlgeschlagen. Bitte erneut versuchen.",
    msgSearchHistoryEnabled: "✓ Suchverlauf aktiviert",
    msgSearchHistoryDisabled: "✓ Suchverlauf deaktiviert",
    msgSearchHistoryCleared: "✓ Suchverlauf gelöscht",

    // ── Shared status banner ──
    bannerSavedDefault: "✓ Gespeichert",

    // ── Generic pending indicator ──
    pendingEllipsis: "…",
  },

  it: {
    // ── PageHeader ──
    pageEyebrow: "Caelex Scholar",
    pageTitle: "Impostazioni",
    pageSubtitle: "Gestisci account, preferenze di ricerca e privacy.",

    // ── Tab labels (rail) ──
    tabAccount: "Account",
    tabResearch: "Ricerca e lingua",
    tabSecurity: "Sicurezza",
    tabPrivacy: "Privacy",
    tabAbout: "Info su Scholar",

    // ── Tab shell (SettingsTabs) ──
    tablistLabel: "Categorie delle impostazioni",

    // ── Tab 1: Account ──
    accountHeading: "Account",
    accountDesc:
      "Gestisci il tuo nome visualizzato e consulta i dati del tuo account. Email e dati dell'istituto sono gestiti dalla tua università.",
    fieldEmail: "Email",
    fieldRole: "Ruolo",
    fieldUniversity: "Università",
    roleSuperAdmin: "Amministratore della piattaforma · Accesso completo",
    roleLicensed: "Concesso in licenza tramite la tua università",

    // ── NameForm ──
    nameFormAriaLabel: "Modifica nome",
    nameLabel: "Nome",
    nameHint: "Massimo 100 caratteri; non può essere vuoto.",

    // ── Tab 2: Ricerca e lingua ──
    researchHeading: "Ricerca e lingua",
    researchDesc:
      "Configura le impostazioni predefinite per le tue ricerche — giurisdizione predefinita, formato delle citazioni, ricerca semantica e lingua delle fonti preferita.",
    searchBehaviourLabel: "Comportamento della ricerca",
    searchBehaviourDesc:
      "Queste impostazioni si applicano a tutte le ricerche nella biblioteca Scholar. Puoi sovrascriverle per ogni singola query in qualsiasi momento.",
    sourceLanguageLabel: "Lingua della fonte",
    sourceLanguageDesc:
      "Determina la lingua in cui vengono mostrati i testi delle fonti, ove esistano traduzioni. Scegli “Originale” per vedere sempre il testo giuridico autentico.",

    // ── Interface-language selector (UI chrome locale) ──
    interfaceSectionLabel: "Interfaccia",
    interfaceSectionDesc:
      "Scegli la lingua dell'interfaccia di Scholar — menu, etichette e pulsanti. È distinta dalla lingua delle fonti dei testi giuridici.",
    interfaceLanguageLabel: "Lingua dell'interfaccia",
    interfaceLanguageHint:
      "Cambia la lingua dell'interfaccia di Scholar, non quella dei testi giuridici delle fonti.",
    interfaceFormAriaLabel: "Salva la lingua dell'interfaccia",
    saveInterfaceLanguage: "Salva la lingua",

    // ── PrefsForm ──
    prefsFormAriaLabel: "Salva le preferenze di ricerca",
    defaultJurisdictionLabel: "Giurisdizione predefinita",
    defaultJurisdictionNone: "Nessuna (tutte le giurisdizioni)",
    defaultJurisdictionHint:
      "Usata come filtro preselezionato nella biblioteca.",
    citationFormatLabel: "Formato delle citazioni",
    citationFormatDin: "Stile di citazione tedesco (DIN 1505)",
    citationFormatOscola: "OSCOLA",
    citationFormatBluebook: "Bluebook",
    semanticSearchLabel: "Ricerca semantica",
    semanticSearchOn: "Attivata",
    semanticSearchOff: "Disattivata (solo ricerca per parole chiave)",
    semanticSearchHint:
      "La ricerca semantica utilizza gli embedding per risultati contestuali.",
    resultsPerPageLabel: "Risultati per pagina",
    savePrefs: "Salva impostazioni",

    // ── SourceLangForm ──
    sourceLangFormAriaLabel: "Salva la lingua della fonte",
    sourceLangOriginal: "Originale (lingua del documento)",
    sourceLangDe: "Tedesco",
    sourceLangFr: "Francese",
    sourceLangEn: "Inglese",
    sourceLangHint:
      "Determina la lingua in cui vengono mostrati i testi delle fonti, ove esistano traduzioni.",
    saveSourceLang: "Salva la lingua",

    // ── Tab 3: Sicurezza ──
    securityHeading: "Sicurezza",
    securityDesc:
      "Cambia la password, comprendi le sessioni attive e consulta la cronologia degli accessi del tuo account.",
    changePasswordLabel: "Cambia password",
    changePasswordDesc:
      "Scegli una password robusta di almeno 8 caratteri. Viene cifrata in modo sicuro (hash) e mai memorizzata in chiaro.",
    ssoNoteTitle: "Accesso tramite single sign-on",
    ssoNoteBody:
      "Il tuo accesso è gestito dalla tua università. Cambia password e autenticazione a due fattori direttamente presso la tua università.",
    activeSessionsLabel: "Sessioni attive",
    activeSessionsBody1:
      "Scholar utilizza token di sessione di breve durata (JWT). Una disconnessione singola lato server non è prevista — per terminare tutte le sessioni usa",
    activeSessionsSignOut: "Esci",
    activeSessionsBody2:
      "nel menu di navigazione. I nuovi accessi da dispositivi sconosciuti compaiono nella cronologia degli accessi qui sotto.",
    loginHistoryLabel: "Cronologia degli accessi",
    loginHistoryDesc:
      "Gli ultimi 10 tentativi di accesso al tuo account. Le voci sospette sono evidenziate in ambra.",
    loginHistoryEmpty: "Nessuna cronologia degli accessi.",
    loginHistoryTableLabel: "Cronologia degli accessi",
    colTimestamp: "Momento",
    colDevice: "Dispositivo / browser",
    colIp: "IP (mascherato)",
    colStatus: "Stato",
    statusAriaPrefix: "Stato:",

    // ── Login-event type labels ──
    eventLoginSuccess: "Riuscito",
    eventLoginFailed: "Fallito",
    eventLoginBlocked: "Bloccato",
    eventMfaRequired: "2FA richiesta",
    eventMfaSuccess: "2FA riuscita",
    eventMfaFailed: "2FA fallita",
    eventPasskeySuccess: "Passkey",
    eventPasskeyFailed: "Passkey fallita",
    eventBackupCodeUsed: "Codice di backup",
    eventAccountLocked: "Account bloccato",
    eventAccountUnlocked: "Account sbloccato",
    eventSuspiciousLogin: "Sospetto",

    // ── PasswordForm ──
    passwordFormAriaLabel: "Cambia password",
    currentPasswordLabel: "Password attuale",
    newPasswordLabel: "Nuova password",
    newPasswordHint:
      "Almeno 8 caratteri; deve essere diversa da quella attuale.",
    confirmPasswordLabel: "Conferma password",
    savePassword: "Salva password",
    passwordChanged: "✓ Password modificata",
    passwordMismatch: "Le password non coincidono.",

    // ── Tab 4: Privacy ──
    privacyHeading: "Privacy",
    privacyDesc:
      "Controlla cosa Scholar memorizza su di te, esporta i tuoi dati (art. 20 GDPR) o richiedi la cancellazione del tuo account (art. 17 GDPR).",
    searchHistoryLabel: "Cronologia delle ricerche",
    searchHistoryDesc:
      "Scholar memorizza le tue ricerche recenti per precompilare i filtri della biblioteca. Puoi consultarla, cancellarla o disattivarne la registrazione in qualsiasi momento.",
    searchHistoryEmpty: "Nessuna cronologia delle ricerche memorizzata.",
    savedSearchesAriaLabel: "Ricerche salvate",
    recordingLabel: "Registrazione",

    // ── HistoryToggleForm ──
    historyToggleAriaLabel: "Impostazione della cronologia delle ricerche",
    recordSearchHistory: "Registra la cronologia delle ricerche",
    currentlyPrefix: "Attualmente:",

    // ── ClearHistoryForm ──
    clearHistoryAriaLabel: "Cancella la cronologia delle ricerche",
    clearHistoryWarn: "Le ricerche salvate verranno eliminate definitivamente.",
    clearHistoryEmpty: "Nessuna cronologia delle ricerche.",
    clearHistoryButton: "Cancella la cronologia delle ricerche",

    // ── GDPR export ──
    exportLabel: "Esporta i miei dati",
    exportDesc:
      "Scarica un file JSON con il tuo account, le tue impostazioni e la tua cronologia delle ricerche. Il diritto alla portabilità dei dati è disciplinato dall'art. 20 GDPR.",
    exportButton: "Scarica i dati",

    // ── Account deletion ──
    deletionLabel: "Richiedi la cancellazione dell'account",
    deletionDesc:
      "Poiché il tuo accesso è fornito tramite la tua università, la cancellazione dell'account avviene tramite l'assistenza della tua istituzione. Scrivici un'email — coordineremo la cancellazione con la tua università (art. 17 GDPR, diritto all'oblio).",
    deletionButton: "Richiedi la cancellazione (cs@caelex.eu)",
    deletionMailSubject: "Richiesta di cancellazione – Caelex Scholar",
    deletionMailBody:
      "Gentile team Caelex,\n\ncon la presente richiedo la cancellazione del mio account Caelex Scholar.\n\nIndirizzo email: {email}\n\nCordiali saluti",
    deletionMailFallback: "(da compilare)",

    // ── Tab 5: Info su Scholar ──
    aboutHeading: "Info su Caelex Scholar",
    aboutDesc:
      "Dettagli tecnici, versione e informazioni legali sulla piattaforma Scholar.",
    platformLabel: "Piattaforma",
    platformBody1Prefix: "Caelex Scholar è powered by",
    platformBody1Suffix:
      "— il motore di ricerca giuridica di Caelex. Atlas indicizza leggi, regolamenti e sentenze di oltre 10 giurisdizioni europee e li rende disponibili tramite ricerca semantica e filtri strutturati.",
    platformBody2:
      "Scholar è rivolto agli utenti universitari per la ricerca giuridica nello studio e nella ricerca. La piattaforma non sostituisce la consulenza legale.",
    versionLabel: "Versione",
    versionValue: "Scholar · Atlas Engine · Caelex Platform",
    legalLabel: "Informazioni legali",
    legalNavLabel: "Informazioni legali",
    legalPrivacy: "Informativa sulla privacy",
    legalTerms: "Termini e condizioni",
    legalImpressum: "Note legali",

    // ── Footer ──
    footerBy: "di Caelex",
    footerCopyright: "© {year} Caelex",

    // ── Server action messages ──
    msgNotSignedIn: "Non hai effettuato l'accesso.",
    msgInvalidInput: "Inserimento non valido.",
    msgNameEmpty: "Il nome non può essere vuoto.",
    msgSaveFailed: "Salvataggio non riuscito. Riprova.",
    msgSaveFailedShort: "Salvataggio non riuscito.",
    msgDeleteFailed: "Eliminazione non riuscita. Riprova.",
    msgSearchHistoryEnabled: "✓ Cronologia delle ricerche attivata",
    msgSearchHistoryDisabled: "✓ Cronologia delle ricerche disattivata",
    msgSearchHistoryCleared: "✓ Cronologia delle ricerche cancellata",

    // ── Shared status banner ──
    bannerSavedDefault: "✓ Salvato",

    // ── Generic pending indicator ──
    pendingEllipsis: "…",
  },

  fr: {
    // ── PageHeader ──
    pageEyebrow: "Caelex Scholar",
    pageTitle: "Paramètres",
    pageSubtitle:
      "Gérez votre compte, vos préférences de recherche et votre confidentialité.",

    // ── Tab labels (rail) ──
    tabAccount: "Compte",
    tabResearch: "Recherche et langue",
    tabSecurity: "Sécurité",
    tabPrivacy: "Confidentialité",
    tabAbout: "À propos de Scholar",

    // ── Tab shell (SettingsTabs) ──
    tablistLabel: "Catégories de paramètres",

    // ── Tab 1: Compte ──
    accountHeading: "Compte",
    accountDesc:
      "Gérez votre nom d'affichage et consultez les informations de votre compte. L'adresse e-mail et les données de l'établissement sont gérées par votre université.",
    fieldEmail: "E-mail",
    fieldRole: "Rôle",
    fieldUniversity: "Université",
    roleSuperAdmin: "Administrateur de la plateforme · Accès complet",
    roleLicensed: "Sous licence via votre université",

    // ── NameForm ──
    nameFormAriaLabel: "Modifier le nom",
    nameLabel: "Nom",
    nameHint: "100 caractères maximum ; ne peut pas être vide.",

    // ── Tab 2: Recherche et langue ──
    researchHeading: "Recherche et langue",
    researchDesc:
      "Réglez les valeurs par défaut de vos recherches — juridiction par défaut, format de citation, recherche sémantique et langue source préférée.",
    searchBehaviourLabel: "Comportement de la recherche",
    searchBehaviourDesc:
      "Ces paramètres s'appliquent à toutes les recherches dans la bibliothèque Scholar. Vous pouvez les remplacer pour chaque requête à tout moment.",
    sourceLanguageLabel: "Langue source",
    sourceLanguageDesc:
      "Détermine la langue d'affichage des textes sources, lorsque des traductions existent. Choisissez « Original » pour toujours voir le texte juridique authentique.",

    // ── Interface-language selector (UI chrome locale) ──
    interfaceSectionLabel: "Interface",
    interfaceSectionDesc:
      "Choisissez la langue de l'interface de Scholar — menus, libellés et boutons. Elle est distincte de la langue source des textes juridiques.",
    interfaceLanguageLabel: "Langue de l'interface",
    interfaceLanguageHint:
      "Modifie la langue de l'interface de Scholar, et non celle des sources juridiques.",
    interfaceFormAriaLabel: "Enregistrer la langue de l'interface",
    saveInterfaceLanguage: "Enregistrer la langue",

    // ── PrefsForm ──
    prefsFormAriaLabel: "Enregistrer les préférences de recherche",
    defaultJurisdictionLabel: "Juridiction par défaut",
    defaultJurisdictionNone: "Aucune (toutes les juridictions)",
    defaultJurisdictionHint:
      "Utilisée comme filtre présélectionné dans la bibliothèque.",
    citationFormatLabel: "Format de citation",
    citationFormatDin: "Style de citation allemand (DIN 1505)",
    citationFormatOscola: "OSCOLA",
    citationFormatBluebook: "Bluebook",
    semanticSearchLabel: "Recherche sémantique",
    semanticSearchOn: "Activée",
    semanticSearchOff: "Désactivée (recherche par mots-clés uniquement)",
    semanticSearchHint:
      "La recherche sémantique utilise des plongements (embeddings) pour des résultats contextuels.",
    resultsPerPageLabel: "Résultats par page",
    savePrefs: "Enregistrer les paramètres",

    // ── SourceLangForm ──
    sourceLangFormAriaLabel: "Enregistrer la langue source",
    sourceLangOriginal: "Original (langue du document)",
    sourceLangDe: "Allemand",
    sourceLangFr: "Français",
    sourceLangEn: "Anglais",
    sourceLangHint:
      "Détermine la langue d'affichage des textes sources, lorsque des traductions existent.",
    saveSourceLang: "Enregistrer la langue",

    // ── Tab 3: Sécurité ──
    securityHeading: "Sécurité",
    securityDesc:
      "Changez votre mot de passe, comprenez les sessions actives et consultez l'historique de connexion de votre compte.",
    changePasswordLabel: "Changer le mot de passe",
    changePasswordDesc:
      "Choisissez un mot de passe robuste d'au moins 8 caractères. Il est haché de manière sécurisée et n'est jamais stocké en clair.",
    ssoNoteTitle: "Connexion par authentification unique (SSO)",
    ssoNoteBody:
      "Votre connexion est gérée par votre université. Modifiez votre mot de passe et l'authentification à deux facteurs directement auprès de votre université.",
    activeSessionsLabel: "Sessions actives",
    activeSessionsBody1:
      "Scholar utilise des jetons de session de courte durée (JWT). Une déconnexion unique côté serveur n'est pas prévue — pour mettre fin à toutes les sessions, utilisez",
    activeSessionsSignOut: "Se déconnecter",
    activeSessionsBody2:
      "dans le menu de navigation. Les nouvelles connexions depuis des appareils inconnus apparaissent dans l'historique de connexion ci-dessous.",
    loginHistoryLabel: "Historique de connexion",
    loginHistoryDesc:
      "Les 10 dernières tentatives de connexion à votre compte. Les entrées suspectes sont signalées en ambre.",
    loginHistoryEmpty: "Aucun historique de connexion pour le moment.",
    loginHistoryTableLabel: "Historique de connexion",
    colTimestamp: "Date et heure",
    colDevice: "Appareil / navigateur",
    colIp: "IP (masquée)",
    colStatus: "Statut",
    statusAriaPrefix: "Statut :",

    // ── Login-event type labels ──
    eventLoginSuccess: "Réussie",
    eventLoginFailed: "Échouée",
    eventLoginBlocked: "Bloquée",
    eventMfaRequired: "2FA requise",
    eventMfaSuccess: "2FA réussie",
    eventMfaFailed: "2FA échouée",
    eventPasskeySuccess: "Clé d'accès",
    eventPasskeyFailed: "Clé d'accès échouée",
    eventBackupCodeUsed: "Code de secours",
    eventAccountLocked: "Compte verrouillé",
    eventAccountUnlocked: "Compte déverrouillé",
    eventSuspiciousLogin: "Suspecte",

    // ── PasswordForm ──
    passwordFormAriaLabel: "Changer le mot de passe",
    currentPasswordLabel: "Mot de passe actuel",
    newPasswordLabel: "Nouveau mot de passe",
    newPasswordHint:
      "Au moins 8 caractères ; doit différer du mot de passe actuel.",
    confirmPasswordLabel: "Confirmer le mot de passe",
    savePassword: "Enregistrer le mot de passe",
    passwordChanged: "✓ Mot de passe modifié",
    passwordMismatch: "Les mots de passe ne correspondent pas.",

    // ── Tab 4: Confidentialité ──
    privacyHeading: "Confidentialité",
    privacyDesc:
      "Contrôlez ce que Scholar stocke à votre sujet, exportez vos données (art. 20 RGPD) ou demandez la suppression de votre compte (art. 17 RGPD).",
    searchHistoryLabel: "Historique de recherche",
    searchHistoryDesc:
      "Scholar conserve vos recherches récentes afin de préremplir les filtres de la bibliothèque. Vous pouvez le consulter, l'effacer ou désactiver l'enregistrement à tout moment.",
    searchHistoryEmpty: "Aucun historique de recherche enregistré.",
    savedSearchesAriaLabel: "Recherches enregistrées",
    recordingLabel: "Enregistrement",

    // ── HistoryToggleForm ──
    historyToggleAriaLabel: "Paramètre de l'historique de recherche",
    recordSearchHistory: "Enregistrer l'historique de recherche",
    currentlyPrefix: "Actuellement :",

    // ── ClearHistoryForm ──
    clearHistoryAriaLabel: "Effacer l'historique de recherche",
    clearHistoryWarn:
      "Les recherches enregistrées seront définitivement supprimées.",
    clearHistoryEmpty: "Aucun historique de recherche.",
    clearHistoryButton: "Effacer l'historique de recherche",

    // ── GDPR export ──
    exportLabel: "Exporter mes données",
    exportDesc:
      "Téléchargez un fichier JSON contenant votre compte, vos paramètres et votre historique de recherche. Le droit à la portabilité des données est prévu à l'art. 20 RGPD.",
    exportButton: "Télécharger les données",

    // ── Account deletion ──
    deletionLabel: "Demander la suppression du compte",
    deletionDesc:
      "Votre accès étant fourni par votre université, la suppression du compte s'effectue via l'assistance de votre établissement. Écrivez-nous un e-mail — nous coordonnons la suppression avec votre université (art. 17 RGPD, droit à l'oubli).",
    deletionButton: "Demander la suppression (cs@caelex.eu)",
    deletionMailSubject: "Demande de suppression – Caelex Scholar",
    deletionMailBody:
      "Chère équipe Caelex,\n\nje demande par la présente la suppression de mon compte Caelex Scholar.\n\nAdresse e-mail : {email}\n\nCordialement",
    deletionMailFallback: "(à compléter)",

    // ── Tab 5: À propos de Scholar ──
    aboutHeading: "À propos de Caelex Scholar",
    aboutDesc:
      "Détails techniques, version et informations légales sur la plateforme Scholar.",
    platformLabel: "Plateforme",
    platformBody1Prefix: "Caelex Scholar est powered by",
    platformBody1Suffix:
      "— le moteur de recherche juridique de Caelex. Atlas indexe lois, règlements et décisions de plus de 10 juridictions européennes et les rend accessibles par recherche sémantique et filtres structurés.",
    platformBody2:
      "Scholar s'adresse aux utilisateurs universitaires pour la recherche juridique dans les études et la recherche. La plateforme ne remplace pas un conseil juridique.",
    versionLabel: "Version",
    versionValue: "Scholar · Atlas Engine · Caelex Platform",
    legalLabel: "Mentions légales",
    legalNavLabel: "Informations légales",
    legalPrivacy: "Politique de confidentialité",
    legalTerms: "Conditions générales",
    legalImpressum: "Mentions légales",

    // ── Footer ──
    footerBy: "par Caelex",
    footerCopyright: "© {year} Caelex",

    // ── Server action messages ──
    msgNotSignedIn: "Non connecté.",
    msgInvalidInput: "Saisie non valide.",
    msgNameEmpty: "Le nom ne peut pas être vide.",
    msgSaveFailed: "Échec de l'enregistrement. Veuillez réessayer.",
    msgSaveFailedShort: "Échec de l'enregistrement.",
    msgDeleteFailed: "Échec de la suppression. Veuillez réessayer.",
    msgSearchHistoryEnabled: "✓ Historique de recherche activé",
    msgSearchHistoryDisabled: "✓ Historique de recherche désactivé",
    msgSearchHistoryCleared: "✓ Historique de recherche effacé",

    // ── Shared status banner ──
    bannerSavedDefault: "✓ Enregistré",

    // ── Generic pending indicator ──
    pendingEllipsis: "…",
  },

  es: {
    // ── PageHeader ──
    pageEyebrow: "Caelex Scholar",
    pageTitle: "Ajustes",
    pageSubtitle:
      "Gestiona tu cuenta, las preferencias de búsqueda y la privacidad.",

    // ── Tab labels (rail) ──
    tabAccount: "Cuenta",
    tabResearch: "Investigación e idioma",
    tabSecurity: "Seguridad",
    tabPrivacy: "Privacidad",
    tabAbout: "Acerca de Scholar",

    // ── Tab shell (SettingsTabs) ──
    tablistLabel: "Categorías de ajustes",

    // ── Tab 1: Cuenta ──
    accountHeading: "Cuenta",
    accountDesc:
      "Gestiona tu nombre visible y consulta los datos de tu cuenta. El correo electrónico y los datos de la institución los gestiona tu universidad.",
    fieldEmail: "Correo electrónico",
    fieldRole: "Rol",
    fieldUniversity: "Universidad",
    roleSuperAdmin: "Administrador de la plataforma · Acceso total",
    roleLicensed: "Con licencia a través de tu universidad",

    // ── NameForm ──
    nameFormAriaLabel: "Cambiar nombre",
    nameLabel: "Nombre",
    nameHint: "Máximo 100 caracteres; no puede estar vacío.",

    // ── Tab 2: Investigación e idioma ──
    researchHeading: "Investigación e idioma",
    researchDesc:
      "Ajusta los valores predeterminados de tus búsquedas — jurisdicción predeterminada, formato de cita, búsqueda semántica e idioma de origen preferido.",
    searchBehaviourLabel: "Comportamiento de la búsqueda",
    searchBehaviourDesc:
      "Estos ajustes se aplican a todas las búsquedas en la biblioteca de Scholar. Puedes anularlos en cada consulta en cualquier momento.",
    sourceLanguageLabel: "Idioma de origen",
    sourceLanguageDesc:
      "Determina el idioma en que se muestran los textos de las fuentes, cuando existen traducciones. Elige «Original» para ver siempre el texto jurídico auténtico.",

    // ── Interface-language selector (UI chrome locale) ──
    interfaceSectionLabel: "Interfaz",
    interfaceSectionDesc:
      "Elige el idioma de la interfaz de Scholar — menús, etiquetas y botones. Es distinto del idioma de origen de los textos jurídicos.",
    interfaceLanguageLabel: "Idioma de la interfaz",
    interfaceLanguageHint:
      "Cambia el idioma de la interfaz de Scholar, no el de los textos jurídicos de las fuentes.",
    interfaceFormAriaLabel: "Guardar el idioma de la interfaz",
    saveInterfaceLanguage: "Guardar idioma",

    // ── PrefsForm ──
    prefsFormAriaLabel: "Guardar las preferencias de búsqueda",
    defaultJurisdictionLabel: "Jurisdicción predeterminada",
    defaultJurisdictionNone: "Ninguna (todas las jurisdicciones)",
    defaultJurisdictionHint:
      "Se usa como filtro preseleccionado en la biblioteca.",
    citationFormatLabel: "Formato de cita",
    citationFormatDin: "Estilo de cita alemán (DIN 1505)",
    citationFormatOscola: "OSCOLA",
    citationFormatBluebook: "Bluebook",
    semanticSearchLabel: "Búsqueda semántica",
    semanticSearchOn: "Activada",
    semanticSearchOff: "Desactivada (solo búsqueda por palabras clave)",
    semanticSearchHint:
      "La búsqueda semántica utiliza embeddings para obtener resultados contextuales.",
    resultsPerPageLabel: "Resultados por página",
    savePrefs: "Guardar ajustes",

    // ── SourceLangForm ──
    sourceLangFormAriaLabel: "Guardar el idioma de origen",
    sourceLangOriginal: "Original (idioma del documento)",
    sourceLangDe: "Alemán",
    sourceLangFr: "Francés",
    sourceLangEn: "Inglés",
    sourceLangHint:
      "Determina el idioma en que se muestran los textos de las fuentes, cuando existen traducciones.",
    saveSourceLang: "Guardar idioma",

    // ── Tab 3: Seguridad ──
    securityHeading: "Seguridad",
    securityDesc:
      "Cambia tu contraseña, comprende las sesiones activas y consulta el historial de inicios de sesión de tu cuenta.",
    changePasswordLabel: "Cambiar contraseña",
    changePasswordDesc:
      "Elige una contraseña segura de al menos 8 caracteres. Se cifra de forma segura (hash) y nunca se almacena en texto plano.",
    ssoNoteTitle: "Inicio de sesión mediante inicio de sesión único (SSO)",
    ssoNoteBody:
      "Tu inicio de sesión lo gestiona tu universidad. Cambia la contraseña y la autenticación de dos factores directamente con tu universidad.",
    activeSessionsLabel: "Sesiones activas",
    activeSessionsBody1:
      "Scholar utiliza tokens de sesión de corta duración (JWT). El cierre de sesión único del lado del servidor no está previsto por diseño — para finalizar todas las sesiones usa",
    activeSessionsSignOut: "Cerrar sesión",
    activeSessionsBody2:
      "en el menú de navegación. Los nuevos inicios de sesión desde dispositivos desconocidos aparecen en el historial de inicios de sesión más abajo.",
    loginHistoryLabel: "Historial de inicios de sesión",
    loginHistoryDesc:
      "Los últimos 10 intentos de inicio de sesión de tu cuenta. Las entradas sospechosas se marcan en ámbar.",
    loginHistoryEmpty: "Aún no hay historial de inicios de sesión.",
    loginHistoryTableLabel: "Historial de inicios de sesión",
    colTimestamp: "Momento",
    colDevice: "Dispositivo / navegador",
    colIp: "IP (enmascarada)",
    colStatus: "Estado",
    statusAriaPrefix: "Estado:",

    // ── Login-event type labels ──
    eventLoginSuccess: "Correcto",
    eventLoginFailed: "Fallido",
    eventLoginBlocked: "Bloqueado",
    eventMfaRequired: "2FA requerida",
    eventMfaSuccess: "2FA correcta",
    eventMfaFailed: "2FA fallida",
    eventPasskeySuccess: "Clave de acceso",
    eventPasskeyFailed: "Clave de acceso fallida",
    eventBackupCodeUsed: "Código de respaldo",
    eventAccountLocked: "Cuenta bloqueada",
    eventAccountUnlocked: "Cuenta desbloqueada",
    eventSuspiciousLogin: "Sospechoso",

    // ── PasswordForm ──
    passwordFormAriaLabel: "Cambiar contraseña",
    currentPasswordLabel: "Contraseña actual",
    newPasswordLabel: "Nueva contraseña",
    newPasswordHint: "Al menos 8 caracteres; debe diferir de la actual.",
    confirmPasswordLabel: "Confirmar contraseña",
    savePassword: "Guardar contraseña",
    passwordChanged: "✓ Contraseña cambiada",
    passwordMismatch: "Las contraseñas no coinciden.",

    // ── Tab 4: Privacidad ──
    privacyHeading: "Privacidad",
    privacyDesc:
      "Controla qué almacena Scholar sobre ti, exporta tus datos (art. 20 RGPD) o solicita la eliminación de tu cuenta (art. 17 RGPD).",
    searchHistoryLabel: "Historial de búsquedas",
    searchHistoryDesc:
      "Scholar almacena tus búsquedas recientes para precargar los filtros de la biblioteca. Puedes consultarlo, borrarlo o desactivar el registro en cualquier momento.",
    searchHistoryEmpty: "No hay historial de búsquedas almacenado.",
    savedSearchesAriaLabel: "Búsquedas guardadas",
    recordingLabel: "Registro",

    // ── HistoryToggleForm ──
    historyToggleAriaLabel: "Ajuste del historial de búsquedas",
    recordSearchHistory: "Registrar el historial de búsquedas",
    currentlyPrefix: "Actualmente:",

    // ── ClearHistoryForm ──
    clearHistoryAriaLabel: "Borrar el historial de búsquedas",
    clearHistoryWarn:
      "Las búsquedas guardadas se eliminarán de forma permanente.",
    clearHistoryEmpty: "No hay historial de búsquedas.",
    clearHistoryButton: "Borrar el historial de búsquedas",

    // ── GDPR export ──
    exportLabel: "Exportar mis datos",
    exportDesc:
      "Descarga un archivo JSON con tu cuenta, tus ajustes y tu historial de búsquedas. El derecho a la portabilidad de los datos está regulado en el art. 20 RGPD.",
    exportButton: "Descargar datos",

    // ── Account deletion ──
    deletionLabel: "Solicitar la eliminación de la cuenta",
    deletionDesc:
      "Dado que tu acceso se proporciona a través de tu universidad, la eliminación de la cuenta se gestiona mediante el soporte de tu institución. Escríbenos un correo electrónico — coordinaremos la eliminación con tu universidad (art. 17 RGPD, derecho al olvido).",
    deletionButton: "Solicitar la eliminación (cs@caelex.eu)",
    deletionMailSubject: "Solicitud de eliminación – Caelex Scholar",
    deletionMailBody:
      "Estimado equipo de Caelex:\n\npor la presente solicito la eliminación de mi cuenta de Caelex Scholar.\n\nDirección de correo electrónico: {email}\n\nUn cordial saludo",
    deletionMailFallback: "(rellénalo, por favor)",

    // ── Tab 5: Acerca de Scholar ──
    aboutHeading: "Acerca de Caelex Scholar",
    aboutDesc:
      "Detalles técnicos, versión e información legal sobre la plataforma Scholar.",
    platformLabel: "Plataforma",
    platformBody1Prefix: "Caelex Scholar es powered by",
    platformBody1Suffix:
      "— el motor de investigación jurídica de Caelex. Atlas indexa leyes, reglamentos y sentencias de más de 10 jurisdicciones europeas y los pone a disposición mediante búsqueda semántica y filtros estructurados.",
    platformBody2:
      "Scholar está dirigido a usuarios universitarios para la investigación jurídica en los estudios y la investigación. La plataforma no sustituye al asesoramiento jurídico.",
    versionLabel: "Versión",
    versionValue: "Scholar · Atlas Engine · Caelex Platform",
    legalLabel: "Aspectos legales",
    legalNavLabel: "Información legal",
    legalPrivacy: "Política de privacidad",
    legalTerms: "Términos y condiciones",
    legalImpressum: "Aviso legal",

    // ── Footer ──
    footerBy: "por Caelex",
    footerCopyright: "© {year} Caelex",

    // ── Server action messages ──
    msgNotSignedIn: "No has iniciado sesión.",
    msgInvalidInput: "Entrada no válida.",
    msgNameEmpty: "El nombre no puede estar vacío.",
    msgSaveFailed: "No se pudo guardar. Inténtalo de nuevo.",
    msgSaveFailedShort: "No se pudo guardar.",
    msgDeleteFailed: "No se pudo eliminar. Inténtalo de nuevo.",
    msgSearchHistoryEnabled: "✓ Historial de búsquedas activado",
    msgSearchHistoryDisabled: "✓ Historial de búsquedas desactivado",
    msgSearchHistoryCleared: "✓ Historial de búsquedas borrado",

    // ── Shared status banner ──
    bannerSavedDefault: "✓ Guardado",

    // ── Generic pending indicator ──
    pendingEllipsis: "…",
  },
} as const satisfies ScholarNamespace;
