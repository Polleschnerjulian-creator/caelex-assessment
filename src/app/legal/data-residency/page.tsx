import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Datenresidenz · Caelex",
  description:
    "Mandantendaten (Datenbank, Vault) verbleiben in der EU. Hilfsdienste mit transparenten Drittland-Transfers (DPF + SCC). Konkrete Regionen pro Sub-Processor.",
  alternates: { canonical: "https://www.caelex.eu/legal/data-residency" },
};

/**
 * Wave 9 (2026-05-19) — komplett-rewrite der data-residency-seite.
 *
 * AUDIT-BEFUND C-2: Vorherige version behauptete "EU only — kein Transfer
 * in die USA, keine SCC erforderlich" — faktisch FALSCH. Das Sub-Processor-
 * Register (/legal/sub-processors) listet Vercel USA admin, Anthropic
 * USA-Fallback, OpenAI USA, Resend USA, Sentry USA-Fallback, LogSnag
 * Kanada — alle mit SCC. Der widerspruch war (a) UWG § 5 irreführende
 * werbung und (b) potentiell § 43e BRAO-relevant für anwaltskunden,
 * die ihre mandanten-vertraulichkeit auf falscher grundlage zusichern.
 *
 * Neue framing-strategie: ehrliche zwei-stufen-zusicherung.
 *   Stufe 1 (Mandant-Content): Datenbank + Vault bleiben in der EU.
 *           Das ist die rechtlich + reputationell kritische zusicherung.
 *   Stufe 2 (Hilfsdienste): Mail, Monitoring, Analytics, KI-Fallback,
 *           Embeddings nutzen US/CA-Anbieter mit DPF + SCC. Transparent
 *           offengelegt — das ist die ehrliche, prüfbare aussage.
 */
export default function DataResidencyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-slate-900 dark:text-slate-100">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Caelex · Legal · Datenresidenz
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Datenresidenz — EU-First mit transparenten Drittland-Garantien
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Stand: 19.05.2026 · Version 2.0 · DSGVO Kapitel V
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none text-[14px] leading-relaxed">
        <h2>Kurz und ehrlich</h2>
        <p>
          <strong>Mandanten-Content</strong> — die persistente Datenbank und der
          Datei-Vault — bleibt ausschließlich in der EU. Diese Zusicherung ist
          vertragsbestandteil aller AVVs mit Kanzleien.
        </p>
        <p>
          <strong>Hilfsdienste</strong> — KI-Inferenz-Fallback, Embeddings für
          die semantische Suche, transaktionale E-Mails, Fehler-Monitoring und
          Web-Analytics — laufen teilweise über US- oder kanadische Anbieter.
          Sämtliche Transfers sind über Standardvertragsklauseln (SCC, Modul 3),
          das EU-US Data Privacy Framework (DPF), den
          EU-Angemessenheitsbeschluss Kanada (Decision 2002/2/EG) und — wo
          verfügbar — Zero-Data-Retention-Zusagen abgesichert. Die vollständige
          Liste mit Anbieter, Sitz, Zweck und Transfer-Mechanismus liegt im{" "}
          <Link
            href="/legal/sub-processors"
            className="text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Sub-Processor-Register
          </Link>
          .
        </p>

        <h2>Stufe 1 — Mandanten-Content bleibt in der EU</h2>

        <h3>1. Persistente Datenbank (PostgreSQL via Neon)</h3>
        <ul>
          <li>
            <strong>Region:</strong> AWS Europe Central 1 (Frankfurt am Main)
          </li>
          <li>
            <strong>Endpoint:</strong> *.c-2.eu-central-1.aws.neon.tech
          </li>
          <li>
            <strong>Daten:</strong> Mandate, Chats, Parteien, Fristen,
            Zeit-Entries, Notizen, Wissensbasis, Audit-Logs, sämtliche
            Anwendungsdaten
          </li>
          <li>
            <strong>Backup:</strong> Point-in-Time-Recovery (PITR) im selben
            Region-Cluster, max. 30 Tage
          </li>
          <li>
            <strong>Standby-Replicas:</strong> ausschließlich EU-Regionen
          </li>
          <li>
            <strong>Verwaltungs-Zugriff:</strong> Neon-Support aus den USA
            (selten, nur auf Anforderung) ist durch SCC Modul 3 abgesichert
          </li>
        </ul>

        <h3>2. Datei-Vault (Cloudflare R2)</h3>
        <ul>
          <li>
            <strong>Region:</strong> EU (R2 EU-Jurisdiction-Hint aktiviert,
            Speicher-Region Frankfurt bevorzugt)
          </li>
          <li>
            <strong>Daten:</strong> hochgeladene Vault-Dateien (Schriftsätze,
            Bescheide, Verträge, Mandanten-PDFs)
          </li>
          <li>
            <strong>Zugriff:</strong> Signed-URLs mit kurzer Gültigkeit
            (Stunden, nicht Tage); keine Public-Buckets
          </li>
          <li>
            <strong>Verschlüsselung:</strong> AES-256 at-rest durch
            Cloudflare-Standard
          </li>
        </ul>

        <h3>3. Applikations-Hosting (Vercel)</h3>
        <ul>
          <li>
            <strong>Primary Region:</strong> Vercel Frankfurt (fra1) für
            dynamische Requests, die Mandanten-Daten verarbeiten
          </li>
          <li>
            <strong>Edge Network:</strong> Multi-Region, aber Funktionen mit
            Mandanten-Datenzugriff sind auf EU-Regionen gepinnt
          </li>
          <li>
            <strong>Logs:</strong> EU-Verarbeitung auf Pro+ Plan
          </li>
        </ul>

        <h3>4. Rate-Limiting / Caching (Upstash Redis)</h3>
        <ul>
          <li>
            <strong>Region:</strong> EU-West-1 (Dublin, Irland)
          </li>
          <li>
            <strong>Daten:</strong> Rate-Limit-Counter, Session-Tokens,
            kurzlebige Zähler — keine Mandanten-Inhalte
          </li>
        </ul>

        <h2>Stufe 2 — Hilfsdienste mit Drittland-Transfers</h2>
        <p>
          Folgende Dienste verarbeiten zumindest teilweise außerhalb der EU. Für
          jeden ist Transfer-Mechanismus und Schutzniveau dokumentiert; details
          im{" "}
          <Link
            href="/legal/sub-processors"
            className="text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Sub-Processor-Register
          </Link>
          .
        </p>

        <h3>5. KI-Inferenz für Dokumentengenerierung (Anthropic Claude)</h3>
        <ul>
          <li>
            <strong>Primärer Pfad:</strong> AWS Bedrock EU (Frankfurt / Irland)
            über das Vercel AI Gateway — kein Drittland-Transfer
          </li>
          <li>
            <strong>Fallback-Pfad:</strong> Anthropic Direct-API (USA) — wird
            nur genutzt, wenn der EU-Bedrock-Pfad zeitweise nicht verfügbar ist
          </li>
          <li>
            <strong>Garantien für den Fallback:</strong> Anthropic ist
            DPF-zertifiziert (EU-US Data Privacy Framework) · SCC Modul 3 ·
            Zero-Data-Retention (Anthropic Enterprise — keine Speicherung nach
            Antwort, keine Nutzung für Modelltraining)
          </li>
        </ul>

        <h3>
          6. Embeddings für semantische Suche (OpenAI via Vercel AI Gateway)
        </h3>
        <ul>
          <li>
            <strong>Region:</strong> USA
          </li>
          <li>
            <strong>Routing:</strong> Über das Vercel AI Gateway — keine direkte
            Vertragsbeziehung zwischen OpenAI und Caelex; OpenAI ist
            Sub-Sub-Processor von Vercel
          </li>
          <li>
            <strong>Daten:</strong> Such-Queries (kurz), Library-Eintrags- Texte
            (Titel + erste 3.000 Zeichen) zur Vektor-Repräsentation
          </li>
          <li>
            <strong>Garantien:</strong> DPF-zertifiziert · SCC ·
            Zero-Data-Retention für API-Aufrufe (OpenAI seit 2023)
          </li>
        </ul>

        <h3>7. Transaktionale E-Mails (Resend)</h3>
        <ul>
          <li>
            <strong>Region:</strong> USA-Backend mit EU-Edge-Regionen für
            Zustellung
          </li>
          <li>
            <strong>Daten:</strong> Empfänger-Adresse, Betreff, E-Mail- Inhalt
            während der Zustellung — keine dauerhafte Speicherung
          </li>
          <li>
            <strong>Garantien:</strong> SCC Modul 3 · optional EU-Datenhaltung
            aktiv
          </li>
        </ul>

        <h3>8. Fehler- und Performance-Monitoring (Sentry)</h3>
        <ul>
          <li>
            <strong>Region:</strong> Primär EU (Frankfurt), Fallback USA
          </li>
          <li>
            <strong>Daten:</strong> Stack-Traces, Browser-/OS-Info,
            Request-Metadaten — PII-Scrubbing vor Übertragung aktiv
          </li>
          <li>
            <strong>Garantien:</strong> SCC Modul 3 für USA-Fallback
          </li>
        </ul>

        <h3>9. Web-Analytics + Speed-Insights (Vercel)</h3>
        <ul>
          <li>
            <strong>Region:</strong> USA mit globaler Edge-Aggregation
          </li>
          <li>
            <strong>Daten:</strong> Cookielose Reichweiten-Statistik (Pfad,
            Geräteklasse, Referrer, gerollter Session-Hash) — keine IP-Adressen,
            keine Cookies, keine User-IDs
          </li>
          <li>
            <strong>Voraussetzung:</strong> Nur nach ausdrücklicher
            Cookie-Banner-Einwilligung
          </li>
          <li>
            <strong>Garantien:</strong> SCC Modul 3 · DPF-zertifiziert
          </li>
        </ul>

        <h3>10. Geschäftsereignis-Monitoring (LogSnag)</h3>
        <ul>
          <li>
            <strong>Region:</strong> Kanada
          </li>
          <li>
            <strong>Daten:</strong> Ereignistyp, Channel, kurze Beschreibung,
            Caelex-interne IDs — keine E-Mails, kein PII- Klartext, kein
            Browser- oder Geräte-Fingerprinting (server- only)
          </li>
          <li>
            <strong>Garantien:</strong> Übermittlung an Drittland mit
            EU-Angemessenheitsbeschluss Kanada (Entscheidung 2002/2/EG —
            Schutzniveau wird durch EU-Kommission als ausreichend angesehen, SCC
            nicht zwingend erforderlich) · zusätzlich SCC im Anbietervertrag
          </li>
        </ul>

        <h3>11. Zahlungsabwicklung (Stripe Payments Europe Ltd.)</h3>
        <ul>
          <li>
            <strong>Hauptregion:</strong> Irland (EU) — Stripe ist
            eigenverantwortlicher Datenverarbeiter für Zahlungsdaten
          </li>
          <li>
            <strong>Teilverarbeitung:</strong> USA und Großbritannien
          </li>
          <li>
            <strong>Garantien:</strong> SCC Modul 3 · UK-Addendum · Stripe ist
            PCI DSS Level 1 zertifiziert
          </li>
        </ul>

        <h2>Schrems-II-Compliance</h2>
        <p>
          Für die unter <em>Stufe 1</em> aufgeführten Mandanten-Content-
          Verarbeitungen (Datenbank, Vault, primäres Hosting, Rate-Limit- Cache)
          findet kein Drittland-Transfer statt — Schrems II ist hier nicht
          einschlägig.
        </p>
        <p>
          Für die unter <em>Stufe 2</em> aufgeführten Hilfsdienste mit
          Drittland-Berührung greift ein vollständiges Schrems-II-konformes
          Schutzkonzept:
        </p>
        <ol>
          <li>
            <strong>Adäquanzentscheidung:</strong> für Kanada (LogSnag) besteht
            eine Adäquanzentscheidung der EU-Kommission
          </li>
          <li>
            <strong>EU-US Data Privacy Framework:</strong> alle US-
            Sub-Prozessoren (Vercel, Anthropic, OpenAI, Cloudflare, Sentry) sind
            DPF-zertifiziert
          </li>
          <li>
            <strong>Standardvertragsklauseln (SCC, Modul 3):</strong>
            in jedem Sub-Processor-Vertrag zusätzlich vereinbart als zweite
            Schutzebene neben DPF
          </li>
          <li>
            <strong>Transfer-Risk-Assessment (TIA):</strong> für jeden
            Drittland-Transfer dokumentiert; auf Anforderung als geschwärzte
            Zusammenfassung erhältlich
          </li>
          <li>
            <strong>Zero-Data-Retention:</strong> wo technisch möglich
            (Anthropic Enterprise, OpenAI API) aktiviert
          </li>
          <li>
            <strong>PII-Scrubbing:</strong> wo technisch sinnvoll (Sentry) vor
            Übertragung aktiv
          </li>
        </ol>
        <p>
          CLOUD Act und FISA 702 sind durch die kombinierte Anwendung von DPF,
          SCC und Zero-Data-Retention adressiert. Caelex stellt Kanzlei-Kunden
          auf Anforderung ein detailliertes TIA pro Sub-Processor zur Verfügung.
        </p>

        <h2>Audit + Nachweise</h2>
        <p>Auf Anfrage stellt Caelex zur Verfügung:</p>
        <ul>
          <li>
            Schriftliche Bestätigung jedes EU-only-Sub-Processors zur Region
            (Stufe 1)
          </li>
          <li>DPF-Zertifizierungsnachweise für US-Sub-Prozessoren</li>
          <li>SCC-Vertragsauszüge (Modul 3) für jeden Drittland-Transfer</li>
          <li>Transfer-Risk-Assessment (TIA) je Sub-Processor</li>
          <li>
            Provider-Trust-Center-Links (Neon, Vercel, Anthropic, Cloudflare,
            Sentry, OpenAI, Resend, Stripe)
          </li>
          <li>SOC 2 Type II Reports (vertraulich, NDA-gebunden)</li>
          <li>Caelex-eigenes Verarbeitungsverzeichnis (DSGVO Art. 30)</li>
        </ul>

        <h2>Kontakt</h2>
        <p>
          Nachweise + Audit-Anfragen + TIA-Anforderungen:{" "}
          <a
            href="mailto:legal@caelex.eu"
            className="text-emerald-700 hover:underline dark:text-emerald-400"
          >
            legal@caelex.eu
          </a>
        </p>
      </div>
    </article>
  );
}
