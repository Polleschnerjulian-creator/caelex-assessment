import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BRAO §43e Konformitätserklärung · Caelex",
  description:
    "Konformitätserklärung der Caelex-Cloud-Nutzung gemäß § 43e BRAO. Für deutsche Rechtsanwaltskanzleien.",
  alternates: { canonical: "https://www.caelex.eu/legal/brao-43e" },
};

export default function BraoPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-slate-900 dark:text-slate-100">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Caelex · Legal · Anwalts-Compliance
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          BRAO § 43e Konformitätserklärung
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Stand: 18.05.2026 · Version 1.0
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none text-[14px] leading-relaxed">
        <h2>Zweck dieser Erklärung</h2>
        <p>
          Caelex erklärt hiermit verbindlich, dass die Caelex-Atlas-Cloud zur
          Verarbeitung anwaltlicher Mandatsdaten gemäß den Anforderungen des{" "}
          <strong>§ 43e BRAO</strong> (Bundesrechtsanwaltsordnung) ausgestaltet
          ist. Diese Erklärung ist Bestandteil des Auftragsverarbeitungsvertrags
          (AVV) mit jeder Kanzlei.
        </p>

        <h2>1. Sicherheitsstandards (§ 43e Abs. 2 Nr. 1 BRAO)</h2>
        <ul>
          <li>
            Verschlüsselung bei Übertragung: TLS 1.3 (Vercel + Neon Default)
          </li>
          <li>
            Verschlüsselung bei Speicherung: AES-256-GCM für sensible Felder
            (IBAN, Bankdaten, Aktenzeichen, Custom Instructions)
          </li>
          <li>
            Per-Organisation Encryption-Key (Tenant-Isolation kryptographisch
            durchgesetzt)
          </li>
          <li>
            Multi-Faktor-Authentifizierung verpflichtend (TOTP + WebAuthn /
            FIDO2)
          </li>
          <li>
            Audit-Logging mit SHA-256-Hash-Chain (tamper-evident, Art. 32 DSGVO)
          </li>
          <li>
            Provider-Stack: SOC 2 Type II + ISO 27001 zertifiziert (Neon,
            Vercel, Anthropic, Cloudflare R2, Upstash)
          </li>
        </ul>

        <h2>2. Verzicht auf Drittzugriff (§ 43e Abs. 2 Nr. 2 BRAO)</h2>
        <p>
          Sub-Processors (Cloud-Anbieter) verpflichten sich vertraglich, weder
          auf Inhalts-Daten zuzugreifen noch diese zu Trainingszwecken zu
          nutzen. Insbesondere:
        </p>
        <ul>
          <li>
            <strong>Anthropic Claude:</strong> Zero-Data-Retention Add-On aktiv
            (API-Inputs/Outputs werden nicht gespeichert, nicht für Training
            verwendet)
          </li>
          <li>
            <strong>Neon Postgres:</strong> Verschlüsselte Storage in
            eu-central-1 Frankfurt, kein Personal-Zugriff
          </li>
          <li>
            <strong>Cloudflare R2:</strong> EU-Jurisdiction, keine
            Datei-Inspektion
          </li>
        </ul>

        <h2>3. Schweigepflicht der Mitwirkenden (§ 203 StGB analog)</h2>
        <p>
          Alle Caelex-Mitarbeiter und Sub-Processors sind schriftlich auf die
          anwaltliche Schweigepflicht analog § 203 Abs. 4 StGB verpflichtet.
          Verstöße werden straf- und arbeitsrechtlich verfolgt. Details:
          <a
            href="/legal/mitwirkende"
            className="ml-1 text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Mitwirkenden-Verpflichtungserklärung
          </a>
          .
        </p>

        <h2>4. Audit-Rechte der Kanzlei (§ 43e Abs. 2 Nr. 4 BRAO)</h2>
        <p>
          Die Kanzlei hat das Recht, Sicherheits-Audits durchzuführen oder
          durchführen zu lassen. Caelex stellt zur Verfügung:
        </p>
        <ul>
          <li>
            SOC 2 Type II Reports der Sub-Processors (Neon, Vercel, Anthropic,
            Cloudflare, Upstash) — auf Anfrage NDA-gebunden
          </li>
          <li>
            ISO 27001 Zertifikate der Sub-Processors (siehe § 1 —
            Provider-Stack)
          </li>
          <li>
            Penetration-Test Summaries (jährlich, geschwärzte Zusammenfassung)
          </li>
          <li>
            Vollständiges Audit-Log aller Operationen auf Mandantendaten (DSGVO
            Art. 30)
          </li>
          <li>Vertragliche Audit-Klausel mit 14 Tagen Voranmeldung</li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong>Hinweis zur Caelex-eigenen Zertifizierung:</strong> Caelex ist
          aktuell nicht ISO-27001- oder SOC-2-zertifiziert. Eine eigene
          Zertifizierung ist mittelfristig geplant; ein konkretes Datum
          kommunizieren wir erst, wenn Audit-Vorbereitung und Auditor-Mandat
          abgeschlossen sind. Aktuell stützen wir uns vertraglich auf die
          Zertifizierungen der oben genannten Sub-Processors, ergänzt durch
          eigene technische und organisatorische Maßnahmen (siehe
          <a
            href="/legal/security"
            className="ml-1 text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Security-Statement
          </a>
          ).
        </p>

        <h2>5. Datenresidenz (§ 43e Abs. 2 Nr. 3 BRAO + DSGVO Kapitel V)</h2>
        <p>
          Mandanten-Content (Datenbank, Datei-Vault) verbleibt ausschließlich in
          der EU (Frankfurt). Hilfsdienste mit Drittland-Berührung
          (KI-Inferenz-Fallback, Embeddings für die semantische Suche,
          transaktionale E-Mails, Fehler-Monitoring) sind über
          EU-Standardvertragsklauseln (SCC, Modul 3), das EU-US Data Privacy
          Framework und — wo verfügbar — Zero-Data-Retention-Zusagen
          abgesichert. Details und vollständige Aufschlüsselung pro
          Sub-Processor:{" "}
          <a
            href="/legal/data-residency"
            className="text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Datenresidenz-Statement
          </a>{" "}
          und{" "}
          <a
            href="/legal/sub-processors"
            className="text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Sub-Processor-Register
          </a>
          .
        </p>

        <h2>6. Daten-Löschung und Mandats-Akten-Übertragung</h2>
        <p>
          Bei Vertragsende werden alle Mandantendaten auf Wunsch der Kanzlei
          binnen 30 Tagen vollständig gelöscht (DSGVO Art. 17) oder im
          Standardformat exportiert (DSGVO Art. 20). Backup-Aufbewahrung maximal
          90 Tage nach Vertragsende.
        </p>

        <h2>7. Versicherung</h2>
        <p>
          Caelex Einzelunternehmen verfügt über IT-Berufshaftpflicht
          (Vermögensschaden) sowie Cyber-Versicherung. Deckungssumme +
          Versicherer auf Anfrage über{" "}
          <a
            href="mailto:legal@caelex.eu"
            className="text-emerald-700 hover:underline dark:text-emerald-400"
          >
            legal@caelex.eu
          </a>
          .
        </p>

        <h2>Kontakt</h2>
        <p>
          Caelex Einzelunternehmen · Inhaber: Julian Polleschner ·{" "}
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
