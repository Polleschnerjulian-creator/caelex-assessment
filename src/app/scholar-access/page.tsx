/**
 * /scholar-access — public institutional licence landing page.
 *
 * No auth gate — anyone can reach this page to request a free
 * university licence for Caelex Scholar. Students and researchers
 * discover this page from the scholar-no-access redirect and from
 * the main marketing site.
 *
 * CTA: mailto: to cs@caelex.eu — the lowest-risk option for v1.
 * Rationale: institutional licence requests are low-volume, handled
 * by the customer-success team, and benefit from a human reply rather
 * than an automated pipeline. A dedicated /api/scholar-access endpoint
 * can be added in a future sprint once volume justifies automation.
 */

import Link from "next/link";
import {
  GraduationCap,
  CheckCircle2,
  BookOpen,
  Users,
  ArrowRight,
} from "lucide-react";

const CONTACT_EMAIL = "cs@caelex.eu";

const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Caelex Scholar — Institutionelle Lizenzanfrage")}&body=${encodeURIComponent(
  "Hallo Caelex-Team,\n\nwir möchten Caelex Scholar für unsere Hochschule/Forschungseinrichtung beantragen.\n\nEinrichtung: \nAnsprechpartner: \nAnzahl Studierende / Nutzer: \nAnmerkungen: \n\nVielen Dank!",
)}`;

const FEATURES = [
  {
    icon: BookOpen,
    title: "Vollzugriff auf das Gesetzescorpus",
    description:
      "Studierende erhalten Zugang zu über 150 kommentierten Rechtsquellen aus EU-Weltraumrecht, NIS2 und nationalen Jurisdiktionen.",
  },
  {
    icon: Users,
    title: "Unbegrenzte Campus-Nutzer",
    description:
      "Alle Studierenden und Wissenschaftler deiner Einrichtung melden sich mit ihrer Hochschul-E-Mail an — ohne Einzellizenzen.",
  },
  {
    icon: GraduationCap,
    title: "Kostenlos für Hochschulen",
    description:
      "Die institutionelle Lizenz ist für akkreditierte Universitäten und Forschungseinrichtungen vollständig kostenfrei.",
  },
];

const STEPS = [
  "Sende uns eine Anfrage mit dem Namen deiner Einrichtung.",
  "Wir verifizieren die Hochschule und richten die Lizenz ein (24–48 h).",
  "Studierende registrieren sich unter /scholar-login mit ihrer Hochschul-E-Mail.",
];

export default function ScholarAccessPage() {
  return (
    <div className="min-h-screen bg-navy-950 text-slate-200">
      {/* Minimal header */}
      <header className="border-b border-navy-700 px-6 py-4">
        <Link
          href="https://www.caelex.eu"
          className="flex items-baseline gap-2"
        >
          <span className="text-title font-semibold text-white">
            Caelex Scholar
          </span>
          <span className="text-caption text-slate-400">powered by Atlas</span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 space-y-16">
        {/* Hero */}
        <section className="space-y-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-caption text-emerald-400">
            <GraduationCap size={13} />
            Institutionelle Lizenz · Kostenlos für Hochschulen
          </div>

          <h1 className="text-display font-semibold text-white leading-tight">
            Caelex Scholar für
            <br />
            deine Hochschule
          </h1>

          <p className="text-body-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Caelex Scholar ist die juristische Forschungsplattform für
            Weltraumrecht — semantisch durchsuchbar, mit redaktionell
            aufbereiteten Rechtsquellen aus 10 Jurisdiktionen. Für Universitäten
            und Forschungseinrichtungen ist der Zugang kostenlos.
          </p>

          <a
            href={MAILTO}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-6 py-3 text-subtitle font-medium transition-colors"
          >
            Institutionelle Lizenz anfragen
            <ArrowRight size={16} />
          </a>

          <p className="text-small text-slate-500">
            Oder schreibe direkt an{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-slate-400 hover:text-emerald-400 underline underline-offset-2 transition-colors"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        {/* Features */}
        <section className="space-y-6">
          <h2 className="text-heading font-semibold text-white text-center">
            Was die Lizenz beinhaltet
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li
                  key={f.title}
                  className="rounded-lg border border-navy-700 bg-navy-900 p-5 space-y-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Icon size={18} className="text-emerald-400" />
                  </div>
                  <h3 className="text-title font-medium text-white leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-small text-slate-400 leading-relaxed">
                    {f.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* How it works */}
        <section className="space-y-6">
          <h2 className="text-heading font-semibold text-white text-center">
            So funktioniert es
          </h2>
          <ol className="space-y-3">
            {STEPS.map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-4 rounded-lg border border-navy-700 bg-navy-900 px-5 py-4"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25 text-caption font-semibold text-emerald-400">
                  {i + 1}
                </span>
                <p className="text-body text-slate-300 leading-relaxed">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Student note */}
        <section className="rounded-lg border border-navy-700 bg-navy-900 px-6 py-5 flex items-start gap-4">
          <CheckCircle2
            size={18}
            className="text-emerald-400 mt-0.5 shrink-0"
          />
          <div className="space-y-1">
            <p className="text-title font-medium text-white">
              Du bist Studierende·r?
            </p>
            <p className="text-small text-slate-400 leading-relaxed">
              Wenn deine Hochschule bereits eine Lizenz hat, melde dich einfach
              unter{" "}
              <Link
                href="/scholar-login"
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
              >
                /scholar-login
              </Link>{" "}
              mit deiner Hochschul-E-Mail-Adresse an. Kein weiterer Schritt
              notwendig.
            </p>
          </div>
        </section>

        {/* CTA bottom */}
        <section className="text-center space-y-4">
          <h2 className="text-display-sm font-semibold text-white">
            Bereit, loszulegen?
          </h2>
          <p className="text-body text-slate-400">
            Die Einrichtung einer Hochschullizenz dauert in der Regel 24–48
            Stunden.
          </p>
          <a
            href={MAILTO}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-6 py-3 text-subtitle font-medium transition-colors"
          >
            Lizenz anfragen
            <ArrowRight size={16} />
          </a>
        </section>
      </main>

      <footer className="border-t border-navy-700 px-6 py-6 text-center">
        <p className="text-small text-slate-500">
          &copy; {new Date().getFullYear()} Caelex GmbH &middot;{" "}
          <Link
            href="/legal/privacy"
            className="hover:text-slate-400 transition-colors"
          >
            Datenschutz
          </Link>{" "}
          &middot;{" "}
          <Link
            href="/legal/impressum"
            className="hover:text-slate-400 transition-colors"
          >
            Impressum
          </Link>
        </p>
      </footer>
    </div>
  );
}
