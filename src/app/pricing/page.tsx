"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import {
  ArrowLeft,
  Check,
  HelpCircle,
  Zap,
  Building2,
  Rocket,
} from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "Für kleine Teams und erste Compliance-Schritte",
    icon: Zap,
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceLabel: "Kostenlos",
    highlighted: false,
    cta: "Jetzt starten",
    ctaHref: "/register",
    features: [
      "Compliance Assessment",
      "Basis-Dashboard",
      "1 Spacecraft",
      "EU Space Act Ressourcen",
      "Community Support",
    ],
    limits: [
      "Kein Dokumentenmanagement",
      "Keine API-Zugang",
      "Keine Team-Funktionen",
    ],
  },
  {
    name: "Professional",
    description: "Für wachsende Space-Unternehmen",
    icon: Rocket,
    monthlyPrice: 299,
    yearlyPrice: 249,
    priceLabel: null,
    highlighted: true,
    cta: "14 Tage kostenlos testen",
    ctaHref: "/register?plan=professional",
    features: [
      "Alles aus Starter",
      "Unbegrenzte Spacecraft",
      "Vollständiges Compliance-Dashboard",
      "Dokumentenmanagement",
      "Audit-Trail & Berichte",
      "NCA-Submission Workflow",
      "Team-Zugang (bis 10 User)",
      "E-Mail Support",
      "API-Zugang",
    ],
    limits: [],
  },
  {
    name: "Enterprise",
    description: "Für Konzerne und komplexe Anforderungen",
    icon: Building2,
    monthlyPrice: null,
    yearlyPrice: null,
    priceLabel: "Auf Anfrage",
    highlighted: false,
    cta: "Kontakt aufnehmen",
    ctaHref: "/contact?subject=enterprise",
    features: [
      "Alles aus Professional",
      "Unbegrenzte User",
      "Multi-Organisation Support",
      "SSO / SAML Integration",
      "Dedizierter Account Manager",
      "Custom Integrationen",
      "SLA-Garantie (99.9%)",
      "On-Premise Option",
      "Schulungen & Onboarding",
      "Priority Support",
    ],
    limits: [],
  },
];

const faqs = [
  {
    question: "Kann ich den Plan jederzeit wechseln?",
    answer:
      "Ja, Sie können jederzeit upgraden oder downgraden. Bei einem Upgrade wird der Differenzbetrag anteilig berechnet. Bei einem Downgrade wird das Guthaben auf die nächste Rechnung angerechnet.",
  },
  {
    question: "Was passiert nach der kostenlosen Testphase?",
    answer:
      "Nach 14 Tagen werden Sie automatisch auf den gewählten Plan umgestellt. Sie können jederzeit vorher kündigen. Es werden keine Kreditkartendaten für die Testphase benötigt.",
  },
  {
    question: "Gibt es Rabatte für Startups?",
    answer:
      "Ja! Wir bieten ein Startup-Programm mit 50% Rabatt im ersten Jahr für qualifizierte Space-Startups. Kontaktieren Sie uns für Details.",
  },
  {
    question: "Wie funktioniert die Abrechnung?",
    answer:
      "Die Abrechnung erfolgt monatlich oder jährlich im Voraus per Kreditkarte oder SEPA-Lastschrift. Enterprise-Kunden können auch per Rechnung zahlen.",
  },
  {
    question: "Was zählt als 'Spacecraft'?",
    answer:
      "Ein Spacecraft ist jedes Raumfahrzeug, das Sie in der Plattform verwalten — unabhängig davon, ob es sich um einen Satelliten, eine Konstellation oder ein Servicemodul handelt. Konstellationen mit identischen Einheiten können als ein Eintrag verwaltet werden.",
  },
  {
    question: "Bieten Sie Schulungen an?",
    answer:
      "Professional-Kunden erhalten Zugang zu unserer Wissensdatenbank und Webinaren. Enterprise-Kunden bekommen dedizierte Schulungen und Onboarding-Sessions.",
  },
];

const comparisonFeatures = [
  {
    name: "Compliance Assessment",
    starter: true,
    professional: true,
    enterprise: true,
  },
  {
    name: "Spacecraft Management",
    starter: "1",
    professional: "Unbegrenzt",
    enterprise: "Unbegrenzt",
  },
  {
    name: "Team-Mitglieder",
    starter: "1",
    professional: "10",
    enterprise: "Unbegrenzt",
  },
  {
    name: "Dokumentenmanagement",
    starter: false,
    professional: true,
    enterprise: true,
  },
  { name: "Audit-Trail", starter: false, professional: true, enterprise: true },
  {
    name: "NCA-Submission Workflow",
    starter: false,
    professional: true,
    enterprise: true,
  },
  { name: "API-Zugang", starter: false, professional: true, enterprise: true },
  { name: "SSO / SAML", starter: false, professional: false, enterprise: true },
  {
    name: "Custom Integrationen",
    starter: false,
    professional: false,
    enterprise: true,
  },
  {
    name: "SLA-Garantie",
    starter: false,
    professional: "99.5%",
    enterprise: "99.9%",
  },
  {
    name: "Support",
    starter: "Community",
    professional: "E-Mail",
    enterprise: "Priority + AM",
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly",
  );

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="transition-opacity duration-300 hover:opacity-70"
            >
              <Logo size={24} className="text-white" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Zurück</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em] block mb-4">
              Pricing
            </span>
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light tracking-[-0.02em] mb-6">
              Einfache, transparente Preise
            </h1>
            <p className="text-[17px] text-white/50 max-w-[500px] mx-auto mb-10">
              Starten Sie kostenlos und skalieren Sie mit Ihren
              Compliance-Anforderungen.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 p-1.5 bg-white/[0.03] rounded-full border border-white/[0.08]">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Monatlich
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${
                  billingPeriod === "yearly"
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Jährlich
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    billingPeriod === "yearly"
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  -17%
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const price =
                billingPeriod === "yearly"
                  ? plan.yearlyPrice
                  : plan.monthlyPrice;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative rounded-2xl border ${
                    plan.highlighted
                      ? "bg-white/[0.04] border-white/20"
                      : "bg-white/[0.02] border-white/[0.08]"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-mono text-black bg-white px-3 py-1 rounded-full">
                        Beliebt
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          plan.highlighted ? "bg-white/10" : "bg-white/[0.05]"
                        }`}
                      >
                        <Icon size={20} className="text-white/70" />
                      </div>
                      <div>
                        <h3 className="text-[18px] font-medium text-white">
                          {plan.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-[13px] text-white/50 mb-6 h-10">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.priceLabel ? (
                        <div className="text-[32px] font-light text-white">
                          {plan.priceLabel}
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-[32px] font-light text-white">
                            €{price}
                          </span>
                          <span className="text-[14px] text-white/40">
                            /Monat
                          </span>
                        </div>
                      )}
                      {billingPeriod === "yearly" &&
                        price !== null &&
                        price > 0 && (
                          <p className="text-[12px] text-white/40 mt-1">
                            €{price * 12} jährlich abgerechnet
                          </p>
                        )}
                    </div>

                    {/* CTA */}
                    <Link
                      href={plan.ctaHref}
                      className={`block w-full text-center py-3 rounded-full text-[14px] font-medium transition-all ${
                        plan.highlighted
                          ? "bg-white text-black hover:bg-white/90"
                          : "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                      }`}
                    >
                      {plan.cta}
                    </Link>

                    {/* Features */}
                    <div className="mt-6 pt-6 border-t border-white/[0.06]">
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-3 text-[13px]"
                          >
                            <Check
                              size={16}
                              className="text-emerald-400 flex-shrink-0 mt-0.5"
                            />
                            <span className="text-white/70">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[24px] font-light text-center mb-12">
            Feature-Vergleich
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-4 px-4 text-[13px] text-white/40 font-medium">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 text-[13px] text-white/60 font-medium">
                    Starter
                  </th>
                  <th className="text-center py-4 px-4 text-[13px] text-white font-medium bg-white/[0.02]">
                    Professional
                  </th>
                  <th className="text-center py-4 px-4 text-[13px] text-white/60 font-medium">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr
                    key={feature.name}
                    className="border-b border-white/[0.04]"
                  >
                    <td className="py-4 px-4 text-[13px] text-white/70">
                      {feature.name}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof feature.starter === "boolean" ? (
                        feature.starter ? (
                          <Check
                            size={16}
                            className="text-emerald-400 mx-auto"
                          />
                        ) : (
                          <span className="text-white/20">—</span>
                        )
                      ) : (
                        <span className="text-[13px] text-white/60">
                          {feature.starter}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center bg-white/[0.02]">
                      {typeof feature.professional === "boolean" ? (
                        feature.professional ? (
                          <Check
                            size={16}
                            className="text-emerald-400 mx-auto"
                          />
                        ) : (
                          <span className="text-white/20">—</span>
                        )
                      ) : (
                        <span className="text-[13px] text-white/80">
                          {feature.professional}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof feature.enterprise === "boolean" ? (
                        feature.enterprise ? (
                          <Check
                            size={16}
                            className="text-emerald-400 mx-auto"
                          />
                        ) : (
                          <span className="text-white/20">—</span>
                        )
                      ) : (
                        <span className="text-[13px] text-white/60">
                          {feature.enterprise}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[800px] mx-auto">
          <div className="flex items-center justify-center gap-3 mb-12">
            <HelpCircle size={20} className="text-white/40" />
            <h2 className="text-[24px] font-light">Häufige Fragen</h2>
          </div>

          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl"
              >
                <h3 className="text-[15px] font-medium text-white mb-2">
                  {faq.question}
                </h3>
                <p className="text-[14px] text-white/50 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-[28px] font-light mb-4">
            Bereit für EU Space Act Compliance?
          </h2>
          <p className="text-[15px] text-white/50 mb-8">
            Starten Sie kostenlos oder sprechen Sie mit unserem Team über Ihre
            Anforderungen.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-black bg-white px-8 py-4 rounded-full hover:bg-white/90 transition-all"
            >
              Kostenlos starten
              <span>→</span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-[15px] text-white/60 hover:text-white transition-colors"
            >
              Enterprise anfragen
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
