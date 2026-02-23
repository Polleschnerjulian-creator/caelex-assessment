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

const governanceMetrics = [
  { value: "100%", label: "EU Data Residency" },
  { value: "0", label: "Data Incidents" },
  { value: "AES-256", label: "Encryption" },
  { value: "GDPR", label: "by Design" },
];

const frameworkPillars = [
  {
    icon: Landmark,
    title: "Corporate Leadership",
    subtitle: "Governance",
    items: [
      "Clear decision structures and responsibilities",
      "Regular review of business processes",
      "Transparent communication with customers and partners",
      "Documented policies for all business areas",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Risk Management",
    subtitle: "Risk & Compliance",
    items: [
      "Systematic identification and assessment of risks",
      "Continuous monitoring of regulatory changes",
      "Incident response processes with defined escalation paths",
      "Automated security scans and internal code reviews on every deployment",
    ],
  },
  {
    icon: HeartHandshake,
    title: "Customer Responsibility",
    subtitle: "Accountability",
    items: [
      "Equal treatment of all customers regardless of size",
      "Fair and transparent pricing",
      "Open feedback culture with fast response times",
      "Long-term partnerships over short-term optimization",
    ],
  },
];

const codexArticles = [
  {
    number: "I",
    title: "Data Sovereignty",
    text: "Customer data is the property of the customer. Caelex processes data exclusively to deliver the contractually agreed service. No sale, transfer, or other monetization of customer data takes place — neither directly nor indirectly.",
  },
  {
    number: "II",
    title: "Regulatory Integrity",
    text: "Caelex provides regulatory knowledge — not legal advice. Our platform reflects the current state of European space regulation and aids understanding. Compliance decisions are made by the customer based on qualified legal counsel.",
  },
  {
    number: "III",
    title: "Transparency",
    text: "All pricing, service scope, and contract terms are clearly and fully documented. There are no hidden costs, no dark patterns, and no manipulative design elements in our software.",
  },
  {
    number: "IV",
    title: "Responsible AI",
    text: "AI-generated content is always clearly labeled in our platform. AI features serve as support tools — never as autonomous decision-makers. Customer data is not used to train AI models. Our AI usage complies with the requirements of the EU AI Act.",
  },
  {
    number: "V",
    title: "Independence",
    text: "Caelex is an independent software company. We do not offer consulting services and have no conflicts of interest with regulatory authorities, consultants, or other market participants. Our software delivers facts — not opinions.",
  },
  {
    number: "VI",
    title: "Sustainable Growth",
    text: "We are committed to responsible growth. This applies to our infrastructure (efficient resource usage, EU hosting) and our business model (sustainable customer relationships over short-term profit maximization).",
  },
];

const esgPillars = [
  {
    icon: Leaf,
    accent: "emerald",
    title: "Environmental",
    subtitle: "Environment & Resources",
    commitments: [
      {
        title: "EU-Only Cloud Infrastructure",
        description:
          "AWS eu-central-1 (Frankfurt) — carbon-neutral region with 100% renewable energy matching",
      },
      {
        title: "Efficient Software Architecture",
        description:
          "Optimized database queries and serverless architecture to minimize resource consumption",
      },
      {
        title: "Paperless Processes",
        description:
          "Fully digital compliance documentation, audit trails, and report generation",
      },
    ],
  },
  {
    icon: Users,
    accent: "blue",
    title: "Social",
    subtitle: "People & Society",
    commitments: [
      {
        title: "Equal Treatment",
        description:
          "Identical service quality and price transparency for all customers — regardless of company size",
      },
      {
        title: "Knowledge Access",
        description:
          "Free assessment, public guides, and glossaries for access to regulatory knowledge",
      },
      {
        title: "Transparent Regulatory Communication",
        description:
          "Clear presentation of complex regulation — public blog, glossary, and guides for the entire industry",
      },
    ],
  },
  {
    icon: Landmark,
    accent: "purple",
    title: "Governance",
    subtitle: "Leadership & Control",
    commitments: [
      {
        title: "Documented Policies",
        description:
          "Privacy policy, terms of service, and cookie policy — publicly accessible",
      },
      {
        title: "Compliance Monitoring",
        description:
          "Continuous monitoring of regulatory requirements and automated audit trails",
      },
      {
        title: "Automated Audit Trails",
        description:
          "Comprehensive logging of all security-relevant actions — fully traceable at any time",
      },
    ],
  },
];

const complianceFrameworks = [
  {
    name: "GDPR",
    status: "achieved" as const,
    description: "Privacy by design, data protection impact assessments, DPO",
  },
  {
    name: "EU AI Act",
    status: "achieved" as const,
    description:
      "Transparency obligations, human oversight, risk classification",
  },
  {
    name: "NIS2 Directive",
    status: "achieved" as const,
    description: "Security measures per Art. 21, incident reporting",
  },
];

const riskCategories = [
  {
    icon: Lock,
    title: "Information Security",
    measures: [
      "AES-256-GCM encryption of sensitive data",
      "Role-based access control (RBAC)",
      "Automated security scans on every deployment",
      "Multi-layered rate limiting and DDoS protection",
    ],
  },
  {
    icon: Database,
    title: "Data Protection",
    measures: [
      "Data minimization and purpose limitation",
      "Automatic anonymization of IP addresses",
      "Encrypted backups with EU data residency",
      "Right to erasure and data portability",
    ],
  },
  {
    icon: Activity,
    title: "Business Continuity",
    measures: [
      "Automatic failover and redundancy",
      "Zero-downtime deployments",
      "Real-time monitoring with alerting",
      "Documented incident response processes",
    ],
  },
  {
    icon: Globe,
    title: "Regulatory Risks",
    measures: [
      "Continuous monitoring of European legislation",
      "Proactive adaptation to new requirements",
      "Automated compliance checks in the CI/CD pipeline",
      "Automated dependency checks and secret scanning in the CI/CD pipeline",
    ],
  },
];

const ethicalPolicies = [
  {
    icon: Fingerprint,
    title: "Privacy Policy",
    points: [
      "No transfer or monetization of customer data",
      "No third-party tracking — exclusively self-hosted analytics",
      "GDPR-compliant data processing with documented legal bases",
      "Automatic deletion after contract termination and upon request",
    ],
  },
  {
    icon: Brain,
    title: "AI Ethics Policy",
    points: [
      "Labeling requirement for all AI-generated content",
      "No training of AI models with customer data",
      "Human-in-the-loop for all safety-critical decisions",
      "Regular review for bias and fairness",
    ],
  },
  {
    icon: Gavel,
    title: "Anti-Corruption Policy",
    points: [
      "Zero tolerance for bribery and undue advantage",
      "No dark patterns or manipulative design elements",
      "Transparent business relationships without conflicts of interest",
      "Whistleblower protection for internal and external reporters",
    ],
  },
];

const reportingChannels = [
  {
    icon: AlertTriangle,
    title: "Whistleblower System",
    description:
      "Confidential reporting of violations against our Code of Conduct or applicable laws. Anonymous reports are possible. We guarantee protection against retaliation in accordance with the EU Whistleblower Directive.",
    email: "ethics@caelex.eu",
    label: "Report a concern",
  },
  {
    icon: Lock,
    title: "Security Response",
    description:
      "Responsible disclosure for security vulnerabilities. We acknowledge receipt within 24 hours and provide updates on remediation progress.",
    email: "security@caelex.eu",
    label: "Report a vulnerability",
  },
  {
    icon: Shield,
    title: "Data Protection Officer",
    description:
      "Point of contact for all questions regarding data protection, data subject rights, and data processing. Requests are handled within the statutory deadlines.",
    email: "dpo@caelex.eu",
    label: "Contact DPO",
  },
];

const governanceDocuments = [
  {
    title: "Privacy Policy",
    description: "GDPR-compliant processing of personal data",
    status: "available" as const,
    href: "/legal/privacy-en",
  },
  {
    title: "Terms of Service",
    description: "Contractual basis for platform usage",
    status: "available" as const,
    href: "/legal/terms-en",
  },
  {
    title: "Cookie Policy",
    description: "Transparent information about technologies used",
    status: "available" as const,
    href: "/legal/cookies-en",
  },
  {
    title: "Legal Notice",
    description: "Company information and legal responsibility",
    status: "available" as const,
    href: "/legal/impressum",
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
      <span className="text-caption uppercase tracking-[0.2em] text-white/30 mb-4 block">
        {eyebrow}
      </span>
      <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-subtitle md:text-title text-white/45 leading-relaxed max-w-[650px] mx-auto">
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
      label: "Achieved",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    planned: {
      label: "Planned",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    },
    available: {
      label: "Available",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    },
    "on-request": {
      label: "On Request",
      className: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    },
    "coming-soon": {
      label: "Coming Soon",
      className: "bg-white/10 text-white/45 border-white/10",
    },
  };
  const { label, className } = config[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium border ${className}`}
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
          <span className="inline-block text-small font-semibold text-emerald-400 uppercase tracking-[0.2em] mb-6">
            Corporate Governance
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(isInView, 0.1)}
          className="text-[clamp(2.5rem,6vw,4.5rem)] font-medium tracking-[-0.03em] leading-[1.1] text-white mb-6"
        >
          Responsibility is not a feature
          <br />
          <span className="text-white/45">— it is our foundation.</span>
        </motion.h1>

        <motion.p
          {...fadeUp(isInView, 0.2)}
          className="text-heading md:text-heading-lg text-white/45 max-w-[700px] mx-auto mb-14 leading-relaxed"
        >
          Caelex manages sensitive compliance data for the European space
          industry. This commits us to the highest standards in data protection,
          ethics, and corporate governance.
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
              <div className="text-display-sm md:text-[28px] font-medium text-white tracking-[-0.02em]">
                {metric.value}
              </div>
              <div className="text-small text-white/45 mt-1">
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
          title="Governance Structure"
          subtitle="Our governance framework is built on three pillars — they define how we make decisions, manage risk, and take responsibility."
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
                    <h3 className="text-heading font-medium text-white">
                      {pillar.title}
                    </h3>
                    <span className="text-small text-white/30 uppercase tracking-wider">
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
                      <span className="text-body text-white/45 leading-[1.6]">
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
          subtitle="Six binding principles that guide our actions. They apply to every decision, every product, and every business relationship."
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
                      <span className="text-title font-medium text-emerald-400 font-mono">
                        {article.number}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-title md:text-heading font-medium text-white mb-2">
                      {article.title}
                    </h3>
                    <p className="text-body md:text-body-lg text-white/45 leading-[1.8]">
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
          subtitle="Sustainability is not a marketing label for Caelex. We measure ourselves by concrete actions across all three ESG dimensions."
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
                      <h3 className="text-heading font-medium text-white">
                        {pillar.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-small text-white/30 uppercase tracking-wider mb-6">
                    {pillar.subtitle}
                  </p>

                  <div className="space-y-5">
                    {pillar.commitments.map((commitment, j) => (
                      <div key={j}>
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${colors.dotBg}`}
                          />
                          <span className="text-body-lg font-medium text-white">
                            {commitment.title}
                          </span>
                        </div>
                        <p className="text-body text-white/45 leading-[1.6] ml-3.5">
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
          title="Regulatory Frameworks"
          subtitle="Caelex adheres to the strictest European regulations — without compromise."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[900px] mx-auto">
          {complianceFrameworks.map((fw, i) => (
            <motion.div key={fw.name} {...fadeUp(isInView, 0.15 + i * 0.06)}>
              <GlassCard className="p-6 h-full">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-title font-medium text-white">
                    {fw.name}
                  </h3>
                  <StatusBadge status={fw.status} />
                </div>
                <p className="text-body text-white/45 leading-[1.7]">
                  {fw.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div {...fadeUp(isInView, 0.5)} className="text-center mt-8">
          <Link
            href="/security"
            className="inline-flex items-center gap-2 text-body-lg text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Technical security details
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
          eyebrow="Risk Management"
          title="Systematic Protection"
          subtitle="Four core risk areas that we address through defined measures, processes, and controls."
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
                      className="text-white/45"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-heading font-medium text-white">
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
                      <span className="text-body text-white/45 leading-[1.6]">
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
          eyebrow="Policies"
          title="Ethics & Compliance Policies"
          subtitle="Binding policies that apply to all product development and business relationships."
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
                      className="text-white/45"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="text-title font-medium text-white">
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
                      <span className="text-body text-white/45 leading-[1.6]">
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
          eyebrow="Reporting"
          title="Transparency & Reporting"
          subtitle="Three dedicated channels for responsible communication — confidential, protected, and with guaranteed response times."
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
                    className="text-white/45"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-heading font-medium text-white mb-2">
                  {channel.title}
                </h3>
                <p className="text-body text-white/45 leading-[1.7] mb-5 flex-1">
                  {channel.description}
                </p>
                <a
                  href={`mailto:${channel.email}`}
                  className="inline-flex items-center gap-2 text-body text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
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
          eyebrow="Documents"
          title="Governance Documentation"
          subtitle="Core policies and documents — publicly accessible."
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
                        <span className="text-body-lg font-medium text-white">
                          {doc.title}
                        </span>
                        <StatusBadge status={doc.status} />
                      </div>
                      <p className="text-small text-white/25 mt-0.5 truncate">
                        {doc.description}
                      </p>
                    </div>
                  </div>
                  {doc.href && (
                    <Link
                      href={doc.href}
                      className="ml-4 p-2 rounded-lg hover:bg-white/[0.06] transition-colors shrink-0"
                      aria-label={`Open ${doc.title}`}
                    >
                      <ExternalLink
                        size={16}
                        className="text-white/45"
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
              Questions about our governance?
            </h2>
            <p className="text-title text-white/45 max-w-[560px] mx-auto mb-10 leading-relaxed">
              We are committed to open dialogue — about governance, data
              protection, or how we work.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-subtitle font-medium transition-all duration-300 hover:bg-white/90 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              >
                Get in Touch
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/security"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-white/70 text-subtitle font-medium border border-white/20 transition-all duration-300 hover:border-white/40 hover:text-white hover:scale-[1.02]"
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
