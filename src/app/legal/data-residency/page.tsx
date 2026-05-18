import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenresidenz EU-only · Caelex",
  description:
    "Alle Caelex-Mandantendaten werden ausschließlich in der EU verarbeitet. Keine USA-Transfers. Konkrete Regionen pro Sub-Processor.",
  alternates: { canonical: "https://www.caelex.eu/legal/data-residency" },
};

export default function DataResidencyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-slate-900 dark:text-slate-100">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Caelex · Legal · Datenresidenz
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Datenresidenz-Statement — EU only
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Stand: 18.05.2026 · Version 1.0 · DSGVO Kapitel V
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none text-[14px] leading-relaxed">
        <h2>Zusicherung</h2>
        <p>
          Caelex verarbeitet sämtliche personenbezogenen Mandantendaten
          ausschließlich in der Europäischen Union. Es findet{" "}
          <strong>kein Transfer in die USA oder andere Drittländer</strong>{" "}
          statt. Diese Zusicherung ist Bestandteil aller AVVs mit Kanzleien.
        </p>

        <h2>Konkrete Verarbeitungsorte pro Datenkategorie</h2>

        <h3>1. Datenbank (PostgreSQL via Neon)</h3>
        <ul>
          <li>
            <strong>Region:</strong> AWS Europe Central 1 (Frankfurt am Main)
          </li>
          <li>
            <strong>Endpoint:</strong> *.c-2.eu-central-1.aws.neon.tech
          </li>
          <li>
            <strong>Daten:</strong> Mandate, Chats, Parteien, Fristen,
            Zeit-Entries, Notes, Wissensbasis, Audit-Logs
          </li>
          <li>
            <strong>Backup:</strong> Point-in-Time-Recovery (PITR) im selben
            Region-Cluster, max. 30 Tage
          </li>
          <li>
            <strong>Standby-Replicas:</strong> ausschließlich EU-Regionen
          </li>
        </ul>

        <h3>2. Applikation (Hosting via Vercel)</h3>
        <ul>
          <li>
            <strong>Primary Region:</strong> Vercel Frankfurt (fra1)
          </li>
          <li>
            <strong>Edge Network:</strong> Multi-Region Edge, aber Vercel
            Edge-Functions die Mandantendaten verarbeiten sind gepinnt auf
            EU-Regionen
          </li>
          <li>
            <strong>Logs:</strong> Vercel-Logs in EU verarbeitet (auf Pro+ Plan)
          </li>
        </ul>

        <h3>3. Datei-Storage (Vault — Cloudflare R2)</h3>
        <ul>
          <li>
            <strong>Jurisdiction:</strong> EU (Cloudflare R2
            EU-Jurisdiction-Hint aktiviert)
          </li>
          <li>
            <strong>Daten:</strong> hochgeladene Vault-Dateien (Schriftsätze,
            Bescheide, Verträge, Mandanten-PDFs)
          </li>
          <li>
            <strong>Zugriff:</strong> Signed-URLs mit max. 60min Gültigkeit,
            keine Public-Buckets
          </li>
        </ul>

        <h3>4. LLM-Inference (Anthropic Claude)</h3>
        <ul>
          <li>
            <strong>Region:</strong> EU/UK Data Processing (Anthropic EU/UK Data
            Processing aktiv)
          </li>
          <li>
            <strong>Retention:</strong> Zero-Data-Retention Add-On — API-Inputs
            und -Outputs werden <strong>nicht</strong> gespeichert
          </li>
          <li>
            <strong>Training:</strong> Mandanten-Daten werden NICHT für
            Anthropic-Training verwendet (vertraglich ausgeschlossen)
          </li>
        </ul>

        <h3>5. Caching / Rate-Limiting (Upstash Redis)</h3>
        <ul>
          <li>
            <strong>Region:</strong> EU (Frankfurt-Region)
          </li>
          <li>
            <strong>Daten:</strong> nur Rate-Limit-Counter und Session-Metadaten
            — keine PII, keine Mandantendaten
          </li>
        </ul>

        <h3>6. E-Mail (Resend)</h3>
        <ul>
          <li>
            <strong>Region:</strong> EU
          </li>
          <li>
            <strong>Daten:</strong> nur transaktionale E-Mails (Frist-Reminder,
            Login-Mails, Notification)
          </li>
          <li>Kein Mandanten-Content in E-Mails</li>
        </ul>

        <h2>Schrems II Compliance</h2>
        <p>
          Da kein Transfer in Drittländer stattfindet, sind{" "}
          <strong>
            keine Standard Contractual Clauses (SCCs) erforderlich
          </strong>{" "}
          und auch keine Transfer Impact Assessments (TIA) gemäß Schrems II.
          Damit besteht keinerlei Risiko aus dem CLOUD Act oder FISA 702.
        </p>

        <h2>Audit + Nachweise</h2>
        <p>Auf Anfrage stellt Caelex zur Verfügung:</p>
        <ul>
          <li>Schriftliche Bestätigung jedes Sub-Processors zur EU-Region</li>
          <li>
            Provider-Trust-Center-Links (Neon, Vercel, Anthropic, Cloudflare)
          </li>
          <li>SOC 2 Type II Reports (vertraulich, NDA-gebunden)</li>
          <li>Caelex-eigenes Verarbeitungsverzeichnis (DSGVO Art. 30)</li>
        </ul>

        <h2>Kontakt</h2>
        <p>
          Nachweise + Audit-Anfragen:{" "}
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
