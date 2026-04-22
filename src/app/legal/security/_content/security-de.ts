import type { LegalDocument } from "@/lib/legal/types";

export const SECURITY_DE: LegalDocument = {
  lang: "de",
  title: "Sicherheitsrichtlinie",
  subtitle:
    "Verantwortungsvolle Offenlegung von Schwachstellen und Sicherheitskontakt",
  version: "Version 1.0",
  effectiveDate: "18. April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin",
  preamble: [
    "Die Sicherheit der Caelex-Plattform hat höchste Priorität. Diese Richtlinie regelt, wie Sie uns Sicherheitsprobleme melden, welche Erwartungen wir aneinander haben und wie wir Schwachstellen handhaben (Coordinated Vulnerability Disclosure).",
    "Diese Richtlinie ergänzt die technischen und organisatorischen Maßnahmen in DPA Anlage 1 (/legal/dpa) und § 21 der AGB V3.0.",
  ],
  sections: [
    {
      id: "sec1",
      number: "§ 1",
      title: "Meldekanal",
      blocks: [
        {
          type: "p",
          text: "Sicherheitslücken melden Sie bitte an security@caelex.eu. Der maschinenlesbare Kontakt ist unter /.well-known/security.txt gemäß RFC 9116 abrufbar.",
        },
        {
          type: "p",
          text: "Melden Sie bitte keine Sicherheitsprobleme über den allgemeinen Support, soziale Medien oder GitHub Issues — diese Kanäle sind nicht für vertrauliche Meldungen geeignet.",
        },
      ],
    },
    {
      id: "sec2",
      number: "§ 2",
      title: "Was Sie melden sollten",
      blocks: [
        { type: "p", text: "Wir begrüßen insbesondere Meldungen zu:" },
        {
          type: "ul",
          items: [
            "Authentifizierungs- oder Autorisierungsschwächen",
            "Injection-Schwachstellen (SQL, XSS, Command, LDAP)",
            "Server-Side Request Forgery (SSRF)",
            "Cross-Site Request Forgery (CSRF)",
            "Verletzung der Mandantentrennung",
            "sensiblen Datenverlust (PII, Zugangsdaten)",
            "fehlerhafter Konfiguration sicherheitsrelevanter Header",
            "Unsicherheiten in der Session-, Token- oder Cookie-Behandlung",
            "Umgehung von Rate-Limits mit signifikanter Auswirkung",
          ],
        },
      ],
    },
    {
      id: "sec3",
      number: "§ 3",
      title: "Safe-Harbor / Erwartungen an Forscher",
      blocks: [
        {
          type: "p",
          text: "Wenn Sie in gutem Glauben und im Rahmen dieser Richtlinie Sicherheitstests durchführen und uns Ergebnisse melden, werden wir keine rechtlichen Schritte gegen Sie einleiten (Safe Harbor).",
        },
        {
          type: "p",
          text: "Voraussetzungen:",
        },
        {
          type: "ul",
          items: [
            "Keine Beeinträchtigung der Verfügbarkeit der Plattform (kein DDoS, keine Lasttests ohne Freigabe)",
            "Keine Destruktion, Modifikation oder Exfiltration von Kundendaten über das zur Demonstration notwendige Mindestmaß hinaus",
            "Kein Zugriff auf Accounts oder Daten anderer Nutzer; nutzen Sie ausschließlich eigene Testaccounts",
            "Keine öffentliche Offenlegung vor gemeinsam vereinbartem Veröffentlichungsdatum (Standard: 90 Tage ab Meldung oder ab Patch, je nach gemeinsamer Absprache)",
            "Keine Verletzung anwendbaren Rechts oder Rechten Dritter",
            "Meldung mit ausreichender Detailtiefe zur Reproduktion",
          ],
        },
      ],
    },
    {
      id: "sec4",
      number: "§ 4",
      title: "Unser Versprechen",
      blocks: [
        {
          type: "ul",
          items: [
            "Eingangsbestätigung innerhalb von 2 Werktagen",
            "Erste inhaltliche Rückmeldung innerhalb von 5 Werktagen",
            "Fortlaufende Updates zum Fortschritt",
            "Namentliche Nennung in unserer Hall of Fame (siehe § 6), sofern gewünscht",
            "Keine rechtlichen Schritte bei gutgläubiger Forschung im Rahmen dieser Richtlinie (§ 3)",
            "Kritische Schwachstellen werden mit höchster Priorität behandelt",
          ],
        },
      ],
    },
    {
      id: "sec5",
      number: "§ 5",
      title: "Ausgeschlossene Bereiche",
      blocks: [
        {
          type: "p",
          text: "Nicht unter diese Richtlinie fallen Tests an Drittdiensten und Bereichen, die nicht unter unserer Kontrolle stehen, insbesondere:",
        },
        {
          type: "ul",
          items: [
            "Infrastruktur unserer Sub-Auftragsverarbeiter (Vercel, Neon, Upstash, Stripe, Resend, Sentry, Anthropic) — bitte deren eigene Responsible-Disclosure-Programme nutzen",
            "Social-Engineering-Angriffe gegen Mitarbeiter oder Kunden",
            "Physische Angriffe",
            "Denial-of-Service, Brute-Force und volumetrische Tests",
          ],
        },
      ],
    },
    {
      id: "sec6",
      number: "§ 6",
      title: "Hall of Fame",
      blocks: [
        {
          type: "p",
          text: "Wir danken folgenden Sicherheitsforschern für verantwortungsvolle Offenlegung. Diese Liste wird mit Ihrer Zustimmung gepflegt; ohne Zustimmung bleibt Ihre Meldung vertraulich.",
        },
        {
          type: "p",
          text: "Aktuell noch keine Einträge — wir freuen uns auf Ihre Meldungen.",
        },
      ],
    },
    {
      id: "sec7",
      number: "§ 7",
      title: "PGP-Schlüssel",
      blocks: [
        {
          type: "p",
          text: "Für besonders sensible Meldungen stellen wir auf Anfrage einen PGP-Schlüssel zur Verfügung. Anforderung unter security@caelex.eu mit Betreff „PGP-Schlüssel anfordern“.",
        },
      ],
    },
  ],
  annexes: [],
  contactLines: [
    "Caelex",
    "Sicherheitskontakt:",
    "mailto:security@caelex.eu",
    "",
    "Machine-readable contact (RFC 9116):",
    "https://www.caelex.eu/.well-known/security.txt",
  ],
  links: [
    { label: "/.well-known/security.txt", href: "/.well-known/security.txt" },
    { label: "DPA (TOMs)", href: "/legal/dpa#anl1" },
    { label: "AGB § 21", href: "/legal/terms#s21" },
    { label: "Impressum", href: "/legal/impressum" },
  ],
};
