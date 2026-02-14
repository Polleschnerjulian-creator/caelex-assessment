"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
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
// GLASS CARD COMPONENT
// ============================================================================
function GlassCard({
  children,
  className = "",
  hover = true,
  highlighted = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`
        relative rounded-2xl overflow-hidden
        ${
          highlighted
            ? "bg-white/[0.06] backdrop-blur-xl border-2 border-emerald-500/30"
            : "bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]"
        }
        ${hover && !highlighted ? "transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]" : ""}
        ${highlighted ? "shadow-[0_20px_60px_rgba(16,185,129,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]" : "shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]"}
        ${className}
      `}
    >
      {children}
    </div>
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
      "Full Compliance Assessment",
      "1 Jurisdiction Coverage",
      "Basic Dashboard",
      "Up to 3 Spacecraft",
      "Document Templates",
      "Email Support",
      "Monthly Reports",
    ],
    notIncluded: [
      "Multi-jurisdiction",
      "API Access",
      "Custom Workflows",
      "Dedicated Support",
    ],
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
      "Replaces manual compliance work typically done at €250–400/h",
    features: [
      "Everything in Essentials",
      "All 10 Jurisdictions",
      "Unlimited Spacecraft",
      "Full Compliance Dashboard",
      "Document Vault (50GB)",
      "NCA Submission Workflow",
      "ASTRA AI Assistant",
      "Team Access (up to 25)",
      "API Access",
      "Priority Email Support",
      "Weekly Reports",
      "Audit Trail",
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
      "Everything in Professional",
      "Unlimited Everything",
      "Custom Integrations",
      "SSO / SAML / OIDC",
      "On-Premise Option",
      "Dedicated Account Manager",
      "Custom SLA (99.95%)",
      "Training & Onboarding",
      "Multi-Org Management",
      "White-Label Reports",
      "24/7 Phone Support",
      "Compliance Consulting",
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
      "Caelex automates compliance mapping, gap analysis, document preparation, and ongoing regulatory monitoring — work traditionally done by consultants at €250–400/hour. You still need: authorization fees to your NCA (~€100K per product line), specialized legal counsel for specific filings, technical compliance measures (hardware, systems), and insurance coverage. Caelex handles the preparation work, not the fees or technical implementation.",
    icon: Info,
  },
  {
    question: "What happens if we miss the 2030 deadline?",
    answer:
      "The EU Space Act enters full effect on January 1, 2030. Non-compliant operators risk authorization denial, operational restrictions, and penalties up to €10M or 2% of global turnover. Starting early gives you time to address gaps systematically.",
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

  // User-driven estimate inputs
  const [estimatedHours, setEstimatedHours] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  // Calculate user estimate (only when both inputs have values)
  const hours = parseInt(estimatedHours) || 0;
  const rate = parseInt(hourlyRate) || 0;
  const consultingEstimate = hours * rate;
  const caelexAnnual = 11988; // Professional yearly
  const hasEstimate = hours > 0 && rate > 0;
  const savings = consultingEstimate - caelexAnnual;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ================================================================== */}
      {/* FOUNDING MEMBER BANNER */}
      {/* ================================================================== */}
      {/* HERO SECTION */}
      {/* ================================================================== */}
      <section ref={heroRef} className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-medium tracking-[-0.03em] leading-[1.1] mb-8">
              Compliance automation
              <br />
              <span className="text-emerald-400">for space operators</span>
            </h1>
            <p className="text-[18px] md:text-[20px] text-white/60 max-w-[650px] mx-auto mb-12 leading-relaxed">
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
                className={`px-6 py-3 rounded-xl text-[15px] font-medium transition-all duration-300 ${
                  billingPeriod === "monthly"
                    ? "bg-white text-black shadow-lg"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-6 py-3 rounded-xl text-[15px] font-medium transition-all duration-300 flex items-center gap-2 ${
                  billingPeriod === "yearly"
                    ? "bg-white text-black shadow-lg"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Yearly
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                    billingPeriod === "yearly"
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-500/20 text-emerald-400"
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
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative"
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-emerald-500 px-4 py-2 rounded-full shadow-lg">
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
                            plan.highlighted
                              ? "bg-emerald-500/20"
                              : "bg-white/[0.06]"
                          }`}
                        >
                          <Icon
                            size={26}
                            className={
                              plan.highlighted
                                ? "text-emerald-400"
                                : "text-white/50"
                            }
                          />
                        </div>
                        <h3 className="text-[22px] font-medium text-white">
                          {plan.name}
                        </h3>
                      </div>

                      <p className="text-[15px] text-white/50 mb-6 leading-relaxed min-h-[48px]">
                        {plan.description}
                      </p>

                      {/* Value Statement (replaces fake savings) */}
                      <p className="text-[13px] text-emerald-400/80 mb-6 pb-6 border-b border-white/[0.06]">
                        {plan.valueStatement}
                      </p>

                      {/* Price */}
                      <div className="mb-8">
                        {plan.priceLabel ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-[16px] text-white/40">
                              {plan.priceLabel}
                            </span>
                            <span className="text-[48px] font-light tracking-[-0.02em] text-white">
                              €{price?.toLocaleString("de-DE")}
                            </span>
                            <span className="text-[16px] text-white/40">
                              /month
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-[48px] font-light tracking-[-0.02em] text-white">
                              €{price?.toLocaleString("de-DE")}
                            </span>
                            <span className="text-[16px] text-white/40">
                              /month
                            </span>
                          </div>
                        )}
                        {billingPeriod === "yearly" && price && (
                          <p className="text-[14px] text-white/40 mt-2">
                            €{(price * 12).toLocaleString("de-DE")} billed
                            annually
                          </p>
                        )}
                      </div>

                      {/* CTA */}
                      <Link
                        href={plan.ctaHref}
                        className={`w-full text-center py-4 rounded-xl text-[15px] font-semibold transition-all duration-300 mb-8 block ${
                          plan.highlighted
                            ? "bg-emerald-500 text-white hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.02]"
                            : "bg-white/[0.08] text-white hover:bg-white/[0.12] border border-white/[0.1]"
                        }`}
                      >
                        {plan.cta}
                      </Link>

                      {/* Features */}
                      <div className="pt-8 border-t border-white/[0.08] flex-1">
                        <ul className="space-y-4">
                          {plan.features.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-3 text-[15px]"
                            >
                              <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check size={12} className="text-emerald-400" />
                              </div>
                              <span className="text-white/70">{feature}</span>
                            </li>
                          ))}
                          {plan.notIncluded.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-3 text-[15px]"
                            >
                              <div className="w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0 mt-0.5">
                                <X size={12} className="text-white/30" />
                              </div>
                              <span className="text-white/30">{feature}</span>
                            </li>
                          ))}
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 flex flex-wrap items-center justify-center gap-8 text-[15px] text-white/50"
          >
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-emerald-400" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-emerald-400" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-emerald-400" />
              <span>SOC 2 certified</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-emerald-400" />
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block text-[12px] font-semibold text-emerald-400 uppercase tracking-[0.2em] mb-4">
              Compliance Scope
            </span>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.02em] text-white mb-5">
              What authorization under the EU Space Act requires
            </h2>
            <p className="text-[17px] text-white/50 leading-relaxed max-w-[700px] mx-auto">
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard className="p-6 h-full" hover={false}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Icon size={20} className="text-emerald-400" />
                      </div>
                      <h3 className="text-[15px] font-medium text-white">
                        {workstream.title}
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {workstream.items.map((item) => (
                        <li
                          key={item}
                          className="text-[14px] text-white/50 flex items-start gap-2"
                        >
                          <span className="text-emerald-400/60 mt-1.5">•</span>
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-10 text-center"
          >
            <p className="text-[15px] text-white/40 leading-relaxed max-w-[800px] mx-auto">
              Traditionally, operators hire consultants at €250–400/hour or
              build internal compliance teams. Caelex automates the mapping,
              tracking, documentation, and monitoring across all workstreams —
              continuously.
            </p>
            <p className="text-[13px] text-white/30 mt-4">
              Source: EU Space Act (COM/2025/335), Titles II–IV
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* YOUR ESTIMATE (User-Driven Comparison) */}
      {/* ================================================================== */}
      <section className="relative py-24 px-6 md:px-12">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16, 185, 129, 0.06) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block text-[12px] font-semibold text-emerald-400 uppercase tracking-[0.2em] mb-4">
              Your Estimate
            </span>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.02em] text-white mb-5">
              Already budgeting for compliance?
            </h2>
            <p className="text-[17px] text-white/50 leading-relaxed">
              Enter your own estimates to see how Caelex compares.
            </p>
          </motion.div>

          <GlassCard className="p-10" hover={false}>
            <div className="grid md:grid-cols-2 gap-12">
              {/* Input Fields */}
              <div className="space-y-8">
                <div>
                  <label className="block text-[15px] text-white/70 mb-3">
                    Estimated consulting/legal hours for authorization
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 300"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-[16px] placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <p className="text-[13px] text-white/40 mt-2">
                    The authorization process spans 6+ months across multiple
                    workstreams
                  </p>
                </div>

                <div>
                  <label className="block text-[15px] text-white/70 mb-3">
                    Average hourly rate of your regulatory counsel (€)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 300"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-[16px] placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <p className="text-[13px] text-white/40 mt-2">
                    Specialized space law: typically €250–400/h
                  </p>
                </div>
              </div>

              {/* Results - Only show when both inputs have values */}
              <div className="space-y-6">
                {hasEstimate ? (
                  <>
                    {/* Consulting Estimate */}
                    <div className="py-4 border-b border-white/[0.08]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[15px] text-white/60">
                          Consulting estimate
                        </span>
                        <span className="text-[20px] text-white/70">
                          €{consultingEstimate.toLocaleString("de-DE")}
                        </span>
                      </div>
                      <p className="text-[13px] text-white/40">
                        Based on your inputs — one-time engagement
                      </p>
                      <p className="text-[13px] text-white/40 mt-1">
                        + Ongoing monitoring after initial authorization
                      </p>
                      <p className="text-[13px] text-white/40">
                        + Re-engagement when regulations change
                      </p>
                    </div>

                    {/* Caelex */}
                    <div className="py-4 border-b border-white/[0.08]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[15px] text-white/60">
                          Caelex Professional
                        </span>
                        <span className="text-[20px] font-medium text-emerald-400">
                          €{caelexAnnual.toLocaleString("de-DE")}/year
                        </span>
                      </div>
                      <p className="text-[13px] text-white/40">
                        Continuous — includes regulatory updates
                      </p>
                      <div className="mt-3 space-y-1">
                        <p className="text-[13px] text-emerald-400/80 flex items-center gap-2">
                          <Check size={14} /> Compliance mapping automated
                        </p>
                        <p className="text-[13px] text-emerald-400/80 flex items-center gap-2">
                          <Check size={14} /> Document templates pre-built
                        </p>
                        <p className="text-[13px] text-emerald-400/80 flex items-center gap-2">
                          <Check size={14} /> Regulatory changes tracked
                          automatically
                        </p>
                      </div>
                    </div>

                    {/* Savings/Comparison Line */}
                    <div className="rounded-xl p-5 bg-emerald-500/10 border border-emerald-500/20">
                      {savings > 0 ? (
                        <p className="text-[15px] text-emerald-400 leading-relaxed">
                          Caelex costs{" "}
                          <strong>
                            €{savings.toLocaleString("de-DE")} less
                          </strong>{" "}
                          than your consulting estimate — and it&apos;s
                          continuous, not one-time.
                        </p>
                      ) : (
                        <p className="text-[15px] text-white/60 leading-relaxed">
                          Caelex provides continuous automated compliance at a
                          comparable cost to your consulting estimate — with
                          ongoing monitoring included.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[15px] text-white/30 text-center">
                      Enter your estimates to see the comparison
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Fine Print */}
            <p className="text-[13px] text-white/30 mt-8 pt-6 border-t border-white/[0.06] leading-relaxed">
              This is a simple estimate based on your inputs. Caelex complements
              but does not fully replace legal counsel — you may still need
              specialized advice for NCA filings and specific regulatory
              questions. Authorization fees to national competent authorities
              are separate and not included in this comparison.
            </p>
          </GlassCard>

          {/* Credibility Anchor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <p className="text-[13px] text-white/30 leading-relaxed max-w-[800px] mx-auto">
              The EU Commission estimates total annual compliance costs from the
              Space Act at €322.8M across the industry, with authorization
              requirements costing ~€100,000 per product line in fees alone —
              before consulting and preparation costs.
            </p>
            <p className="text-[12px] text-white/20 mt-2">
              Source: EU Commission Impact Assessment, COM/2025/335
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block text-[12px] font-semibold text-emerald-400 uppercase tracking-[0.2em] mb-4">
              Compare Plans
            </span>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.02em] text-white">
              Feature Comparison
            </h2>
          </motion.div>

          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-6 px-6 text-[15px] text-white/50 font-medium">
                      Feature
                    </th>
                    <th className="text-center py-6 px-4 text-[15px] text-white/60 font-medium w-[140px]">
                      Essentials
                    </th>
                    <th className="text-center py-6 px-4 text-[15px] text-emerald-400 font-semibold bg-emerald-500/[0.05] w-[140px]">
                      Professional
                    </th>
                    <th className="text-center py-6 px-4 text-[15px] text-white/60 font-medium w-[140px]">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {featureCategories.map((category) => (
                    <>
                      <tr
                        key={category.name}
                        className="border-b border-white/[0.08] bg-white/[0.02]"
                      >
                        <td
                          colSpan={4}
                          className="py-4 px-6 text-[15px] font-semibold text-white"
                        >
                          <div className="flex items-center gap-3">
                            <category.icon
                              size={18}
                              className="text-emerald-400"
                            />
                            {category.name}
                          </div>
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr
                          key={feature.name}
                          className="border-b border-white/[0.04]"
                        >
                          <td className="py-4 px-6 pl-12 text-[15px] text-white/60">
                            {feature.name}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {typeof feature.essentials === "boolean" ? (
                              feature.essentials ? (
                                <Check
                                  size={18}
                                  className="mx-auto text-emerald-400"
                                />
                              ) : (
                                <span className="text-white/20">—</span>
                              )
                            ) : (
                              <span className="text-[14px] text-white/50">
                                {feature.essentials}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center bg-emerald-500/[0.03]">
                            {typeof feature.professional === "boolean" ? (
                              feature.professional ? (
                                <Check
                                  size={18}
                                  className="mx-auto text-emerald-400"
                                />
                              ) : (
                                <span className="text-white/20">—</span>
                              )
                            ) : (
                              <span className="text-[14px] font-medium text-emerald-400">
                                {feature.professional}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {typeof feature.enterprise === "boolean" ? (
                              feature.enterprise ? (
                                <Check
                                  size={18}
                                  className="mx-auto text-emerald-400"
                                />
                              ) : (
                                <span className="text-white/20">—</span>
                              )
                            ) : (
                              <span className="text-[14px] text-white/50">
                                {feature.enterprise}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <span className="inline-block text-[12px] font-semibold text-emerald-400 uppercase tracking-[0.2em] mb-4">
              FAQ
            </span>
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.02em] text-white mb-5">
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
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard className="overflow-hidden" hover={false}>
                    <button
                      onClick={() => setExpandedFaq(isExpanded ? null : i)}
                      className="w-full p-6 flex items-center gap-4 text-left"
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-500/10">
                        <Icon size={20} className="text-emerald-400" />
                      </div>
                      <span className="flex-1 text-[17px] font-medium text-white">
                        {faq.question}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={22} className="text-white/40" />
                      ) : (
                        <ChevronDown size={22} className="text-white/40" />
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
                          <div className="px-6 pb-6 pl-[88px]">
                            <p className="text-[16px] text-white/60 leading-relaxed">
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
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(16, 185, 129, 0.08) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-[900px] mx-auto">
          <GlassCard className="p-12 md:p-16" hover={false}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold mb-8 bg-amber-500/15 border border-amber-500/25 text-amber-400">
                <Clock size={16} />
                Don&apos;t wait until 2029
              </div>

              <h2 className="text-[clamp(2rem,4vw,3rem)] font-medium tracking-[-0.02em] text-white mb-5">
                Start your compliance journey today
              </h2>
              <p className="text-[18px] text-white/50 mb-12 max-w-[550px] mx-auto leading-relaxed">
                The authorization process takes 6+ months. The earlier you start
                mapping requirements and preparing documentation, the smoother
                your path to compliance.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                <Link
                  href="/contact?plan=professional"
                  className="inline-flex items-center gap-2 px-10 py-5 rounded-full bg-emerald-500 text-white text-[16px] font-semibold transition-all duration-300 hover:bg-emerald-400 hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:scale-[1.02]"
                >
                  Start Free Trial
                  <ArrowRight size={20} />
                </Link>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-10 py-5 rounded-full bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] text-white text-[16px] font-semibold transition-all duration-300 hover:bg-white/[0.1]"
                >
                  Try Free Assessment
                </Link>
              </div>

              <div className="flex items-center justify-center gap-2 text-[15px] text-white/50">
                <Shield size={18} className="text-emerald-400" />
                30-day money-back guarantee • No questions asked
              </div>
            </motion.div>
          </GlassCard>
        </div>
      </section>

      {/* ================================================================== */}
      {/* STATS FOOTER (Provable stats only) */}
      {/* ================================================================== */}
      <section className="relative py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
            <div>
              <div className="text-[42px] font-light tracking-tight text-emerald-400 mb-2">
                <AnimatedCounter target={119} />
              </div>
              <div className="text-[15px] text-white/50">Articles Mapped</div>
            </div>
            <div>
              <div className="text-[42px] font-light tracking-tight text-emerald-400 mb-2">
                <AnimatedCounter target={10} />
              </div>
              <div className="text-[15px] text-white/50">Jurisdictions</div>
            </div>
            <div>
              <div className="text-[42px] font-light tracking-tight text-emerald-400 mb-2">
                <AnimatedCounter target={47} />
              </div>
              <div className="text-[15px] text-white/50">
                Document Templates
              </div>
            </div>
            <div>
              <div className="text-[42px] font-light tracking-tight text-emerald-400 mb-2">
                <AnimatedCounter target={8} />
              </div>
              <div className="text-[15px] text-white/50">
                Compliance Modules
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
