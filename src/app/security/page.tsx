"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Shield,
  Lock,
  Database,
  Cloud,
  Eye,
  FileCheck,
  Server,
  Key,
  UserCheck,
  ShieldCheck,
  Globe,
  Brain,
  Activity,
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
  Users,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

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

const trustBadges = [
  { label: "GDPR Compliant", icon: Shield },
  { label: "EU AI Act", icon: Brain },
  { label: "AES-256 Encrypted", icon: Lock },
  { label: "SOC 2 (Planned)", icon: ShieldCheck },
];

const infrastructureItems = [
  {
    icon: Server,
    title: "EU-Only Hosting",
    description:
      "Unsere gesamte Infrastruktur wird in der EU betrieben. Deine Daten verlassen nie europäischen Boden.",
  },
  {
    icon: Database,
    title: "Verschlüsselte Datenbank",
    description:
      "Alle Daten sind im Ruhezustand und bei der Übertragung verschlüsselt — nach Industriestandard AES-256.",
  },
  {
    icon: Cloud,
    title: "Sicherer Dateispeicher",
    description:
      "Dokumente und Uploads werden serverseitig verschlüsselt in EU-Rechenzentren gespeichert.",
  },
  {
    icon: Globe,
    title: "DDoS-Schutz & CDN",
    description:
      "Automatischer Schutz vor Angriffen, SSL-Verschlüsselung und ein globales Edge-Netzwerk für schnelle Ladezeiten.",
  },
];

const applicationSecurityItems = [
  {
    icon: UserCheck,
    title: "Sichere Anmeldung",
    description:
      "Passwörter werden nach Best Practices gehasht. Login per Google, Enterprise SSO oder klassisch per E-Mail — mit Multi-Faktor-Authentifizierung.",
  },
  {
    icon: Key,
    title: "Rollenbasierte Zugriffe",
    description:
      "Jedes Teammitglied sieht nur, was es sehen soll. Granulare Rollen von Viewer bis Owner — isoliert pro Organisation.",
  },
  {
    icon: Activity,
    title: "API-Absicherung",
    description:
      "Mehrstufiges Rate Limiting, API-Key-Authentifizierung und Schutz gegen gängige Angriffsvektoren wie CSRF und Injection.",
  },
  {
    icon: FileCheck,
    title: "Eingabevalidierung",
    description:
      "Jede Eingabe wird serverseitig validiert. Strikte Content-Security-Policies und moderne Security-Header schützen zusätzlich.",
  },
  {
    icon: Shield,
    title: "Upload-Prüfung",
    description:
      "Hochgeladene Dateien werden auf Dateityp und Größe geprüft, bevor sie akzeptiert werden. Kein Blindvertrauen.",
  },
  {
    icon: ShieldCheck,
    title: "Automatische Sicherheitsscans",
    description:
      "Unser Code wird bei jedem Deployment automatisch auf Schwachstellen, Secrets und unsichere Abhängigkeiten geprüft.",
  },
];

const gdprItems = [
  {
    icon: Lock,
    title: "Sensible Daten verschlüsselt",
    description:
      "Besonders schützenswerte Felder wie Steuernummern oder Bankdaten werden zusätzlich mit AES-256 verschlüsselt — nicht nur die Datenbank.",
  },
  {
    icon: Eye,
    title: "Datenminimierung",
    description:
      "Wir sammeln nur, was wirklich nötig ist. IP-Adressen werden automatisch anonymisiert, veraltete Daten regelmäßig gelöscht.",
  },
  {
    icon: FileCheck,
    title: "Cookie-Einwilligung",
    description:
      "Granulares Consent-Management mit echtem Opt-in. Kein Tracking ohne deine ausdrückliche Zustimmung.",
  },
  {
    icon: Database,
    title: "Datenportabilität",
    description:
      "Deine Daten gehören dir. Jederzeit vollständiger Export gemäß DSGVO Art. 15 und Art. 20 — in Standardformaten.",
  },
  {
    icon: Users,
    title: "Recht auf Löschung",
    description:
      "Auf Anfrage werden alle deine Daten vollständig und unwiderruflich gelöscht — über alle verknüpften Systeme hinweg.",
  },
  {
    icon: Eye,
    title: "Kein externes Tracking",
    description:
      "Wir nutzen ausschließlich selbst gehostete Analysen. Kein Google Analytics, keine Drittanbieter-Tracker, kein Datenverkauf.",
  },
];

const aiSecurityItems = [
  {
    label: "Transparenz",
    description:
      "KI-generierte Inhalte sind immer klar gekennzeichnet — gemäß EU AI Act Art. 50",
  },
  {
    label: "Kein Training mit deinen Daten",
    description:
      "Deine Daten werden niemals zum Trainieren oder Verbessern von KI-Modellen verwendet",
  },
  {
    label: "Mensch bleibt in Kontrolle",
    description:
      "Alle KI-Antworten enthalten den Hinweis, dass sie keine Rechtsberatung darstellen",
  },
  {
    label: "Ausdrückliche Einwilligung",
    description:
      "KI-Funktionen erfordern ein explizites Opt-in vor jeder Nutzung",
  },
  {
    label: "Lückenloser Audit Trail",
    description:
      "Jede KI-Interaktion wird mit Zeitstempel und Kontext protokolliert — für volle Nachvollziehbarkeit",
  },
];

const auditItems = [
  {
    icon: FileCheck,
    title: "Lückenlose Protokollierung",
    description:
      "Jede sicherheitsrelevante Aktion wird protokolliert — wer hat was wann geändert, von welchem Gerät.",
  },
  {
    icon: Activity,
    title: "Sicherheits-Monitoring",
    description:
      "Login-Versuche, Berechtigungsänderungen und Datenzugriffe werden überwacht und bei Auffälligkeiten gemeldet.",
  },
  {
    icon: ShieldCheck,
    title: "Echtzeit-Fehlerüberwachung",
    description:
      "Fehler werden in Echtzeit erkannt und an unser Team gemeldet — mit EU-Datenresidenz für die Monitoring-Daten.",
  },
  {
    icon: Clock,
    title: "99,99% Verfügbarkeit",
    description:
      "Enterprise-Infrastruktur mit automatischem Failover und Zero-Downtime-Deployments.",
  },
];

const enterpriseFeatures = [
  {
    icon: Key,
    title: "Single Sign-On",
    description:
      "Nahtlose Anmeldung über euren bestehenden Identity Provider — SAML und OpenID Connect werden unterstützt.",
  },
  {
    icon: Clock,
    title: "Individuelle Aufbewahrungsfristen",
    description:
      "Konfigurierbare Datenaufbewahrung passend zu den Anforderungen eurer Organisation.",
  },
  {
    icon: Shield,
    title: "Dedizierter Security-Kontakt",
    description:
      "Direkter Draht zu unserem Sicherheitsteam für Fragen, Vorfälle und Koordination.",
  },
  {
    icon: Activity,
    title: "Incident Response SLA",
    description:
      "Definierte Reaktionszeiten bei Sicherheitsvorfällen mit klaren Eskalationswegen.",
  },
  {
    icon: ShieldCheck,
    title: "Jährliche Penetration Tests",
    description:
      "Unabhängige Sicherheitsprüfungen durch externe Experten — mit Tracking der Behebung.",
  },
  {
    icon: Building2,
    title: "Organisations-Isolation",
    description:
      "Vollständige Datentrennung zwischen Organisationen. Keine geteilten Ressourcen, kein Datenleck zwischen Tenants.",
  },
];

// ============================================================================
// COMPONENTS
// ============================================================================

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
      <span className="text-[11px] uppercase tracking-[0.2em] text-white/30 mb-4 block">
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
            Security & Compliance
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(isInView, 0.1)}
          className="text-[clamp(2.5rem,6vw,4.5rem)] font-medium tracking-[-0.03em] leading-[1.1] text-white mb-6"
        >
          Deine Compliance-Daten
          <br />
          <span className="text-white/50">in sicheren Händen</span>
        </motion.h1>

        <motion.p
          {...fadeUp(isInView, 0.2)}
          className="text-[18px] md:text-[20px] text-white/50 max-w-[650px] mx-auto mb-10 leading-relaxed"
        >
          Enterprise-Sicherheit für die sensibelsten Daten der
          Raumfahrt-Regulierung. Gehostet in der EU, Ende-zu-Ende verschlüsselt,
          ohne Tracking durch Dritte.
        </motion.p>

        {/* Trust Badges */}
        <motion.div
          {...fadeUp(isInView, 0.3)}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          {trustBadges.map((badge) => (
            <div
              key={badge.label}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] text-[12px] text-white/60"
            >
              <badge.icon
                size={14}
                className="text-emerald-400"
                aria-hidden="true"
              />
              {badge.label}
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          {...fadeUp(isInView, 0.4)}
          className="flex flex-wrap justify-center gap-4"
        >
          <Link
            href="/assessment"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-black text-[14px] font-medium transition-all duration-300 hover:bg-white/90 hover:scale-[1.02]"
          >
            Kostenloses Assessment starten
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-white text-[14px] font-medium transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.2]"
          >
            Security-Team kontaktieren
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function InfrastructureSection() {
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
          eyebrow="Infrastruktur"
          title="In der EU gehostet. Überall verschlüsselt."
          subtitle="Alle Daten bleiben in der Europäischen Union. Jede Schicht unserer Infrastruktur ist verschlüsselt und abgesichert."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {infrastructureItems.map((item, i) => (
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

function ApplicationSecuritySection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Anwendungssicherheit"
          title="Mehrere Schutzebenen"
          subtitle="Von der Anmeldung bis zum API-Zugriff — deine Daten sind durch mehrere unabhängige Sicherheitsschichten geschützt."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applicationSecurityItems.map((item, i) => (
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
                <p className="text-[13px] text-white/45 leading-[1.7]">
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

function GDPRSection() {
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
          eyebrow="Datenschutz"
          title="DSGVO-konform von Anfang an"
          subtitle="Datenschutz ist kein Nachgedanke. Jede Funktion wird mit Privacy-by-Design-Prinzipien entwickelt."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gdprItems.map((item, i) => (
            <motion.div key={item.title} {...fadeUp(isInView, 0.15 + i * 0.08)}>
              <GlassCard className="p-6 h-full group">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors w-fit mb-4">
                  <item.icon
                    size={18}
                    className="text-emerald-400"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-[15px] font-medium text-white mb-2 tracking-[-0.01em]">
                  {item.title}
                </h3>
                <p className="text-[13px] text-white/45 leading-[1.7]">
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

function AISecuritySection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="KI-Sicherheit"
          title="EU AI Act konform"
          subtitle="Unser KI-Assistent ASTRA erfüllt die Anforderungen des EU AI Act an Transparenz und menschliche Aufsicht."
          isInView={isInView}
        />

        <motion.div {...fadeUp(isInView, 0.15)}>
          <GlassCard
            className="max-w-[720px] mx-auto p-8 md:p-10"
            hover={false}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-lg bg-purple-500/10">
                <Brain
                  size={20}
                  className="text-purple-400"
                  aria-hidden="true"
                />
              </div>
              <h3 className="text-[18px] font-medium text-white">
                ASTRA — Verantwortungsvolle KI
              </h3>
            </div>

            <div className="space-y-5">
              {aiSecurityItems.map((item, i) => (
                <motion.div
                  key={item.label}
                  {...fadeUp(isInView, 0.25 + i * 0.06)}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2
                    size={18}
                    className="text-emerald-400 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <div>
                    <span className="text-[14px] font-medium text-white">
                      {item.label}
                    </span>
                    <p className="text-[13px] text-white/45 mt-0.5 leading-[1.6]">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}

function AuditSection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Überwachung"
          title="Audit & Monitoring"
          subtitle="Volle Transparenz über jede Aktion auf der Plattform — mit Echtzeit-Überwachung."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auditItems.map((item, i) => (
            <motion.div key={item.title} {...fadeUp(isInView, 0.15 + i * 0.08)}>
              <GlassCard className="p-8 h-full group">
                <div className="p-2.5 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors w-fit mb-5">
                  <item.icon
                    size={20}
                    className="text-white/50"
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

function EnterpriseSection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Enterprise"
          title="Für höchste Anforderungen"
          subtitle="Erweiterte Sicherheitsfunktionen für Organisationen, die keine Kompromisse eingehen."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enterpriseFeatures.map((item, i) => (
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
                <p className="text-[13px] text-white/45 leading-[1.7]">
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
              Bereit für sichere Space Compliance?
            </h2>
            <p className="text-[17px] text-white/50 max-w-[520px] mx-auto mb-10 leading-relaxed">
              Starte mit einem kostenlosen Assessment oder sprich mit unserem
              Team über Enterprise-Sicherheit.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/assessment"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-[15px] font-medium transition-all duration-300 hover:bg-white/90 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              >
                Kostenloses Assessment
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-white/80 text-[15px] font-medium border border-white/20 transition-all duration-300 hover:border-white/40 hover:text-white hover:scale-[1.02]"
              >
                Vertrieb kontaktieren
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function SecurityPage() {
  return (
    <main className="bg-black min-h-screen">
      <HeroSection />
      <InfrastructureSection />
      <ApplicationSecuritySection />
      <GDPRSection />
      <AISecuritySection />
      <AuditSection />
      <EnterpriseSection />
      <CTASection />
    </main>
  );
}
