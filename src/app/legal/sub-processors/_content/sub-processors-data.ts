/**
 * Single source of truth for the Caelex sub-processor register.
 * Exposed on /legal/sub-processors (DE + EN).
 *
 * When you change this list, you also need to notify existing
 * customers at least 30 days in advance (DPA § 10).
 */

export interface SubProcessor {
  id: string;
  name: string;
  entity: string; // legal entity + country
  category:
    | "hosting"
    | "database"
    | "rate_limit_cache"
    | "payments"
    | "email"
    | "monitoring"
    | "ai"
    | "storage"
    | "analytics"
    | "other";
  categoryLabel: { de: string; en: string };
  purpose: { de: string; en: string };
  dataTypes: { de: string; en: string };
  location: string; // data location
  transferMechanism: string;
  website: string;
  dpaUrl?: string;
  addedOn: string; // ISO date
}

export const SUB_PROCESSORS: SubProcessor[] = [
  {
    id: "vercel",
    name: "Vercel Inc.",
    entity: "Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA",
    category: "hosting",
    categoryLabel: {
      de: "Hosting & Edge Network",
      en: "Hosting & Edge Network",
    },
    purpose: {
      de: "Bereitstellung der Plattform über das globale Edge-Netzwerk, Build- und Deploy-Orchestrierung, Serverless-Funktionen.",
      en: "Serving the platform through the global edge network, build and deploy orchestration, serverless functions.",
    },
    dataTypes: {
      de: "Sämtliche zur Auslieferung der Anwendung benötigten Daten (Anwendungscode, Request-Metadaten, IP-Adressen), flüchtige Anwendungsdaten während der Verarbeitung.",
      en: "All data required to serve the application (application code, request metadata, IP addresses), transient application data during processing.",
    },
    location:
      "USA mit Edge-Regionen weltweit; Caelex nutzt vorrangig EU-Regionen (fra1, cdg1) für dynamische Requests",
    transferMechanism:
      "EU-Standardvertragsklauseln (Modul 3) · EU-US Data Privacy Framework",
    website: "https://vercel.com",
    dpaUrl: "https://vercel.com/legal/dpa",
    addedOn: "2024-01-01",
  },
  {
    id: "neon",
    name: "Neon Inc.",
    entity: "Neon Inc., 2261 Market St #4474, San Francisco, CA 94114, USA",
    category: "database",
    categoryLabel: {
      de: "Managed Postgres",
      en: "Managed Postgres",
    },
    purpose: {
      de: "Betrieb der Produktivdatenbank (PostgreSQL), inkl. Backups und Point-in-Time-Recovery.",
      en: "Operating the production database (PostgreSQL), including backups and point-in-time recovery.",
    },
    dataTypes: {
      de: "Alle persistierten Anwendungsdaten: Nutzer-, Organisations-, Assessment-, Dokument-, Audit-Log-, Bookmark- und Kommunikationsdaten.",
      en: "All persisted application data: user, organisation, assessment, document, audit-log, bookmark and communication data.",
    },
    location: "EU-Region eu-central-1 (Frankfurt, Deutschland)",
    transferMechanism:
      "Verarbeitung innerhalb der EU; Verwaltungs-Zugriffe aus den USA werden durch EU-Standardvertragsklauseln (Modul 3) abgesichert",
    website: "https://neon.tech",
    dpaUrl: "https://neon.tech/dpa",
    addedOn: "2024-01-01",
  },
  {
    id: "upstash",
    name: "Upstash Inc.",
    entity: "Upstash Inc., 900 Mission St #203, San Francisco, CA 94103, USA",
    category: "rate_limit_cache",
    categoryLabel: {
      de: "Rate-Limiting & Caching",
      en: "Rate limiting & caching",
    },
    purpose: {
      de: "Rate-Limiting für API- und Widget-Endpunkte; serverloses Redis-Caching für Session-Tokens und kurzlebige Zähler.",
      en: "Rate limiting for API and widget endpoints; serverless Redis caching for session tokens and short-lived counters.",
    },
    dataTypes: {
      de: "IP-Adressen und User-IDs zu Rate-Limit-Zwecken (TTL < 24h), Session- und MFA-Tokens (kurzlebig).",
      en: "IP addresses and user IDs for rate-limit purposes (TTL < 24h), session and MFA tokens (short-lived).",
    },
    location: "EU-Region eu-west-1 (Dublin, Irland)",
    transferMechanism:
      "Verarbeitung innerhalb der EU; EU-US DPF für USA-Support-Zugriffe; Standardvertragsklauseln Modul 3",
    website: "https://upstash.com",
    dpaUrl: "https://upstash.com/trust/dpa.pdf",
    addedOn: "2024-01-01",
  },
  {
    id: "stripe",
    name: "Stripe Payments Europe Ltd.",
    entity:
      "Stripe Payments Europe Ltd., 1 Grand Canal Street Lower, Dublin 2, Ireland",
    category: "payments",
    categoryLabel: {
      de: "Zahlungsabwicklung",
      en: "Payments",
    },
    purpose: {
      de: "Abwicklung von Zahlungen, Abrechnung, Rechnungsstellung, Abo-Verwaltung. Stripe ist für Zahlungsdaten eigenverantwortlicher Datenverarbeiter.",
      en: "Payment processing, billing, invoicing, subscription management. Stripe is an independent controller for payment data.",
    },
    dataTypes: {
      de: "Rechnungsadresse, Umsatz- und Steuernummern, Zahlungshistorie. Kartendaten werden ausschließlich bei Stripe gespeichert (PCI DSS Level 1), nicht bei Caelex.",
      en: "Billing address, VAT and tax IDs, payment history. Card data is stored only with Stripe (PCI DSS Level 1), not with Caelex.",
    },
    location: "Irland (EU); Teilverarbeitung in USA und Großbritannien",
    transferMechanism:
      "Hauptverarbeitung in der EU; internationale Transfers über EU-Standardvertragsklauseln und UK-Addendum",
    website: "https://stripe.com",
    dpaUrl: "https://stripe.com/legal/dpa",
    addedOn: "2024-01-01",
  },
  {
    id: "resend",
    name: "Resend Inc.",
    entity:
      "Resend Inc., 2261 Market Street #5039, San Francisco, CA 94114, USA",
    category: "email",
    categoryLabel: {
      de: "Transaktionale E-Mails",
      en: "Transactional email",
    },
    purpose: {
      de: "Versand transaktionaler E-Mails (Login-Links, Rechnungen, Benachrichtigungen, Support-Kommunikation).",
      en: "Sending transactional email (login links, invoices, notifications, support communication).",
    },
    dataTypes: {
      de: "E-Mail-Adressen der Empfänger, Betreff, E-Mail-Inhalt (nur während Zustellung, keine dauerhafte Speicherung bei Caelex-Aktivierung)",
      en: "Recipient email addresses, subject, email content (only during delivery; no permanent storage when Caelex configures accordingly).",
    },
    location: "USA mit EU-Edge-Regionen",
    transferMechanism:
      "EU-Standardvertragsklauseln Modul 3 · optional EU-Datenhaltung aktiv",
    website: "https://resend.com",
    dpaUrl: "https://resend.com/legal/dpa",
    addedOn: "2024-01-01",
  },
  {
    id: "sentry",
    name: "Functional Software Inc. (dba Sentry)",
    entity:
      "Functional Software Inc., 45 Fremont Street, 8th Floor, San Francisco, CA 94105, USA",
    category: "monitoring",
    categoryLabel: {
      de: "Fehler- & Performance-Monitoring",
      en: "Error & performance monitoring",
    },
    purpose: {
      de: "Erfassung von Laufzeitfehlern und Performance-Metriken zur Produktstabilität und Sicherheitsbeobachtung.",
      en: "Capturing runtime errors and performance metrics for product stability and security observability.",
    },
    dataTypes: {
      de: "Stack-Traces, Browser- und OS-Informationen, Request-Metadaten, anonymisierte User-IDs. PII-Scrubbing vor Übertragung aktiviert.",
      en: "Stack traces, browser and OS information, request metadata, anonymised user IDs. PII scrubbing enabled before transmission.",
    },
    location: "EU-Region (Frankfurt) mit Fallback USA",
    transferMechanism:
      "Verarbeitung primär in EU; EU-Standardvertragsklauseln Modul 3 für USA-Fallback",
    website: "https://sentry.io",
    dpaUrl: "https://sentry.io/legal/dpa/",
    addedOn: "2024-01-01",
  },
  {
    id: "anthropic",
    name: "Anthropic PBC",
    entity:
      "Anthropic PBC, 548 Market Street PMB 90375, San Francisco, CA 94104, USA",
    category: "ai",
    categoryLabel: {
      de: "KI-Inferenz (Claude)",
      en: "AI inference (Claude)",
    },
    purpose: {
      de: "Ausführung der Large-Language-Model-Anfragen für Astra (Compliance-Copilot), Atlas (Anwalts-Modus), Generate 2.0 und automatische Dokumentengenerierung.",
      en: "Running large-language-model requests for Astra (compliance copilot), Atlas (legal-counsel mode), Generate 2.0 and automated document generation.",
    },
    dataTypes: {
      de: "Nutzer-Prompt, vom Nutzer bereitgestellter Kontext, Konversations-ID (nur Astra). Zero-Data-Retention-Vereinbarung aktiv: keine Speicherung bei Anthropic nach Beantwortung, keine Nutzung zum Modelltraining.",
      en: "User prompt, user-provided context, conversation ID (Astra only). Zero-data-retention agreement active: no storage at Anthropic after response, no use for model training.",
    },
    location:
      "Primär EU (Frankfurt/Irland, AWS Bedrock via Vercel AI Gateway); Fallback USA (Anthropic Direkt-API) — siehe `src/lib/atlas/anthropic-client.ts`",
    transferMechanism:
      "Primärer Pfad (EU-Bedrock): kein Drittlandtransfer — Verarbeitung in der EU. Fallback-Pfad (USA): EU-US Data Privacy Framework (Anthropic ist DPF-zertifiziert) · EU-Standardvertragsklauseln Modul 3 · Zero-Data-Retention-Zusage (Anthropic Enterprise).",
    website: "https://www.anthropic.com",
    dpaUrl: "https://www.anthropic.com/legal/dpa",
    addedOn: "2024-03-01",
  },
  {
    id: "openai",
    name: "OpenAI, L.L.C.",
    entity:
      "OpenAI, L.L.C., 3180 18th Street, San Francisco, CA 94110, USA · Routed via Vercel AI Gateway",
    category: "ai",
    categoryLabel: {
      de: "KI-Embeddings (semantische Recherche)",
      en: "AI embeddings (semantic search)",
    },
    purpose: {
      de: "Erzeugung von Vektor-Embeddings (text-embedding-3-small @ 512 Dimensionen) für die Atlas-Korpus-Semantiksuche und die Phase-5+ Personal-Library-Recall. Routing über das Vercel AI Gateway — keine direkte Vertragsbeziehung zwischen OpenAI und Caelex; OpenAI wirkt als Sub-Sub-Processor von Vercel.",
      en: "Vector embedding generation (text-embedding-3-small @ 512 dims) for Atlas corpus semantic search and the Phase 5+ Personal Library recall. Routed through Vercel AI Gateway — no direct contractual relationship between OpenAI and Caelex; OpenAI acts as a sub-sub-processor under Vercel.",
    },
    dataTypes: {
      de: "Nutzer-Anfragetext (kurze Such-Queries) und Library-Eintragstexte (Titel + ggf. ursprüngliche Frage + erste 3.000 Zeichen des Inhalts) zur Vektor-Repräsentation. Keine Klartext-Speicherung über die API-Aufruf-Dauer hinaus (OpenAI Zero-Data-Retention für API-Kunden seit 2023).",
      en: "User query text (short search queries) and library-entry texts (title + optional original question + first 3,000 chars of content) for vector representation. No plaintext retention beyond the API call duration (OpenAI Zero-Data-Retention for API customers since 2023).",
    },
    location: "USA",
    transferMechanism:
      "EU-US Data Privacy Framework (zertifiziert) · Standardvertragsklauseln · Zero-Data-Retention für API-Aufrufe · Routing über Vercel AI Gateway (kein eigener Vertrag mit Caelex)",
    website: "https://www.openai.com",
    dpaUrl: "https://openai.com/policies/data-processing-addendum/",
    addedOn: "2026-04-25",
  },
  /* ─── Compliance-Audit 2026-05: nachgepflegte Sub-Prozessoren ─── */
  {
    id: "cloudflare-r2",
    name: "Cloudflare, Inc.",
    entity: "Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA",
    category: "storage",
    categoryLabel: {
      de: "Objektspeicher (Dokumente, Anhänge)",
      en: "Object storage (documents, attachments)",
    },
    purpose: {
      de: "Speicherung von Nutzer-hochgeladenen Dokumenten, Mandantenanlagen, generierten PDF-Reports und sonstigen Datei-Anhängen via Cloudflare R2 (S3-kompatibel). R2 wird ausschließlich serverseitig adressiert; signierte URLs sind kurzlebig (Stunden, nicht Tage).",
      en: "Storage of user-uploaded documents, mandate attachments, generated PDF reports and other file attachments via Cloudflare R2 (S3-compatible). R2 is addressed server-side only; signed URLs are short-lived (hours, not days).",
    },
    dataTypes: {
      de: "Dateiinhalte (Dokumente, Bilder, PDFs), Datei-Metadaten (Name, MIME-Type, Größe), Caelex-interne Zuordnungs-IDs (Organisation, Nutzer, Mandant). Keine Klartext-Indizierung. Verschlüsselung at-rest durch Cloudflare-Standard (AES-256).",
      en: "File contents (documents, images, PDFs), file metadata (name, MIME type, size), Caelex-internal assignment IDs (organisation, user, mandate). No plaintext indexing. At-rest encryption via Cloudflare standard (AES-256).",
    },
    location:
      "EU-Region (Frankfurt) als bevorzugte Storage-Region; Cloudflare global edge für signierte URL-Auslieferung",
    transferMechanism:
      "Verarbeitung in EU-Region; EU-Standardvertragsklauseln Modul 3 für US-Verwaltungs-Zugriff; Cloudflare ist DPF-zertifiziert",
    website: "https://www.cloudflare.com/products/r2/",
    dpaUrl: "https://www.cloudflare.com/cloudflare-customer-dpa/",
    addedOn: "2026-05-11",
  },
  {
    id: "logsnag",
    name: "LogSnag",
    entity: "LogSnag (operated by Shayan Taslim, registered in Canada)",
    category: "monitoring",
    categoryLabel: {
      de: "Geschäftsereignis-Monitoring",
      en: "Business-event monitoring",
    },
    purpose: {
      de: "Server-seitiges Tracking aussagekräftiger Geschäftsereignisse (Anmeldungen, Stornierungen, Compliance-Meilensteine, Fehler-Cluster) für Operator-Alerting. Keine Profilbildung, keine Werbe- oder Marketing-Auswertung.",
      en: "Server-side tracking of significant business events (signups, cancellations, compliance milestones, error clusters) for operator alerting. No profiling, no advertising or marketing analysis.",
    },
    dataTypes: {
      de: "Ereignistyp, Channel, kurze Beschreibung, Caelex-interne IDs (User, Organisation), Zeitstempel. Keine E-Mail-Adressen, keine PII-Klartextfelder. Kein Browser- oder Geräte-Fingerprinting (Server-only).",
      en: "Event type, channel, short description, Caelex-internal IDs (user, organisation), timestamp. No email addresses, no PII plaintext fields. No browser or device fingerprinting (server-only).",
    },
    location: "Kanada",
    transferMechanism:
      "Übermittlung an Drittland mit EU-Angemessenheitsbeschluss (Kanada — Decision 2002/2/EG); zusätzlich Standardvertragsklauseln im Anbietervertrag",
    website: "https://logsnag.com",
    dpaUrl: "https://logsnag.com/privacy",
    addedOn: "2026-05-11",
  },
  {
    id: "vercel-analytics",
    name: "Vercel Inc. (Web Analytics)",
    entity: "Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA",
    category: "analytics",
    categoryLabel: {
      de: "Web-Analytics (cookielos)",
      en: "Web analytics (cookieless)",
    },
    purpose: {
      de: "Aggregierte Reichweiten- und Nutzungsstatistiken (Seitenaufrufe, Verweildauer, Geräteklasse). Cookielos und ohne Cross-Site-Tracking. Wird ausschließlich nach ausdrücklicher Einwilligung des Nutzers (Cookie-Banner: Analytics-Toggle aktiv) geladen — siehe `src/components/ConditionalAnalytics.tsx`.",
      en: "Aggregated reach and usage statistics (page views, dwell time, device class). Cookieless and without cross-site tracking. Loaded only after explicit user consent (Cookie banner: analytics toggle on) — see `src/components/ConditionalAnalytics.tsx`.",
    },
    dataTypes: {
      de: "Pfad der aufgerufenen Seite, anonymisierte Geräte-Klasse, Referrer-Domain, Sitzungs-Hash (gerollt). Keine IP-Adressen, keine Cookies, keine User-IDs.",
      en: "Path of the visited page, anonymised device class, referrer domain, rolled session hash. No IP addresses, no cookies, no user IDs.",
    },
    location:
      "USA (Vercel) mit globaler Edge-Aggregation; Caelex bevorzugt EU-Edge-Regionen",
    transferMechanism:
      "EU-Standardvertragsklauseln Modul 3 · EU-US Data Privacy Framework (Vercel ist zertifiziert)",
    website: "https://vercel.com/analytics",
    dpaUrl: "https://vercel.com/legal/dpa",
    addedOn: "2026-05-11",
  },
  {
    id: "vercel-speed-insights",
    name: "Vercel Inc. (Speed Insights)",
    entity: "Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA",
    category: "monitoring",
    categoryLabel: {
      de: "Performance-Monitoring (Core Web Vitals)",
      en: "Performance monitoring (Core Web Vitals)",
    },
    purpose: {
      de: "Erfassung der Core Web Vitals (LCP, INP, CLS, TTFB) zur Beobachtung der Wahrnehmungs-Performance der Plattform. Wird ausschließlich nach ausdrücklicher Einwilligung des Nutzers (Cookie-Banner: Performance-Toggle aktiv) geladen — siehe `src/components/ConditionalAnalytics.tsx`.",
      en: "Collection of Core Web Vitals (LCP, INP, CLS, TTFB) to observe perceived platform performance. Loaded only after explicit user consent (Cookie banner: performance toggle on) — see `src/components/ConditionalAnalytics.tsx`.",
    },
    dataTypes: {
      de: "Performance-Messwerte (Millisekunden), Pfad der gemessenen Seite, anonymisierte Geräte- und Verbindungsklasse. Keine IP-Adressen, keine Cookies, keine personenbezogenen Identifikatoren.",
      en: "Performance metrics (milliseconds), path of the measured page, anonymised device and connection class. No IP addresses, no cookies, no personal identifiers.",
    },
    location: "USA (Vercel) mit globaler Edge-Aggregation",
    transferMechanism:
      "EU-Standardvertragsklauseln Modul 3 · EU-US Data Privacy Framework (Vercel ist zertifiziert)",
    website: "https://vercel.com/speed-insights",
    dpaUrl: "https://vercel.com/legal/dpa",
    addedOn: "2026-05-11",
  },
];
