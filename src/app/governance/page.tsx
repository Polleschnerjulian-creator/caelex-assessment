"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Eye,
  Database,
  Scale,
  Leaf,
  Brain,
  Shield,
  CheckCircle2,
  ShieldCheck,
  FileCheck,
  ArrowRight,
  Mail,
  Lock,
} from "lucide-react";

// ============================================================================
// ANIMATION HELPERS
// ============================================================================

function useAnimatedSection(margin: `${number}px` = "-80px") {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin });
  return { ref, isInView };
}

function fadeUp(isInView: boolean, delay = 0) {
  return {
    initial: { opacity: 0, y: 30 },
    animate: isInView ? { opacity: 1, y: 0 } : {},
    transition: { duration: 0.5, delay },
  };
}

// ============================================================================
// DATA
// ============================================================================

const principles = [
  {
    icon: Eye,
    title: "Transparenz",
    description:
      "Offene Kommunikation, klare Preise, keine versteckten Kosten. Wir zeigen, was wir tun — und was nicht.",
  },
  {
    icon: Database,
    title: "Datensouveränität",
    description:
      "Kundendaten gehören den Kunden. Kein Verkauf, kein Teilen mit Dritten — jederzeit vollständig exportierbar.",
  },
  {
    icon: Scale,
    title: "Regulatorische Integrität",
    description:
      "Wir helfen verstehen, nicht nur abhaken. Keine Compliance-Stempel, sondern echtes Verständnis für Anforderungen.",
  },
  {
    icon: Leaf,
    title: "Nachhaltigkeit",
    description:
      "Effizienter Umgang mit Ressourcen und verantwortungsvolles Wachstum — in unserer Infrastruktur und als Unternehmen.",
  },
  {
    icon: Brain,
    title: "Verantwortungsvolle KI",
    description:
      "KI als Werkzeug, nicht als Ersatz. Immer transparent, nie autonom — der Mensch behält die Kontrolle.",
  },
  {
    icon: Shield,
    title: "Unabhängigkeit",
    description:
      "Keine Beratung, keine Interessenkonflikte. Unsere Software liefert Fakten und Regulierungswissen — keine Meinungen.",
  },
];

const ethicalGuidelines = [
  "Wir verkaufen keine Kundendaten — niemals.",
  "Wir geben keine Rechtsberatung — unsere Plattform informiert, sie berät nicht.",
  "Wir setzen keine manipulativen UI-Patterns ein — kein Dark Design.",
  "Wir machen KI-generierte Inhalte immer kenntlich — volle Transparenz.",
  "Wir behandeln alle Kunden gleich — unabhängig von Unternehmensgröße.",
];

const complianceStandards = [
  { label: "DSGVO-konform", description: "Privacy-by-Design in jedem Feature" },
  {
    label: "EU AI Act konform",
    description: "Transparenz- und Aufsichtspflichten erfüllt",
  },
  {
    label: "SOC 2 & ISO 27001",
    description: "Zertifizierungen in Vorbereitung",
  },
];

const contactChannels = [
  {
    icon: Lock,
    title: "Schwachstelle melden",
    description:
      "Du hast eine Sicherheitslücke entdeckt? Melde sie vertraulich an unser Security-Team.",
    email: "security@caelex.eu",
  },
  {
    icon: ShieldCheck,
    title: "Datenschutzbeauftragter",
    description:
      "Fragen zum Umgang mit deinen Daten? Unser DPO steht dir zur Verfügung.",
    email: "dpo@caelex.eu",
  },
  {
    icon: FileCheck,
    title: "Verantwortungsvolle Offenlegung",
    description:
      "Wir verpflichten uns zu transparentem Umgang mit Sicherheitsvorfällen und zeitnaher Kommunikation.",
    email: "disclosure@caelex.eu",
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function GlassCard({
  children,
  className = "",
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`
        bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl
        shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]
        ${hover ? "transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  isInView,
  delay = 0,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  isInView: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      {...fadeUp(isInView, delay)}
      className="text-center mb-16 md:mb-20"
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/30 mb-4 block">
        {eyebrow}
      </span>
      <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[15px] md:text-[16px] text-white/40 leading-relaxed max-w-[650px] mx-auto">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

// ============================================================================
// SECTIONS
// ============================================================================

function HeroSection() {
  const { ref, isInView } = useAnimatedSection("-50px");

  return (
    <section
      ref={ref}
      className="relative pt-40 pb-24 md:pt-48 md:pb-32 overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(16, 185, 129, 0.10) 0%, transparent 60%)",
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12 text-center">
        <motion.div {...fadeUp(isInView, 0)}>
          <span className="inline-block text-[12px] font-semibold text-emerald-400 uppercase tracking-[0.2em] mb-6">
            Corporate Governance
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(isInView, 0.1)}
          className="text-[clamp(2.5rem,6vw,4.5rem)] font-medium tracking-[-0.03em] leading-[1.1] text-white mb-6"
        >
          Verantwortung ist kein Feature
          <br />
          <span className="text-white/50">— es ist unser Fundament.</span>
        </motion.h1>

        <motion.p
          {...fadeUp(isInView, 0.2)}
          className="text-[18px] md:text-[20px] text-white/50 max-w-[650px] mx-auto leading-relaxed"
        >
          Caelex baut Software für regulatorische Compliance in der Raumfahrt.
          Dabei leiten uns klare Prinzipien — gegenüber Kunden, Partnern und der
          Gesellschaft.
        </motion.p>
      </div>
    </section>
  );
}

function PrinciplesSection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="relative py-24 md:py-32">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16, 185, 129, 0.04) 0%, transparent 60%)",
        }}
      />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Prinzipien"
          title="Wonach wir handeln"
          subtitle="Sechs Grundsätze leiten unsere Arbeit — in jeder Entscheidung, jedem Feature, jeder Kundenbeziehung."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {principles.map((item, i) => (
            <motion.div key={item.title} {...fadeUp(isInView, 0.15 + i * 0.08)}>
              <GlassCard className="p-8 h-full group">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors w-fit mb-5">
                  <item.icon
                    size={20}
                    className="text-emerald-400"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-[18px] font-medium text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-[14px] text-white/45 leading-[1.7]">
                  {item.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EthicsSection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Ethik"
          title="Unsere Leitlinien"
          subtitle="Klare Regeln, an die wir uns halten — ohne Ausnahme."
          isInView={isInView}
        />

        <motion.div {...fadeUp(isInView, 0.15)}>
          <GlassCard
            className="max-w-[720px] mx-auto p-8 md:p-10"
            hover={false}
          >
            <div className="space-y-5">
              {ethicalGuidelines.map((item, i) => (
                <motion.div
                  key={i}
                  {...fadeUp(isInView, 0.25 + i * 0.06)}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2
                    size={18}
                    className="text-emerald-400 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-[14px] md:text-[15px] text-white/70 leading-[1.6]">
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}

function ComplianceSection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="relative py-24 md:py-32">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 80% 70%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)",
        }}
      />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Standards"
          title="Compliance & Zertifizierungen"
          subtitle="Wir halten uns an die strengsten europäischen Standards — und arbeiten kontinuierlich an weiteren Zertifizierungen."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[900px] mx-auto">
          {complianceStandards.map((item, i) => (
            <motion.div key={item.label} {...fadeUp(isInView, 0.15 + i * 0.08)}>
              <GlassCard className="p-6 h-full text-center">
                <h3 className="text-[16px] font-medium text-white mb-2">
                  {item.label}
                </h3>
                <p className="text-[13px] text-white/45 leading-[1.7]">
                  {item.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp(isInView, 0.4)} className="text-center mt-8">
          <Link
            href="/security"
            className="inline-flex items-center gap-2 text-[14px] text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Technische Details auf unserer Security-Seite
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function ContactSection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Kontakt"
          title="Meldewege & Ansprechpartner"
          subtitle="Transparenz bedeutet auch: erreichbar sein. Für Sicherheitsfragen, Datenschutzanliegen und verantwortungsvolle Offenlegung."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[1000px] mx-auto">
          {contactChannels.map((item, i) => (
            <motion.div key={item.title} {...fadeUp(isInView, 0.15 + i * 0.08)}>
              <GlassCard className="p-6 h-full group">
                <div className="p-2.5 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors w-fit mb-4">
                  <item.icon
                    size={18}
                    className="text-white/50"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-[15px] font-medium text-white mb-2 tracking-[-0.01em]">
                  {item.title}
                </h3>
                <p className="text-[13px] text-white/45 leading-[1.7] mb-4">
                  {item.description}
                </p>
                <a
                  href={`mailto:${item.email}`}
                  className="inline-flex items-center gap-1.5 text-[13px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Mail size={13} aria-hidden="true" />
                  {item.email}
                </a>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="relative py-24 md:py-32">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(16, 185, 129, 0.06) 0%, transparent 60%)",
        }}
      />
      <div className="relative max-w-[1200px] mx-auto px-6 md:px-12">
        <motion.div {...fadeUp(isInView, 0)}>
          <GlassCard className="p-12 md:p-16 text-center" hover={false}>
            <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-light tracking-[-0.02em] leading-[1.2] text-white mb-4">
              Fragen zu unseren Prinzipien?
            </h2>
            <p className="text-[17px] text-white/50 max-w-[520px] mx-auto mb-10 leading-relaxed">
              Wir stehen für offenen Dialog. Schreib uns — zu Governance,
              Datenschutz oder unserer Arbeitsweise.
            </p>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-[15px] font-medium transition-all duration-300 hover:bg-white/90 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
            >
              Kontakt aufnehmen
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function GovernancePage() {
  return (
    <main className="bg-black min-h-screen">
      <HeroSection />
      <PrinciplesSection />
      <EthicsSection />
      <ComplianceSection />
      <ContactSection />
      <CTASection />
    </main>
  );
}
