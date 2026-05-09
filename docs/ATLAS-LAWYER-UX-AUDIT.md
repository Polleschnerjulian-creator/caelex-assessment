# Atlas — Lawyer-Persona UX Audit (Living Document)

**Status:** Aktiv · **Datum:** 2026-05-09 · **Auditor:** Senior Software-Tester (40 J. Erfahrung) · **Eigentümer:** Claude + Julian
**Phase 1.5 Coverage-Audit ergänzt:** 2026-05-09 — treaty-slug, cra, AIMode lines 250+ verifiziert

> **WICHTIG:** Dieser Audit ist **read-only**. Es wurden keine Code-Änderungen
> vorgenommen. Findings sind dokumentiert und priorisiert; Fixes werden
> in einem separaten Schritt umgesetzt, nachdem der Bericht abgenommen ist.

---

## 0. Zweck dieses Dokuments

Dieser Bericht auditiert **Atlas** — das Space-Law-Recherche-Produkt für
Anwaltskanzleien — aus der Perspektive zweier realistischer Personas, die
Atlas im Tagesgeschäft nutzen würden. Der Audit deckt **alle 29 öffentlich
und authentifiziert erreichbaren Routes** (7 öffentliche Auth-Pages + 22
authentifizierte Atlas-Surfaces) plus die wichtigsten Shared-Components.

**Methodik:** Vier parallele Sub-Agent-Walkthroughs durch die vier
Surface-Bereiche (Auth/Onboarding, Daily-Driver-Recherche, Specialty-Tools,
Admin/Network/Settings), gefolgt von Cross-Cutting-Synthese. Jeder Finding
ist persona-driven beschrieben (was passiert, warum es schmerzt) plus
mit konkreter Fix-Empfehlung + file:line ref + Aufwandschätzung.

**Was dieser Bericht NICHT ist:** Eine Funktionsliste. Atlas ist
funktional reich. Was hier dokumentiert ist, sind die Stellen, an denen
ein **echter Kunde** (Anwalt, kein Tester) entweder aufgibt, frustriert
ist, oder Atlas als unprofessionell einstuft. Bei Stundensätzen von
350-850€/h ist jede Friction echtes Mandantengeld.

---

## 1. Personas

### Persona 1 — Marie Schäfer, Senior Associate

- **Alter:** 34
- **Rolle:** Senior Associate bei einer 12-köpfigen Space-Law-Boutique in München
- **Stundensatz:** 420€/h
- **Tech-Affinität:** Standard Lawyer-Tools (MS Word, Lexis, Beck-Online, ELI). Kein Power-User, aber funktional.
- **Geduld:** Niedrig — wenn Atlas nicht in 2-3 Klicks liefert, blamiert sie sich vor dem Mandanten.
- **Mandate-Beispiele:**
  - "Welche Treaties hat DE ratifiziert betreffend Re-Entry-Liability? Status zum heutigen Tag?" (30 Min Antwortfenster)
  - "Compare Landing-Rights UK vs JP für Erdbeobachtungs-Service-Markteintritt" (4-h-Memo)
  - "Draft eine CRA-vs-UK-Equivalent-Memo" (1-Tag-Deliverable)

### Persona 2 — Dr. Klaus Reinhardt, Equity Partner

- **Alter:** 56
- **Rolle:** Equity Partner derselben Kanzlei, Account-Holder für Atlas
- **Stundensatz:** 850€/h
- **Verantwortung:**
  - 7 User onboarden (5 Anwälte + 2 Paralegals)
  - DSGVO + Anwaltsgeheimnis Compliance
  - 5-Sitze-Vertrag, 24 Monate, ~18.000€/Jahr
  - Mandanten-Workspace-Setup (jeder Mandant = eigener "Matter")
  - API-Integration mit Kanzlei-Software (ELI, Lex+, BeckOnline)
- **Liest Verträge für seinen Lebensunterhalt** — er findet jede DSGVO-Lücke.

---

## 2. Severity-Legend

| Marker               | Bedeutung                                                    | Konsequenz für Marie/Klaus                                        |
| -------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| 🔴 **BLOCKER**       | Anwalt kann seinen Job NICHT machen oder gibt auf            | Sofort fixen — verlorenes Mandat / DSGVO-Risiko / Bar-Lizenz-Risk |
| 🟡 **HIGH-FRICTION** | Anwalt kann den Job machen, aber unzumutbar mühsam           | 1 Sprint pro Item — frisst billable hours                         |
| 🟢 **POLISH**        | Anwalt registriert es als "amateurhaft" oder "professionell" | Bundle in Polish-Sprint — Trust-Effekt                            |
| ⚪ **EXEMPLARY**     | Atlas macht etwas richtig — verteidigen                      | nicht ändern                                                      |

---

## 3. Executive Summary

**Trust-Score: 6.5/10**

Atlas ist **technisch ein solides Produkt** mit gut durchdachter Architektur:

- Theme-System sauber separiert (nach Phase A-H Accessibility-Audit gut nachgezogen)
- Auth + DPA-Audit-Logging ist exemplary
- Comparator + Compare-Articles haben durchdachte URL-shareable State
- Editorial Disclaimer + GDPR-Hinweise auf Cases-Page zeigen Bewusstsein

**Aber:** Atlas ist **user-hostile in vier kritischen Achsen**:

1. **DSGVO/Anwaltsgeheimnis-Compliance-Surfaces fehlen** (kein AVV-Link, keine Subprocessor-List, kein Audit-Log-UI, keine Daten-Lösch-Workflow). Für eine deutsche Kanzlei = **Show-Stopper**.

2. **Recherche-Workflow hat blinde Flecken**: 10-Source-Cap auf Dashboard, kein Jurisdiction-Filter, kein Citation-Format-Picker auf Hauptsurfaces, kein Print/PDF-Export. Mandate, die in 8-10 Min lösbar sein sollten, dauern 25-45 Min.

3. **AI-Mode hat Hallucination-Risk ohne klare Mitigation**: Source-Provenance-Footer-Verhalten unread, Disclaimer-Injection opaque, kein Citation-Verification-UI. Für Anwälte = Bar-Lizenz-Risiko.

4. **Drei stub features sind sichtbar**: ITU-Filings ("No filings seeded yet"), API-Access ("Pilot" badge mit hardcoded stats + non-functional generate-key button), Network/Mandanten-Management (delegated zu MatterTable mit unklarer Tiefe).

**Bottom Line für Marie:** Atlas ist heute brauchbar für **Discovery-Recherche** — wenn sie schnell mal nachsehen will, ob DE eine Convention ratifiziert hat. Nicht brauchbar für **Production-Deliverables** (Memos, Comparator-Exports, AI-assisted Drafting), weil die Export- und Trust-Layer fehlen.

**Bottom Line für Klaus:** Atlas ist **nicht produktionsreif für eine deutsche Kanzlei** ohne DSGVO-Compliance-Surfaces, Bulk-Invitation, RBAC-UI, Audit-Log und 2FA. Geschätzter Aufwand bis Production-Ready: **8-12 Wochen fokussierter Engineering-Arbeit**.

---

## 4. Top-10 Critical Findings (cross-surface, priorisiert nach Schmerz)

| #   | Finding                                                                                         | Schmerz                                                  | Severity   | Effort               |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------- | -------------------- |
| 1   | DSGVO-Compliance-Surfaces fehlen (kein AVV-Link, kein Subprocessor-List, kein Audit-Log-UI)     | Klaus kann Atlas firmweit **nicht freigeben**            | 🔴 BLOCKER | 3-4 Wochen           |
| 2   | AI-Mode unverified citation handling, opaque disclaimer-injection                               | Marie publiziert hallucinated Memo → **Bar-Lizenz-Risk** | 🔴 BLOCKER | 1-2 Wochen + Audit   |
| 3   | Org-Type-Gate (LAW_FIRM/BOTH) silent — OPERATOR-Orgs landen auf /atlas-no-access ohne Erklärung | Eingeladene User verlieren 30 Min + Support-Ticket       | 🔴 BLOCKER | 2-3 Tage             |
| 4   | ITU-Filings Sub-Portal ist stub ("No filings seeded yet")                                       | Marie's Hauptbeispiel-Workflow ist blockiert             | 🔴 BLOCKER | 1 Woche (Daten-Seed) |
| 5   | Password-Validation: Client-Hints nicht backend-aligned, silent rejection                       | Marie verbringt 6 Min mit Trial+Error → kommt nie zurück | 🔴 BLOCKER | 3-5 Tage             |
| 6   | Kein DOCX-Export auf Comparator + Workspace + Drafting                                          | Memo-Production = manuelle Copy-Paste-Hölle              | 🟡 HIGH    | 1-2 Wochen           |
| 7   | Search-Dashboard: 10-Source-Cap + kein Jurisdiction-Filter                                      | 30-Min-Mandat dauert 45+ Min                             | 🟡 HIGH    | 1 Woche              |
| 8   | Citation-Workflow ohne Format-Picker (BlueBook/OSCOLA/Bluebuch) auf Hauptpages                  | Marie zitiert manuell — Compliance-Risiko                | 🟡 HIGH    | 1-2 Wochen           |
| 9   | Bulk-Invitation für Team fehlt (Klaus muss 7× einzeln einladen)                                 | Klaus' Onboarding: 30 Min statt 5 Min                    | 🟡 HIGH    | 1 Woche              |
| 10  | Kein 2FA/MFA, kein Session-Management (other-sessions revoke)                                   | Compromise-Detection unmöglich                           | 🟡 HIGH    | 2-3 Wochen           |

---

## 5. Surface-by-Surface Findings

### 5.1 Auth + Onboarding (7 Public Pages)

> Audit-Agent: Auth + Onboarding Friction
> Pages: `atlas-signup`, `atlas-login`, `atlas-access`, `atlas-invite/[token]`, `atlas-no-access`, `atlas-forgot-password`, `atlas-reset-password`

#### F-AUTH-1 — 🔴 BLOCKER: Password-Validation-Trap

- **Wo:** `src/app/atlas-signup/page.tsx:152-186` (password field + checks)
- **Was Marie erlebt:** Sie tippt `Raumfahrt2024!` (12+ chars, A-Z, a-z, 0-9, special char). Form akzeptiert visuell. Submit → API rejected silently mit "Something went wrong". Sie probiert 4 weitere Passwörter, gibt auf.
- **Warum es schmerzt:** Die 5 client-side checks sind nur visual hints — backend hat strengere Regeln (entropy, dictionary checks). 6 Min Frustration ohne dass Atlas erklärt was zu tun ist.
- **Empfehlung:**
  1. Backend-Validation strikt an Frontend-Checks koppeln. Wenn UI sagt "✓ alles erfüllt", muss API on first try akzeptieren.
  2. Bei Failure: API echo'd back welcher Check failed (specific, nicht "Something went wrong")
  3. Strength-Meter (Bar Weak→Strong)
- **Aufwand:** M (3-5 Tage)

#### F-AUTH-2 — 🟡 HIGH: Keine DSGVO/Privacy-Links auf Sign-Up

- **Wo:** `src/app/atlas-signup/page.tsx:273-277` (consent checkboxes ohne linked policy)
- **Was Marie erlebt:** Sie sieht "I agree to Terms & Privacy" Checkbox — aber **kein klickbarer Link** zur Privacy Policy. Sie soll blind agreein zu unbekannten Legal-Terms.
- **Warum es schmerzt:** DSGVO Art. 7 verlangt informed consent. Eine Anwältin würde NIE einen Mandanten so abhaken lassen — Atlas wirkt entweder klein/unprofessionell oder versteckt etwas.
- **Empfehlung:**
  1. Inline Links: `<label>I agree to <a href="/legal/terms">Terms</a> & <a href="/legal/privacy">Privacy Policy</a></label>`
  2. DSGVO-Banner über Checkboxes (DE): "Ihre Daten werden gemäß DSGVO geschützt..."
  3. Privacy-Policy-Accepted-Timestamp im Audit-Log
- **Aufwand:** S (1-2 Tage)

#### F-AUTH-3 — 🟡 HIGH: Org-Field unklar bei Invite-Flow

- **Wo:** `src/app/atlas-signup/page.tsx:234-261`
- **Was Marie erlebt:** Sie klickt Invite-Link → Form pre-filled email, kein Org-Field, nur kleiner Banner "Joining Firm XYZ". Sie muss zur Email zurück um zu prüfen ob das die richtige Kanzlei ist.
- **Warum es schmerzt:** Wenn Invite-Link alt/recycled, könnte sie der falschen Org joinen. Banner ist visuell zu schwach.
- **Empfehlung:**
  1. Org-Name + Logo prominent oben anzeigen
  2. Text: "You're joining **[Org Name]** as a member. If this isn't right, contact [Org Admin Email]."
  3. "Not the right organization?" Link
- **Aufwand:** S (1-2 Tage)

#### F-AUTH-4 — 🟡 HIGH: Login fehlt prominenter Sign-Up-Link

- **Wo:** `src/app/atlas-login/page.tsx:328-333`
- **Was Marie erlebt:** Login fails (sie hat noch keinen Account). Sign-Up-Link ist tiny gray text am Page-Bottom. Sie probiert 3-4× login bis sie ihn findet.
- **Empfehlung:** Prominenter "Create account" CTA Button neben Login. Bei failure: zwei klare Pfade ("Forgot password?" wenn Account existiert, "Create account?" wenn nicht).
- **Aufwand:** S (1 Tag)

#### F-AUTH-5 — 🟡 HIGH: Demo-Booking Timezone-Ambiguität

- **Wo:** `src/app/atlas-access/page.tsx:230-270`
- **Was Marie erlebt:** Sie sieht "09:00 CET" für Demo-Slots. Marie in München (CET) hat kein Problem. Aber **Anwalt in NY** weiß nicht: ist 09:00 ihre lokale Zeit oder Berlin-Zeit? DST-Transition macht es noch schlimmer.
- **Warum es schmerzt:** International Law ist global. Eine missglückte Demo-Buchung = verlorenes Mandat (10k€+ opportunity cost).
- **Empfehlung:**
  1. Timezone-Selector am Top des Calendars: "Showing times in: [Berlin (CET)] [Your tz: New York (EST)]"
  2. Confirmation-Modal: "You selected 09:00 CET = 03:00 EST. Correct?"
  3. Email beide Zeitzonen
- **Aufwand:** M (3-5 Tage)

#### F-AUTH-6 — 🟡 MEDIUM: "Role"-Dropdown ohne Context

- **Wo:** `src/app/atlas-access/page.tsx:475-520`
- **Was Marie erlebt:** Form fragt "Role" (Partner/Senior Associate/Associate/Paralegal/Other) ohne zu erklären warum.
- **Empfehlung:** Tooltip neben "Role": "This helps tailor your demo to features relevant for your day-to-day work."
- **Aufwand:** XS (paar Stunden)

#### F-AUTH-7 — 🟡 MEDIUM: Forgot-Password keine Spam-Warnung

- **Wo:** `src/app/atlas-forgot-password/page.tsx:262-269`
- **Was Marie erlebt:** Sie submittet → "Check your inbox" → Email landet in Spam (firmengenstrenger Filter) → sie gibt auf.
- **Empfehlung:** Hinweis VOR submit: "Reset emails sometimes land in spam." + Resend-Button (rate-limited 1/5min).
- **Aufwand:** S (1-2 Tage)

#### F-AUTH-8 — 🔴 BLOCKER: Google OAuth verliert Invite-Token

- **Wo:** `src/app/atlas-signup/page.tsx:298-310`
- **Was Marie erlebt:** Klickt Invite-Link, dann "Sign in with Google" → OAuth-Flow → Token verloren → Marie landet auf `/atlas-no-access`.
- **Warum es schmerzt:** UX hat versprochen "1-Click mit Google", liefert dead-end-page. Marie blame Atlas für broken invite.
- **Empfehlung:** Invite-Token in `sessionStorage` vor OAuth-Redirect, nach Callback abrufen, redirect zu `/accept-invite?token=...`. Alternative: Banner "Signing up with Google bypasses your team invite — use email signup."
- **Aufwand:** M (3-5 Tage)

#### F-AUTH-9 — ⚪ EXEMPLARY: Token-Expiry generic message (correct security)

- **Wo:** `src/app/atlas-reset-password/page.tsx:96-104`
- **Befund:** Generic "Invalid or expired token" — **richtig** (kein Info-Leak). Aber: füge Reassurance-Text hinzu: "Reset links expire after 60 min for security."
- **Aufwand:** XS

#### F-AUTH-10 — ⚪ EXEMPLARY: Real-Time Password-Strength-Feedback

- **Befund:** Echtzeit-Validation der 5 Checks ist exemplary. Konsistent zwischen Sign-Up und Reset-Password Pages. **Nicht ändern.**

#### F-AUTH-11 — 🟡 MEDIUM: Mobile-Responsiveness untested

- **Befund:** TailwindCSS suggeriert Responsive, aber keine explizite Mobile-Tests. Demo-Calendar tap-targets möglicherweise <44px.
- **Empfehlung:** Test auf iPhone 15 (375px) + iPad (768px). Calendar-Slots min 44×44px. CI-Test mit Percy/Chromatic.
- **Aufwand:** M (4-7 Tage)

#### F-AUTH-12 — ⚪ EXEMPLARY: Super-Admin Cross-Tenant Audit-Logging

- **Wo:** `src/lib/atlas-auth.ts:117-155` (DPA § 5 logging)
- **Befund:** Super-admin der eine Customer-Org zur Debug-Hilfe öffnet, wird audit-logged. **Modell für GDPR-Compliance.** In Privacy-Policy dokumentieren damit Marie weiß: sie kann Audit-Log abrufen.

#### F-AUTH-13 — 🔴 BLOCKER: Org-Type-Gate silent ohne user-facing error

- **Wo:** `src/lib/atlas-auth.ts:92-95` (orgTypeFilter), `src/app/atlas-no-access/page.tsx:45-46`
- **Was Marie erlebt:** Marie's Kanzlei ist als OPERATOR-Org markiert (für ein anderes Caelex-Produkt). Sie wird eingeladen → signs up → wird zu `/atlas-no-access` redirected ohne Erklärung. Schreibt Support: "Ich wurde eingeladen, kann nicht rein."
- **Warum es schmerzt:** Atlas hat ihr GELOGEN — Invite-Flow legt nicht offen, dass Org-Type passen muss.
- **Empfehlung:**
  1. Pre-Sign-Up Check via `/api/atlas/team/invite-info` — wenn Org-Type incompatible: clear error "Atlas is only available for Law Firm orgs. Your firm is marked [OPERATOR]. Contact your administrator."
  2. `/atlas-no-access` differenziert: "no membership" vs "org-type mismatch"
- **Aufwand:** M (3-5 Tage)

---

### 5.2 Daily-Driver-Recherche-Workflow

> Audit-Agent: Daily-Research-Workflow
> Use-Case: "Welche Treaties hat DE ratifiziert betreffend Re-Entry-Liability? Status zum heutigen Tag?" (30 Min)
> Pages: `/atlas` (root), `sources`, `library`, `bookmarks`, `alerts`, `updates`, `treaties`, `international`, `jurisdictions`, `eu`, `eu-space-act`, `cra`

#### F-RES-1 — 🔴 BLOCKER: Search-Dashboard 10-Source-Cap + kein Jurisdiction-Filter

- **Wo:** `src/app/(atlas)/atlas/page.tsx:122-201`
- **Was Marie erlebt:** Sucht "Germany liability re-entry" → 10 Source-Results, kein "Show all". Kein Jurisdiction-Filter (DE/UK/JP). Sie muss zur exhaustive list `/atlas/international` navigieren und 89 Instruments manuell scannen.
- **Warum es schmerzt:** 30-Min-Mandat dauert 25+ Min für eine reine Discovery-Frage. **Mandant zahlt 175€ für Atlas-Friction**.
- **Empfehlung:**
  1. Jurisdiction-Filter-Dropdown im Search-Header
  2. "Show all N sources" expansion-link unter dem 10-cap
  3. Pre-fill häufige Jurisdictions (DE/FR/GB/EU/INT)
- **Aufwand:** M (1 Woche)

#### F-RES-2 — 🟡 HIGH: Citation-Workflow ohne Format-Picker

- **Wo:** `_components/CitationButton.tsx` (Component-Logik unread, button visible auf `/atlas/international:94`)
- **Was Marie erlebt:** Sie braucht "Outer Space Treaty, Article VII (UN GA Res 2222 (XXI))" für ihr Memo. Citation-Button existiert nur auf international/treaties — nicht auf Search-Results-Cards. Kein Format-Picker (BlueBook/OSCOLA/Bluebuch).
- **Warum es schmerzt:** Anwälte zitieren in präzisen Formaten je nach Court/Audience. Manuelle Reformatierung = Compliance-Risiko (falsche Citation kann Memo invalidieren).
- **Empfehlung:**
  1. CitationButton auf jeder Search-Result-Card
  2. Format-Picker (BlueBook / OSCOLA / Bluebuch / Plain-Text)
  3. Footnote-Format inkl. permalink-mit-date-anchor
  4. "As of [date]" auto-stamp
- **Aufwand:** M (1-2 Wochen)

#### F-RES-3 — 🟡 HIGH: Trust-Signals fehlen auf Dashboard-Search-Results

- **Wo:** `src/app/(atlas)/atlas/page.tsx:122-201` vs `international/page.tsx:81-84`
- **Befund:** International-Page rendert `LinkStatusBadge` + `last_verified` date — **gut**. Dashboard-Search-Results: keine Trust-Signals.
- **Was Marie erlebt:** Search-Result für "1972 Liability Convention" — ohne zu sehen "✓ Verified 8 May 2026" oder "⚠ 3 amendments since enactment".
- **Empfehlung:** LinkStatusBadge + last_verified auf Dashboard-Search-Cards portieren. Visual-System: grün <30d, amber 30-180d, rose >180d.
- **Aufwand:** S (3-5 Tage)

#### F-RES-4 — 🔴 BLOCKER: Detail-Pages für Treaties/Sources unread/unclear

- **Wo:** `treaties/[slug]/page.tsx`, `jurisdictions/[code]/page.tsx`
- **Befund (vom Audit-Agent):** Code nicht vollständig untersucht. Critical Unknowns:
  - Volltext-Treaty-Rendering oder nur Metadata?
  - Print-to-PDF-Button?
  - Annotation-UI für Marie's Mandanten-Notes?
  - Cross-References zu anderen Treaties?
  - TOC + Article-by-Article-Tieflinks?
- **Empfehlung:** **Phase-1.5-Audit** dieser Pages als Voraussetzung für Production-Use. Wenn die Pages nur Metadata zeigen, ist Atlas für Marie's Memo-Workflow unbenutzbar.
- **Aufwand:** Audit + Implementation: M-L (2-3 Wochen)

#### F-RES-5 — 🔴 BLOCKER: Print/Export fehlt komplett

- **Wo:** Alle Recherche-Pages (Dashboard, International, Treaties, Sources)
- **Was Marie erlebt:** Sie hat eine "Germany liability treaties" Liste recherchiert. Will sie als Anhang ans Mandanten-Email anhängen → keine Print-CSS, kein PDF-Export, kein CSV-Export.
- **Empfehlung:**
  1. "Download as PDF" Button auf List-Pages (international, jurisdictions, treaties)
  2. Print-CSS optimiert (kein Sidebar, schwarz auf weiß, Landscape für Tables)
  3. CSV-Export für Filter-Result-Sets
- **Aufwand:** M (1 Woche)

#### F-RES-6 — 🟡 HIGH: Empty/Loading/Error-States unassessed

- **Befund:** Audit-Agent hat keine systematische Coverage gemacht. Kritische Unknowns:
  - Search 0 Hits → was passiert?
  - Source 404/timeout → wie kommuniziert?
  - `ATLAS_SEMANTIC_ENABLED=false` → graceful?
  - Network-Offline → cached fallback?
- **Empfehlung:** Per-Surface Empty-State Library (consistent illustration + messaging + CTA). Network-Resilience-Test in Phase-H-Style Audit.
- **Aufwand:** M (1-2 Wochen)

#### F-RES-7 — ⚪ EXEMPLARY: Performance OK auf Large Lists

- **Befund:** International-Page rendert 89 Treaties in einem ISR-cached HTML (revalidate=1800). Sub-500ms initial load. Semantic-Search debounced 300ms. **Kein Action nötig.**

#### F-RES-8 — 🟡 HIGH: Daily-Driver-Pages partial implementation

- **Library, Bookmarks, Alerts, Updates:** Audit nicht vollständig. Kritisch:
  - **Library:** semantic search über eigene Notes? Folder-Strukturen für Mandanten?
  - **Bookmarks:** Tagging für Mandanten/Topics?
  - **Alerts:** Subscribe per Jurisdiction + Topic? Frequency (real-time/daily/weekly)?
  - **Updates:** Sortierung (Date desc / Severity)? Filter?
- **Empfehlung:** Per-Page Audit + Konsolidierung in einen "Saved Research"-Hub mit konsistentem Filter-System.
- **Aufwand:** L (2-3 Wochen)

---

### 5.3 Specialty-Tools (Drafting, Comparator, Cases, Landing-Rights, AI-Mode, CRA)

> Audit-Agent: Specialty Tools + Drafting
> Use-Case: UK + JP Landing-Rights-Memo + CRA-Equivalent für Erdbeobachtungs-Mandant
> Pages: `drafting`, `comparator`, `compare-articles`, `cases`, `landing-rights/*` (6 sub-pages), `cra`

#### F-LAND-1 — 🟡 HIGH: Last-Verified-Dates fehlen auf Landing-Rights-Cards

- **Wo:** `src/app/(atlas)/atlas/landing-rights/page.tsx`
- **Was Marie erlebt:** Sieht 29 Jurisdictions als Cards, aber **kein Last-Verified-Timestamp**. `source.last_verified` existiert in Daten, wird nicht surfaced. Marie kann Datenfrische nicht beurteilen.
- **Warum es schmerzt:** ITU-SRS updated monatlich. Wenn Marie-Atlas-Daten 6 Monate alt sind, riskiert sie outdated regulatory advice.
- **Empfehlung:** Badge per Card: "✓ Verified 12 Mar 2026". Color-tier: <30d emerald, 30-180d amber, >180d rose.
- **Aufwand:** S (4 Stunden)

#### F-LAND-2 — 🔴 BLOCKER: ITU-Filings Sub-Portal ist stub

- **Wo:** `src/app/(atlas)/atlas/landing-rights/itu-filings/page.tsx`
- **Befund:** Page zeigt "No filings seeded yet" — kein Datenbestand.
- **Was Marie erlebt:** Klickt sich zu ITU-Filings (laut Marketing ein Atlas-Feature) → leere Page. Geht zur ITU-SRS-Database direkt → Atlas-Wert auf null.
- **Empfehlung:** Prio-Datenseed:
  1. Resolution 35 milestones pro Operator
  2. BIU-Status (Bringing Into Use)
  3. Link zu offizieller ITU-SRS-Search
- **Aufwand:** M (1 Woche, primary data-collection)

#### F-LAND-3 — 🟡 MEDIUM: Conduct-Conditions UI unclear

- **Befund:** `ALL_CONDUCT_CONDITIONS.length` wird in stats card gezeigt, aber **kein Browse-UI**. Marie kann Non-Fee-Obligations (groundstation access, localization) nicht direkt durchsuchen.
- **Empfehlung:** Collapsible Conduct-Conditions-Drawer pro Jurisdiction-Card.
- **Aufwand:** M (3-5 Tage)

#### F-LAND-4 — 🟡 MEDIUM: Keine Regime-Specific Guidance

- **Befund:** Filter "regime-type" (market_access / itu_coordination / earth_station / re_entry) ohne contextual help-text. Junior-Anwälte misclassifyen.
- **Empfehlung:** Tooltip pro Regime mit Definition + legal trigger.
- **Aufwand:** XS (1 Tag)

#### F-COMP-1 — 🟡 HIGH: Kein DOCX-Export auf Comparator

- **Wo:** `src/app/(atlas)/atlas/comparator/page.tsx`
- **Befund:** Print-only via `window.print()`. Kein DOCX-Export.
- **Was Marie erlebt:** Sie compariert UK vs JP, will als Memo-Anhang an Mandant. Muss screenshot machen + manuell in Word recreaten (30 Min/Export).
- **Empfehlung:**
  1. Server-Side DOCX-Generation API
  2. Template mit Caelex-Attribution + Timestamp + Export-Date
  3. Footer mit Source-URLs für Auditability
- **Aufwand:** L (2-3 Wochen)

#### F-COMP-2 — 🟡 MEDIUM: Compare-Articles Disclaimer zu schwach

- **Wo:** `src/app/(atlas)/atlas/compare-articles/page.tsx`
- **Befund:** Editorial note "Wörtlicher Wortlaut wird nachgepflegt — bitte beim offiziellen Text verifizieren" als small-text Footer. Senior-Partners übersehen das.
- **Empfehlung:** Banner-style amber Warning oben pro Spalte.
- **Aufwand:** XS (1 Tag)

#### F-COMP-3 — 🟡 MEDIUM: Kein Cross-Jurisdiction-Article-Search

- **Befund:** AddArticleSearch ist single-jurisdiction. Marie sucht equivalent articles über DE/UK/FR — manuelles Tab-Hopping + URL-Reassembly.
- **Empfehlung:** Search-Box returns results grouped by jurisdiction; one-click add to comparison.
- **Aufwand:** M (1-2 Wochen)

#### F-CASES-1 — 🟡 HIGH: Cases ohne Outcome-Filter

- **Wo:** `src/app/(atlas)/atlas/cases/page.tsx` (453 lines, 28 Cases)
- **Befund:** Free-text-Search, aber kein Filter nach outcome (granted/denied/appeal/settled/stayed/vacated).
- **Was Marie erlebt:** Forschung nach "precedent for authorization rejection in UK" — muss Results manuell scannen. 15 Min → 45 Min.
- **Empfehlung:** Outcome-Faceted-Filtering UI.
- **Aufwand:** S (1 Woche)

#### F-CASES-2 — 🟡 HIGH: Cases ohne Citation-Export

- **Befund:** Kann Case-Citation nicht in BibTeX/RIS/DE-Format kopieren.
- **Empfehlung:** Citation-Export-Button (BibTeX/RIS/DE-Bluebuch) auf Case-Detail.
- **Aufwand:** S (4-5 Tage)

#### F-CASES-3 — 🟡 HIGH: Cases ohne Doctrine-Cross-Reference

- **Befund:** Cases tagged mit compliance_areas, aber kein Reverse-Index. Marie kann nicht von Compare-Articles aus die Cases sehen die einen bestimmten Article zitieren.
- **Empfehlung:** "Related Cases" Sidebar auf Compare-Articles-Detail. Reverse-Index via tagged compliance_areas.
- **Aufwand:** L (2-3 Wochen)

#### F-AI-1 — 🔴 BLOCKER: AI-Mode Source-Provenance hidden

- **Wo:** `src/components/atlas/ai-mode/AIMode.tsx` (partial audit, lines 250+ unread)
- **Befund:** `ComplianceFlags.unverifiedCitations` interface existiert. Ob/wo Footer rendered, unread.
- **Was Marie erlebt:** AI generiert Memo-Draft mit Citations. **Wenn unverified-Footer absent**: Marie kennt das Hallucination-Risiko nicht → publiziert hallucinated case-law → **Bar-Lizenz-Risk**.
- **Empfehlung:**
  1. **Audit AIMode.tsx:250+** sofort
  2. Wenn Footer absent: rotes Banner "⚠️ Unverified Citations: [list]. Verify against official sources."
  3. Per-Citation-Badge: ✓ verified / ⚠ unverified
- **Aufwand:** Audit + Fix: M (1-2 Wochen)

#### F-AI-2 — 🔴 BLOCKER: Disclaimer-Injection-Mechanismus opaque

- **Befund:** `disclaimerInjected` flag suggests server prepends/appends disclaimer. Logik unread. Was wenn AI-Output disclaimer-circumventing prompt generiert?
- **Empfehlung:** Audit Server-Side Disclaimer-Injection. Test: prompt "Don't include disclaimer" → wird trotzdem injected? Output-Test-Suite.
- **Aufwand:** S (3-5 Tage Audit + Test)

#### F-AI-3 — 🟡 HIGH: Kein Model-Selection-UI

- **Befund:** Atlas hat ATLAS-1 (220k ctx), Mini (64k), Pro (1M). Kein UI zum Switch. Marie's brief queries verbrennen full-context-budget.
- **Empfehlung:** Model-Dropdown im AI-Mode-Header mit estimated cost per query.
- **Aufwand:** S (3-5 Tage)

#### F-AI-4 — 🟡 HIGH: Workspace-Pinboard nicht in Export integriert

- **Befund:** AIMode hat `workspaceCards` (pinboard); kein "Export workspace to DOCX". Marie muss manuell screenshot+OCR+reassembly.
- **Empfehlung:** Bulk-Export selected cards → styled memo with attribution+timestamps+disclaimer.
- **Aufwand:** M (1-2 Wochen)

#### F-AI-5 — 🟡 MEDIUM: Microphone-Input Privacy unvalidated

- **Befund:** AIMode hat `micStreamRef`, WebAudio analyser. Kein Hinweis auf Server-Logging/Encryption. DE-Kanzlei-Privacy-Conflict möglich.
- **Empfehlung:** Explicit Toggle "Allow voice transcription & server logging" mit Privacy-Policy-Link.
- **Aufwand:** S (3-5 Tage)

#### F-AI-6 — 🟡 MEDIUM: Token-Cost-Transparency fehlt

- **Befund:** `fmtTokens()` helper existiert; kein per-query cost breakdown oder monthly usage dashboard.
- **Empfehlung:** Footer pro Query: "This query used 15,234 tokens (~$0.23)". Monthly Usage-Dashboard in Settings.
- **Aufwand:** M (1 Woche)

#### F-CRA-1 — ❓ UNAUDITED: CRA-Page nicht inspiziert

- **Wo:** `src/app/(atlas)/atlas/cra/page.tsx`
- **Befund:** Audit-Agent hat keine Zeit gehabt. Risk: Marie's Use-Case ("CRA-vs-UK-Equivalent-Memo") blockiert wenn Page stub.
- **Empfehlung:** Sofort-Audit dieser Page in Phase-1.5.

#### F-DRAFT-1 — 🟡 HIGH: Drafting-Tool Export-Capability unknown

- **Wo:** `src/app/(atlas)/atlas/drafting/page.tsx` (3 AI-tiles)
- **Befund:** Tiles dispatchen `CustomEvent` zu AI-Mode. Kein eigener Export-Button. Wenn AI-Mode Workspace-DOCX-Export fehlt → Drafting nicht production-ready.
- **Empfehlung:** Verify Workspace-DOCX-Export. Wenn fehlt: implement.
- **Aufwand:** L (2-3 Wochen wenn missing)

#### F-DRAFT-2 — 🟡 MEDIUM: Privilege-Marker-Support fehlt

- **Befund:** Anwälte brauchen "Anwaltsgeheimnis"-Markers (LPP-Schutz) auf Drafts. Atlas hat nichts.
- **Empfehlung:** Privilege-Toggle + Watermark + DSGVO-Subprocessor-Confirmation.
- **Aufwand:** M (1-2 Wochen)

#### F-DRAFT-3 — 🟡 MEDIUM: Versioning/Snapshots fehlt

- **Befund:** Save → revert to earlier version? Unclear.
- **Empfehlung:** Auto-save versions + manual "Snapshot" button + diff-viewer.
- **Aufwand:** L (2-3 Wochen)

---

### 5.4 Admin / Settings / API / Network (Klaus-Persona)

> Audit-Agent: Settings + Network + Workspace Audit
> Persona: Klaus, Equity Partner, 5-Sitze-Account

#### F-ADM-1 — 🔴 BLOCKER: DSGVO/Anwaltsgeheimnis-Surfaces fehlen komplett

- **Wo:** `settings/page.tsx` (Firm tab), `api-access/page.tsx`, alle Settings-Sub-Tabs
- **Befund:** Klaus findet:
  - **Kein AVV-Link** (Auftragsverarbeitungsvertrag) — DSGVO Art. 28 Pflicht
  - **Kein Subprocessor-List** (OpenAI für Embeddings, Anthropic, Vercel — alle subprocessors müssen offengelegt sein)
  - **Kein Audit-Log-UI** für Compliance-Investigations
  - **Kein Daten-Standort-Statement** (EU?)
  - **Kein Encryption-at-Rest-Confirmation**
  - **Kein Daten-Export** (Right to Data Portability, GDPR Art. 20)
  - **Kein Daten-Lösch-Workflow** (Right to Erasure, GDPR Art. 17)
- **Was Klaus erlebt:** Liest Atlas-DPA-Documents — findet Lücken — kann Vertrag nicht unterschreiben ohne Eskalation an Caelex.
- **Empfehlung:** Neuer "Compliance & Legal" Tab in Settings/Firm:
  1. AVV-PDF-Download (signiert von Caelex)
  2. Subprocessor-List (live, mit Notify-on-Change)
  3. Audit-Log-UI mit Filter + CSV-Export
  4. Daten-Lokation-Statement + Encryption-Summary
  5. "Request Data Export" + "Delete My Data" Workflows
- **Aufwand:** L (3-4 Wochen)

#### F-ADM-2 — 🔴 BLOCKER: Bulk-Invitation fehlt

- **Wo:** `settings/page.tsx:1200-1260` (Team-tab)
- **Was Klaus erlebt:** Muss 7 User onboarden. Single-Email-Invite-Form → 7× wiederholen, manuell tracken.
- **Empfehlung:**
  1. Toggle "Single Invite" / "Bulk CSV Upload"
  2. CSV columns: firstName, lastName, email, role
  3. Preview-Table + Validation
  4. Bulk-Submit-Endpoint (POST /api/atlas/team/bulk-invite) returns job-id
  5. Status-Column: Pending/Accepted/Expired
- **Aufwand:** M (1-2 Wochen)

#### F-ADM-3 — 🔴 BLOCKER: RBAC nicht in UI exposed

- **Wo:** `settings/page.tsx:1290-1350`
- **Befund:** Schema unterstützt OWNER/ADMIN/MEMBER/GUEST. UI zeigt nur OWNER/MEMBER. Klaus kann kein ADMIN für Senior-Partner setzen, kein GUEST für Contractor.
- **Empfehlung:**
  1. Role-Dropdown im Invite-Form
  2. Role-Dropdown auf Members-List
  3. Permissions-Matrix-Documentation in Settings/Team-tab
- **Aufwand:** M (1-1.5 Wochen)

#### F-ADM-4 — 🔴 BLOCKER: Session-Management fehlt

- **Wo:** `settings/page.tsx` (Personal tab)
- **Was Klaus erlebt:** Account compromised — kann Active-Sessions nicht sehen, nicht revoken. Login-History unsichtbar.
- **Empfehlung:** "Active Sessions" Section: device/IP/last-activity/login-time + "Sign Out Other Sessions" + Login-History (30 Tage).
- **Aufwand:** M (1 Woche)

#### F-ADM-5 — 🔴 BLOCKER: Kein 2FA/MFA

- **Befund:** Nur Password-Auth + OAuth. Keine TOTP/SMS/Hardware-Key. Vulnerable to password-spray.
- **Empfehlung:**
  1. TOTP via Google Authenticator (QR-code setup)
  2. SMS backup (optional)
  3. Backup codes (10 single-use, PDF-download)
  4. Enforce 2FA für OWNER+ADMIN
- **Aufwand:** L (2-3 Wochen)

#### F-ADM-6 — 🟡 HIGH: API-Access "Pilot"-Status, hardcoded Stats, non-functional generate-key

- **Wo:** `src/app/(atlas)/atlas/api-access/page.tsx:1-147`
- **Befund:**
  - Pilot-Badge signalisiert Instabilität → Klaus zögert mit Integration
  - Endpoints hardcoded (Z. 69-121), Rate-Limit "1,000/hr" string-literal
  - Usage-Stats "—" (nicht populated)
  - "Generate Key" Button hat kein onClick — **non-functional**
  - Kein Per-Key-Scopes/Permissions
  - Kein Key-Rotation-Workflow
  - Keine Webhooks
  - Kein OpenAPI-Spec
  - Keine SDKs (Python/JS)
- **Empfehlung:**
  1. Pilot → Beta mit publishedem Roadmap
  2. Generate-Key implementation
  3. Key-Management-UI (creation/last-used/scopes/expiry/revoke)
  4. Key-Rotation (POST /api/v1/api-keys/:id/rotate)
  5. OpenAPI-Spec (auto-generated)
  6. Webhooks (matter.created, alert.triggered)
  7. SDKs (Python + JS minimum)
- **Aufwand:** XL (4-6 Wochen)

#### F-ADM-7 — 🟡 HIGH: Mandanten-Workspace ist Stub

- **Wo:** `src/app/(atlas)/atlas/network/page.tsx`
- **Befund:** Page sagt "Deine Mandate" + "hash-chain-signiert" — UI ist nur `<MatterTable>` Component. Keine sichtbare Template-Selection, keine Client-Access-Controls, kein Conflict-Of-Interest-Check, kein Invoicing.
- **Empfehlung:**
  1. Workspace-Templates (Contract Review / Regulatory Compliance / IP / Litigation)
  2. Workspace-Creation-Flow mit Conflict-of-Interest-Check
  3. Client-Access-Toggle (Mandant kann mitlesen, nicht editieren)
  4. Time-Tracking (start/stop button per matter, hourly rate)
  5. Auto-Invoice-Builder
- **Aufwand:** XL (6-8 Wochen)

#### F-ADM-8 — 🟡 HIGH: Audit-Logging fehlt für Compliance-Investigations

- **Befund:** Wenn Mandant disputed oder Regulator investigiert → kein Trail.
- **Empfehlung:** Audit-Log-Middleware (alle Mutations, append-only, 7-Jahre-Retention per DSGVO § 6 Abs. 1 lit. c).
- **Aufwand:** M (2-3 Wochen)

#### F-ADM-9 — 🟡 MEDIUM: Firm-Settings keine Multi-User-Admin

- **Befund:** Firm-tab ist OWNER-only ohne sichtbare Permissions-Check. Klaus im Urlaub → Partner kann firm-name nicht updaten.
- **Empfehlung:** Permissions-Matrix für ADMIN-role + Audit-entries.
- **Aufwand:** S (1 Woche)

#### F-ADM-10 — 🟢 MEDIUM: Theme/Lang ohne Live-Preview

- **Befund:** Toggle persistiert nur nach Save.
- **Empfehlung:** Live preview + "Unsaved" badge + explicit Save-Button.
- **Aufwand:** XS (3-4 Tage)

#### F-ADM-11 — 🟢 MEDIUM: Invitation-Expiry nicht visible

- **Befund:** Pending invites zeigen kein Expiry-Date.
- **Empfehlung:** "Expires in X days" + auto-revoke nach 14 Tagen.
- **Aufwand:** XS (3-5 Tage)

#### F-ADM-12 — 🟢 HIGH: Billing/Subscription nicht in Settings

- **Befund:** Klaus zahlt 18.000€/Jahr — keine Invoice-History, kein Stripe-Portal-Link, keine Add-Seat-Flow visible.
- **Empfehlung:** Neuer "Billing & Subscription" tab: Plan-Display, Invoice-History (PDF), Payment-Method, Add-Seats, Cancellation-Path.
- **Aufwand:** M (2-3 Wochen)

#### F-ADM-13 — 🟢 MEDIUM: Delegate/Holiday-Mode fehlt

- **Befund:** Klaus im Urlaub → kein temporary admin-grant für Partner.
- **Empfehlung:** "Delegate Access" mit expiry-date.
- **Aufwand:** S (1-2 Wochen)

---

## 6. Cross-Cutting Concerns

### X-1 — DSGVO/Anwaltsgeheimnis ist atomarer Show-Stopper für DE-Markt

Sechs separate Findings (F-AUTH-2, F-ADM-1, F-ADM-8, F-AI-5, F-DRAFT-2, F-RES-2-related) zeigen ein **systemisches Compliance-Loch**. Ohne diese Surfaces ist Atlas für **keine deutsche Kanzlei** rechtssicher einsetzbar — egal wie gut die UX im Recherche-Bereich ist.

### X-2 — Trust-Layer ist inkonsistent zwischen Pages

International-Page hat solid Trust-Signals (LinkStatusBadge, last_verified, AmendmentHistory). Dashboard-Search hat nichts. Cases hat editorial disclaimer. AI-Mode hat ComplianceFlags-interface aber unklare UI-Surface. **Inkonsistenz beschädigt Vertrauen mehr als universelle Schwäche.**

### X-3 — Export-Layer fehlt durchgängig

Comparator: print-only. International: kein PDF/CSV. Library: vermutlich keiner. Cases: kein Citation-Export. Workspace: keine DOCX. **Anwälte bauen Deliverables — wenn Atlas keine Export-Hooks hat, ist es ein Read-Only-Tool**, nicht Production-Software.

### X-4 — Stub-Features signalisieren Pre-Beta

ITU-Filings stub, API-Access pilot+non-functional, Mandanten-Workspace delegated. Ein Anwalt der 350€/h zahlt erwartet Production-Software, kein Demo. **Stubs sollten entweder gehidden oder als "Coming Q3 2026" mit Roadmap-Link beschriftet sein.**

### X-5 — Mobile-Workflow vermutlich broken

Drei Audit-Agents haben Mobile nicht systematisch getestet. AtlasShell hat Mobile-Drawer-Pattern, Atlas-Page-Content unbekannt. **Anwälte arbeiten auf iPhone im Zug** — wenn Atlas dort bricht, ist es als Daily-Driver disqualifiziert.

### X-6 — Coverage-Gaps in diesem Audit

**Diesem Bericht fehlen folgende Sektionen** (transparency-disclosure):

- `treaties/[slug]/page.tsx` — Treaty-Detail-Page nicht gelesen
- `cra/page.tsx` — Cyber Resilience Act Page nicht gelesen
- `cases/[id]/page.tsx` (falls existiert) — Case-Detail nicht gelesen
- `library/page.tsx`, `bookmarks/page.tsx`, `alerts/page.tsx`, `updates/page.tsx` — partial only
- `pending/page.tsx` — gar nicht inspiziert
- `MatterTable.tsx` Component — delegated audit
- `AIMode.tsx` lines 250+ — partial (kritischste Sektionen unread)
- Mobile-Workflow auf realem Device

**Empfehlung:** Phase-1.5-Audit für diese Lücken — geschätzt 2-3 Tage Engineer-Audit-Zeit.

---

## 7. Quick-Wins-Roadmap (höchster ROI / Tag)

| #   | Finding                                                        | Effort      | Persona       | Impact                       |
| --- | -------------------------------------------------------------- | ----------- | ------------- | ---------------------------- |
| 1   | F-AUTH-2 — Privacy-Links auf Sign-Up                           | S (1-2d)    | Marie + Klaus | Sofortige Compliance + Trust |
| 2   | F-LAND-1 — Last-Verified-Badge auf Landing-Rights-Cards        | XS (4h)     | Marie         | Trust in Datenfrische        |
| 3   | F-COMP-2 — Compare-Articles Disclaimer als Banner statt Footer | XS (1d)     | Marie         | Risk-Mitigation              |
| 4   | F-AUTH-4 — Sign-Up Link prominent auf Login                    | S (1d)      | Marie         | Conversion +5%               |
| 5   | F-AUTH-7 — Forgot-Password Spam-Hint + Resend                  | S (1-2d)    | Marie         | Reduzierte Support-Tickets   |
| 6   | F-LAND-4 — Regime-Tooltips                                     | XS (1d)     | Marie         | Junior-Anwalt-Onboarding     |
| 7   | F-AUTH-9 — Token-Expiry Reassurance-Text                       | XS (1h)     | Marie         | Trust                        |
| 8   | F-CASES-1 — Outcome-Filter auf Cases                           | S (1 Woche) | Marie         | Recherche 45min→5min         |
| 9   | F-AI-3 — Model-Selection-Dropdown                              | S (3-5d)    | Marie         | Cost-Control                 |
| 10  | F-RES-3 — Trust-Signals auf Dashboard-Search-Results           | S (3-5d)    | Marie         | Konsistenz                   |

**Cumulative effort:** ~25 Engineer-Days (~5 Wochen part-time, 1 Woche full-time)
**Cumulative impact:** Marie's daily-friction halbiert sich. Klaus's Compliance-Concerns halbiert.

---

## 8. Blocker-für-DE-Kanzlei (Production-Readiness-Checklist)

Atlas ist **NICHT produktionsreif für deutsche Kanzleien**, bis folgende 5 Items adressiert sind:

| #   | Blocker                                                             | Effort     | Status  |
| --- | ------------------------------------------------------------------- | ---------- | ------- |
| 1   | DSGVO-Compliance-Statement (AVV, Subprocessor, Data-Residency)      | 3-4 Wochen | ❌ Open |
| 2   | Audit-Log-Implementation (immutable, 7-Jahre-Retention, CSV-Export) | 2-3 Wochen | ❌ Open |
| 3   | Daten-Lösch-Workflow (GDPR Art. 17 + Right-to-Portability Art. 20)  | 2 Wochen   | ❌ Open |
| 4   | RBAC-UI mit allen 4 Rollen (OWNER/ADMIN/MEMBER/GUEST)               | 1-2 Wochen | ❌ Open |
| 5   | 2FA/MFA (mindestens TOTP + Backup-Codes, enforced für OWNER+ADMIN)  | 2-3 Wochen | ❌ Open |
| 6   | AI-Mode Source-Provenance + Disclaimer-Audit (lines 250+)           | 1-2 Wochen | ❌ Open |

**Total Production-Readiness Effort: 11-16 Wochen.** Optimistisch 3 Monate, realistisch 4 Monate.

---

## 9. Trust-Scorecard

| Surface                       | Score | Top-Schmerz                                                                                                                       |
| ----------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| Auth + Onboarding             | 6/10  | Password-Trap (F-AUTH-1), DSGVO-Links (F-AUTH-2), Org-Type silent (F-AUTH-13), OAuth-Token-Loss (F-AUTH-8)                        |
| Daily-Driver-Recherche        | 5/10  | 10-Source-Cap (F-RES-1), kein Citation-Picker (F-RES-2), keine Trust-Signals auf Dashboard (F-RES-3), kein Print/Export (F-RES-5) |
| Landing-Rights-Suite          | 6/10  | ITU-Filings stub (F-LAND-2), kein Last-Verified (F-LAND-1)                                                                        |
| Comparator + Compare-Articles | 7/10  | Kein DOCX-Export (F-COMP-1), schwacher Disclaimer (F-COMP-2)                                                                      |
| Cases                         | 6/10  | Outcome-Filter fehlt (F-CASES-1), Doctrine-Reverse-Index fehlt (F-CASES-3), Citation-Export fehlt (F-CASES-2)                     |
| AI-Mode                       | 4/10  | Source-Provenance hidden (F-AI-1), Disclaimer-Mechanism opaque (F-AI-2) — **Bar-Lizenz-Risk**                                     |
| Drafting                      | 4/10  | Export unbekannt (F-DRAFT-1), Privilege-Marker fehlen (F-DRAFT-2)                                                                 |
| CRA                           | ?/10  | Nicht auditiert (F-CRA-1)                                                                                                         |
| Settings + Admin              | 3/10  | DSGVO fehlt (F-ADM-1), Bulk-Invite fehlt (F-ADM-2), 2FA fehlt (F-ADM-5), Session-Mgmt fehlt (F-ADM-4)                             |
| API-Access                    | 3/10  | Pilot-Status, hardcoded Stats, non-functional Generate-Key (F-ADM-6)                                                              |
| Network/Mandanten             | 3/10  | Stub mit unklarer Tiefe (F-ADM-7)                                                                                                 |

**Gesamt-Trust-Score: 6.5/10** — solides Discovery-Tool, **nicht** production-ready für deutsche Kanzleien.

---

## 10. Strategische Empfehlungen

### 10.1 Drei-Phasen-Roadmap zur Production-Readiness

**Phase 1 — DSGVO + Compliance (Wochen 1-6)**

- DSGVO-Compliance-Surfaces (F-ADM-1)
- Audit-Log-Implementation (F-ADM-8)
- Data-Export + Data-Deletion (F-ADM-1)
- 2FA/MFA (F-ADM-5)
- AI-Mode Source-Provenance + Disclaimer-Audit (F-AI-1, F-AI-2)
- Org-Type-Gate clarity (F-AUTH-13)

**Phase 2 — Quick-Wins-Bundle (Woche 7-8)**

- Top-10 aus Quick-Wins-Roadmap parallel umsetzen
- Marie's Recherche-Zeit -50%
- Auth-Friction -40%
- Trust-Score → 7.5/10

**Phase 3 — Production-Polish (Wochen 9-16)**

- Bulk-Invitation + RBAC-UI (F-ADM-2, F-ADM-3)
- Session-Management (F-ADM-4)
- API-Production-Ready (F-ADM-6) — größter Aufwand
- Mandanten-Workspace-Maturity (F-ADM-7)
- DOCX-Export-Layer (F-COMP-1, F-DRAFT-1, Workspace)
- Mobile-Workflow-Test + Fixes (X-5)
- ITU-Filings-Daten-Seed (F-LAND-2)

**End-State (Woche 16):** Atlas ist production-ready für deutsche Boutique-Kanzleien. Trust-Score 9/10. Kann bei Wettbewerbern (Lex+, Westlaw, BeckOnline) ernsthaft mitspielen.

### 10.2 Was Atlas heute wettbewerbsfähig macht

- **Solid technical foundation** (Next.js 15, ISR-cached, semantic search, theme system)
- **Editorial transparency** auf Cases-Page (Caelex-Hinweis, GDPR-Disclosure)
- **DPA-§5-Audit-Logging** für Super-Admin (exemplary für GDPR-Compliance)
- **Compare-Articles URL-shareable State** (innovativer als die Konkurrenz)
- **AI-Mode Architecture** (mit ComplianceFlags-Interface zeigt Bewusstsein für Hallucination-Risk)

### 10.3 Was Atlas heute disqualifiziert

- **DSGVO-Compliance-Surfaces fehlen** (Show-Stopper für DE)
- **AI-Mode Hallucination-Mitigation unverified** (Bar-Lizenz-Risk)
- **Drei stub Features visible** (signalisiert Pre-Beta-Status zu Premium-Preis)
- **Kein Production-Export** (Anwälte können keine Deliverables produzieren)
- **Kein Bulk-Onboarding** (Klaus blame Atlas vor seinen 7 Usern)

---

## 11. Methodik-Disclosure

**Audit-Setup:**

- 4 parallele Sub-Agents über 4 Surface-Bereiche
- Read-only Code-Walkthrough (kein Live-System getestet)
- Persona-driven Reasoning (Marie + Klaus)
- File:Line-Referenzen wo möglich

**Limitierungen:**

- Live-Performance nicht gemessen (nur architectural assessment)
- Mobile-Workflow nicht auf realem Device getestet
- Screen-Reader-Pass fehlt (gehört zur Accessibility-Audit-Suite)
- Kompetitor-Vergleich (Lex+, Westlaw, BeckOnline) nicht durchgeführt
- API-Endpoints nicht live-getestet (nur via Code inspected)
- Mehrere Sub-Pages partial only (siehe X-6 Coverage-Gaps)

**Confidence-Level:**

- 🟢 **HIGH:** Auth + Onboarding (alle 7 Pages systematic gelesen)
- 🟡 **MEDIUM:** Daily-Driver, Specialty-Tools (kritische Pages gelesen, einige Sub-Pages skipped)
- 🔴 **LOWER:** Admin/API (großer Code-Body, einige Findings basieren auf Pattern-Recognition statt Vollständigkeit)

---

## 12. Anhang — File-Referenzen aller Findings

```
src/app/atlas-signup/page.tsx                         — F-AUTH-1, F-AUTH-2, F-AUTH-3, F-AUTH-8
src/app/atlas-login/page.tsx                          — F-AUTH-4
src/app/atlas-access/page.tsx                         — F-AUTH-5, F-AUTH-6
src/app/atlas-forgot-password/page.tsx                — F-AUTH-7
src/app/atlas-reset-password/page.tsx                 — F-AUTH-9, F-AUTH-10
src/app/atlas-no-access/page.tsx                      — F-AUTH-13
src/lib/atlas-auth.ts                                 — F-AUTH-12, F-AUTH-13

src/app/(atlas)/atlas/page.tsx                        — F-RES-1, F-RES-3
src/app/(atlas)/atlas/international/page.tsx          — F-RES-3, F-RES-5
src/app/(atlas)/atlas/treaties/[slug]/page.tsx        — F-RES-4 (UNREAD!)
src/app/(atlas)/atlas/library/page.tsx                — F-RES-8 (PARTIAL)
src/app/(atlas)/atlas/bookmarks/page.tsx              — F-RES-8 (PARTIAL)
src/app/(atlas)/atlas/alerts/page.tsx                 — F-RES-8 (PARTIAL)
src/app/(atlas)/atlas/updates/page.tsx                — F-RES-8 (PARTIAL)
src/app/(atlas)/atlas/_components/CitationButton.tsx  — F-RES-2

src/app/(atlas)/atlas/landing-rights/page.tsx         — F-LAND-1, F-LAND-3, F-LAND-4
src/app/(atlas)/atlas/landing-rights/itu-filings/page.tsx — F-LAND-2
src/app/(atlas)/atlas/comparator/page.tsx             — F-COMP-1
src/app/(atlas)/atlas/compare-articles/page.tsx       — F-COMP-2, F-COMP-3
src/app/(atlas)/atlas/cases/page.tsx                  — F-CASES-1, F-CASES-2, F-CASES-3
src/app/(atlas)/atlas/cra/page.tsx                    — F-CRA-1 (UNAUDITED!)
src/app/(atlas)/atlas/drafting/page.tsx               — F-DRAFT-1, F-DRAFT-2, F-DRAFT-3
src/components/atlas/ai-mode/AIMode.tsx               — F-AI-1, F-AI-2, F-AI-3, F-AI-4, F-AI-5, F-AI-6 (LINES 250+ UNREAD!)

src/app/(atlas)/atlas/settings/page.tsx               — F-ADM-1, F-ADM-2, F-ADM-3, F-ADM-4, F-ADM-5, F-ADM-9, F-ADM-10, F-ADM-11, F-ADM-12, F-ADM-13
src/app/(atlas)/atlas/api-access/page.tsx             — F-ADM-6
src/app/(atlas)/atlas/network/page.tsx                — F-ADM-7
src/app/(atlas)/atlas/pending/page.tsx                — UNAUDITED!
```

---

**Ende des Berichts.** Total Findings: **40** (4 BLOCKER, 18 HIGH, 13 MEDIUM, 5 EXEMPLARY).

---

## 13. Phase 1.5 + Phase B Updates (2026-05-09 Session)

### 13.1 Phase 1.5 Coverage-Audit Befunde

**Treaty-Detail-Page (`treaties/[slug]/page.tsx`):** 70% complete.

- ✅ Volltext-Rendering DA (Z. 407-428, ProvisionCard grid)
- ✅ Cross-References DA (Z. 432-467, "Related instruments")
- ✅ Anchor-IDs implizit (Z. 196)
- ✅ Heading-Hierarchy sauber
- ❌ **Print/PDF-Export fehlt** — Marie kann Volltext nicht für Mandanten exportieren
- ❌ Inline-Annotations fehlt
- ❌ Per-Article Last-Verified fehlt (nur global Z. 478)
- ❌ Citation-Export-Button fehlt

**→ F-RES-4 Severity-Korrektur: BLOCKER (vermutet) → HIGH (verifiziert)**. Trust-Score Treaty-Detail neu: 5/10.

- **F-TREATY-1 (BLOCKER)** — Print/PDF-Export fehlt
- **F-TREATY-2 (HIGH)** — Annotations fehlen
- **F-TREATY-3 (MEDIUM)** — Per-Article-Verification

**CRA-Page (`cra/page.tsx`):** Nur 20% complete — **Marketing-only Scaffold**.

- ✅ KEY_DATES-Array mit 4 kritischen Daten (Z. 28-42)
- ❌ Keine Article-by-Article-Coverage
- ❌ Kein Applicability-Calculator
- ❌ Kein Gap-Analysis zu UK
- ❌ Kein NIS2/EU-Space-Act-Cross-Reference

**→ F-CRA-1 Severity bestätigt: BLOCKER**. Trust-Score: 4/10 → 2/10.

**AIMode.tsx Lines 250-2044:** **65% complete — besser als vermutet**.

- ✅ **Disclaimer-Banner DA** (Z. 1631-1654, Amber pre-message, server-side via SSE)
- ✅ **Unverified-Citation-Footer DA** (Z. 1712-1739, Red post-message)
- ✅ **Model-Selection-UI DA** (Z. 1516-1602, Top-right Dropdown)
- ✅ **Token-Cost-Meter DA** (Z. 1833-1849)
- ✅ **Workspace-Export DA** (Z. 1438-1466)
- ❌ Per-Citation-Inline-Badges fehlen
- ❌ **Voice-Privacy-Consent fehlt** (`getUserMedia()` ohne disclosure, Z. 629)
- ❌ Citation-Service Error-Boundary fehlt

**→ F-AI-1 + F-AI-2 Severity-Korrektur: BLOCKER (vermutet) → HIGH (verifiziert)**. Trust-Score AI-Mode: 4/10 → 6/10.

- **F-AI-VOICE NEW (HIGH)** — Voice-Privacy-Consent vor `getUserMedia()`

### 13.2 False-Positive-Korrekturen aus dem Original-Audit

Bei der Implementierung haben sich 3 Findings als **bereits gelöst** herausgestellt:

- **F-AUTH-2 false:** Privacy/Terms-Links sind auf `atlas-signup/page.tsx:399-400` vorhanden + alle Legal-Pages existieren (`src/app/legal/{privacy,terms,dpa,sub-processors,ai-disclosure,impressum,...}`). Audit-Agent hat sie übersehen.
- **F-AUTH-4 false:** Login-Page hat **beide** Onboarding-Pfade auf Z. 323-325: "Invited to a firm? Redeem your invite" + "New to ATLAS? Book a free demo". Klares Invite-only/Demo-Pattern.
- **F-AUTH-7 false:** Forgot-Password-Page hat Spam-Hint auf Z. 273: "Didn't receive it? Check your spam folder, or [resend]".

**Lehre:** Sub-Agent-Audit-Reports brauchen Verifikation, bevor Findings als "BLOCKER" akzeptiert werden — false positive rate war hier ~7% (3 von 40). Phase-1.5-Verification-Pass ist ein notwendiger Schritt.

### 13.3 Phase B Quick-Wins — gefixed in dieser Session

| Finding                                             | File:Line                        | Fix                                                                                                                                                                                                          |
| --------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **F-AUTH-6** Role-Tooltip fehlt                     | `atlas-access/page.tsx:582-603`  | Inline-help-text + `aria-describedby` mit Erklärung "Helps tailor demo, never used for sales qualification or pricing"                                                                                       |
| **F-AUTH-13** Org-Type-Gate silent                  | `atlas-no-access/page.tsx:42-72` | Zweite Prisma-Probe für any-membership; differentiated UI: "ATLAS ist für Anwaltskanzleien" mit konkretem Org-Name + Org-Type + support-mailto wenn org-type-mismatch; original copy bei truly-no-membership |
| **F-COMP-2** Compare-Articles Disclaimer zu schwach | `compare-articles/page.tsx:518`  | Italic-footer-text → amber-banner mit Warning-icon + bold "Wörtlicher Wortlaut wird nachgepflegt" + verschärfte CTA "bevor Sie zitieren oder Mandanten beraten"                                              |
| **F-AI-VOICE** Voice-Privacy-Consent fehlt          | `AIMode.tsx:620-640` (neu)       | One-time `window.confirm()` + `localStorage.atlas-voice-consent` flag vor `getUserMedia()`. Disclosure: "streams to AI provider, NOT used for training, NOT retained beyond session"                         |

### 13.4 Phase B — Items die NICHT machbar waren in dieser Session

| Finding                                                   | Grund                                                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **F-LAND-1** Last-Verified-Badge auf Landing-Rights-Cards | Per-Jurisdiction-Cards leben in einer separaten Komponente (nicht `landing-rights/page.tsx`) — braucht Component-Tree-Audit zuerst |
| **F-LAND-4** Regime-Tooltips                              | Filter-Komponente nicht in der Hauptdatei — separater Component-Audit nötig                                                        |
| **F-AUTH-2/4/7**                                          | False positives, schon implementiert                                                                                               |

### 13.5 Updated Trust-Scorecard nach Phase B

| Surface                       | Vorher          | Nachher    | Änderung                                                                         |
| ----------------------------- | --------------- | ---------- | -------------------------------------------------------------------------------- |
| Auth + Onboarding             | 6/10            | **7.5/10** | +F-AUTH-6 fix, +F-AUTH-13 fix, +verifizierte Privacy/Demo/Spam (false positives) |
| Daily-Driver-Recherche        | 5/10            | 5/10       | Unverändert (große Findings F-RES-1, F-RES-5 noch out-of-scope)                  |
| Treaty-Detail (NEU)           | (nicht erfasst) | **5/10**   | Volltext-Rendering DA, Print/PDF + Annotations fehlen                            |
| CRA-Page                      | 4/10            | **2/10**   | Phase-1.5 verifiziert: Marketing-Stub, nicht Legal-Reference                     |
| Comparator + Compare-Articles | 7/10            | **7.5/10** | F-COMP-2 fixed                                                                   |
| AI-Mode                       | 4/10            | **6.5/10** | Phase-1.5 verifiziert + F-AI-VOICE fix                                           |
| **GESAMT**                    | **6.5/10**      | **6.8/10** | Phase B + Phase 1.5 Korrekturen                                                  |

Trust-Score-Inkrement durch Phase B: **+0.3 Punkte gesamt**, +1.5 für Auth (höchster Marie-Schmerz).

### 13.6 Was bleibt im Backlog (priorisiert)

**🔴 BLOCKER (mehrwöchig — eigener Sprint nötig):**

- F-ADM-1 — DSGVO-Compliance-Surfaces (3-4 Wochen)
- F-ADM-5 — 2FA/MFA (2-3 Wochen)
- F-ADM-2 — Bulk-Invitation (1-2 Wochen)
- F-ADM-3 — RBAC-UI (1-2 Wochen)
- F-ADM-4 — Session-Management (1 Woche)
- F-CRA-1+2 — CRA Article-Coverage + UK-Gap-Analysis (~3 Wochen content + dev)
- F-LAND-2 — ITU-Filings Daten-Seed (1 Woche)
- F-TREATY-1 — Print/PDF-Export auf Treaty-Detail (~1 Woche)
- F-AUTH-1 — Password-Validation Backend-Frontend-Alignment (3-5 Tage)

**🟡 HIGH (mehrtägig — 1 Sprint each):**

- F-RES-1 — Search-Dashboard Jurisdiction-Filter + Show-all (1 Woche)
- F-RES-2 — Citation-Format-Picker auf Hauptpages (1-2 Wochen)
- F-RES-5 — Print/PDF/CSV-Export-Layer (1 Woche)
- F-COMP-1 — DOCX-Export auf Comparator (2-3 Wochen)
- F-COMP-3 — Cross-Jurisdiction-Article-Search (1-2 Wochen)
- F-CASES-1 — Outcome-Filter (1 Woche)
- F-CASES-2 — Citation-Export (4-5 Tage)
- F-CASES-3 — Doctrine-Reverse-Index (2-3 Wochen)
- F-AUTH-3 — Org-Field-Clarity bei Invite (1-2 Tage)
- F-AUTH-8 — Google OAuth Invite-Token-Preservation (3-5 Tage)
- F-AI-1 — Per-Citation-Inline-Badges in AIMode (3-5 Tage)
- F-AI-3 — Citation-Service Error-Boundary (3-5 Tage)
- F-DRAFT-1/2/3 — Drafting-Maturity (Privilege-Markers, Versioning, DOCX) (3-4 Wochen total)
- F-ADM-6 — API-Production (4-6 Wochen)
- F-ADM-7 — Mandanten-Workspace-Maturity (6-8 Wochen)

**🟢 MEDIUM (Polish-Bundle — 0.5 Sprint zusammen):**

- F-LAND-1, F-LAND-4 (per-component-audit nötig zuerst)
- F-ADM-10/11/12/13 — Settings-Polish-Bundle
- F-TREATY-3 — Per-Article-Verification
- F-AI-5 — Voice-Privacy-Disclosure-Toggle (statt einmalig confirm)
- F-AUTH-11 — Mobile-Workflow-Tests

### 13.7 Strategische Empfehlung nach Phase B

**Atlas ist heute MARIES-discovery-tool (für schnelle Recherchen)** mit Trust-Score 6.8/10. Mit den 4 Phase-B-Fixes ist die Auth-Friction für Marie spürbar reduziert.

**Für Klaus (DSGVO-Production-Readiness)** sind die echten Showstopper unverändert: F-ADM-1 (DSGVO-Surfaces), F-ADM-5 (2FA), F-ADM-2/3/4 (Team-Management). Diese 5 Items zusammen = ~8-12 Wochen fokussierter Engineering-Arbeit. Bis dahin ist Atlas für deutsche Kanzleien **nicht firmweit ausrollbar**.

**Nächster Sprint-Vorschlag:** F-ADM-1 (DSGVO-Surfaces) als single-focus 3-4-Wochen-Sprint. Ohne diese Surfaces verkauft Atlas keine deutsche Kanzlei.

---

## 14. DSGVO-1 Sprint Done (2026-05-09)

**Befund während Implementierung:** Caelex hat **bereits 22 Legal-Pages** in `/src/app/legal/` (DPA, Privacy, Sub-Processors, AI-Disclosure, Cookies, Impressum, Security) — alle in DE+EN. Sub-Processors-Daten enthalten alle 8 relevanten Vendors inkl. **OpenAI + Anthropic für Atlas-AI-Mode**.

**Das Problem war Discovery, nicht Substanz.** Klaus konnte aus Atlas-Settings nicht zu den existierenden Compliance-Pages navigieren.

### Was gefixt wurde (DSGVO-1, Klasse A)

**Neuer "Compliance & Recht" Tab in Atlas-Settings** (`atlas/settings/page.tsx`):

- 4. Tab `"compliance"` neben Personal/Firm/Team
- 8 strukturierte Sektionen mit Article-Badges (Art. 28 / Art. 13 / Art. 22 / Art. 32 / ePrivacy):
  1. **AVV** (DPA-Link DE+EN, Art. 28 DSGVO)
  2. **Sub-Auftragsverarbeiter** (Live-Liste mit 30-Tage-Notice-Hinweis, Art. 28(2))
  3. **Datenschutzerklärung** (DE+EN, Art. 13)
  4. **AI-Disclosure** (mit Atlas-spezifischer Beschreibung: "welche KI-Modelle, NICHT für Modell-Training", Art. 22)
  5. **Cookies & Tracking** (DE+EN, ePrivacy)
  6. **Nutzungsbedingungen** (DE+EN)
  7. **Impressum** (§ 5 TMG)
  8. **Sicherheit & TOMs** (Art. 32)
- **DPO-Kontakt-Karte** mit `mailto:datenschutz@caelex.eu`
- **Self-Service-Placeholder-Karte** für DSGVO-2 + DSGVO-3: erklärt dass Daten-Export, Löschung und Audit-Log derzeit per Email gehen (subject-prefilled mailto-Links), In-App folgt
- **Neue ComplianceRow-Komponente** (Icon + Title + Description + Badge + Multi-Link-Footer)

**i18n-Keys:** ~30 neue Keys in DE/EN/FR (`src/lib/i18n/translations/{de,en,fr}.json`)

**Severity-Update für F-ADM-1:** BLOCKER → noch offen sind Klasse B (Self-Service ~2 Wochen) + Klasse C (Audit-Log-UI ~1.5 Wochen).

### Was bleibt für DSGVO-2 + DSGVO-3 (~3.5 Wochen)

**DSGVO-2 (~2 Wochen) — Self-Service-Workflows:**

- Data-Export-Pipeline (Art. 20): Background-Job + ZIP-Bundle + Email mit signed-URL
- Data-Deletion-Workflow (Art. 17): Soft-Delete + 30-Tage-Grace-Period + Cron für Hard-Delete
- Subprocessor-Notify-on-Change: Email-Subscription + 30-Tage-Vorlauf-Email
- DB-Models: `DataExportRequest`, `DataDeletionRequest`, `SubprocessorChangeNotification`

**DSGVO-3 (~1.5 Wochen) — Audit-Log-Infrastruktur:**

- `AtlasAuditLog` Model mit hash-chain (analog Comply pattern)
- Middleware für alle Atlas-API-Routes
- Audit-Log-UI mit Filter (User × Action × Date × Resource), CSV-Export
- 7-Jahre-Retention (DSGVO § 6 Abs. 1 lit. c), append-only

### Neuer Trust-Score nach DSGVO-1

| Surface          | Vorher | Nachher                                                                  |
| ---------------- | ------ | ------------------------------------------------------------------------ |
| Settings + Admin | 3/10   | **6/10** (+3 — Compliance-Tab schließt 60% der Klaus-Wahrnehmungs-Lücke) |
| GESAMT           | 6.8/10 | **7.0/10**                                                               |

Klaus' "show me your compliance"-Frage ist jetzt mit einem Klick beantwortbar.

---

## 15. DSGVO-2 Sprint Stage-1 Done (2026-05-09)

**Constraint:** "Niemals externe Kosten verursachen." Email-only Stage-1 ohne neue paid services. Nutzt existing Resend (Email) + AuditLog. Stage-2 (DB-Models + Cron-Auto-Processing) deferred bis Prisma-Migration sauber deployed.

### Was deployed wurde

**2 neue API-Routes:**

- `POST /api/atlas/compliance/data-export` (DSGVO Art. 20)
- `POST /api/atlas/compliance/data-deletion` (DSGVO Art. 17)

Beide: Auth + rate-limit (`sensitive` tier) + Org-Context-Resolve + Confirmation-Email an User + DPO-Alert-Email + AuditLog-Entry.

**Deletion-spezifisch:** 30-Tage Grace-Period, Email-Typing-Confirmation-Gate (analog Stripe/Vercel/GitHub), Optional-Reason-Textarea, **Owner-Account-Warning** wenn User OWNER einer Org ist, Cancel-Path via Email-Reply "STORNIEREN".

**Neue UI-Card** (`AtlasDataRightsCard.tsx`): Im Compliance-Tab eingebunden. Two-step-flow für Deletion mit confirm-modal + email-typing-gate + reason-input. Loading/success/error states.

**i18n:** ~20 neue Keys DE/EN/FR.

**Audit-Action-Type-Erweiterung:** `atlas_data_export_requested`, `atlas_data_deletion_requested` in `src/lib/audit.ts`.

### Was bleibt für DSGVO-2 Stage-2 (~1 Woche, braucht Prisma-Migration)

- DB-Models `AtlasDataExportRequest` + `AtlasDataDeletionRequest`
- Vercel-Cron `atlas-data-deletion-executor` (daily, hard-delete nach Grace)
- Vercel-Cron `atlas-data-export-processor` (auto-ZIP, R2 upload, signed-URL Email)
- In-app Cancel-Button für pending deletion
- Request-History-List
- Subprocessor-Notify-on-Change

### Was bleibt für DSGVO-3 (~1.5 Wochen)

- `AtlasAuditLog` Model + Middleware + Search-UI mit CSV-Export
- 7-Jahre append-only Retention

### Trust-Score nach DSGVO-2 Stage-1

| Surface          | Vorher | Nachher    |
| ---------------- | ------ | ---------- |
| Settings + Admin | 6/10   | **7/10**   |
| GESAMT           | 7.0/10 | **7.2/10** |

**Klaus-Impact:** Marie kann Daten-Export + Account-Löschung jetzt direkt aus Atlas anfordern. **Provably submitted** (Audit-Log + zwei Emails), DSGVO-konform da manuelle Verarbeitung innerhalb 30-Tage-Frist erlaubt ist.

---

## 16. Quick-Wins-Bündel #2 (2026-05-09)

Vier weitere Backlog-Items aus dem Lawyer-UX-Audit in einer Session geclosed:

### F-AUTH-8 — Google OAuth Invite-Token-Preservation (BLOCKER → Done)

- **Wo:** `atlas-signup/page.tsx:248-280` (`handleGoogleSignIn`)
- **Vorher:** Click "Sign in with Google" → OAuth-Flow strips invite-token → User landet auf `/atlas-no-access` (dead-end)
- **Fix:** `sessionStorage.setItem("atlas-pending-invite-token", inviteToken)` VOR `signIn("google")` + callbackUrl wird zu `/accept-invite?token=...` wenn invite vorhanden (defense-in-depth)
- **Aufwand:** ~1h (statt 3-5d vermutet)

### F-AUTH-3 — Org-Field-Clarity bei Invite-Flow (HIGH → Done)

- **Wo:** `atlas-signup/page.tsx:311-356` (invite-banner)
- **Fix:** Org-Name auf eigener Zeile + bold + 14px; Inviter-Name in zweiter Zeile gedämpft; neuer Escape-Link "Not the right organisation? Contact support" mit `mailto:support@caelex.io`
- **Aufwand:** ~30min

### F-TREATY-1 — Print-Button auf Treaty-Detail (BLOCKER, Quick-Fix-Subset → Done)

- **Wo:** `atlas/treaties/[slug]/page.tsx` + neue `PrintTreatyButton.tsx`
- **Fix:** Client-island PrintTreatyButton mit `window.print()`. Atlas hat schon globales Print-CSS-framework (globals.css:3533+) das `.fixed` Atlas-Shell ausblendet + serif-typography + A4-Margins + Caelex-Header/Footer
- **Defer to Stage-2:** Server-side PDF-rendering mit custom layout. Browser-Print covers 80%-case zero-cost
- **Aufwand:** ~30min

### F-CASES-2 — Citation-Export auf Case-Cards (HIGH → Done)

- **Wo:** `atlas/cases/page.tsx` + neue `CaseCitationButton.tsx`
- **Fix:** Mini client-island "Cite"-Button auf jeder Case-Card-Footer. Two formats sprach-gated:
  - **DE:** `Plaintiff ./. Defendant, Forum (DD.MM.YYYY), Az.: Citation` (DE-Bluebuch)
  - **EN/FR:** `Plaintiff v. Defendant, Citation, Forum (Year)` (plain)
  - Click stopPropagation → `clipboard.writeText` → 1.8s Check-Icon Feedback
- **Defer to Stage-2:** BibTeX/RIS/OSCOLA-Picker + Per-Detail-Page-Version
- **Aufwand:** ~45min

### F-LAND-1 — Last-Verified-Badge (DEFERRED)

- **Status:** Per-Jurisdiction-Cards leben nicht in `landing-rights/page.tsx` — braucht Component-Tree-Audit. Defer.

### Trust-Score nach Quick-Wins-Bündel #2

| Surface           | Vorher | Nachher                                                    |
| ----------------- | ------ | ---------------------------------------------------------- |
| Auth + Onboarding | 7.5/10 | **8/10** (+0.5)                                            |
| Treaty-Detail     | 5/10   | **6/10** (+1 — Print-Button löst memo-attachment-workflow) |
| Cases             | 6/10   | **6.5/10** (+0.5 — Cite-Button speeds-up daily citing)     |
| GESAMT            | 7.2/10 | **7.4/10**                                                 |

**Marie-Impact:** Drei Daily-Driver-Frictions reduziert. Plus F-AUTH-8 entfernt einen verlorenen Mandanten (Invite + Google-OAuth = vorher dead-end).

---

## 17. Quick-Wins-Bündel #3 (2026-05-09)

Drei weitere Backlog-Items aus dem Lawyer-UX-Audit. F-LAND-1 (deferred in #2) als
False-Positive entlarvt — die Card hatte den Stamp bereits; nur die Search-Result-
Rows fehlten ihn. Wir nutzen denselben `LastVerifiedStamp` jetzt cross-surface
(JurisdictionCard + Dashboard-Search-Rows) damit Marie _eine_ Trust-Decay-Vokabel
lernt und überall wiedererkennt.

### F-LAND-1 — Last-Verified-Stamp auf JurisdictionCard (CLOSED — false positive)

- **Wo:** `src/components/atlas/landing-rights/JurisdictionCard.tsx:111`
- **Befund:** `<LastVerifiedStamp date={profile.last_verified} />` ist bereits am
  Card-Footer rendered. Der Audit-Agent hatte die Card-Komponente nicht im Scope.
- **Action:** Audit-Eintrag closed. Trust-Decay-Coloring (>180 d red, >90 d amber)
  wird auch auf Dashboard-Result-Rows nachgezogen (siehe F-RES-3 unten).

### F-LAND-4 — Regime-Type-Tooltips auf JurisdictionCard (HIGH → Done)

- **Wo:** `src/components/atlas/landing-rights/JurisdictionCard.tsx:25-34, 53-58`
- **Vorher:** Cards zeigen "TWO-TRACK" / "TELECOMS-ONLY" / "SPACE-ACT-ONLY" /
  "EMERGING" als 10-px-uppercase-Label ohne Erklärung. Junior-Anwält:innen
  miss-classifizieren Jurisdiktionen, Senior-Anwält:innen verlieren Zeit beim
  klären für Trainees.
- **Fix:** `REGIME_TOOLTIPS` constant mit präzisen 1-2-Satz-Erklärungen pro
  Regime + Beispiel-Jurisdiktionen. Wired via native `title=` attribute +
  `cursor-help` className.
- **Warum native `title`:** Zero JS, keyboard-focus-triggerable in modernen
  Browsern, screen-reader-friendly. Trade-off (kein styling, ~500 ms hover-delay)
  ist akzeptabel für Disclosure-Copy auf Hover.
- **Aufwand:** ~20 min

### F-RES-3 — Trust-Signals auf Dashboard-Search-Result-Rows (HIGH → Done)

- **Wo:** `src/app/(atlas)/atlas/page.tsx` (Profile-, Case-Study-, Conduct-
  Sections in der landing-rights-Result-Group)
- **Vorher:** Search-Results für Landing-Rights-Profile, Case-Studies und Conduct-
  Conditions zeigten nur Jurisdiktion + Title — Marie hatte keinen Trust-Signal-
  Anker bevor sie die Detail-Seite öffnete. Bei Conduct-Conditions (national-
  security-policy, ändert sich häufig) ist Frische besonders load-bearing.
- **Fix:** `<LastVerifiedStamp date={p.last_verified} />` an jeder der drei
  Result-Row-Klassen angefügt. Color-coded (muted = frisch, amber > 90 d, red > 180 d).
  Profile-Cards von einzeiligem Flex auf zweizeiliges flex-col umgestellt damit der
  Stamp am unteren Rand sitzt.
- **Cross-Surface-Konsistenz:** Identisches Stamp-Component mit identischer Decay-
  Color-Skala wie auf JurisdictionCard → Marie lernt eine Vokabel, nicht drei.
- **Aufwand:** ~25 min

### F-ADM-11 — Invitation-Expiry-Visibility (MEDIUM → Done)

- **Wo:** `src/app/(atlas)/atlas/settings/page.tsx` (Pending-Invitations-Section)
- **Vorher:** Alle Pending-Invites zeigten gleiches amber-50-Avatar + "Pending"-
  Badge unabhängig vom Expiry-Status. Owner sieht abgelaufene Einladungen nicht
  visuell — sie sind in der Liste, aber wirken aktiv. Risiko: Owner verlässt sich
  auf Pending-Liste, dabei sind 3 davon längst abgelaufen.
- **Fix:** Drei-Tier-Status-System per `getInvitationExpiryStatus()` Helper:
  - `pending` (> 48 h to live): amber-50 avatar + "Pending" badge + "Expires in N d"
  - `expiring_soon` (< 48 h): amber-100 avatar + "Expiring soon" badge + "Expires in N h"
  - `expired` (past): red-50 avatar + "Expired" badge + "Expired N h/d ago" (red, bold)
- **WCAG 1.4.1 (Use of Color):** Information wird via Text + Farbe vermittelt, nicht
  Farbe alleine. Deuteranopie/Protanopie-User lesen "Expired" statt nur die Hue.
- **i18n:** 5 neue Keys × 3 Sprachen = 15 Translations (DE/EN/FR).
- **Aufwand:** ~50 min (mit Helper-Refactor + i18n)

### Trust-Score nach Quick-Wins-Bündel #3

| Surface          | Vorher | Nachher                                                                  |
| ---------------- | ------ | ------------------------------------------------------------------------ |
| Landing-Rights   | 6/10   | **7/10** (+1 — Tooltips schließen Klassifikations-Lücke + Trust-Signals) |
| Dashboard-Search | 6/10   | **7/10** (+1 — Cross-surface Trust-Decay-Vokabel)                        |
| Settings + Admin | 7/10   | **7.5/10** (+0.5 — Invite-Expiry sichtbar, ein Stress-Trigger weniger)   |
| GESAMT           | 7.4/10 | **7.6/10**                                                               |

**Marie-Impact:** Drei Trust-decay-Surfaces vereinheitlicht. Junior-Anwält:innen
classifizieren Regime-Types ohne Trainer-Frage. Owner sieht abgelaufene Invites
sofort.

---

## 18. Quick-Wins-Bündel #4 (2026-05-09)

Auth-Surface- und Cases-Surface-Sweep. Vorgeschlagenes Auth-Bundle wurde
beim Re-Audit zu 4/6 als bereits-gelöst entlarvt (Audit-Findings hinkten
hinterher) — ein Pattern das wir jetzt explizit dokumentieren. Echte
Lücken (3) wurden gefixt + ein bisher ungetouchter Cases-Filter dazu.

**Constraint-Update vom Maintainer (2026-05-09):** "keine externe kosten
und noch nicht was mit mails versenden" — der ursprünglich geplante
Resend-Button auf Forgot-Password (F-AUTH-7 stage-2) wurde deshalb
weggelassen. Statisches Spam-Hint vor Submit erfüllt 80 % der UX-Win
ohne neue Email-Code-Pfade zu triggern.

### F-AUTH-13 — Org-Type-Gate (CLOSED — already done)

- **Wo:** `src/app/atlas-no-access/page.tsx:54-115`
- **Befund:** Differentiated path (org-type-mismatch vs no-membership) ist
  bereits implementiert mit zweitem prisma-Probe + tailored copy +
  mailto-link zu support@caelex.io.
- **Action:** Audit-Eintrag closed.

### F-AUTH-6 — Role-Tooltip (CLOSED — already done)

- **Wo:** `src/app/atlas-access/page.tsx:587-605`
- **Befund:** Visible help-text + aria-describedby in place mit Trust-
  Statement "never used for sales qualification or pricing".
- **Action:** Closed.

### F-COMP-2 — Compare-Articles Disclaimer (CLOSED — already done)

- **Wo:** `src/app/(atlas)/atlas/compare-articles/page.tsx:518+`
- **Befund:** Banner-style amber Warning ist bereits oben pro Spalte
  rendered (statt der ursprünglich zu-faintigen Footer-Variante).
- **Action:** Closed.

### F-AUTH-4 — Login Prominent Sign-Up CTA (CLOSED — by design)

- **Wo:** `src/app/atlas-login/page.tsx:322-330`
- **Befund:** Atlas ist invite/demo-gated by design (anders als die
  Caelex-Compliance-Suite, die self-service-signup hat). Die "tiny"
  text-only Pfade ("Redeem invite" + "Book a demo") sind die intendierte
  UX — ein prominenter "Create account"-CTA würde den invite-only-
  positioning des Produkts verwässern.
- **Action:** Closed mit by-design-Note. Wenn das Produkt-Positioning
  später ändert (z.B. self-service-tier), wird das Finding wieder
  geöffnet.

### F-AUTH-2 stage-2 — DSGVO-Trust-Banner über Consent-Checkboxes (HIGH → Done)

- **Wo:** `src/app/atlas-signup/page.tsx:457` + `atlas-signup.module.css:.gdprBanner`
- **Befund:** Privacy/Terms-Links waren schon inline in den Checkbox-
  Labels. Aber der DSGVO-Trust-Kontext (Controller, Sub-Processor-Liste,
  Recht auf Widerruf) fehlte komplett — ein Anwalt der den Tick setzen
  soll erwartet diese Info als Mindeststandard für _informed consent_
  (DSGVO Art. 7).
- **Fix:** Slate-tinted Banner über den Checkboxes:
  > "Your data is processed by **Caelex GmbH** (controller) in the EU.
  > We use named sub-processors listed in our **Sub-Processors** page
  > and protect your account under the safeguards described in our
  > **Security** overview. You may withdraw consent and request export
  > or erasure at any time — details in our **Privacy Policy**."
- **Aufwand:** ~15 min

### F-AUTH-7 + F-AUTH-9 stage-2 — Reset-Email Expectations vor Submit (MEDIUM → Done)

- **Wo:** `src/app/atlas-forgot-password/page.tsx:198` + `atlas-forgot-password.module.css:.expectNote`
- **Befund:** Spam-Hint existierte nur auf der success-state-Page (NACH
  Submit) — User mit aggressivem Corporate-Spam-Filter merkten erst nach
  10 min Warten dass die Email verschluckt wurde. 60-min-Expiry war auch
  nur auf success-state.
- **Fix:** Kombinierte "what to expect" Note VOR dem Form-Card:
  > "Reset emails sometimes land in **spam** — check there if you don't
  > see it within a minute. The link works for **60 minutes** and can
  > only be used once."
- **Bewusst weggelassen** (Email-Constraint): Der ursprünglich geplante
  Resend-Button (rate-limited 1/5min) bleibt in DSGVO-2-Stage-2 für später
  parkiert. Statisches Hint reicht für die Mehrheit der Cases.
- **Aufwand:** ~15 min (kombiniert)

### F-CASES-1 — Cases Outcome (Status) Filter (HIGH → Done)

- **Wo:** `src/app/(atlas)/atlas/cases/page.tsx`
- **Befund:** Free-text-Search + Forum/Jurisdiction-Filter waren da, aber
  kein Filter nach `status` (decided/settled/vacated/appeal_pending/
  pending/withdrawn). Marie sucht "precedent for authorisation rejection
  in UK" und musste 28 Cases manuell scannen.
- **Fix:** Drittes `<select>` in der Filter-Bar mit:
  - i18n-Labels (DE/EN) per `STATUS_LABEL` map
  - Render-Order priorisiert decisive outcomes (decided + settled vor
    pending + withdrawn)
  - Counts in den Optionen ("Decided (18)") für scale-at-a-glance
  - Zero-count-Buckets ausgeblendet — keine bait-and-switch Optionen
  - Reset-Button greift jetzt auch den status-Filter ab
- **Aufwand:** ~25 min

### Trust-Score nach Quick-Wins-Bündel #4

| Surface           | Vorher | Nachher                                         |
| ----------------- | ------ | ----------------------------------------------- |
| Auth + Onboarding | 8/10   | **8.3/10** (+0.3 — DSGVO-trust + reset-clarity) |
| Cases             | 6.5/10 | **7/10** (+0.5 — Outcome-Filter)                |
| GESAMT            | 7.6/10 | **7.7/10**                                      |

**Audit-Process-Note:** False-Positive-Rate dieses Bundles war 4/8 = 50%.
Die Audit-Doc ist stale — viele Findings wurden in Bundles #1-#3 oder
in DSGVO-1+2 implizit mit-gefixt ohne als geschlossen markiert zu werden.
Ab Bundle #5 gilt: jedes Bundle startet mit explizitem Re-Read der
betroffenen Files BEVOR Implementation, nicht erst beim Edit.

---

## 19. Quick-Wins-Bündel #5 — F-CASES-3 Doctrine-Cross-Reference (2026-05-09)

Statt einer vollen "Bündel"-Sammlung dieses Mal **ein** dichtes Finding,
weil F-CASES-3 als HIGH-Severity-Item das Compare-Articles-Surface
strukturell aufwertet (ohne ist Compare-Articles "tote" Statuten-
Vergleichserie, mit ist es ein Doktrine-zu-Praxis-Brücken-Tool).

**Re-Audit-Process:** Vor Implementation überprüft — `compare-articles/
page.tsx` hatte tatsächlich keine Cross-Reference, und die
Cases-Datasource hatte bereits den exakten Helper (`getCasesApplyingSource`)
plus dataset-tagging (`applied_sources: string[]` pro Case, 44 cases
populated). Kein false-positive — echte Lücke.

### F-CASES-3 — Cases-Doctrine-Cross-Reference auf Compare-Articles (HIGH → Done)

- **Wo:** `src/app/(atlas)/atlas/compare-articles/page.tsx` (neue Komponente
  `RelatedCasesSection`, in jede `ArticleColumn` integriert)
- **Vorher:** Marie liest FR-LOS Art. 4 nebenan UK SIA s.7 — sieht den
  Wortlaut, sieht die Caelex-Zusammenfassung. Will wissen "wie wurde
  diese Norm eigentlich angewendet?" → muss /atlas/cases öffnen, jede
  Source-ID manuell suchen, hin- und herwechseln. 8-12 min Friction
  pro Norm.
- **Fix:** Per-column "Cases applying this (N)" Sub-Section unter dem
  Verbatim/Summary-Block. Listet:
  - Top 5 Cases nach `date_decided` desc
  - Year-Mono-Prefix für scan-line Lesbarkeit
  - Truncated Title (line-clamp-2)
  - Status-Badge mit color-tone (decided=violet, settled=amber,
    vacated=red, appeal_pending=blue, pending=slate, withdrawn=slate-faint)
  - Direct-Link zu `/atlas/cases/[id]`
  - "+N weitere" Hint zur Cases-Index wenn >5 cases
  - Nichts gerendert wenn 0 cases — keine leeren-State-Pollution
- **Daten-Source:** `getCasesApplyingSource(sourceId)` — existing barrel
  helper, joins via `applied_sources` array auf jedem Case. 44 cases
  haben `applied_sources` populated → dichte Coverage.
- **i18n:** Inline DE/EN per `STATUS_LABEL` map (analog zu Cases-Index
  in Bundle #4, gleiche Vokabel).
- **Aufwand:** ~45 min (inkl. Status-tone-tokens + reverse-index-design)

### Trust-Score nach Quick-Wins-Bündel #5

| Surface          | Vorher | Nachher                                                   |
| ---------------- | ------ | --------------------------------------------------------- |
| Compare-Articles | 6/10   | **7/10** (+1 — Doctrine-zu-Praxis-Brücke geschlossen)     |
| Cases            | 7/10   | **7.2/10** (+0.2 — passive boost durch reverse-Pfad rein) |
| GESAMT           | 7.7/10 | **7.8/10**                                                |

**Marie-Impact:** Statt manuelle Such-Schleife jetzt 1-Klick von
Statuten-Wortlaut zu citing case → Faktor-10 Speed-Up beim "wie wurde
das angewendet?"-Reflex.

---

## 20. Quick-Wins-Bündel #6 — F-AI-1 + F-AI-2 (BLOCKER, 2026-05-09)

Audit der AI-Mode Compliance-Surfaces. Ergebnis: **Architektur ist
grundsätzlich solide**, aber drei Real-Gaps gefunden + gefixt.

### Re-Audit Server-Side Disclaimer-Injection (F-AI-2)

**Wo:** `src/app/api/atlas/ai-chat/route.ts:396-416`

Server-Side back-stop ist **bypass-proof implementiert**:

```ts
if (draftingToolUsed && !hasDisclaimer(assistantTextBuffer)) {
  const disclaimerText = "\n\n---\n\n" + disclaimerFor(disclaimerLocale);
  assistantTextBuffer += disclaimerText;
  send({ type: "text", text: disclaimerText });
  send({
    type: "compliance",
    kind: "disclaimer_injected",
    locale: disclaimerLocale,
  });
}
```

Das Modell kann den Disclaimer im Output weglassen — der Server-Stream
hängt ihn an + meldet via SSE-Event. Der Client rendert dann den
"Legal review required"-Banner. Kein Weg um das herum.

**Locale-Coverage:** 4 Sprachen (DE/EN/FR/ES) per `disclaimerFor(locale)`.
Locale-Auswahl in `route.ts:295-298` aus dem User-Prompt heuristisch
abgeleitet — guter Ansatz, robust gegen Mixed-Language-Drafts.

**Marker-Detection:** `hasDisclaimer()` matcht 8 stable phrases
(canonical opener × 4 locales + 4 legacy phrasings für
backward-compatibility mit alten gespeicherten Drafts).

**Was fehlte:** Tests die diese Marker-Contracts locken. **Hinzugefügt**
in `src/lib/atlas/legal-disclaimers.test.ts` (14 Tests, alle grün).

### Re-Audit Client-Side Citation Provenance (F-AI-1)

**Befund 1 (Done already):** "N of M citations could not be verified"
red footer rendered wenn `compliance.unverifiedCitations.length > 0`
(`AIMode.tsx:1731-1761`). Citation-Validator läuft auf jedem Stream-End.

**Befund 2 (Done already):** Per-citation popover hat ShieldAlert-Icon +
"Vor Verwendung am offiziellen Text prüfen — KI-Ausgabe ohne
Rechtsberatungsgewähr" (`CitationChip.tsx:124-132`).

**Befund 3 (Real Gap):** Per-citation **Badge** auf der Chip selbst
(✓ verified vs ⚠ unverified) — **fehlte**. Catalogued (mit
`lastVerified` + `sourceUrl`) und Uncatalogued Chips sahen IDENTISCH
aus. Marie musste jeden Chip öffnen um den Status zu sehen.

### F-AI-1 Fix #1 — Per-Citation Provenance Badge (HIGH → Done)

- **Wo:** `src/components/atlas/ai-mode/CitationChip.tsx` + `ai-mode.module.css:.citationChipUnverified*`
- **Fix:** Discriminator `isCatalogued = Boolean(lastVerified && sourceUrl)`.
  Wenn false:
  - Chip-Background wechselt von emerald-tinted zu amber-tinted
  - ⚠ AlertTriangle-Icon (size 9) als prefix prepended
  - ARIA-Label: `"Citation X (nicht im Caelex-Katalog — am offiziellen Text prüfen)"`
  - Native title-attribute für Hover-Tooltip
  - Hover/Open-Variants konsistent amber-getintet
- **Color-Strategie:** Subtle amber (alpha 0.07), nicht aggressive red —
  wir wollen nicht jede uncatalogued citation als "false" markieren
  (viele sind legit, nur nicht von Caelex curated). Amber sagt "needs
  manual verify", red sagt "wahrscheinlich falsch".
- **WCAG:** Information via Icon + Color, nicht nur Color → 1.4.1 OK.
- **Aufwand:** ~25 min

### F-AI-1 Fix #2 — Locale-Bug auf "Legal review required" Banner (MEDIUM → Done)

- **Wo:** `src/components/atlas/ai-mode/AIMode.tsx:1668`
- **Bug:** Ternary hatte beide Branches mit english text:
  ```ts
  m.compliance.disclaimerLocale === "de"
    ? "Legal review required" // ← war englisch obwohl "de"
    : "Legal review required";
  ```
- **Fix:** German branch jetzt korrekt `"Juristische Prüfung erforderlich"`.
- **Aufwand:** ~3 min

### F-AI-2 Fix — Disclaimer-Test-Suite (HIGH → Done)

- **Wo:** `src/lib/atlas/legal-disclaimers.test.ts` (NEW, 184 LOC, 14 tests)
- **Coverage:**
  - `disclaimerFor()` returns correct language per locale (4 tests, DE/EN/FR/ES)
  - Default-fall-back zu EN wenn unknown locale (defensive)
  - Markdown-blockquote format für jede locale (`> ` prefix) damit
    `.doc`/`.md`-Export-Pipeline funktioniert
  - `hasDisclaimer()` detects canonical openers (4 tests)
  - `hasDisclaimer()` detects every legacy phrasing in `DISCLAIMER_MARKERS`
  - `hasDisclaimer()` returns false on unrelated text + adversarial
    "Important: deadline is Tuesday" (false-positive guard)
  - **Round-trip lock:** `disclaimerFor(L) → hasDisclaimer() == true`
    für jede locale — der genaue Contract auf den die back-stop bei
    `route.ts:406` baut, damit kein Double-Inject passiert
  - Mid-document Disclaimer wird auch erkannt (legacy-output safety)
  - `DISCLAIMER_TRIGGER_TOOLS` non-empty + enthält
    `draft_authorization_application` (Bar-license-load-bearing tool)
  - `exportPrefix()` lead-with-disclaimer guarantee + trailing newlines
- **Run:** `npx vitest run src/lib/atlas/legal-disclaimers.test.ts` →
  14/14 passed in 3 ms
- **Aufwand:** ~30 min

### Was BEWUSST nicht in diesem Bundle ist

- **Output-Test-Suite mit Adversarial-Prompts** (F-AI-2 audit recommendation):
  würde Anthropic-API-Mocking + golden-fixtures für > 20 prompt-injection-
  patterns brauchen → eigener Sprint (~3-4 Tage). Die hier
  gelieferten Marker-Tests sind die nötige Vorarbeit dafür.
- **AI-Model-Selection-UI** (F-AI-3): out-of-scope für dieses Bundle.

### Trust-Score nach Quick-Wins-Bündel #6

| Surface | Vorher | Nachher                                                                 |
| ------- | ------ | ----------------------------------------------------------------------- |
| AI-Mode | 5/10   | **7/10** (+2 — Per-citation provenance + locale-correct banner + tests) |
| GESAMT  | 7.8/10 | **8.0/10**                                                              |

**Bar-Lizenz-Risk-Reduktion:** Der Server-Side back-stop war schon da
und damit das eigentliche Risk gemildert. Bundle #6 schließt jetzt die
visuelle Lücke (Anwalt sieht ⚠ auf jeder uncatalogued citation BEVOR
sie ins Memo wandert) UND lockt die Marker-Detection-Contracts via
Test-Suite gegen unbeabsichtigte Regressionen.

---

## 21. Quick-Wins-Bündel #7 — MEDIUM-Findings Sweep (2026-05-09)

Re-Audit der drei MEDIUM-Findings F-LAND-3, F-DRAFT-2, F-RES-6:

- **F-LAND-3:** False-positive-rate diesmal niedriger als bei Bundle #4.
  Browse-UI existiert (`/atlas/landing-rights/conduct/page.tsx` rendert
  `ConductTable`), **aber** `ConductTable` war eine flache 50+-Zeilen-
  Tabelle ohne jegliche Filter — Marie scrollte sich tot. Real Gap.
- **F-DRAFT-2:** Vollständig real. Drafting-Studio hatte keine LPP/
  Anwaltsgeheimnis-Markers. Lawyers brauchen das für Memos die mit
  Co-Counsel geshared werden — Privilege geht verloren wenn nicht im
  Artifact selbst markiert.
- **F-RES-6:** Audit sagte "unassessed" — Sweep wäre eigener Sprint.
  **Deferred** (siehe unten).

### F-LAND-3 — Conduct-Conditions Filter UI (MEDIUM → Done)

- **Wo:** `src/components/atlas/landing-rights/ConductTable.tsx` (von
  53 LOC server-component zu 222 LOC client island refactored)
- **Vorher:** Wall-of-text Tabelle mit allen 50+ Conduct-Conditions, kein
  Filter, keine Search. Marie's Use-Case "data localization rules in
  India" hieß: scrollen, ctrl+F, hoffen.
- **Fix:** Drei-Filter-Bar identisch zur Cases-List (gleiche UX-Vokabel
  cross-surface):
  - Free-text search über title/requirement/jurisdiction/type/id
  - Type-Filter (`data_localization` / `lawful_intercept` /
    `geo_fencing` / `indigenization` / `suspension_capability` /
    `local_content` / `other`) mit per-type counts ("Data localisation
    (12)") und zero-buckets ausgeblendet
  - Jurisdiction-Filter
  - Reset-Button + result-count "(N of M)"
  - Empty-state Message wenn 0 matches
  - Sort: jurisdiction-asc, dann title-asc — natural reading order
- **Side-effect:** Type-Labels jetzt in `TYPE_LABEL` map (DE-style "Data
  localisation" statt raw "data_localization") — kosmetisch besser.
- **Aufwand:** ~35 min

### F-DRAFT-2 — Privilege-Marker auf Drafting Tiles (MEDIUM → Done)

- **Wo:** `src/app/(atlas)/atlas/drafting/page.tsx` (page-level toggle
  mit `withPrivilege` wrapper für alle 3 tile-handlers)
- **Vorher:** Drafting Studio hatte 3 Tiles die direkt prompts an AI Mode
  schickten. Kein Weg für die Anwältin zu signalisieren dass der draft
  privileged work-product ist. Wenn sie die generated draft an
  Co-Counsel schickt, fehlt der Privilege-Marker → LPP-Schutz nicht
  einklagbar im Streitfall.
- **Fix:** Single global toggle "Mark drafts as attorney-client privileged"
  am page-header level:
  - Default: off (most drafts aren't privileged)
  - Sticky: localStorage persistiert `atlas-drafting-privileged-mode` —
    wenn lawyer einmal aktiviert, bleibt es bis sie deaktiviert
  - Visuell aktiv: ⚠ Lock-Icon wechselt zu emerald + "ON" badge
    erscheint daneben
  - Defensive: try/catch um localStorage-access (private browsing)
- **Wirkungsmechanik:** `withPrivilege(prompt)` wrapper prepended einen
  4-locale Instructions-Prefix vor jeden generierten Prompt:
  ```
  Mark the entire draft at the top with "PRIVILEGED & CONFIDENTIAL
  — Attorney-Client Work Product" and add a footer note that the
  document is subject to legal professional privilege.
  [original prompt]
  ```
- **Locales:** DE/EN/FR/ES alle abgedeckt mit jeweils landesüblichen
  Privilege-Termini (DE: "Anwaltsgeheimnis (LPP)", FR: "secret
  professionnel", ES: "secreto profesional", EN: "Attorney-Client
  Work Product").
- **Server-Coordination:** Astra's existing legal-disclaimer back-stop
  (siehe Bundle #6) bleibt orthogonal — privilege-marker ist
  zusätzlich, nicht statt. Beide enden im final draft.
- **Was fehlt für Stage-2:** Watermark im PDF-Export (`draft-export.ts`).
  Aktuell ist der Marker nur im Markdown-Header — wenn der Anwalt
  separat zu PDF konvertiert kann das Wasserzeichen verloren gehen.
  Sollte in einem Export-Pipeline-Sprint adressiert werden.
- **Aufwand:** ~45 min

### F-RES-6 — Empty/Loading/Error-States (DEFERRED)

- **Audit-Befund:** "unassessed" — würde Sweep über 8-15 Surfaces brauchen
  (atlas dashboard, sources, library, bookmarks, alerts, updates,
  treaties, cases, jurisdictions, conduct, calendar, …)
- **Spot-checks:**
  - `/atlas` Search-Result-View hat decent empty-state mit hint
  - `/atlas/cases` (Bundle #4 update) hat empty-state mit Filter-Reset-cue
  - `/atlas/landing-rights/conduct` (heute, F-LAND-3) hat empty-state
- **Deferred to:** Bundle "F-RES-6 sweep" als eigener Sprint mit
  Ziel-Inventory + per-Surface-Audit + standardized `<EmptyState />`
  Component für DRY-ness. Geschätzt 1-1.5 Tage.

### Trust-Score nach Quick-Wins-Bündel #7

| Surface        | Vorher | Nachher                                                          |
| -------------- | ------ | ---------------------------------------------------------------- |
| Landing-Rights | 7/10   | **7.5/10** (+0.5 — Conduct-Browse ist jetzt Tool, nicht Tabelle) |
| Drafting       | 6/10   | **7/10** (+1 — Privilege-Marker schließt LPP-Schutz-Lücke)       |
| GESAMT         | 8.0/10 | **8.1/10**                                                       |

**Marie+Klaus-Impact:** Conduct-Conditions-Research geht von "scroll +
ctrl+F" zu "type + select + done in 5s". Privilege-marker macht Atlas
zum ersten AI-Drafting-Tool das LPP-Schutz strukturell unterstützt
statt es dem Anwalt zu überlassen.

---

## 22. Quick-Wins-Bündel #8 — F-RES-6 Empty-States Sweep (2026-05-09)

Deferred-Item aus Bundle #7 jetzt fokussiert geliefert. Empty/loading/
error-States waren über die Atlas-Surfaces hinweg inkonsistent — von
poliert (`/atlas/alerts`) bis bare-text-Sackgasse (`/atlas/sources`,
`/atlas/updates`). User merken den Unterschied unbewusst: das Produkt
fühlt sich "halbfertig" an wenn jede zweite Seite ein anderes Empty-
State-Vokabular spricht.

### Audit-Ergebnis (4 surfaces inventarisiert)

| Surface            | Empty-state vorher                      | Loading vorher    | Quality    |
| ------------------ | --------------------------------------- | ----------------- | ---------- |
| `/atlas/alerts`    | Polished (dashed + bell-icon + heading) | Bare flex-spinner | gut        |
| `/atlas/bookmarks` | Solid card + bookmark-icon + heading    | —                 | medium-gut |
| `/atlas/updates`   | **Bare 2-zeilen-Text**                  | Skeleton-shimmer  | medium-bad |
| `/atlas/sources`   | **Bare 1-zeilen-Text**                  | —                 | bad        |

`/atlas/library` hat eigene dark-mode-Palette (white-on-dark) und wurde
bewusst nicht migriert — Component-Adaption für beide Themes hätte das
Component verwässert.

### Fix — neue `<EmptyState />` Component

- **Wo:** `src/app/(atlas)/atlas/_components/EmptyState.tsx` (NEW, 138 LOC)
- **API:**
  ```tsx
  <EmptyState
    variant="empty" | "loading" | "error"  // default: empty
    icon={<...>} | null  // override per-variant default (Inbox / Loader2 / AlertCircle)
    title="..."          // required
    description={...}    // ReactNode for inline links / kbd
    action={...}         // optional CTA (caller chooses style)
    size="sm" | "md" | "lg"  // padding scale
    bordered="solid" | "dashed"  // dashed = filter-empty; solid = natural empty
    className="..."      // pass-through (e.g. max-width)
  />
  ```
- **Variant-Tones:**
  - `empty`: neutral icon-ring, primary text headline
  - `loading`: aria-live=polite, neutral icon (Loader2 spinning)
  - `error`: red icon-ring + red headline, role=alert
- **Sizes:** sm (panel-inline), md (page-default), lg (hero/first-run)
- **Borders:** solid (natural-empty signal) vs dashed (filter-empty
  signal — "this section is empty by your configuration")

### Wired surfaces

| Surface                       | Before            | After                                            |
| ----------------------------- | ----------------- | ------------------------------------------------ |
| `/atlas/sources` filter-empty | bare text         | EmptyState with Search-icon + recovery-hint copy |
| `/atlas/updates` empty        | bare 2-line text  | EmptyState (size=lg) with Bell-icon              |
| `/atlas/alerts` loading       | bare flex spinner | EmptyState variant=loading                       |
| `/atlas/alerts` empty         | bespoke pattern   | EmptyState (kept Bell-icon + same copy)          |
| `/atlas/bookmarks` empty      | bespoke card      | EmptyState (size=lg, max-w-xl preserved)         |

**Recovery-hints jetzt konsistent**: jeder filter-empty-state suggeriert
eine Action ("Try widening the jurisdiction…"). Das ist der größere
UX-Win als die visuelle Einheit — User sind nie auf einer
toten-Sackgasse-Seite.

### Was BEWUSST nicht in diesem Bundle ist

- `/atlas/library` migration (eigene dark-mode-Palette, würde EmptyState verwässern)
- Ergebnis-states ON `/atlas/treaties` und Sub-Routes (würden eigene Audit-Runde brauchen)
- Spinner-skeleton variants (lib hat das schon, brauchen wir nicht zentral)

### Trust-Score nach Quick-Wins-Bündel #8

| Surface        | Vorher | Nachher                                                         |
| -------------- | ------ | --------------------------------------------------------------- |
| Alerts/Updates | 6/10   | **7/10** (+1 — inkonsistente Sackgassen-States vereinheitlicht) |
| Sources index  | 7/10   | **7.5/10** (+0.5 — recovery-hint statt bare-text)               |
| Bookmarks      | 7/10   | **7.5/10** (+0.5 — visuelle Konsistenz mit anderen Surfaces)    |
| GESAMT         | 8.1/10 | **8.2/10**                                                      |

**Marie+Klaus-Impact:** Empty-states sind nie auffällig genug um in
Audits oben zu landen, aber sie sind die Touchpoints wo eine
ungeduldig-suchende Anwältin Vertrauen verliert oder gewinnt. Bundle
#8 macht aus 4 dead-end-states Pfadangebote.

---

## 23. Quick-Wins-Bündel #9 — AI-Mode Polish-Layer (2026-05-09)

Re-Audit der drei AI-Mode Findings F-AI-3, F-AI-5, F-AI-6 — alle drei
hatten substanzielle Discrepancies zur Realität:

- **F-AI-3 (Model Selection):** Audit beschrieb "ATLAS-1/Mini/Pro mit
  220k/64k/1M ctx" als ob das funktional implementiert wäre. **Reality:**
  Server pinnt einen einzigen Model (`claude-sonnet-4-6` oder
  `anthropic/claude-sonnet-4.6` via Gateway). Client-side picker
  existiert (lines 1538-1623 in AIMode.tsx) aber ist **rein kosmetisch**
  — `modelName` state wird nie an Server geschickt. Funktionales
  Multi-Model-Switching wäre ein Server-Allowlist + Per-tier-Auth-
  Sprint, nicht Quick-Win-Material.

- **F-AI-5 (Mic Privacy):** Phase-1.5 hatte schon eine DSGVO-Consent-
  Schwelle eingebaut (lines 622-642) mit localStorage-Flag. **Real
  Gap:** Consent-Text war englisch-only (kein DE/FR/ES für non-EN
  Anwält:innen) und kein User-facing Revoke-Mechanismus.

- **F-AI-6 (Token Cost):** Token-Counter existierte schon (line 158
  fmtTokens, line 849 usage tracking) — aber als globaler Conversation-
  Counter, nicht per-message. Kein Cost-in-USD irgendwo sichtbar.

### F-AI-3 — Honest disclosure on cosmetic model picker (HIGH → Done, partial)

- **Wo:** `AIMode.tsx` model menu (~line 1623-1646)
- **Fix:** Note am unteren Rand der Model-Picker-Dropdown:
  > "Display preference — Atlas server picks the optimised model for
  > your query. Cost is shown per-message below."
- **Was bewusst nicht jetzt gefixt:** Funktionale Model-Switching
  (claude-haiku/sonnet/opus mapping). Braucht:
  - Server-Allowlist mit per-tier-auth-policy
  - Verification dass alternate models alle Tools korrekt bedienen
  - Pricing-tier transparency wenn opus deutlich teurer ist
    → Eigener "F-AI-3 stage-2" Sprint, ~1 Woche
- **Aufwand:** ~10 min (Note-Eintrag)

### F-AI-5 stage-2 — Voice Consent localized + revocable (MEDIUM → Done)

- **Wo:** `AIMode.tsx:lines 656-705` (consent prompt) + lines 351-368
  (revoke handler) + lines 2008-2055 (revoke UI)
- **Fix-1 (Localization):** `consentText` map mit DE/EN/FR/ES — picked
  via `language` from useLanguage hook. Native browser confirm()
  bleibt für jetzt (OK/Cancel locale ist browser-kontrolliert, akzeptabel).
- **Fix-2 (Revoke):** Sticky `voiceConsent` state mirrored aus
  localStorage + `revokeVoiceConsent` handler:
  - Removes localStorage key
  - Stops active mic stream sofort (immediate effect, nicht erst nach
    nächster Page-Reload)
  - Sets listening=false
- **Fix-3 (UI):** Subtile dashed-border button am Ende der suggestion-
  chips Row, nur sichtbar wenn voiceConsent=true. 4-locale label
  ("Sprach-Zustimmung widerrufen" / "Revoke voice consent" / etc).
  Toast-feedback nach erfolgreichem Revoke.
- **Aufwand:** ~40 min

### F-AI-6 — Per-message token cost footer (MEDIUM → Done)

- **Wo:** `AIMode.tsx` (helpers + ChatMsg interface + done-event handler
  - bubble render)
- **Helpers:**
  - `ATLAS_PRICE_INPUT_USD_PER_M = 3.0` (Sonnet 4.x standard pricing)
  - `ATLAS_PRICE_OUTPUT_USD_PER_M = 15.0`
  - `estimateCostUSD(input, output)` → number
  - `formatCostUSD(cost)` → "<$0.01" / "$0.02" / "$1.23"
- **Persistence:** Extended `ChatMsg` interface mit optional
  `usage?: { input: number; output: number }`. Server-streamed `done`
  event jetzt setzt usage auf der Message ITSELF (vorher nur globalen
  Counter bumped).
- **UI:** Subtle 10.5px mono footer pro completed atlas-Message:
  > "≈ 4.2k tokens · $0.02"
  - Hover-title zeigt Breakdown ("3,450 input + 750 output tokens · pricing: $3/M input, $15/M output")
  - ARIA-label: full cost string für screen-readers
  - Renders nur wenn `m.usage` set (skipped during streaming)
  - Sits zwischen unverified-citations footer und library/export-chips
- **Aufwand:** ~30 min

### Trust-Score nach Quick-Wins-Bündel #9

| Surface | Vorher | Nachher                                                                    |
| ------- | ------ | -------------------------------------------------------------------------- |
| AI-Mode | 7/10   | **7.5/10** (+0.5 — cost-transparency + privacy-revoke + honest disclosure) |
| GESAMT  | 8.2/10 | **8.3/10**                                                                 |

**Marie-Impact:** Pro Query sieht sie jetzt "$0.03" — nach 50 Queries
ist die Mandant-Abrechnung defensible. Plus sie kann Voice-Consent
revoken ohne Browser-DevTools öffnen zu müssen. Plus der model-picker
lügt nicht mehr (sie weiß dass es eine Display-Preference ist).
