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
  AlertTriangle,
  Globe,
  Server,
  Users,
  Landmark,
  BookOpen,
  CircleDot,
  ExternalLink,
  Fingerprint,
  Gavel,
  HeartHandshake,
  Activity,
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

const governanceMetrics = [
  { value: "100%", label: "EU-Datenresidenz" },
  { value: "0", label: "Datenvorfälle" },
  { value: "AES-256", label: "Verschlüsselung" },
  { value: "DSGVO", label: "by Design" },
];

const frameworkPillars = [
  {
    icon: Landmark,
    title: "Unternehmensführung",
    subtitle: "Governance",
    items: [
      "Klare Entscheidungsstrukturen und Verantwortlichkeiten",
      "Regelmäßige Überprüfung der Unternehmensprozesse",
      "Transparente Kommunikation gegenüber Kunden und Partnern",
      "Dokumentierte Richtlinien für alle Geschäftsbereiche",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Risikomanagement",
    subtitle: "Risk & Compliance",
    items: [
      "Systematische Identifikation und Bewertung von Risiken",
      "Kontinuierliches Monitoring regulatorischer Änderungen",
      "Incident-Response-Prozesse mit definierten Eskalationswegen",
      "Automatisierte Sicherheitsscans und interne Code-Reviews bei jedem Deployment",
    ],
  },
  {
    icon: HeartHandshake,
    title: "Kundenverantwortung",
    subtitle: "Accountability",
    items: [
      "Gleichbehandlung aller Kunden unabhängig von Größe",
      "Faire und transparente Preisgestaltung",
      "Offene Feedbackkultur mit kurzen Reaktionszeiten",
      "Langfristige Partnerschaften statt kurzfristiger Optimierung",
    ],
  },
];

const codexArticles = [
  {
    number: "I",
    title: "Datensouveränität",
    text: "Kundendaten sind Eigentum des Kunden. Caelex verarbeitet Daten ausschließlich zur Erbringung der vertraglich vereinbarten Leistung. Ein Verkauf, eine Weitergabe oder anderweitige Monetarisierung von Kundendaten findet nicht statt — weder direkt noch indirekt.",
  },
  {
    number: "II",
    title: "Regulatorische Integrität",
    text: "Caelex stellt regulatorisches Wissen bereit — keine Rechtsberatung. Unsere Plattform bildet den aktuellen Stand europäischer Raumfahrtregulierung ab und hilft beim Verständnis. Compliance-Entscheidungen trifft der Kunde auf Basis qualifizierter rechtlicher Beratung.",
  },
  {
    number: "III",
    title: "Transparenz",
    text: "Alle Preise, Leistungsumfänge und Vertragsbedingungen sind klar und vollständig dokumentiert. Es gibt keine versteckten Kosten, keine Dark Patterns und keine manipulativen Gestaltungselemente in unserer Software.",
  },
  {
    number: "IV",
    title: "Verantwortungsvolle KI",
    text: "KI-generierte Inhalte sind in unserer Plattform immer kenntlich gemacht. KI-Funktionen dienen als Unterstützungswerkzeug — niemals als autonomer Entscheider. Kundendaten werden nicht zum Training von KI-Modellen verwendet. Unser KI-Einsatz entspricht den Anforderungen des EU AI Act.",
  },
  {
    number: "V",
    title: "Unabhängigkeit",
    text: "Caelex ist ein unabhängiges Softwareunternehmen. Wir bieten keine Beratungsleistungen an und haben keine Interessenkonflikte mit Regulierungsbehörden, Beratern oder anderen Marktteilnehmern. Unsere Software liefert Fakten — keine Meinungen.",
  },
  {
    number: "VI",
    title: "Nachhaltiges Wachstum",
    text: "Wir verpflichten uns zu verantwortungsvollem Wachstum. Das betrifft unsere Infrastruktur (effiziente Ressourcennutzung, EU-Hosting) und unser Geschäftsmodell (nachhaltige Kundenbeziehungen statt kurzfristiger Gewinnmaximierung).",
  },
];

const esgPillars = [
  {
    icon: Leaf,
    accent: "emerald",
    title: "Environmental",
    subtitle: "Umwelt & Ressourcen",
    commitments: [
      {
        title: "EU-Only Cloud-Infrastruktur",
        description:
          "AWS eu-central-1 (Frankfurt) — carbon-neutral Region mit 100% Renewable-Energy-Matching",
      },
      {
        title: "Effiziente Software-Architektur",
        description:
          "Optimierte Datenbankabfragen und serverlose Architektur zur Minimierung des Ressourcenverbrauchs",
      },
      {
        title: "Papierlose Prozesse",
        description:
          "Vollständig digitale Compliance-Dokumentation, Audit-Trails und Berichterstellung",
      },
    ],
  },
  {
    icon: Users,
    accent: "blue",
    title: "Social",
    subtitle: "Mensch & Gesellschaft",
    commitments: [
      {
        title: "Gleichbehandlung",
        description:
          "Identische Servicequalität und Preistransparenz für alle Kunden — unabhängig von Unternehmensgröße",
      },
      {
        title: "Wissenszugang",
        description:
          "Kostenloses Assessment, öffentliche Guides und Glossare für den Zugang zu Regulierungswissen",
      },
      {
        title: "Transparente Regulierungskommunikation",
        description:
          "Verständliche Aufbereitung komplexer Regulierung — öffentlicher Blog, Glossar und Leitfäden für die gesamte Branche",
      },
    ],
  },
  {
    icon: Landmark,
    accent: "purple",
    title: "Governance",
    subtitle: "Führung & Kontrolle",
    commitments: [
      {
        title: "Dokumentierte Richtlinien",
        description:
          "Datenschutzrichtlinie, Nutzungsbedingungen und Cookie-Richtlinie — öffentlich einsehbar",
      },
      {
        title: "Compliance-Monitoring",
        description:
          "Kontinuierliche Überwachung regulatorischer Anforderungen und automatisierte Audit-Trails",
      },
      {
        title: "Automatisierte Audit-Trails",
        description:
          "Lückenlose Protokollierung aller sicherheitsrelevanten Aktionen — jederzeit nachvollziehbar",
      },
    ],
  },
];

const complianceFrameworks = [
  {
    name: "DSGVO / GDPR",
    status: "achieved" as const,
    description: "Privacy-by-Design, Datenschutz-Folgenabschätzungen, DPO",
  },
  {
    name: "EU AI Act",
    status: "achieved" as const,
    description:
      "Transparenzpflichten, menschliche Aufsicht, Risikoklassifizierung",
  },
  {
    name: "NIS2-Richtlinie",
    status: "achieved" as const,
    description: "Sicherheitsmaßnahmen nach Art. 21, Incident Reporting",
  },
];

const riskCategories = [
  {
    icon: Lock,
    title: "Informationssicherheit",
    measures: [
      "AES-256-GCM Verschlüsselung sensibler Daten",
      "Rollenbasierte Zugriffskontrolle (RBAC)",
      "Automatische Sicherheitsscans bei jedem Deployment",
      "Mehrstufiges Rate Limiting und DDoS-Schutz",
    ],
  },
  {
    icon: Database,
    title: "Datenschutz",
    measures: [
      "Datenminimierung und Zweckbindung",
      "Automatische Anonymisierung von IP-Adressen",
      "Verschlüsselte Backups mit EU-Datenresidenz",
      "Recht auf Löschung und Datenportabilität",
    ],
  },
  {
    icon: Activity,
    title: "Betriebskontinuität",
    measures: [
      "Automatisches Failover und Redundanz",
      "Zero-Downtime-Deployments",
      "Echtzeit-Monitoring mit Alerting",
      "Dokumentierte Incident-Response-Prozesse",
    ],
  },
  {
    icon: Globe,
    title: "Regulatorische Risiken",
    measures: [
      "Kontinuierliches Monitoring europäischer Gesetzgebung",
      "Proaktive Anpassung an neue Anforderungen",
      "Automatisierte Compliance-Checks in der CI/CD-Pipeline",
      "Automatisierte Dependency-Checks und Secret-Scanning in der CI/CD-Pipeline",
    ],
  },
];

const ethicalPolicies = [
  {
    icon: Fingerprint,
    title: "Datenschutzrichtlinie",
    points: [
      "Keine Weitergabe oder Monetarisierung von Kundendaten",
      "Kein Tracking durch Drittanbieter — ausschließlich selbst gehostete Analysen",
      "DSGVO-konforme Datenverarbeitung mit dokumentierten Rechtsgrundlagen",
      "Automatische Löschung nach Vertragsende und auf Anfrage",
    ],
  },
  {
    icon: Brain,
    title: "KI-Ethikrichtlinie",
    points: [
      "Kennzeichnungspflicht für alle KI-generierten Inhalte",
      "Kein Training von KI-Modellen mit Kundendaten",
      "Mensch-in-der-Schleife bei allen sicherheitskritischen Entscheidungen",
      "Regelmäßige Überprüfung auf Bias und Fairness",
    ],
  },
  {
    icon: Gavel,
    title: "Anti-Korruptionsrichtlinie",
    points: [
      "Null-Toleranz gegenüber Bestechung und Vorteilsgewährung",
      "Keine Dark Patterns oder manipulativen Gestaltungselemente",
      "Transparente Geschäftsbeziehungen ohne Interessenkonflikte",
      "Whistleblower-Schutz für interne und externe Meldende",
    ],
  },
];

const reportingChannels = [
  {
    icon: AlertTriangle,
    title: "Hinweisgebersystem",
    description:
      "Vertrauliche Meldung von Verstößen gegen unseren Code of Conduct oder geltende Gesetze. Anonyme Meldungen sind möglich. Wir garantieren Schutz vor Repressalien gemäß EU-Whistleblower-Richtlinie.",
    email: "ethics@caelex.eu",
    label: "Hinweis melden",
  },
  {
    icon: Lock,
    title: "Security Response",
    description:
      "Responsible Disclosure für Sicherheitslücken und Schwachstellen. Wir bestätigen den Eingang innerhalb von 24 Stunden und informieren über den Fortschritt der Behebung.",
    email: "security@caelex.eu",
    label: "Schwachstelle melden",
  },
  {
    icon: Shield,
    title: "Datenschutzbeauftragter",
    description:
      "Ansprechpartner für alle Fragen zu Datenschutz, Betroffenenrechte und Datenverarbeitung. Anfragen werden innerhalb der gesetzlichen Fristen bearbeitet.",
    email: "dpo@caelex.eu",
    label: "DPO kontaktieren",
  },
];

const governanceDocuments = [
  {
    title: "Datenschutzrichtlinie",
    description: "DSGVO-konforme Verarbeitung personenbezogener Daten",
    status: "available" as const,
    href: "/legal/privacy",
  },
  {
    title: "Nutzungsbedingungen",
    description: "Vertragliche Grundlagen der Plattformnutzung",
    status: "available" as const,
    href: "/legal/terms",
  },
  {
    title: "Cookie-Richtlinie",
    description: "Transparente Information über eingesetzte Technologien",
    status: "available" as const,
    href: "/legal/cookies",
  },
  {
    title: "Impressum",
    description: "Angaben gemäß § 5 TMG und Verantwortlichkeit",
    status: "available" as const,
    href: "/legal/impressum",
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

function StatusBadge({
  status,
}: {
  status: "achieved" | "planned" | "available" | "on-request" | "coming-soon";
}) {
  const config = {
    achieved: {
      label: "Umgesetzt",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    planned: {
      label: "Geplant",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
    available: {
      label: "Verfügbar",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    "on-request": {
      label: "Auf Anfrage",
      className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    "coming-soon": {
      label: "In Vorbereitung",
      className: "bg-white/10 text-white/50 border-white/10",
    },
  };
  const { label, className } = config[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${className}`}
    >
      {label}
    </span>
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
          className="text-[18px] md:text-[20px] text-white/50 max-w-[700px] mx-auto mb-14 leading-relaxed"
        >
          Caelex verwaltet sensible Compliance-Daten der europäischen
          Raumfahrtindustrie. Das verpflichtet uns zu den höchsten Standards bei
          Datenschutz, Ethik und Unternehmensführung.
        </motion.p>

        {/* Governance Metrics */}
        <motion.div
          {...fadeUp(isInView, 0.3)}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[800px] mx-auto"
        >
          {governanceMetrics.map((metric) => (
            <div
              key={metric.label}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-xl px-5 py-4"
            >
              <div className="text-[24px] md:text-[28px] font-medium text-white tracking-[-0.02em]">
                {metric.value}
              </div>
              <div className="text-[12px] text-white/40 mt-1">
                {metric.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FrameworkSection() {
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
          eyebrow="Framework"
          title="Governance-Struktur"
          subtitle="Unser Governance-Framework basiert auf drei Säulen — sie definieren, wie wir Entscheidungen treffen, Risiken managen und Verantwortung übernehmen."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {frameworkPillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              {...fadeUp(isInView, 0.15 + i * 0.1)}
            >
              <GlassCard className="p-8 h-full" hover={false}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10">
                    <pillar.icon
                      size={20}
                      className="text-emerald-400"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-[18px] font-medium text-white">
                      {pillar.title}
                    </h3>
                    <span className="text-[12px] text-white/30 font-mono uppercase tracking-wider">
                      {pillar.subtitle}
                    </span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {pillar.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <CircleDot
                        size={14}
                        className="text-emerald-500/50 mt-1 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[13px] text-white/50 leading-[1.6]">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CodexSection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Codex"
          title="Caelex Corporate Codex"
          subtitle="Sechs verbindliche Grundsätze, die unser Handeln bestimmen. Sie gelten für jede Entscheidung, jedes Produkt und jede Geschäftsbeziehung."
          isInView={isInView}
        />

        <div className="max-w-[900px] mx-auto space-y-4">
          {codexArticles.map((article, i) => (
            <motion.div
              key={article.number}
              {...fadeUp(isInView, 0.1 + i * 0.06)}
            >
              <GlassCard className="p-6 md:p-8" hover={false}>
                <div className="flex gap-5 md:gap-8">
                  <div className="shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <span className="text-[16px] font-medium text-emerald-400 font-mono">
                        {article.number}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[16px] md:text-[18px] font-medium text-white mb-2">
                      {article.title}
                    </h3>
                    <p className="text-[13px] md:text-[14px] text-white/45 leading-[1.8]">
                      {article.text}
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ESGSection() {
  const { ref, isInView } = useAnimatedSection();

  const accentColors = {
    emerald: {
      iconBg: "bg-emerald-500/10",
      iconText: "text-emerald-400",
      dotBg: "bg-emerald-500",
    },
    blue: {
      iconBg: "bg-blue-500/10",
      iconText: "text-blue-400",
      dotBg: "bg-blue-500",
    },
    purple: {
      iconBg: "bg-purple-500/10",
      iconText: "text-purple-400",
      dotBg: "bg-purple-500",
    },
  };

  return (
    <section ref={ref} className="relative py-24 md:py-32">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 20% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(139, 92, 246, 0.04) 0%, transparent 50%)",
        }}
      />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="ESG"
          title="Environmental, Social & Governance"
          subtitle="Nachhaltigkeit ist für Caelex kein Marketing-Label. Wir messen uns an konkreten Maßnahmen in allen drei ESG-Dimensionen."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {esgPillars.map((pillar, i) => {
            const colors =
              accentColors[pillar.accent as keyof typeof accentColors];
            return (
              <motion.div
                key={pillar.title}
                {...fadeUp(isInView, 0.15 + i * 0.1)}
              >
                <GlassCard className="p-8 h-full" hover={false}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2.5 rounded-lg ${colors.iconBg}`}>
                      <pillar.icon
                        size={20}
                        className={colors.iconText}
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <h3 className="text-[18px] font-medium text-white">
                        {pillar.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-[12px] text-white/30 font-mono uppercase tracking-wider mb-6">
                    {pillar.subtitle}
                  </p>

                  <div className="space-y-5">
                    {pillar.commitments.map((commitment, j) => (
                      <div key={j}>
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${colors.dotBg}`}
                          />
                          <span className="text-[14px] font-medium text-white">
                            {commitment.title}
                          </span>
                        </div>
                        <p className="text-[13px] text-white/40 leading-[1.6] ml-3.5">
                          {commitment.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ComplianceFrameworkSection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Compliance"
          title="Regulatorische Frameworks"
          subtitle="Caelex richtet sich nach den strengsten europäischen Regulierungen — ohne Kompromisse."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[900px] mx-auto">
          {complianceFrameworks.map((fw, i) => (
            <motion.div key={fw.name} {...fadeUp(isInView, 0.15 + i * 0.06)}>
              <GlassCard className="p-6 h-full">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-[16px] font-medium text-white">
                    {fw.name}
                  </h3>
                  <StatusBadge status={fw.status} />
                </div>
                <p className="text-[13px] text-white/45 leading-[1.7]">
                  {fw.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp(isInView, 0.5)} className="text-center mt-8">
          <Link
            href="/security"
            className="inline-flex items-center gap-2 text-[14px] text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Technische Sicherheitsdetails
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function RiskManagementSection() {
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
          eyebrow="Risikomanagement"
          title="Systematischer Schutz"
          subtitle="Vier zentrale Risikobereiche, die wir durch definierte Maßnahmen, Prozesse und Kontrollen adressieren."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {riskCategories.map((category, i) => (
            <motion.div
              key={category.title}
              {...fadeUp(isInView, 0.15 + i * 0.08)}
            >
              <GlassCard className="p-8 h-full group">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors">
                    <category.icon
                      size={20}
                      className="text-white/50"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-[18px] font-medium text-white">
                    {category.title}
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {category.measures.map((measure, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <CheckCircle2
                        size={14}
                        className="text-emerald-500/60 mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[13px] text-white/50 leading-[1.6]">
                        {measure}
                      </span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function EthicalPoliciesSection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Richtlinien"
          title="Ethik & Compliance-Policies"
          subtitle="Verbindliche Richtlinien, die für die gesamte Produktentwicklung und alle Geschäftsbeziehungen gelten."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {ethicalPolicies.map((policy, i) => (
            <motion.div
              key={policy.title}
              {...fadeUp(isInView, 0.15 + i * 0.08)}
            >
              <GlassCard className="p-8 h-full" hover={false}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-lg bg-white/[0.04]">
                    <policy.icon
                      size={20}
                      className="text-white/50"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-[16px] font-medium text-white">
                    {policy.title}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {policy.points.map((point, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <CheckCircle2
                        size={14}
                        className="text-emerald-500/60 mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-[13px] text-white/50 leading-[1.6]">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportingSection() {
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
          eyebrow="Meldewege"
          title="Transparenz & Berichterstattung"
          subtitle="Drei dedizierte Kanäle für verantwortungsvolle Kommunikation — vertraulich, geschützt und mit garantierten Reaktionszeiten."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-[1100px] mx-auto">
          {reportingChannels.map((channel, i) => (
            <motion.div
              key={channel.title}
              {...fadeUp(isInView, 0.15 + i * 0.08)}
            >
              <GlassCard className="p-8 h-full group flex flex-col">
                <div className="p-2.5 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors w-fit mb-5">
                  <channel.icon
                    size={20}
                    className="text-white/50"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-[18px] font-medium text-white mb-2">
                  {channel.title}
                </h3>
                <p className="text-[13px] text-white/45 leading-[1.7] mb-5 flex-1">
                  {channel.description}
                </p>
                <a
                  href={`mailto:${channel.email}`}
                  className="inline-flex items-center gap-2 text-[13px] text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  <Mail size={14} aria-hidden="true" />
                  {channel.email}
                </a>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DocumentsSection() {
  const { ref, isInView } = useAnimatedSection();

  return (
    <section ref={ref} className="py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Dokumente"
          title="Governance-Dokumentation"
          subtitle="Zentrale Richtlinien und Dokumente — öffentlich einsehbar."
          isInView={isInView}
        />

        <motion.div {...fadeUp(isInView, 0.15)}>
          <GlassCard
            className="max-w-[800px] mx-auto overflow-hidden"
            hover={false}
          >
            <div className="divide-y divide-white/[0.06]">
              {governanceDocuments.map((doc) => (
                <div
                  key={doc.title}
                  className="flex items-center justify-between px-6 md:px-8 py-5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <BookOpen
                      size={18}
                      className="text-white/30 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[14px] font-medium text-white">
                          {doc.title}
                        </span>
                        <StatusBadge status={doc.status} />
                      </div>
                      <p className="text-[12px] text-white/35 mt-0.5 truncate">
                        {doc.description}
                      </p>
                    </div>
                  </div>
                  {doc.href && (
                    <Link
                      href={doc.href}
                      className="ml-4 p-2 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0"
                      aria-label={`${doc.title} öffnen`}
                    >
                      <ExternalLink
                        size={16}
                        className="text-white/40"
                        aria-hidden="true"
                      />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
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
              Fragen zu unserer Governance?
            </h2>
            <p className="text-[17px] text-white/50 max-w-[560px] mx-auto mb-10 leading-relaxed">
              Wir stehen für offenen Dialog — zu Governance, Datenschutz oder
              unserer Arbeitsweise.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
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
              <Link
                href="/security"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-white/80 text-[15px] font-medium border border-white/20 transition-all duration-300 hover:border-white/40 hover:text-white hover:scale-[1.02]"
              >
                Security & Compliance
                <Server size={16} aria-hidden="true" />
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

export default function GovernancePage() {
  return (
    <main className="bg-black min-h-screen">
      <HeroSection />
      <FrameworkSection />
      <CodexSection />
      <ESGSection />
      <ComplianceFrameworkSection />
      <RiskManagementSection />
      <EthicalPoliciesSection />
      <ReportingSection />
      <DocumentsSection />
      <CTASection />
    </main>
  );
}
