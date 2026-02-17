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
  Fingerprint,
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
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

const trustBadges = [
  { label: "GDPR Compliant", icon: Shield },
  { label: "EU AI Act", icon: Brain },
  { label: "AES-256 Encryption", icon: Lock },
  { label: "SOC 2 (Planned)", icon: ShieldCheck },
];

const infrastructureItems = [
  {
    icon: Server,
    title: "Hosting",
    description:
      "Vercel (EU Region), Edge Network with automatic DDoS protection and global CDN distribution.",
  },
  {
    icon: Database,
    title: "Database",
    description:
      "Neon PostgreSQL (EU), encrypted at rest with AES-256 and in transit with TLS 1.3.",
  },
  {
    icon: Cloud,
    title: "Storage",
    description:
      "Cloudflare R2 (EU), S3-compatible object storage with server-side encryption.",
  },
  {
    icon: Globe,
    title: "CDN & Edge",
    description:
      "Vercel Edge Network with automatic SSL, DDoS protection, and sub-50ms global latency.",
  },
];

const applicationSecurityItems = [
  {
    icon: UserCheck,
    title: "Authentication",
    description:
      "NextAuth v5 with bcrypt (12 rounds), Google OAuth, SSO (SAML/OIDC), and MFA-ready architecture.",
  },
  {
    icon: Key,
    title: "Authorization",
    description:
      "Role-Based Access Control with 5 permission levels (Owner, Admin, Manager, Member, Viewer) and organization-level isolation.",
  },
  {
    icon: Activity,
    title: "API Security",
    description:
      "Rate limiting via Upstash Redis (7 tiers), API key authentication, CSRF protection, and origin header validation.",
  },
  {
    icon: FileCheck,
    title: "Input Validation",
    description:
      "Zod schema validation on all inputs, Content Security Policy headers, HSTS (2-year preload), X-Frame-Options DENY.",
  },
  {
    icon: Fingerprint,
    title: "File Validation",
    description:
      "Magic number verification for uploaded files, configurable size limits, and content-type enforcement.",
  },
  {
    icon: ShieldCheck,
    title: "Dependency Scanning",
    description:
      "Automated security scanning via CodeQL, TruffleHog secret detection, and OWASP dependency checks in CI/CD.",
  },
];

const gdprItems = [
  {
    icon: Lock,
    title: "Encryption at Rest",
    description:
      "AES-256-GCM with scrypt key derivation for sensitive fields including VAT numbers, bank accounts, and tax IDs.",
  },
  {
    icon: Eye,
    title: "Data Minimization",
    description:
      "IP anonymization after 30 days, automatic data cleanup, and minimal data collection principles.",
  },
  {
    icon: FileCheck,
    title: "Cookie Consent",
    description:
      "Granular consent management with analytics opt-in. No tracking without explicit user consent.",
  },
  {
    icon: Database,
    title: "Data Portability",
    description:
      "GDPR Art. 15/20 compliant data export. Users can download all their data in standard formats.",
  },
  {
    icon: AlertTriangle,
    title: "Right to Erasure",
    description:
      "Complete data deletion with cascading removal across all linked records upon user request.",
  },
  {
    icon: Shield,
    title: "No External Tracking",
    description:
      "Self-hosted analytics only. No Google Analytics, no third-party trackers, no data sharing with advertisers.",
  },
];

const aiSecurityItems = [
  {
    label: "Art. 50 Compliance",
    description:
      "AI-generated content is clearly labeled per EU AI Act transparency requirements",
  },
  {
    label: "No Training on Your Data",
    description:
      "Customer data is never used for AI model training or fine-tuning",
  },
  {
    label: "Human Oversight",
    description:
      "All AI outputs include disclaimers that they do not constitute legal advice",
  },
  {
    label: "Explicit Consent",
    description: "AI features require explicit opt-in before any interaction",
  },
  {
    label: "Full Audit Trail",
    description:
      "Every AI interaction is logged with timestamps and context for accountability",
  },
];

const auditItems = [
  {
    icon: FileCheck,
    title: "Comprehensive Audit Logging",
    description:
      "Full trail with IP address, user-agent, entity changes, and timestamps for every state-changing operation.",
  },
  {
    icon: AlertTriangle,
    title: "Security Event Tracking",
    description:
      "Login attempts, permission changes, data access, and API key usage are monitored and logged.",
  },
  {
    icon: Activity,
    title: "Error Monitoring",
    description:
      "Sentry integration with EU data residency for real-time error tracking and alerting.",
  },
  {
    icon: Clock,
    title: "99.99% Uptime SLA",
    description:
      "Vercel's enterprise-grade infrastructure with automatic failover and zero-downtime deployments.",
  },
];

const certificationTimeline = [
  {
    label: "GDPR",
    status: "active" as const,
    date: "Compliant",
    description: "Full compliance with EU General Data Protection Regulation",
  },
  {
    label: "EU AI Act",
    status: "active" as const,
    date: "Compliant",
    description:
      "Transparency and human oversight per Regulation (EU) 2024/1689",
  },
  {
    label: "SOC 2 Type II",
    status: "planned" as const,
    date: "Q3 2026",
    description: "Security, availability, and confidentiality audit",
  },
  {
    label: "ISO 27001",
    status: "planned" as const,
    date: "Q4 2026",
    description: "Information security management system certification",
  },
];

const enterpriseFeatures = [
  {
    icon: Key,
    title: "SSO (SAML/OIDC)",
    description:
      "Enterprise Single Sign-On with SAML 2.0 and OpenID Connect support.",
  },
  {
    icon: Clock,
    title: "Custom Data Retention",
    description:
      "Configurable data retention policies to meet your organization's requirements.",
  },
  {
    icon: Shield,
    title: "Dedicated Security Contact",
    description:
      "Direct line to our security team for incident coordination and questions.",
  },
  {
    icon: AlertTriangle,
    title: "Incident Response SLA",
    description:
      "Defined response times for security incidents with escalation procedures.",
  },
  {
    icon: ShieldCheck,
    title: "Annual Penetration Testing",
    description:
      "Third-party security assessments with remediation tracking and reporting.",
  },
  {
    icon: Building2,
    title: "Organization Isolation",
    description:
      "Complete data isolation between organizations with separate encryption contexts.",
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
      {/* Background glow — emerald radial gradient matching About/Pricing */}
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
          Security-First Infrastructure
          <br />
          <span className="text-white/50">for Space Compliance</span>
        </motion.h1>

        <motion.p
          {...fadeUp(isInView, 0.2)}
          className="text-[18px] md:text-[20px] text-white/50 max-w-[650px] mx-auto mb-10 leading-relaxed"
        >
          Enterprise-grade security protecting the world&apos;s most sensitive
          space regulatory data. EU-hosted, end-to-end encrypted, zero
          third-party tracking.
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
            href="/docs/api"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-black text-[14px] font-medium transition-all duration-300 hover:bg-white/90 hover:scale-[1.02]"
          >
            View Documentation
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-white text-[14px] font-medium transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.2]"
          >
            Contact Security Team
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
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16, 185, 129, 0.04) 0%, transparent 60%)",
        }}
      />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
        <SectionHeader
          eyebrow="Infrastructure"
          title="EU-Hosted, Encrypted Everywhere"
          subtitle="All data stays within the European Union. Every layer of our infrastructure is encrypted and hardened."
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
          eyebrow="Application Security"
          title="Defense in Depth"
          subtitle="Multiple layers of security controls protect your data from authentication to API access."
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
          eyebrow="Data Protection"
          title="GDPR-Compliant by Design"
          subtitle="Privacy isn't an afterthought. Every feature is built with data protection principles at its core."
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
          eyebrow="AI Security"
          title="EU AI Act Conformity"
          subtitle="Our AI assistant ASTRA is designed to meet EU AI Act transparency and oversight requirements."
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
                ASTRA AI Compliance
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
          eyebrow="Monitoring"
          title="Audit & Monitoring"
          subtitle="Complete visibility into every action taken on the platform with real-time monitoring."
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

function CertificationsSection() {
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
          eyebrow="Certifications"
          title="Compliance Roadmap"
          subtitle="Current certifications and planned milestones for security and compliance."
          isInView={isInView}
        />

        <div className="max-w-[600px] mx-auto">
          {certificationTimeline.map((item, i) => (
            <motion.div
              key={item.label}
              {...fadeUp(isInView, 0.15 + i * 0.1)}
              className="flex items-start gap-6 relative"
            >
              {/* Vertical line */}
              {i < certificationTimeline.length - 1 && (
                <div className="absolute left-[19px] top-[40px] bottom-0 w-px bg-white/[0.06]" />
              )}

              {/* Status dot */}
              <div className="relative shrink-0 mt-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.status === "active"
                      ? "bg-emerald-500/10 border border-emerald-500/30"
                      : "bg-white/[0.04] border border-white/[0.08]"
                  }`}
                >
                  {item.status === "active" ? (
                    <CheckCircle2
                      size={18}
                      className="text-emerald-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <Clock
                      size={18}
                      className="text-white/30"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="pb-10">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-[16px] font-medium text-white">
                    {item.label}
                  </h3>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      item.status === "active"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-white/[0.06] text-white/40"
                    }`}
                  >
                    {item.date}
                  </span>
                </div>
                <p className="text-[14px] text-white/40 leading-[1.6]">
                  {item.description}
                </p>
              </div>
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
          title="Enterprise Security Features"
          subtitle="Advanced security capabilities for organizations with the highest compliance requirements."
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
              Ready to secure your space compliance?
            </h2>
            <p className="text-[17px] text-white/50 max-w-[520px] mx-auto mb-10 leading-relaxed">
              Start with a free compliance assessment or talk to our team about
              enterprise security needs.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/assessment"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-[15px] font-medium transition-all duration-300 hover:bg-white/90 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              >
                Start Free Assessment
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
                Contact Sales
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
      <CertificationsSection />
      <EnterpriseSection />
      <CTASection />
    </main>
  );
}
