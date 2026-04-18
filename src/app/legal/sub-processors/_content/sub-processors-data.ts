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
      de: "Ausführung der Large-Language-Model-Anfragen für Astra, Generate 2.0 und automatische Dokumentengenerierung.",
      en: "Running large-language-model requests for Astra, Generate 2.0 and automated document generation.",
    },
    dataTypes: {
      de: "Nutzer-Prompt, vom Nutzer bereitgestellter Kontext, Astra-Konversations-ID. Zero-Data-Retention-Vereinbarung aktiv: keine Speicherung bei Anthropic nach Beantwortung, keine Nutzung zum Modelltraining.",
      en: "User prompt, user-provided context, Astra conversation ID. Zero-data-retention agreement active: no storage at Anthropic after response, no use for model training.",
    },
    location: "USA",
    transferMechanism:
      "EU-Standardvertragsklauseln Modul 3 · Zero-Data-Retention-Zusage (Anthropic Enterprise)",
    website: "https://www.anthropic.com",
    dpaUrl: "https://www.anthropic.com/legal/dpa",
    addedOn: "2024-03-01",
  },
];
