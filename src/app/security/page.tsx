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
    animate: isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 },
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
      "Our entire infrastructure is operated within the EU. Your data never leaves European soil.",
  },
  {
    icon: Database,
    title: "Encrypted Database",
    description:
      "All data is encrypted at rest and in transit — using industry-standard AES-256 encryption.",
  },
  {
    icon: Cloud,
    title: "Secure File Storage",
    description:
      "Documents and uploads are stored with server-side encryption in EU data centers.",
  },
  {
    icon: Globe,
    title: "DDoS Protection & CDN",
    description:
      "Automatic attack protection, SSL encryption, and a global edge network for fast load times.",
  },
];

const applicationSecurityItems = [
  {
    icon: UserCheck,
    title: "Secure Authentication",
    description:
      "Passwords are hashed following best practices. Sign in with Google, Enterprise SSO, or email — with multi-factor authentication.",
  },
  {
    icon: Key,
    title: "Role-Based Access Control",
    description:
      "Every team member only sees what they need to. Granular roles from Viewer to Owner — isolated per organization.",
  },
  {
    icon: Activity,
    title: "API Security",
    description:
      "Multi-layered rate limiting, API key authentication, and protection against common attack vectors like CSRF and injection.",
  },
  {
    icon: FileCheck,
    title: "Input Validation",
    description:
      "Every input is validated server-side. Strict Content Security Policies and modern security headers provide additional protection.",
  },
  {
    icon: Shield,
    title: "Upload Verification",
    description:
      "Uploaded files are checked for file type and size before being accepted. No blind trust.",
  },
  {
    icon: ShieldCheck,
    title: "Automated Security Scans",
    description:
      "Our code is automatically scanned for vulnerabilities, secrets, and insecure dependencies on every deployment.",
  },
];

const gdprItems = [
  {
    icon: Lock,
    title: "Sensitive Data Encrypted",
    description:
      "Especially sensitive fields like tax IDs or bank details are additionally encrypted with AES-256 — not just the database.",
  },
  {
    icon: Eye,
    title: "Data Minimization",
    description:
      "We only collect what is truly necessary. IP addresses are automatically anonymized, outdated data is regularly deleted.",
  },
  {
    icon: FileCheck,
    title: "Cookie Consent",
    description:
      "Granular consent management with real opt-in. No tracking without your explicit permission.",
  },
  {
    icon: Database,
    title: "Data Portability",
    description:
      "Your data belongs to you. Full export at any time in accordance with GDPR Art. 15 and Art. 20 — in standard formats.",
  },
  {
    icon: Users,
    title: "Right to Erasure",
    description:
      "Upon request, all your data is completely and irrevocably deleted — across all connected systems.",
  },
  {
    icon: Eye,
    title: "No External Tracking",
    description:
      "We exclusively use self-hosted analytics. No Google Analytics, no third-party trackers, no data selling.",
  },
];

const aiSecurityItems = [
  {
    label: "Transparency",
    description:
      "AI-generated content is always clearly labeled — in accordance with EU AI Act Art. 50",
  },
  {
    label: "No Training on Your Data",
    description: "Your data is never used to train or improve AI models",
  },
  {
    label: "Human Remains in Control",
    description:
      "All AI responses include a disclaimer that they do not constitute legal advice",
  },
  {
    label: "Explicit Consent",
    description: "AI features require an explicit opt-in before each use",
  },
  {
    label: "Complete Audit Trail",
    description:
      "Every AI interaction is logged with timestamp and context — for full traceability",
  },
];

const auditItems = [
  {
    icon: FileCheck,
    title: "Comprehensive Logging",
    description:
      "Every security-relevant action is logged — who changed what, when, and from which device.",
  },
  {
    icon: Activity,
    title: "Security Monitoring",
    description:
      "Login attempts, permission changes, and data access are monitored and flagged when anomalies are detected.",
  },
  {
    icon: ShieldCheck,
    title: "Real-Time Error Monitoring",
    description:
      "Errors are detected in real time and reported to our team — with EU data residency for monitoring data.",
  },
  {
    icon: Clock,
    title: "99.99% Availability",
    description:
      "Enterprise infrastructure with automatic failover and zero-downtime deployments.",
  },
];

const enterpriseFeatures = [
  {
    icon: Key,
    title: "Single Sign-On",
    description:
      "Seamless login through your existing identity provider — SAML and OpenID Connect supported.",
  },
  {
    icon: Clock,
    title: "Custom Retention Policies",
    description:
      "Configurable data retention to match your organization's requirements.",
  },
  {
    icon: Shield,
    title: "Dedicated Security Contact",
    description:
      "Direct line to our security team for questions, incidents, and coordination.",
  },
  {
    icon: Activity,
    title: "Incident Response SLA",
    description:
      "Defined response times for security incidents with clear escalation paths.",
  },
  {
    icon: ShieldCheck,
    title: "Annual Penetration Tests",
    description:
      "Independent security audits by external experts — with remediation tracking.",
  },
  {
    icon: Building2,
    title: "Organization Isolation",
    description:
      "Complete data separation between organizations. No shared resources, no data leakage between tenants.",
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
            Security & Compliance
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(isInView, 0.1)}
          className="text-[clamp(2.5rem,6vw,4.5rem)] font-medium tracking-[-0.03em] leading-[1.1] text-white mb-6"
        >
          Your compliance data
          <br />
          <span className="text-white/45">in safe hands</span>
        </motion.h1>

        <motion.p
          {...fadeUp(isInView, 0.2)}
          className="text-heading md:text-heading-lg text-white/45 max-w-[650px] mx-auto mb-10 leading-relaxed"
        >
          Enterprise-grade security for the most sensitive data in space
          regulation. Hosted in the EU, end-to-end encrypted, with no
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.08] text-small text-white/45"
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
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-black text-body-lg font-medium transition-all duration-300 hover:bg-white/90 hover:scale-[1.02]"
          >
            Start Free Assessment
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-white text-body-lg font-medium transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.2]"
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
          title="Hosted in the EU. Encrypted everywhere."
          subtitle="All data stays within the European Union. Every layer of our infrastructure is encrypted and secured."
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
                <h3 className="text-heading font-medium text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-body-lg text-white/45 leading-[1.7]">
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
          title="Multiple Layers of Protection"
          subtitle="From authentication to API access — your data is protected by multiple independent security layers."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applicationSecurityItems.map((item, i) => (
            <motion.div key={item.title} {...fadeUp(isInView, 0.15 + i * 0.08)}>
              <GlassCard className="p-6 h-full group">
                <div className="p-2.5 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors w-fit mb-4">
                  <item.icon
                    size={18}
                    className="text-white/45"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-subtitle font-medium text-white mb-2 tracking-[-0.01em]">
                  {item.title}
                </h3>
                <p className="text-body text-white/45 leading-[1.7]">
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
          title="GDPR Compliant by Design"
          subtitle="Data protection is not an afterthought. Every feature is built with privacy-by-design principles."
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
                <h3 className="text-subtitle font-medium text-white mb-2 tracking-[-0.01em]">
                  {item.title}
                </h3>
                <p className="text-body text-white/45 leading-[1.7]">
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
          title="EU AI Act Compliant"
          subtitle="Our AI assistant ASTRA meets the EU AI Act requirements for transparency and human oversight."
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
              <h3 className="text-heading font-medium text-white">
                ASTRA — Responsible AI
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
                    <span className="text-body-lg font-medium text-white">
                      {item.label}
                    </span>
                    <p className="text-body text-white/45 mt-0.5 leading-[1.6]">
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
          subtitle="Full transparency over every action on the platform — with real-time monitoring."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auditItems.map((item, i) => (
            <motion.div key={item.title} {...fadeUp(isInView, 0.15 + i * 0.08)}>
              <GlassCard className="p-8 h-full group">
                <div className="p-2.5 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors w-fit mb-5">
                  <item.icon
                    size={20}
                    className="text-white/45"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-heading font-medium text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-body-lg text-white/45 leading-[1.7]">
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
          title="Built for the Highest Standards"
          subtitle="Advanced security features for organizations that make no compromises."
          isInView={isInView}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enterpriseFeatures.map((item, i) => (
            <motion.div key={item.title} {...fadeUp(isInView, 0.15 + i * 0.08)}>
              <GlassCard className="p-6 h-full group">
                <div className="p-2.5 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.06] transition-colors w-fit mb-4">
                  <item.icon
                    size={18}
                    className="text-white/45"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-subtitle font-medium text-white mb-2 tracking-[-0.01em]">
                  {item.title}
                </h3>
                <p className="text-body text-white/45 leading-[1.7]">
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
              Ready for secure space compliance?
            </h2>
            <p className="text-title text-white/45 max-w-[520px] mx-auto mb-10 leading-relaxed">
              Start with a free assessment or talk to our team about enterprise
              security.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/assessment"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black text-subtitle font-medium transition-all duration-300 hover:bg-white/90 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              >
                Free Assessment
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-white/70 text-subtitle font-medium border border-white/20 transition-all duration-300 hover:border-white/40 hover:text-white hover:scale-[1.02]"
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
      <EnterpriseSection />
      <CTASection />
    </main>
  );
}
