import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EU AI Act Konformitäts-Statement · Caelex",
  description:
    "Einstufung von Caelex Atlas unter der EU-Verordnung 2024/1689 (AI Act). Limited-risk Transparenzpflichten, kein High-Risk Annex III.",
  alternates: { canonical: "https://www.caelex.eu/legal/eu-ai-act" },
};

export default function EuAiActPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-slate-900 dark:text-slate-100">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Caelex · Legal · EU AI Act
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          EU AI Act Konformitäts-Statement
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Verordnung (EU) 2024/1689 · Stand: 18.05.2026 · Version 1.0
        </p>
      </header>

      <div className="prose prose-slate dark:prose-invert max-w-none text-[14px] leading-relaxed">
        <h2>1. Einstufung von Atlas</h2>
        <p>
          Caelex Atlas ist ein KI-Werkzeug zur Unterstützung von Rechtsanwälten
          bei Recherche, Dokumentenerstellung und Mandatsverwaltung. Atlas
          trifft <strong>keine</strong> autonomen Entscheidungen — der Anwalt
          bleibt jederzeit Entscheider und nutzt Atlas als Recherche- und
          Drafting-Hilfsmittel.
        </p>

        <h3>1.1 Annex III High-Risk? Nein.</h3>
        <p>
          Annex III Nr. 8(a) erfasst KI-Systeme, die zur Unterstützung von
          Justizbehörden bei der Recherche und Interpretation von Sachverhalten
          und Rechtsnormen verwendet werden. Atlas fällt
          <strong> nicht</strong> hierunter, weil:
        </p>
        <ul>
          <li>
            Atlas wird von <em>Rechtsanwälten</em> (private Berufsträger), nicht
            von Justizbehörden (Gerichten, Staatsanwaltschaften) genutzt.
          </li>
          <li>
            Atlas trifft keine richterlichen oder behördlichen Entscheidungen,
            sondern liefert dem Anwalt Recherche- und Draft-Material zur
            eigenverantwortlichen Verwendung.
          </li>
          <li>
            Atlas-Outputs werden vom Anwalt rechtlich geprüft und freigegeben
            bevor sie Wirkung gegenüber Dritten entfalten.
          </li>
        </ul>

        <h3>1.2 Limited-Risk mit Transparenzpflichten (Art. 50)</h3>
        <p>
          Atlas fällt unter die{" "}
          <strong>Transparenzpflichten gemäß Art. 50</strong>
          (Limited-Risk-KI im Sinne eines Chatbots / generativen KI-Systems).
          Diese Pflichten werden wie folgt erfüllt:
        </p>

        <h2>2. Transparenzpflichten — Umsetzung</h2>
        <h3>2.1 Kennzeichnung als KI (Art. 50 Abs. 1)</h3>
        <ul>
          <li>
            Atlas-Antworten sind eindeutig als KI-generiert erkennbar
            (System-Branding, "Atlas" als KI-Identität, Disclaimer am Ende jeder
            Drafting-Antwort)
          </li>
          <li>
            Jede AI-Antwort enthält den Hinweis "Atlas ist ein
            Recherche-Werkzeug — keine Rechtsberatung. Vor Versand juristisch zu
            prüfen."
          </li>
        </ul>

        <h3>2.2 Kennzeichnung synthetischer Inhalte (Art. 50 Abs. 2)</h3>
        <ul>
          <li>
            KI-generierte PDF-Exporte (Schriftsatz, Memo, Vertrag) tragen den
            Hinweis "AI-generierter Entwurf — vor Versand juristisch zu prüfen"
          </li>
          <li>
            Bei vertraulichen Schriftsätzen zusätzlich automatisch "PRIVILEGED
            &amp; CONFIDENTIAL · Anwaltsgeheimnis"
          </li>
        </ul>

        <h3>2.3 Human Oversight (Art. 14 analog)</h3>
        <ul>
          <li>
            Anwalt kann jede AI-Antwort akzeptieren, ablehnen, ändern, oder
            verwerfen
          </li>
          <li>
            Schreibende AI-Aktionen (Mandate erstellen, Fristen anlegen,
            Vault-Files schreiben) erfordern explizite Anwalt-Bestätigung
            (Approval-Gate)
          </li>
          <li>
            Anwalt sieht den vollständigen Reasoning-Trace (Thinking-Tokens)
            jeder Atlas-Antwort
          </li>
        </ul>

        <h2>3. Datenqualität &amp; Halluzinations-Schutz</h2>
        <ul>
          <li>
            Atlas-Korpus mit ~3000 kuratierten Rechtsquellen (EU-Space-Act,
            NIS2, BRAO, etc.) — alle Citations mit eindeutiger Source-ID
          </li>
          <li>
            Validity-Check pro Citation: in_force / amended / repealed /
            needs_review / pending / unknown
          </li>
          <li>
            Halluzinations-Verifizierer: Atlas markiert ungestützte Behauptungen
            (≥ 40 Worte ohne Source-Citation) visuell
          </li>
          <li>
            "Source not found"-Fallback: Atlas erfindet keine Citations, sondern
            sagt "Keine Quelle im Atlas-Korpus für diese Aussage gefunden"
          </li>
        </ul>

        <h2>4. Provider-AI-Governance</h2>
        <p>
          Atlas nutzt als Underlying-LLM <strong>Anthropic Claude</strong> (über
          Anthropic-API). Anthropic ist:
        </p>
        <ul>
          <li>SOC 2 Type II zertifiziert</li>
          <li>ISO 27001 zertifiziert</li>
          <li>
            <strong>ISO 42001 (AI Management Systems) zertifiziert</strong> —
            erste große LLM-Anbieter mit dieser AI-spezifischen Zertifizierung
          </li>
          <li>Caelex hat Zero-Data-Retention Add-On aktiv</li>
        </ul>

        <h2>5. Konformitätsbewertung (Art. 43)</h2>
        <p>
          Da Atlas <em>nicht</em> in High-Risk-Annex-III fällt, ist
          <strong> keine externe Konformitätsbewertung</strong> nach Art. 43
          erforderlich. Caelex dokumentiert die Einstufung intern und führt
          jährliche Selbst-Reviews durch.
        </p>

        <h2>6. Inkrafttreten &amp; Fristen</h2>
        <p>EU AI Act trat am 1. August 2024 in Kraft. Phasen:</p>
        <ul>
          <li>
            <strong>2. Februar 2025:</strong> Verbote (Atlas nicht betroffen)
          </li>
          <li>
            <strong>2. August 2025:</strong> GPAI-Modell-Anbieter-Pflichten
            (Anthropic erfüllt)
          </li>
          <li>
            <strong>2. August 2026:</strong> High-Risk-System-Pflichten (Atlas
            nicht betroffen)
          </li>
          <li>
            <strong>2. August 2027:</strong> alle GPAI-eingebetteten Systeme
            (Caelex stellt Konformität bis dahin sicher)
          </li>
        </ul>

        <h2>7. Re-Klassifizierung</h2>
        <p>
          Sollte sich Atlas-Funktionsumfang in Richtung autonomer Entscheidungen
          oder Justiz-Unterstützung verschieben, wird Caelex die Einstufung
          re-evaluieren und ggf. die High-Risk-Pflichten (Art. 9–15) umsetzen.
        </p>

        <h2>Kontakt</h2>
        <p>
          Fragen zur AI-Compliance:{" "}
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
