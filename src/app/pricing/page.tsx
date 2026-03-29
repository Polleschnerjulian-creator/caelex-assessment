"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Check,
  Zap,
  Building2,
  Rocket,
  ArrowRight,
  Sparkles,
  Shield,
  Users,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Award,
  Lock,
  Globe,
  FileCheck,
  Satellite,
  Database,
  Headphones,
  Target,
  RefreshCw,
  ShieldCheck,
  Leaf,
  Send,
  Eye,
  Info,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ============================================================================
// ANIMATED COUNTER
// ============================================================================
function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;

    let startTime: number;
    const duration = 2000;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString("de-DE")}
      {suffix}
    </span>
  );
}

// ============================================================================
// PRICING DATA
// ============================================================================
const plans = [
  {
    name: "Essentials",
    description: "For startups & small operators getting compliant",
    icon: Zap,
    monthlyPrice: 449,
    yearlyPrice: 374,
    highlighted: false,
    cta: "Start Free Trial",
    ctaHref: "/contact?plan=essentials",
    valueStatement:
      "Automates compliance mapping at a fraction of consulting rates",
    features: [
      "EU Space Act Assessment (119 articles)",
      "NIS2 Directive Assessment",
      "National Space Law — 1 jurisdiction",
      "Operator Type Classification (7 types)",
      "Basic Gap Analysis",
      "Basic Compliance Dashboard",
      "4 Core Modules (Auth, Debris, Cyber, Insurance)",
      "Real-time Compliance Status",
      "Deadline Tracking & Alerts",
      "Up to 3 Spacecraft",
      "Debris Mitigation Plan Templates",
      "End-of-Life Planning",
      "Document Vault (5 GB)",
      "10 Document Templates",
      "Monthly Automated Reports",
      "3 Team Members",
      "Basic Role-Based Access",
      "Audit Logs (30 days)",
      "Email Support (48h response)",
      "Self-Service Onboarding",
    ],
    notIncluded: [],
  },
  {
    name: "Professional",
    description: "For growing companies with serious compliance needs",
    icon: Rocket,
    monthlyPrice: 1199,
    yearlyPrice: 999,
    highlighted: true,
    cta: "Start Free Trial",
    ctaHref: "/contact?plan=professional",
    valueStatement:
      "Replaces manual compliance work typically done at \u20AC250\u2013400/h",
    features: [
      "Everything in Essentials, plus:",
      "All 10 European Jurisdictions",
      "Detailed Gap Analysis + Remediation Roadmap",
      "Full Dashboard — all 8 Compliance Modules",
      "Mission Timeline & Lifecycle Tracking",
      "Risk Indicators & Heatmap",
      "Unlimited Spacecraft",
      "Constellation Support",
      "Custom Debris Mitigation Plans",
      "Collision Avoidance Alerts",
      "NCA Submission Workflow & Packages",
      "ASTRA AI Compliance Assistant",
      "Document Vault (50 GB)",
      "50+ Document Templates",
      "Full Audit Trail",
      "Weekly Automated Reports",
      "Up to 25 Team Members",
      "Full RBAC (Owner, Admin, Manager, Member, Viewer)",
      "REST API v1 Access",
      "Security Audit Logs (1 year)",
      "Priority Email Support (24h response)",
      "Guided Onboarding",
      "Quarterly Training Sessions",
    ],
    notIncluded: [],
  },
  {
    name: "Enterprise",
    description: "For large organizations & constellation operators",
    icon: Building2,
    monthlyPrice: 2499,
    yearlyPrice: 2083,
    priceLabel: "from",
    highlighted: false,
    cta: "Contact Sales",
    ctaHref: "/contact?plan=enterprise",
    valueStatement: "Continuous compliance automation with dedicated support",
    features: [
      "Everything in Professional, plus:",
      "All Jurisdictions + Custom Regulations",
      "Custom Gap Analysis & Dashboard",
      "Unlimited Spacecraft & Objects",
      "Certified Debris Mitigation Plans",
      "Full Collision Avoidance Suite",
      "Custom Integrations",
      "SSO / SAML / OIDC Authentication",
      "On-Premise Deployment Option",
      "Unlimited Document Storage",
      "Custom Document Templates",
      "White-Label Reports",
      "Daily Automated Reports",
      "Unlimited Team Members",
      "Custom Role Configuration",
      "Unlimited Security Audit Logs",
      "Multi-Organization Management",
      "Dedicated Account Manager",
      "Custom SLA (99.95%)",
      "24/7 Phone Support (4h response)",
      "White-Glove Onboarding",
      "Monthly Training Sessions",
      "Compliance Consulting Included",
    ],
    notIncluded: [],
  },
];

// ============================================================================
// AUTHORIZATION WORKSTREAMS
// ============================================================================
const authorizationWorkstreams = [
  {
    icon: Shield,
    title: "Safety & Sustainability Assessment",
    items: [
      "Debris mitigation plan",
      "Collision avoidance capability",
      "End-of-life disposal strategy",
      "Trackability requirements",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Cybersecurity & NIS2 Compliance",
    items: [
      "Risk management framework",
      "Incident reporting procedures",
      "Supply chain security assessment",
    ],
  },
  {
    icon: Leaf,
    title: "Environmental Footprint",
    items: [
      "Mission environmental impact calculation",
      "Footprint declaration",
      "Qualified technical body certification",
    ],
  },
  {
    icon: Send,
    title: "Authorization Documentation",
    items: [
      "Technical file preparation",
      "Submission to up to 3 Member State NCAs",
      "6-month technical assessment response",
    ],
  },
  {
    icon: Eye,
    title: "Ongoing Monitoring",
    items: [
      "Regulatory updates from delegated acts",
      "Re-authorization triggers",
      "Annual reporting obligations",
    ],
  },
];

// ============================================================================
// FEATURE COMPARISON DATA
// ============================================================================
const featureCategories = [
  {
    name: "Compliance Assessment",
    icon: FileCheck,
    features: [
      {
        name: "EU Space Act Assessment",
        essentials: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "NIS2 Assessment",
        essentials: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "National Space Law Assessment",
        essentials: "1 Country",
        professional: "10 Countries",
        enterprise: "All + Custom",
      },
      {
        name: "Operator Classification",
        essentials: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Gap Analysis",
        essentials: "Basic",
        professional: "Detailed",
        enterprise: "Custom",
      },
      {
        name: "Remediation Roadmap",
        essentials: false,
        professional: true,
        enterprise: true,
      },
    ],
  },
  {
    name: "Dashboard & Monitoring",
    icon: Target,
    features: [
      {
        name: "Compliance Dashboard",
        essentials: "Basic",
        professional: "Full",
        enterprise: "Custom",
      },
      {
        name: "Real-time Status",
        essentials: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Module Coverage",
        essentials: "4 Modules",
        professional: "8 Modules",
        enterprise: "All + Custom",
      },
      {
        name: "Deadline Tracking",
        essentials: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Mission Timeline",
        essentials: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "Risk Indicators",
        essentials: false,
        professional: true,
        enterprise: true,
      },
    ],
  },
  {
    name: "Spacecraft Management",
    icon: Satellite,
    features: [
      {
        name: "Spacecraft Registry",
        essentials: "3 Objects",
        professional: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        name: "Constellation Support",
        essentials: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "Debris Mitigation Plans",
        essentials: "Template",
        professional: "Custom",
        enterprise: "Certified",
      },
      {
        name: "End-of-Life Planning",
        essentials: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Collision Avoidance",
        essentials: false,
        professional: "Alerts",
        enterprise: "Full Suite",
      },
    ],
  },
  {
    name: "Documents & Reports",
    icon: Database,
    features: [
      {
        name: "Document Vault",
        essentials: "5 GB",
        professional: "50 GB",
        enterprise: "Unlimited",
      },
      {
        name: "Document Templates",
        essentials: "10",
        professional: "50+",
        enterprise: "Custom",
      },
      {
        name: "NCA Submission Package",
        essentials: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "Audit Trail",
        essentials: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "Automated Reports",
        essentials: "Monthly",
        professional: "Weekly",
        enterprise: "Daily",
      },
    ],
  },
  {
    name: "Team & Security",
    icon: Users,
    features: [
      {
        name: "Team Members",
        essentials: "3 Users",
        professional: "25 Users",
        enterprise: "Unlimited",
      },
      {
        name: "Role-Based Access",
        essentials: "Basic",
        professional: "Full",
        enterprise: "Custom",
      },
      {
        name: "SSO / SAML",
        essentials: false,
        professional: false,
        enterprise: true,
      },
      {
        name: "Security Audit Logs",
        essentials: "30 Days",
        professional: "1 Year",
        enterprise: "Unlimited",
      },
      {
        name: "API Access",
        essentials: false,
        professional: true,
        enterprise: true,
      },
    ],
  },
  {
    name: "Support",
    icon: Headphones,
    features: [
      {
        name: "Support Channel",
        essentials: "Email",
        professional: "Priority Email",
        enterprise: "24/7 Phone",
      },
      {
        name: "Response Time",
        essentials: "48h",
        professional: "24h",
        enterprise: "4h",
      },
      {
        name: "Account Manager",
        essentials: false,
        professional: false,
        enterprise: true,
      },
      {
        name: "Onboarding",
        essentials: "Self-Service",
        professional: "Guided",
        enterprise: "White-Glove",
      },
      {
        name: "Training Sessions",
        essentials: false,
        professional: "Quarterly",
        enterprise: "Monthly",
      },
    ],
  },
];

// ============================================================================
// FAQ DATA
// ============================================================================
const faqs = [
  {
    question: "What does Caelex replace vs. what do we still need?",
    answer:
      "Caelex automates compliance mapping, gap analysis, document preparation, and ongoing regulatory monitoring \u2014 work traditionally done by consultants at \u20AC250\u2013400/hour. You still need: authorization fees to your NCA (~\u20AC100K per product line), specialized legal counsel for specific filings, technical compliance measures (hardware, systems), and insurance coverage. Caelex handles the preparation work, not the fees or technical implementation.",
    icon: Info,
  },
  {
    question: "What happens if we miss the 2030 deadline?",
    answer:
      "The EU Space Act enters full effect on January 1, 2030. Non-compliant operators risk authorization denial, operational restrictions, and penalties up to \u20AC10M or 2% of global turnover. Starting early gives you time to address gaps systematically.",
    icon: AlertTriangle,
  },
  {
    question: "Can we switch plans as we grow?",
    answer:
      "Yes, upgrade anytime. Pricing is prorated so you only pay the difference. Downgrading is available at the end of your billing cycle. Our Founding Member discount carries over to upgrades.",
    icon: TrendingUp,
  },
  {
    question: "Is Caelex recognized by National Competent Authorities?",
    answer:
      "Caelex generates NCA-ready submission packages that follow the exact format required by each authority. Our templates are reviewed by former regulatory officials. Caelex complements but does not replace specialized legal counsel for NCA interactions.",
    icon: Award,
  },
  {
    question: "What if we operate in multiple jurisdictions?",
    answer:
      "Professional and Enterprise plans cover all 10 European jurisdictions (FR, UK, DE, LU, NL, BE, AT, DK, IT, NO). Our comparison tools help you choose the optimal authorization jurisdiction based on your specific operation.",
    icon: Globe,
  },
  {
    question: "How secure is our compliance data?",
    answer:
      "We use AES-256 encryption at rest and in transit, SOC 2 Type II certified infrastructure, and host on EU servers (GDPR compliant). Enterprise customers can opt for on-premise deployment.",
    icon: Shield,
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  return (
    <div className="min-h-screen landing-light bg-[#F7F8FA] text-[#111827]">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://caelex.eu" },
          { name: "Pricing", url: "https://caelex.eu/pricing" },
        ]}
      />
      {/* ================================================================== */}
      {/* FOUNDING MEMBER BANNER */}
      {/* ================================================================== */}
      {/* HERO SECTION */}
      {/* ================================================================== */}
      <section ref={heroRef} className="relative pt-32 pb-20 overflow-hidden">
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          {/* Headline */}
          <motion.div
            initial={false}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-medium tracking-[-0.03em] leading-[1.1] mb-8">
              Compliance automation
              <br />
              <span className="text-[#111827]">for space operators</span>
            </h1>
            <p className="text-heading text-[#4B5563] max-w-[650px] mx-auto mb-12 leading-relaxed">
              Map requirements, track deadlines, prepare documentation, and
              monitor regulatory changes — continuously, not as a one-time
              consulting project.
            </p>

            {/* Billing Toggle */}
            <GlassCard
              className="inline-flex items-center gap-2 p-1.5"
              hover={false}
            >
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-6 py-3 rounded-xl text-subtitle font-medium transition-all duration-300 ${
                  billingPeriod === "monthly"
                    ? "bg-[#111827] text-white shadow-lg"
                    : "text-[#4B5563] hover:text-[#111827]"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-6 py-3 rounded-xl text-subtitle font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingPeriod === "yearly"
                    ? "bg-[#111827] text-white shadow-lg"
                    : "text-[#4B5563] hover:text-[#111827]"
                }`}
              >
                Yearly
                <span
                  className={`text-caption px-2.5 py-1 rounded-full font-semibold ${
                    billingPeriod === "yearly"
                      ? "bg-white text-[#111827]"
                      : "bg-[#F1F3F5] text-[#111827]"
                  }`}
                >
                  2 Months Free
                </span>
              </button>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* PRICING CARDS */}
      {/* ================================================================== */}
      <section className="relative py-16 px-6 md:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const price =
                billingPeriod === "yearly"
                  ? plan.yearlyPrice
                  : plan.monthlyPrice;

              return (
                <motion.div
                  key={plan.name}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative"
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="inline-flex items-center gap-1.5 text-small font-semibold text-white bg-[#111827] px-4 py-2 rounded-full shadow-lg">
                        <Sparkles size={14} />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <GlassCard
                    className="h-full flex flex-col"
                    hover={!plan.highlighted}
                    highlighted={plan.highlighted}
                  >
                    <div className="p-8 flex-1 flex flex-col">
                      {/* Header */}
                      <div className="flex items-center gap-4 mb-5">
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                            plan.highlighted ? "bg-[#F1F3F5]" : "bg-[#F1F3F5]"
                          }`}
                        >
                          <Icon
                            size={26}
                            className={
                              plan.highlighted
                                ? "text-[#111827]"
                                : "text-[#4B5563]"
                            }
                          />
                        </div>
                        <h3 className="text-display-sm font-medium text-[#111827]">
                          {plan.name}
                        </h3>
                      </div>

                      <p className="text-subtitle text-[#4B5563] mb-6 leading-relaxed min-h-[48px]">
                        {plan.description}
                      </p>

                      {/* Value Statement */}
                      <p className="text-body text-[#4B5563] mb-6 pb-6 border-b border-[#E5E7EB]">
                        {plan.valueStatement}
                      </p>

                      {/* Price */}
                      <div className="mb-8">
                        {plan.priceLabel ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-title text-[#4B5563]">
                              {plan.priceLabel}
                            </span>
                            <span className="text-display-lg font-light tracking-[-0.02em] text-[#111827]">
                              &euro;{price?.toLocaleString("de-DE")}
                            </span>
                            <span className="text-title text-[#4B5563]">
                              /month
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-display-lg font-light tracking-[-0.02em] text-[#111827]">
                              &euro;{price?.toLocaleString("de-DE")}
                            </span>
                            <span className="text-title text-[#4B5563]">
                              /month
                            </span>
                          </div>
                        )}
                        {billingPeriod === "yearly" && price && (
                          <p className="text-body-lg text-[#4B5563] mt-2">
                            &euro;{(price * 12).toLocaleString("de-DE")} billed
                            annually
                          </p>
                        )}
                        <p className="text-small text-[#9CA3AF] mt-1">
                          All prices excl. VAT (zzgl. MwSt.)
                        </p>
                      </div>

                      {/* CTA */}
                      <Link
                        href={plan.ctaHref}
                        className={`w-full text-center py-4 rounded-xl text-subtitle font-semibold transition-all duration-300 mb-8 block ${
                          plan.highlighted
                            ? "bg-[#111827] text-white hover:bg-[#374151]"
                            : "bg-[#F1F3F5] text-[#111827] hover:bg-[#E5E7EB] border border-[#E5E7EB]"
                        }`}
                      >
                        {plan.cta}
                      </Link>

                      {/* Features */}
                      <div className="pt-8 border-t border-[#E5E7EB] flex-1">
                        <ul className="space-y-3">
                          {plan.features.map((feature) => {
                            const isInheritLabel = feature.endsWith("plus:");
                            if (isInheritLabel) {
                              return (
                                <li
                                  key={feature}
                                  className="text-small font-semibold text-[#111827] uppercase tracking-wider mb-1"
                                >
                                  {feature}
                                </li>
                              );
                            }
                            return (
                              <li
                                key={feature}
                                className="flex items-start gap-3 text-body-lg"
                              >
                                <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <Check
                                    size={12}
                                    className="text-emerald-500"
                                  />
                                </div>
                                <span className="text-[#4B5563]">
                                  {feature}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {/* Trust Elements */}
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 flex flex-wrap items-center justify-center gap-8 text-subtitle text-[#4B5563]"
          >
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#111827]" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-[#111827]" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-[#111827]" />
              <span>SOC 2 certified</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-[#111827]" />
              <span>GDPR compliant</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* WHAT AUTHORIZATION REQUIRES (Honest Scope Section) */}
      {/* ================================================================== */}
      <section className="relative py-24 px-6 md:px-12">
        <div className="max-w-[1000px] mx-auto">
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block text-small font-semibold text-[#111827] uppercase tracking-[0.2em] mb-4">
              Compliance Scope
            </span>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[#111827] mb-5">
              What authorization under the EU Space Act requires
            </h2>
            <p className="text-heading text-[#4B5563] leading-relaxed max-w-[700px] mx-auto">
              Each workstream requires specialized regulatory expertise. Caelex
              automates the mapping, tracking, documentation, and monitoring
              across all of them.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authorizationWorkstreams.map((workstream, i) => {
              const Icon = workstream.icon;
              return (
                <motion.div
                  key={workstream.title}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard className="p-6 h-full" hover={false}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[#F1F3F5] flex items-center justify-center">
                        <Icon size={20} className="text-[#111827]" />
                      </div>
                      <h3 className="text-subtitle font-medium text-[#111827]">
                        {workstream.title}
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {workstream.items.map((item) => (
                        <li
                          key={item}
                          className="text-body-lg text-[#4B5563] flex items-start gap-2"
                        >
                          <span className="text-[#9CA3AF] mt-1.5">&bull;</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {/* Context text */}
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 text-center"
          >
            <p className="text-subtitle text-[#4B5563] leading-relaxed max-w-[800px] mx-auto">
              Traditionally, operators hire consultants at
              &euro;250&ndash;400/hour or build internal compliance teams.
              Caelex automates the mapping, tracking, documentation, and
              monitoring across all workstreams — continuously.
            </p>
            <p className="text-body text-[#9CA3AF] mt-4">
              Source: EU Space Act (COM/2025/335), Titles II&ndash;IV
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FEATURE COMPARISON */}
      {/* ================================================================== */}
      <section className="relative py-24 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block text-small font-semibold text-[#111827] uppercase tracking-[0.2em] mb-4">
              Compare Plans
            </span>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[#111827]">
              Feature Comparison
            </h2>
          </motion.div>

          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left py-6 px-6 text-subtitle text-[#4B5563] font-medium">
                      Feature
                    </th>
                    <th className="text-center py-6 px-4 text-subtitle text-[#4B5563] font-medium w-[140px]">
                      Essentials
                    </th>
                    <th className="text-center py-6 px-4 text-subtitle text-[#111827] font-semibold bg-[#F1F3F5] w-[140px]">
                      Professional
                    </th>
                    <th className="text-center py-6 px-4 text-subtitle text-[#4B5563] font-medium w-[140px]">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {featureCategories.map((category) => (
                    <Fragment key={category.name}>
                      <tr className="border-b border-[#E5E7EB] bg-[#F1F3F5]">
                        <td
                          colSpan={4}
                          className="py-4 px-6 text-subtitle font-semibold text-[#111827]"
                        >
                          <div className="flex items-center gap-3">
                            <category.icon
                              size={18}
                              className="text-[#111827]"
                            />
                            {category.name}
                          </div>
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr
                          key={feature.name}
                          className="border-b border-[#F1F3F5]"
                        >
                          <td className="py-4 px-6 pl-12 text-subtitle text-[#4B5563]">
                            {feature.name}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {typeof feature.essentials === "boolean" ? (
                              feature.essentials ? (
                                <Check
                                  size={18}
                                  className="mx-auto text-emerald-500"
                                />
                              ) : (
                                <span className="text-[#9CA3AF]">&mdash;</span>
                              )
                            ) : (
                              <span className="text-body-lg text-[#4B5563]">
                                {feature.essentials}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center bg-[#F7F8FA]">
                            {typeof feature.professional === "boolean" ? (
                              feature.professional ? (
                                <Check
                                  size={18}
                                  className="mx-auto text-emerald-500"
                                />
                              ) : (
                                <span className="text-[#9CA3AF]">&mdash;</span>
                              )
                            ) : (
                              <span className="text-body-lg font-medium text-[#111827]">
                                {feature.professional}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {typeof feature.enterprise === "boolean" ? (
                              feature.enterprise ? (
                                <Check
                                  size={18}
                                  className="mx-auto text-emerald-500"
                                />
                              ) : (
                                <span className="text-[#9CA3AF]">&mdash;</span>
                              )
                            ) : (
                              <span className="text-body-lg text-[#4B5563]">
                                {feature.enterprise}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FAQ */}
      {/* ================================================================== */}
      <section className="relative py-24 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          <motion.div
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block text-small font-semibold text-[#111827] uppercase tracking-[0.2em] mb-4">
              FAQ
            </span>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[#111827] mb-5">
              Common Questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, i) => {
              const Icon = faq.icon;
              const isExpanded = expandedFaq === i;

              return (
                <motion.div
                  key={faq.question}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard className="overflow-hidden" hover={false}>
                    <button
                      onClick={() => setExpandedFaq(isExpanded ? null : i)}
                      className="w-full p-6 flex items-center gap-4 text-left"
                    >
                      <div className="hidden sm:flex w-12 h-12 rounded-xl items-center justify-center flex-shrink-0 bg-[#F1F3F5]">
                        <Icon size={20} className="text-[#111827]" />
                      </div>
                      <span className="flex-1 text-subtitle sm:text-heading font-medium text-[#111827]">
                        {faq.question}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={22} className="text-[#4B5563]" />
                      ) : (
                        <ChevronDown size={22} className="text-[#4B5563]" />
                      )}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pl-6 sm:pl-[88px]">
                            <p className="text-subtitle sm:text-title text-[#4B5563] leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CTA */}
      {/* ================================================================== */}
      <section className="relative py-24 px-6 md:px-12">
        <div className="relative z-10 max-w-[900px] mx-auto">
          <GlassCard className="p-8 sm:p-12 md:p-16" hover={false}>
            <motion.div
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-body font-semibold mb-8 bg-amber-50 border border-amber-200 text-amber-700">
                <Clock size={16} />
                Don&apos;t wait until 2029
              </div>

              <h2 className="text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.02em] text-[#111827] mb-5">
                Start your compliance journey today
              </h2>
              <p className="text-heading text-[#4B5563] mb-12 max-w-[550px] mx-auto leading-relaxed">
                The authorization process takes 6+ months. The earlier you start
                mapping requirements and preparing documentation, the smoother
                your path to compliance.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                <Link
                  href="/contact?plan=professional"
                  className="inline-flex items-center gap-2 px-10 py-5 rounded-full bg-[#111827] text-white text-title font-semibold transition-all duration-300 hover:bg-[#374151]"
                >
                  Start Free Trial
                  <ArrowRight size={20} />
                </Link>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-10 py-5 rounded-full bg-white border border-[#D1D5DB] text-[#4B5563] text-title font-semibold transition-all duration-300 hover:bg-[#F1F3F5]"
                >
                  Try Free Assessment
                </Link>
              </div>

              <div className="flex items-center justify-center gap-2 text-subtitle text-[#4B5563]">
                <Shield size={18} className="text-[#111827]" />
                30-day money-back guarantee &bull; No questions asked
              </div>
            </motion.div>
          </GlassCard>
        </div>
      </section>

      {/* ================================================================== */}
      {/* STATS FOOTER (Provable stats only) */}
      {/* ================================================================== */}
      <section className="relative py-20 px-6 md:px-12 border-t border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
            <div>
              <div className="text-display-lg font-light tracking-tight text-[#111827] mb-2">
                <AnimatedCounter target={119} />
              </div>
              <div className="text-subtitle text-[#4B5563]">
                Articles Mapped
              </div>
            </div>
            <div>
              <div className="text-display-lg font-light tracking-tight text-[#111827] mb-2">
                <AnimatedCounter target={10} />
              </div>
              <div className="text-subtitle text-[#4B5563]">Jurisdictions</div>
            </div>
            <div>
              <div className="text-display-lg font-light tracking-tight text-[#111827] mb-2">
                <AnimatedCounter target={47} />
              </div>
              <div className="text-subtitle text-[#4B5563]">
                Document Templates
              </div>
            </div>
            <div>
              <div className="text-display-lg font-light tracking-tight text-[#111827] mb-2">
                <AnimatedCounter target={8} />
              </div>
              <div className="text-subtitle text-[#4B5563]">
                Compliance Modules
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
