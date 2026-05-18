import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schweigepflicht-Erklärung Mitwirkende · § 203 StGB · Caelex",
  description:
    "Caelex-Mitarbeiter und Sub-Processors sind auf die anwaltliche Schweigepflicht analog § 203 Abs. 4 StGB verpflichtet.",
  alternates: { canonical: "https://www.caelex.eu/legal/mitwirkende" },
};

export default function MitwirkendePage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-slate-900 dark:text-slate-100">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Caelex · Legal · § 203 StGB Mitwirkende
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Schweigepflicht-Verpflichtungserklärung der Mitwirkenden
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Gemäß § 203 Abs. 4 StGB · Stand: 18.05.2026 · Version 1.0
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none text-[14px] leading-relaxed">
        <h2>Rechtlicher Hintergrund</h2>
        <p>
          § 203 Abs. 4 StGB normiert die Strafbarkeit der unbefugten Offenbarung
          eines fremden Geheimnisses durch sonstige mitwirkende Personen — also
          auch Cloud-Anbieter und IT-Dienstleister, die Anwaltskanzleien
          unterstützen. Caelex und alle Sub-Processors stehen unter dieser
          Verpflichtung.
        </p>

        <h2>1. Verpflichtete Personen</h2>
        <h3>1.1 Caelex-Mitarbeiter</h3>
        <ul>
          <li>
            Alle Mitarbeiter, Werkstudenten, Freelancer und externen Berater mit
            Zugriff auf Caelex-Infrastruktur unterschreiben eine schriftliche
            Schweigepflicht-Erklärung
          </li>
          <li>
            Verpflichtungserklärung umfasst: Vertraulichkeit aller
            Mandanten-bezogenen Daten (Namen, Adressen, Mandatsinhalte,
            Aktenzeichen, Korrespondenz, Vault-Files, Chat-Verläufe)
          </li>
          <li>
            Wirkung über Beschäftigungsende hinaus (lebenslang, analog § 203
            StGB)
          </li>
          <li>
            Strafrechtliche und arbeitsrechtliche Konsequenzen bei Verstoß
            (Geldstrafe bis Freiheitsstrafe bis 1 Jahr, fristlose Kündigung)
          </li>
        </ul>

        <h3>1.2 Sub-Processors (Cloud-Anbieter)</h3>
        <p>
          Caelex hat mit allen Sub-Processors AVV (Art. 28 DSGVO) +
          Schweigepflicht-Klauseln abgeschlossen. Die Sub-Processors unterliegen
          damit derselben Geheimhaltungspflicht:
        </p>
        <ul>
          <li>
            <strong>Neon (Postgres-Datenbank):</strong> DPA + EU-only
            Verarbeitung + keine Daten-Inspektion
          </li>
          <li>
            <strong>Vercel (Hosting):</strong> DPA + SOC 2 Type II + keine
            Daten-Zugriffe seitens Vercel-Personal
          </li>
          <li>
            <strong>Anthropic (Claude AI):</strong> DPA + Zero-Data-Retention
            Add-On (keine Trainings-Nutzung der Mandanten-Daten)
          </li>
          <li>
            <strong>Cloudflare R2 (Vault-Storage):</strong> DPA +
            EU-Jurisdiction + keine Datei-Inspektion
          </li>
          <li>
            <strong>Upstash (Cache/Rate-Limiting):</strong> DPA — speichert nur
            Rate-Limit-Counter, keine PII
          </li>
        </ul>

        <h2>2. Inhalt der Verpflichtung</h2>
        <p>Mitwirkende verpflichten sich, insbesondere:</p>
        <ol>
          <li>
            keine Mandantendaten an unbefugte Dritte weiterzugeben oder
            zugänglich zu machen
          </li>
          <li>Mandantendaten nicht für eigene Zwecke zu nutzen</li>
          <li>
            Mandantendaten nur im Rahmen ihrer Aufgabenstellung zu verarbeiten
          </li>
          <li>
            Vorgaben der DSGVO + § 43e BRAO einzuhalten (TOMs, Datenminimierung,
            Zweckbindung)
          </li>
          <li>
            Vorfälle (Datenpannen, Verdacht auf unbefugten Zugriff) unverzüglich
            an Caelex zu melden (innerhalb 24 Stunden)
          </li>
          <li>
            Datenträger und Zugänge bei Ende der Mitwirkung zurückzugeben / zu
            löschen
          </li>
        </ol>

        <h2>3. Caelex als Mitwirkender der Kanzlei</h2>
        <p>
          Caelex selbst tritt als Mitwirkender der Kanzlei auf — die Kanzlei
          (als Auftraggeber + Verantwortlicher i.S.d. DSGVO) hat Caelex gemäß §
          43e BRAO + DSGVO Art. 28 zur Verschwiegenheit verpflichtet. Verstöße
          seitens Caelex sind sowohl arbeitsrechtlich (gegenüber
          Caelex-Mitarbeitern) als auch zivilrechtlich (Kanzlei ↔ Caelex) als
          auch strafrechtlich (§ 203 StGB) sanktioniert.
        </p>

        <h2>4. Dokumentation</h2>
        <p>
          Caelex führt ein Verzeichnis aller verpflichteten Mitarbeiter mit
          Zugriff auf Mandantendaten. Das Verzeichnis ist auf Anfrage Kanzleien
          zur Audit-Einsicht verfügbar — Anfragen über{" "}
          <a
            href="mailto:legal@caelex.eu"
            className="text-emerald-700 hover:underline dark:text-emerald-400"
          >
            legal@caelex.eu
          </a>
          .
        </p>

        <h2>5. Vorfälle melden</h2>
        <p>
          Verdacht auf einen Bruch der Schweigepflicht — durch Caelex selbst
          oder durch einen Sub-Processor — bitte sofort melden an{" "}
          <a
            href="mailto:security@caelex.eu"
            className="text-emerald-700 hover:underline dark:text-emerald-400"
          >
            security@caelex.eu
          </a>
          . Bestätigung des Eingangs innerhalb 2 Stunden. Bei Datenpannen
          erfolgt Meldung an die Kanzlei innerhalb 24 Stunden (DSGVO-72h-Frist
          bleibt Pflicht der Kanzlei als Verantwortlichem gegenüber der
          Aufsichtsbehörde).
        </p>
      </div>
    </article>
  );
}
