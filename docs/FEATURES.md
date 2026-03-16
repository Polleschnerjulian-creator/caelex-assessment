# Caelex — Feature Overview

## Assessment Modules

**EU Space Act Assessment** — Interaktiver 8-Fragen-Wizard, der Satellitenbetreiber durch die 119 Artikel des EU Space Act (COM(2025) 335) führt und ein personalisiertes Compliance-Profil mit modulspezifischen Scores erstellt.

**NIS2 Directive Assessment** — Bewertet die NIS2-Einstufung (Essential/Important/Out-of-Scope) für Raumfahrtunternehmen und generiert einen Anforderungskatalog mit 51 Cybersecurity-Maßnahmen und Incident-Response-Timelines.

**National Space Law Assessment** — Vergleicht die nationalen Weltraumgesetze von 10 europäischen Jurisdiktionen und bewertet deren Favorabilität für den jeweiligen Betreibertyp mit Cross-Referencing zwischen Rechtsordnungen.

**Unified Assessment** — Kombinierter Multi-Regulierungs-Assessment, der EU Space Act, NIS2 und nationale Gesetze in einer einzigen Bewertung zusammenführt und ein aggregiertes Compliance-Dashboard erzeugt.

---

## Dashboard — Overview & Tracking

**Compliance Dashboard** — Zentrale Übersicht mit Gesamt-Compliance-Score, 6 Analyse-Charts, Modulstatus-Überblick und Trend-Visualisierung über die gesamte regulatorische Compliance-Landschaft.

**Compliance Tracker** — Artikel-basierter Compliance-Tracker, der den Erfüllungsgrad auf Ebene einzelner Regulierungsartikel nachverfolgt und granulare Fortschrittsübersichten bietet.

---

## Dashboard — Compliance Modules (15 Module)

**Authorization** — Verwaltet den Autorisierungs-Workflow für Raumfahrtaktivitäten mit State-Machine-basierter Fortschrittsverfolgung und Dokumenten-Pipeline.

**Registration** — Trackt Weltraumobjekt-Registrierungen gemäß UN-Registrierungskonvention und nationalen Registrierungspflichten.

**Cybersecurity** — Überwacht die Umsetzung von ENISA/NIS2-Cybersecurity-Kontrollen mit 3.400+ Zeilen an Anforderungsdaten und Maßnahmentracking.

**Debris Mitigation** — Verfolgt Compliance mit Weltraumschrott-Richtlinien (COPUOS/IADC) einschließlich Deorbiting-Pläne und End-of-Life-Management.

**Environmental** — Bewertet Umweltauswirkungen von Raumfahrtaktivitäten und trackt Compliance mit Umweltschutzanforderungen.

**Insurance** — Verwaltet Versicherungsnachweise und -anforderungen für Raumfahrtaktivitäten, einschließlich Haftpflicht- und Drittparteienschäden.

**NIS2** — Spezifisches Modul für die Umsetzung der NIS2-Richtlinie mit Maßnahmentracking, Incident-Response-Phasen und Meldefristen.

**Supervision** — Konfiguration und Verwaltung behördlicher Aufsichtsanforderungen mit Berichterstattungskalender und Supervision-Reports.

**COPUOS/IADC** — Dedicated Modul für die Einhaltung internationaler Weltraumschrott-Richtlinien der COPUOS und IADC.

**Export Control (ITAR/EAR)** — Mapping von Export-Kontroll-Anforderungen unter ITAR und EAR für Raumfahrtkomponenten und -technologien.

**Spectrum/ITU** — Frequenzlizenzierung und ITU-Compliance-Tracking für Satellitenfrequenzkoordination.

**UK Space Industry Act** — UK-spezifisches Compliance-Modul für den Space Industry Act 2018 und zugehörige Regulierungen.

**US Regulatory (FCC/FAA)** — Tracking von US-Regulierungsanforderungen durch FCC (Kommunikation) und FAA (Launch/Reentry).

**Digital Twin** — Live Compliance-Digital-Twin mit Multi-Framework-Scoring (EU Space Act, NIS2, Maturity), Evidence-Tracking, Risikoszenarien und What-If-Simulationen.

**Evidence Coverage** — Aggregiert und visualisiert die Evidence-Abdeckung über alle Regulierungsmodule hinweg mit Chain-of-Custody-Integrity-Prüfung.

---

## Dashboard — Predictive Modeling

**Ephemeris** — Live-Orbital-Compliance-Forecasting, das aus TLE-Daten (CelesTrak) und Physikmodellen (Orbital Decay, Fuel Depletion, Subsystem-Degradation) die verbleibenden Tage bis zur Compliance-Schwellenüberschreitung pro Regulierung berechnet.

**Shield** — Kollisions-Frühwarnsystem, das Conjunction Events überwacht, Manöver-Lifecycle-Workflows (NEW → MONITORING → ASSESSMENT → DECISION → MANEUVER) steuert und Debris-Mitigation-Response koordiniert.

**Hazard Analysis** — FMEA-basierte Gefahrenanalyse über alle Spacecraft-Systeme mit Severity-/Likelihood-Bewertung, Mitigationsstatus und automatischer Generierung von CNES/RDI-Hazard-Reports.

**Nexus (Asset Register)** — NIS2-konformes Asset-Register für Raumfahrt-Assets mit Kritikalitätsbewertung, Compliance-Scoring, Risikoverteilungs-Charts und Asset-Lifecycle-Management.

---

## Dashboard — Evidence & Monitoring

**Sentinel** — Satelliten-Telemetrie-Monitoring mit autonomen Sentinel-Agenten, die Evidence-Pakete sammeln, Cross-Validierung durchführen, Compliance-Mapping erstellen und Chain-of-Custody verifizieren.

**Verity** — Privacy-Preserving Compliance-Attestierungs-Generator, der kryptografisch verifizierbare Zertifikate erstellt, ohne sensible Compliance-Daten offenzulegen.

---

## Dashboard — Resources

**NCA Portal** — Einreichungs-Pipeline für National Competent Authorities mit Dokumentenpaket-Assembly, Korrespondenz-Tracking und Status-Monitoring des Genehmigungsverfahrens.

**Document Vault** — Zentraler Dokumentenspeicher (Cloudflare R2) mit Kategorisierung, Versionierung und Zugriffskontrolle für alle compliance-relevanten Dokumente.

**Document Generator** — KI-gestützte Dokumentenerstellung (Claude) mit 8+ Report-Typen, die aus Compliance-Daten automatisch regulatorische Berichte, Anträge und Nachweise generiert.

**Audit Center** — Compliance-Audit-Dashboard mit Evidence-Management, Attestierungen, Compliance-Score-Tracking und Hash-Chain-basiertem, manipulationssicherem Audit-Trail.

**Timeline** — Missions-Timeline mit Deadline-Management, Meilenstein-Tracking, Kalenderansicht und automatischen Erinnerungen für regulatorische Fristen.

**Incidents** — Incident-Management-System mit NIS2-Phasen-Tracking (Detection → Triage → Notification → Response), Severity-Bewertung und automatischer Meldepflicht-Erkennung.

**Regulatory Feed** — Live-Feed mit regulatorischen Updates, Gesetzesänderungen und neuen Anforderungen, filterbar nach Modul, Severity und Relevanz.

**Mission Control** — 3D-Satellitentracking-Globe (Three.js) mit Echtzeit-Orbitvisualisierung, Bodenstationen und Satellitenstatus-Monitoring.

---

## Dashboard — Network & Collaboration

**Compliance Network** — Stakeholder-Netzwerk für die Verwaltung von Beziehungen zu Rechtsberatern, Versicherern, Auditoren, Zulieferern und NCAs mit Compliance-Attestierungen und Data-Room-Sharing.

**HUB** — Integrierte Projektmanagement-Suite mit Dashboard, Projektansichten (Kanban/Liste), Task-Workflows, Team-Kalender und Timesheet-Zeiterfassung für Compliance-Projekte.

---

## Dashboard — Optimization

**Regulatory Arbitrage Optimizer** — Jurisdiktions-Vergleichstool, das 10 europäische Rechtsordnungen nach Favorabilität rankt, Trade-Offs visualisiert und optimale Migrationspfade für die Unternehmensregistrierung empfiehlt.

---

## Astra AI

**Astra AI Assistant** — Claude-basierter Compliance-Copilot mit Tool-Execution (bis zu 10 Iterationen), der auf Compliance-Scores, Assessments und Workflows zugreift, Fragen beantwortet, Dokumente generiert und regulatorische Analysen durchführt.

**Astra Widget** — Floating-Chat-Widget, das auf jeder Dashboard-Seite verfügbar ist und kontextbezogene KI-Unterstützung bietet, ohne die aktuelle Arbeit zu unterbrechen.

---

## Assure Platform (Investor Due Diligence)

**Regulatory Readiness Score (RRS)** — Quantitativer Score, der die regulatorische Reife eines Raumfahrtunternehmens bewertet und Investoren eine standardisierte Vergleichbarkeit bietet.

**Regulatory Credit Rating (RCR)** — Regulatorisches Kreditrating analog zu Finanzratings, mit Methodology-Dokumentation, Appeal-Verfahren und Benchmark-Vergleich.

**DD Packages** — Data-Room-Management für Due-Diligence-Pakete mit strukturierten Dokumentensammlungen, Zugangskontrollen und Audit-Trails.

**Share Links** — Sichere, tokenbasierte Share-Links für die externe Freigabe von Compliance-Daten an Investoren und Partner mit ablaufenden Zugriffsrechten.

**Company Profile Builder** — 8-Sektionen-Profil-Builder (Regulatory, Financial, Market, Team, Tech, Traction) für die vollständige Darstellung der Unternehmens-Compliance-Positionierung.

**Risk Register & Scenarios** — Risiko-Register mit Szenario-Analyse für regulatorische Risiken, Impact-Bewertung und Mitigationsstrategien.

**Benchmarking** — Peer-Benchmark-Vergleich mit anonymisierten Branchendaten zur Einordnung der eigenen Compliance-Reife.

---

## Academy (Training)

**Course Catalog** — Kurskatalog für regulatorische Weiterbildung mit strukturierten Lernmodulen zu EU Space Act, NIS2 und nationalen Weltraumgesetzen.

**Interactive Classroom** — Interaktive Klassenzimmer-Umgebung für Live-Schulungen mit Echtzeit-Interaktion und Fortschrittstracking.

**Simulations** — Szenario-Simulationen, die realistische regulatorische Situationen durchspielen und praktische Entscheidungskompetenz in Compliance-Fragen trainieren.

**Badges & Certifications** — Gamification-System mit Badges für abgeschlossene Kurse, bestandene Assessments und Compliance-Meilensteine.

---

## Platform Infrastructure

**Multi-Tenant Organizations** — Mandantenfähige Organisationsverwaltung mit RBAC (Owner/Admin/Manager/Member/Viewer), Einladungssystem und SSO (SAML/OIDC).

**Stripe Billing** — Vollintegriertes Abrechnungssystem mit Checkout, Customer Portal und Webhook-basierter Subscription-Verwaltung.

**API v1** — RESTful API mit API-Key-Authentifizierung, Rate-Limiting (19 Tiers) und Webhook-Delivery für externe Integrationen.

**Admin Panel** — Administrationsoberfläche mit User-/Organisationsverwaltung, Booking-Management, Analytics-Dashboard und Audit-Log-Einsicht.

**Settings** — Benutzereinstellungen mit Profilverwaltung, MFA-Konfiguration (TOTP + WebAuthn), Benachrichtigungspräferenzen und Billing-Übersicht.

**Internationalization** — Mehrsprachige Plattform mit Unterstützung für Deutsch, Englisch, Französisch und Spanisch.

**Security Suite** — Umfassendes Sicherheitssystem mit AES-256-GCM-Verschlüsselung, Hash-Chain Audit-Trail, Honey-Tokens, Anomaly-Detection, CSRF-Schutz und Bot-Detection.

---

## Public Pages

**Landing Page** — Marketing-Startseite mit 3D-Globe (Three.js), Hero-Section, Blog-Showcase und Software-Feature-Präsentation.

**Resource Center** — Öffentliche Ressourcen mit FAQ, Glossar, Regulatory Timeline, Guides und EU Space Act-Überblick.

**Blog** — Content-Management-System mit dynamischen Blog-Posts zu regulatorischen Themen und Branchennews.

**API Documentation** — Swagger UI-basierte API-Dokumentation für die externe Entwickler-Integration.

**Stakeholder Portal** — Token-gesichertes Portal für externe Stakeholder zum Einsehen von Compliance-Daten und Attestierungen.
