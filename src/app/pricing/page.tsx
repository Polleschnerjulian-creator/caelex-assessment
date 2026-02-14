"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Calculator,
  TrendingUp,
  Award,
  Crown,
  Lock,
  Globe,
  FileCheck,
  Scale,
  Satellite,
  Database,
  Headphones,
  BookOpen,
  RefreshCw,
  Target,
} from "lucide-react";

// Aston Martin Vantage Green
const VANTAGE_GREEN = {
  primary: "#00665E",
  hover: "#005850",
  light: "#00796B",
  glow: "rgba(0, 102, 94, 0.4)",
  subtle: "rgba(0, 102, 94, 0.15)",
};

// ============================================================================
// COUNTDOWN HOOK - 2030 Deadline
// ============================================================================
function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

// ============================================================================
// ANIMATED COUNTER
// ============================================================================
function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
  duration = 2000,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
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
  green = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  highlighted?: boolean;
  green?: boolean;
}) {
  return (
    <div
      className={`
        relative rounded-2xl overflow-hidden
        ${
          highlighted
            ? `bg-white/[0.06] backdrop-blur-xl border-2`
            : green
              ? "bg-white/[0.04] backdrop-blur-xl border border-white/[0.08]"
              : "bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]"
        }
        ${hover && !highlighted ? "transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]" : ""}
        ${highlighted ? `shadow-[0_20px_60px_${VANTAGE_GREEN.glow},inset_0_1px_0_rgba(255,255,255,0.1)]` : "shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]"}
        ${className}
      `}
      style={
        highlighted
          ? { borderColor: `${VANTAGE_GREEN.primary}50` }
          : green
            ? { borderColor: `${VANTAGE_GREEN.primary}30` }
            : {}
      }
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
    yearlyPrice: 374, // ~17% off
    foundingPrice: 314, // 30% off monthly
    highlighted: false,
    cta: "Start Free Trial",
    ctaHref: "/contact?plan=essentials",
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
    yearlyPrice: 999, // ~17% off
    foundingPrice: 839, // 30% off monthly
    highlighted: true,
    cta: "Start Free Trial",
    ctaHref: "/contact?plan=professional",
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
    yearlyPrice: 2083, // ~17% off
    foundingPrice: null, // Custom
    priceLabel: "from",
    highlighted: false,
    cta: "Contact Sales",
    ctaHref: "/contact?plan=enterprise",
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
// FEATURE COMPARISON DATA (7 Categories, 49 Features)
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
        name: "Compliance Score",
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
        name: "Real-time Status Updates",
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
      {
        name: "Custom Dashboards",
        essentials: false,
        professional: false,
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
        name: "Spectrum Management",
        essentials: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "End-of-Life Planning",
        essentials: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Re-entry Analysis",
        essentials: false,
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
    name: "Document Management",
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
        essentials: "10 Templates",
        professional: "50+ Templates",
        enterprise: "Custom",
      },
      {
        name: "Version Control",
        essentials: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Expiry Alerts",
        essentials: true,
        professional: true,
        enterprise: true,
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
        name: "E-Signature Integration",
        essentials: false,
        professional: false,
        enterprise: true,
      },
    ],
  },
  {
    name: "AI & Automation",
    icon: Sparkles,
    features: [
      {
        name: "ASTRA AI Assistant",
        essentials: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "AI Queries/Month",
        essentials: false,
        professional: "100",
        enterprise: "Unlimited",
      },
      {
        name: "Automated Reports",
        essentials: "Monthly",
        professional: "Weekly",
        enterprise: "Daily + Custom",
      },
      {
        name: "Regulatory Updates",
        essentials: "Newsletter",
        professional: "In-App",
        enterprise: "Push + Briefing",
      },
      {
        name: "Smart Notifications",
        essentials: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "Workflow Automation",
        essentials: false,
        professional: "Basic",
        enterprise: "Advanced",
      },
      {
        name: "Predictive Compliance",
        essentials: false,
        professional: false,
        enterprise: true,
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
        name: "Role-Based Access (RBAC)",
        essentials: "Basic",
        professional: "Full",
        enterprise: "Custom",
      },
      {
        name: "SSO / SAML / OIDC",
        essentials: false,
        professional: false,
        enterprise: true,
      },
      {
        name: "Multi-Factor Auth (MFA)",
        essentials: true,
        professional: true,
        enterprise: true,
      },
      {
        name: "IP Allowlisting",
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
        name: "SOC 2 Compliance",
        essentials: true,
        professional: true,
        enterprise: true,
      },
    ],
  },
  {
    name: "Support & Services",
    icon: Headphones,
    features: [
      {
        name: "Support Channel",
        essentials: "Email",
        professional: "Priority Email",
        enterprise: "24/7 Phone + Slack",
      },
      {
        name: "Response Time SLA",
        essentials: "48h",
        professional: "24h",
        enterprise: "4h",
      },
      {
        name: "Dedicated Account Manager",
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
        enterprise: "Monthly + Custom",
      },
      {
        name: "API Access",
        essentials: false,
        professional: true,
        enterprise: true,
      },
      {
        name: "Custom Integrations",
        essentials: false,
        professional: false,
        enterprise: true,
      },
    ],
  },
];

// ============================================================================
// FAQ DATA (Objection Handling)
// ============================================================================
const faqs = [
  {
    question: "Why is CAELEX cheaper than hiring a regulatory consultant?",
    answer:
      "Traditional space regulatory consultants charge €150-300/hour. A typical EU Space Act compliance project takes 400-600 hours, costing €60,000-180,000. CAELEX automates 80% of that work while maintaining accuracy. You get continuous compliance monitoring, not just a one-time audit.",
    icon: Calculator,
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
    question: "Is CAELEX recognized by National Competent Authorities?",
    answer:
      "CAELEX generates NCA-ready submission packages that follow the exact format required by each authority. Our templates are reviewed by former regulatory officials. Many operators use our reports as the basis for their authorization applications.",
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
      "We use AES-256 encryption at rest and in transit, SOC 2 Type II certified infrastructure, and host on EU servers (GDPR compliant). Enterprise customers can opt for on-premise deployment or dedicated instances.",
    icon: Shield,
  },
  {
    question: "Do you offer a free trial?",
    answer:
      "Yes, all paid plans include a 14-day free trial with full access. No credit card required to start. You can also use our free Compliance Assessment to get your initial compliance score before committing.",
    icon: Sparkles,
  },
  {
    question: "What's included in the Founding Member Program?",
    answer:
      "The first 10 customers on each plan lock in 30% off for life. You also get priority access to new features, direct input into our product roadmap, and recognition as a launch partner on our website (optional).",
    icon: Crown,
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [showFoundingBanner, setShowFoundingBanner] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [spacecraftCount, setSpacecraftCount] = useState(5);
  const [jurisdictionCount, setJurisdictionCount] = useState(3);

  // EU Space Act deadline: Jan 1, 2030
  const deadline = new Date("2030-01-01T00:00:00");
  const timeLeft = useCountdown(deadline);

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  // Calculate savings
  const consultantCost = spacecraftCount * jurisdictionCount * 25000; // €25k per spacecraft per jurisdiction
  const caelexCost = billingPeriod === "yearly" ? 999 * 12 : 1199 * 12;
  const savings = consultantCost - caelexCost;
  const savingsPercent = Math.round((savings / consultantCost) * 100);

  // Founding member spots (mock - in real app this would be from API)
  const foundingSpotsLeft = 4;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ================================================================== */}
      {/* FOUNDING MEMBER BANNER */}
      {/* ================================================================== */}
      <AnimatePresence>
        {showFoundingBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative overflow-hidden"
            style={{
              background: `linear-gradient(90deg, ${VANTAGE_GREEN.primary} 0%, ${VANTAGE_GREEN.light} 100%)`,
            }}
          >
            <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Crown size={18} className="text-white/90" />
                <span className="text-[13px] font-medium text-white">
                  <span className="hidden sm:inline">
                    Founding Member Program:{" "}
                  </span>
                  <span className="font-bold">30% off for life</span>
                  <span className="mx-2">•</span>
                  <span className="text-white/80">
                    Only {foundingSpotsLeft} spots left
                  </span>
                </span>
              </div>
              <button
                onClick={() => setShowFoundingBanner(false)}
                className="text-white/60 hover:text-white transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================== */}
      {/* HERO SECTION WITH COUNTDOWN */}
      {/* ================================================================== */}
      <section ref={heroRef} className="relative pt-28 pb-16 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 80% 50% at 50% 20%, ${VANTAGE_GREEN.subtle} 0%, transparent 60%)`,
            }}
          />
        </div>

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12 text-center">
          {/* Countdown to 2030 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <GlassCard
              className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-6 px-6 py-4"
              hover={false}
              green
            >
              <div className="flex items-center gap-2 text-[13px] font-medium text-white/60">
                <Clock size={16} className="text-[#00796B]" />
                <span>EU Space Act Deadline</span>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                {[
                  { value: timeLeft.days, label: "Days" },
                  { value: timeLeft.hours, label: "Hrs" },
                  { value: timeLeft.minutes, label: "Min" },
                  { value: timeLeft.seconds, label: "Sec" },
                ].map((item, i) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="text-center">
                      <div
                        className="text-[24px] sm:text-[28px] font-light tracking-tight"
                        style={{ color: VANTAGE_GREEN.light }}
                      >
                        {String(item.value).padStart(2, "0")}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-white/40">
                        {item.label}
                      </div>
                    </div>
                    {i < 3 && (
                      <span className="text-white/20 text-[20px]">:</span>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Price Anchor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 text-[13px] text-white/40 mb-2">
              <span className="line-through">
                €100,000+ regulatory consultants
              </span>
              <span className="text-white/20">→</span>
              <span className="text-[#00796B] font-medium">From €314/mo</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-medium tracking-[-0.03em] leading-[1.1] mb-6">
              Compliance that
              <br />
              <span style={{ color: VANTAGE_GREEN.light }}>
                pays for itself
              </span>
            </h1>
            <p className="text-[17px] md:text-[18px] text-white/50 max-w-[550px] mx-auto mb-10">
              Join 50+ operators who switched from six-figure consulting fees to
              automated compliance. Average ROI: 12x in year one.
            </p>

            {/* Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              <GlassCard
                className="inline-flex items-center gap-2 p-1.5"
                hover={false}
              >
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`px-6 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                    billingPeriod === "monthly"
                      ? "bg-white text-black shadow-lg"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={`px-6 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 flex items-center gap-2 ${
                    billingPeriod === "yearly"
                      ? "bg-white text-black shadow-lg"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Yearly
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      billingPeriod === "yearly" ? "text-white" : "text-white"
                    }`}
                    style={{
                      background:
                        billingPeriod === "yearly"
                          ? VANTAGE_GREEN.primary
                          : VANTAGE_GREEN.subtle,
                    }}
                  >
                    2 Months Free
                  </span>
                </button>
              </GlassCard>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* PRICING CARDS */}
      {/* ================================================================== */}
      <section className="relative py-12 px-6 md:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const price =
                billingPeriod === "yearly"
                  ? plan.yearlyPrice
                  : plan.monthlyPrice;
              const foundingPrice = plan.foundingPrice;

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
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white px-4 py-1.5 rounded-full shadow-lg"
                        style={{ background: VANTAGE_GREEN.primary }}
                      >
                        <Sparkles size={12} />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <GlassCard
                    className="h-full flex flex-col"
                    hover={!plan.highlighted}
                    highlighted={plan.highlighted}
                  >
                    <div className="p-6 md:p-8 flex-1 flex flex-col">
                      {/* Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{
                            background: plan.highlighted
                              ? `linear-gradient(135deg, ${VANTAGE_GREEN.primary}40, ${VANTAGE_GREEN.light}40)`
                              : "rgba(255,255,255,0.05)",
                          }}
                        >
                          <Icon
                            size={24}
                            style={{
                              color: plan.highlighted
                                ? VANTAGE_GREEN.light
                                : "rgba(255,255,255,0.5)",
                            }}
                          />
                        </div>
                        <div>
                          <h3 className="text-[20px] font-medium text-white">
                            {plan.name}
                          </h3>
                        </div>
                      </div>

                      <p className="text-[14px] text-white/50 mb-6 min-h-[40px]">
                        {plan.description}
                      </p>

                      {/* Price */}
                      <div className="mb-6">
                        {plan.priceLabel ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-[14px] text-white/40">
                              {plan.priceLabel}
                            </span>
                            <span className="text-[42px] font-light tracking-[-0.02em] text-white">
                              €{price?.toLocaleString("de-DE")}
                            </span>
                            <span className="text-[15px] text-white/40">
                              /month
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[42px] font-light tracking-[-0.02em] text-white">
                                €{price?.toLocaleString("de-DE")}
                              </span>
                              <span className="text-[15px] text-white/40">
                                /month
                              </span>
                            </div>
                            {foundingPrice && foundingSpotsLeft > 0 && (
                              <div
                                className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px]"
                                style={{ background: VANTAGE_GREEN.subtle }}
                              >
                                <Crown
                                  size={12}
                                  style={{ color: VANTAGE_GREEN.light }}
                                />
                                <span className="text-white/70">
                                  Founding:{" "}
                                  <span className="font-medium text-white">
                                    €{foundingPrice}/mo
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {billingPeriod === "yearly" && price && (
                          <p className="text-[13px] text-white/40 mt-1">
                            €{(price * 12).toLocaleString("de-DE")} billed
                            annually
                          </p>
                        )}
                      </div>

                      {/* CTA */}
                      <Link
                        href={plan.ctaHref}
                        className={`w-full text-center py-3.5 rounded-xl text-[14px] font-medium transition-all duration-300 mb-6 block ${
                          plan.highlighted
                            ? "text-white hover:scale-[1.02]"
                            : "bg-white/[0.08] text-white hover:bg-white/[0.12] border border-white/[0.08]"
                        }`}
                        style={
                          plan.highlighted
                            ? {
                                background: `linear-gradient(135deg, ${VANTAGE_GREEN.primary} 0%, ${VANTAGE_GREEN.light} 100%)`,
                                boxShadow: `0 0 30px ${VANTAGE_GREEN.glow}`,
                              }
                            : {}
                        }
                      >
                        {plan.cta}
                      </Link>

                      {/* Features */}
                      <div className="pt-6 border-t border-white/[0.08] flex-1">
                        <ul className="space-y-3">
                          {plan.features.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-3 text-[13px]"
                            >
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{ background: VANTAGE_GREEN.subtle }}
                              >
                                <Check
                                  size={12}
                                  style={{ color: VANTAGE_GREEN.light }}
                                />
                              </div>
                              <span className="text-white/70">{feature}</span>
                            </li>
                          ))}
                          {plan.notIncluded.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-3 text-[13px]"
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
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-[13px] text-white/40"
          >
            <div className="flex items-center gap-2">
              <Shield size={16} style={{ color: VANTAGE_GREEN.light }} />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw size={16} style={{ color: VANTAGE_GREEN.light }} />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock size={16} style={{ color: VANTAGE_GREEN.light }} />
              <span>SOC 2 certified</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={16} style={{ color: VANTAGE_GREEN.light }} />
              <span>GDPR compliant</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* ROI CALCULATOR */}
      {/* ================================================================== */}
      <section className="relative py-24 px-6 md:px-12">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 50%, ${VANTAGE_GREEN.subtle} 0%, transparent 60%)`,
          }}
        />

        <div className="relative z-10 max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span
              className="inline-block text-[11px] font-medium uppercase tracking-[0.2em] mb-4"
              style={{ color: `${VANTAGE_GREEN.light}99` }}
            >
              ROI Calculator
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
              Calculate Your Savings
            </h2>
            <p className="text-[15px] text-white/40">
              See how much you save compared to traditional regulatory
              consultants.
            </p>
          </motion.div>

          <GlassCard className="p-8 md:p-10" hover={false} green>
            <div className="grid md:grid-cols-2 gap-10">
              {/* Sliders */}
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[14px] text-white/70">
                      Number of Spacecraft
                    </label>
                    <span
                      className="text-[18px] font-medium"
                      style={{ color: VANTAGE_GREEN.light }}
                    >
                      {spacecraftCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={spacecraftCount}
                    onChange={(e) =>
                      setSpacecraftCount(parseInt(e.target.value))
                    }
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${VANTAGE_GREEN.primary} 0%, ${VANTAGE_GREEN.primary} ${(spacecraftCount / 50) * 100}%, rgba(255,255,255,0.1) ${(spacecraftCount / 50) * 100}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-1 text-[11px] text-white/30">
                    <span>1</span>
                    <span>50+</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[14px] text-white/70">
                      Jurisdictions Required
                    </label>
                    <span
                      className="text-[18px] font-medium"
                      style={{ color: VANTAGE_GREEN.light }}
                    >
                      {jurisdictionCount}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={jurisdictionCount}
                    onChange={(e) =>
                      setJurisdictionCount(parseInt(e.target.value))
                    }
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${VANTAGE_GREEN.primary} 0%, ${VANTAGE_GREEN.primary} ${(jurisdictionCount / 10) * 100}%, rgba(255,255,255,0.1) ${(jurisdictionCount / 10) * 100}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-1 text-[11px] text-white/30">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-6">
                <div className="flex justify-between items-center py-3 border-b border-white/[0.08]">
                  <span className="text-[14px] text-white/50">
                    Traditional Consultant Cost
                  </span>
                  <span className="text-[18px] text-white/70 line-through">
                    €{consultantCost.toLocaleString("de-DE")}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/[0.08]">
                  <span className="text-[14px] text-white/50">
                    CAELEX Professional (Annual)
                  </span>
                  <span
                    className="text-[18px] font-medium"
                    style={{ color: VANTAGE_GREEN.light }}
                  >
                    €{caelexCost.toLocaleString("de-DE")}
                  </span>
                </div>
                <div
                  className="rounded-xl p-5"
                  style={{ background: VANTAGE_GREEN.subtle }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[14px] text-white/70">
                      Your Annual Savings
                    </span>
                    <div className="text-right">
                      <span
                        className="text-[28px] font-medium"
                        style={{ color: VANTAGE_GREEN.light }}
                      >
                        €<AnimatedCounter target={savings} />
                      </span>
                      <span
                        className="block text-[13px]"
                        style={{ color: VANTAGE_GREEN.light }}
                      >
                        ({savingsPercent}% savings)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FEATURE COMPARISON TABLE */}
      {/* ================================================================== */}
      <section className="relative py-24 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span
              className="inline-block text-[11px] font-medium uppercase tracking-[0.2em] mb-4"
              style={{ color: `${VANTAGE_GREEN.light}99` }}
            >
              Compare Plans
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white">
              Complete Feature Comparison
            </h2>
          </motion.div>

          <GlassCard className="overflow-hidden" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-5 px-6 text-[13px] text-white/40 font-medium">
                      Feature
                    </th>
                    <th className="text-center py-5 px-4 text-[13px] text-white/60 font-medium w-[130px]">
                      Essentials
                    </th>
                    <th
                      className="text-center py-5 px-4 text-[13px] font-medium w-[130px]"
                      style={{
                        color: VANTAGE_GREEN.light,
                        background: `${VANTAGE_GREEN.primary}10`,
                      }}
                    >
                      Professional
                    </th>
                    <th className="text-center py-5 px-4 text-[13px] text-white/60 font-medium w-[130px]">
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
                          className="py-4 px-6 text-[13px] font-medium text-white"
                        >
                          <div className="flex items-center gap-2">
                            <category.icon
                              size={16}
                              style={{ color: VANTAGE_GREEN.light }}
                            />
                            {category.name}
                          </div>
                        </td>
                      </tr>
                      {category.features.map((feature, i) => (
                        <motion.tr
                          key={feature.name}
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.02 }}
                          className="border-b border-white/[0.04] last:border-0"
                        >
                          <td className="py-3.5 px-6 pl-10 text-[13px] text-white/60">
                            {feature.name}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {typeof feature.essentials === "boolean" ? (
                              feature.essentials ? (
                                <Check
                                  size={16}
                                  className="mx-auto"
                                  style={{ color: VANTAGE_GREEN.light }}
                                />
                              ) : (
                                <span className="text-white/20">—</span>
                              )
                            ) : (
                              <span className="text-[12px] text-white/50">
                                {feature.essentials}
                              </span>
                            )}
                          </td>
                          <td
                            className="py-3.5 px-4 text-center"
                            style={{ background: `${VANTAGE_GREEN.primary}08` }}
                          >
                            {typeof feature.professional === "boolean" ? (
                              feature.professional ? (
                                <Check
                                  size={16}
                                  className="mx-auto"
                                  style={{ color: VANTAGE_GREEN.light }}
                                />
                              ) : (
                                <span className="text-white/20">—</span>
                              )
                            ) : (
                              <span
                                className="text-[12px] font-medium"
                                style={{ color: VANTAGE_GREEN.light }}
                              >
                                {feature.professional}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {typeof feature.enterprise === "boolean" ? (
                              feature.enterprise ? (
                                <Check
                                  size={16}
                                  className="mx-auto"
                                  style={{ color: VANTAGE_GREEN.light }}
                                />
                              ) : (
                                <span className="text-white/20">—</span>
                              )
                            ) : (
                              <span className="text-[12px] text-white/50">
                                {feature.enterprise}
                              </span>
                            )}
                          </td>
                        </motion.tr>
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
      {/* FAQ SECTION */}
      {/* ================================================================== */}
      <section className="relative py-24 px-6 md:px-12">
        <div className="max-w-[800px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span
              className="inline-block text-[11px] font-medium uppercase tracking-[0.2em] mb-4"
              style={{ color: `${VANTAGE_GREEN.light}99` }}
            >
              FAQ
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
              Common Questions
            </h2>
          </motion.div>

          <div className="space-y-3">
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
                      className="w-full p-5 flex items-center gap-4 text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: VANTAGE_GREEN.subtle }}
                      >
                        <Icon
                          size={18}
                          style={{ color: VANTAGE_GREEN.light }}
                        />
                      </div>
                      <span className="flex-1 text-[15px] font-medium text-white">
                        {faq.question}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-white/40" />
                      ) : (
                        <ChevronDown size={20} className="text-white/40" />
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
                          <div className="px-5 pb-5 pl-[76px]">
                            <p className="text-[14px] text-white/50 leading-relaxed">
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
      {/* URGENCY CTA SECTION */}
      {/* ================================================================== */}
      <section className="relative py-24 px-6 md:px-12">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% 100%, ${VANTAGE_GREEN.subtle} 0%, transparent 60%)`,
          }}
        />

        <div className="relative z-10 max-w-[900px] mx-auto">
          <GlassCard className="p-10 md:p-14" hover={false} green>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              {/* Urgency Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium mb-6"
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                }}
              >
                <AlertTriangle size={14} />
                <span>
                  Only {foundingSpotsLeft} Founding Member spots remaining
                </span>
              </div>

              <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
                Lock in 30% off — forever
              </h2>
              <p className="text-[16px] text-white/50 mb-10 max-w-[500px] mx-auto">
                Founding Members get lifetime pricing, priority support, and
                direct influence on our product roadmap.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <Link
                  href="/contact?plan=professional&founding=true"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-white text-[15px] font-medium transition-all duration-300 hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${VANTAGE_GREEN.primary} 0%, ${VANTAGE_GREEN.light} 100%)`,
                    boxShadow: `0 0 40px ${VANTAGE_GREEN.glow}`,
                  }}
                >
                  Claim Founding Member Spot
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-white text-[15px] font-medium transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.2]"
                >
                  Try Free Assessment First
                </Link>
              </div>

              {/* Money-back Guarantee */}
              <div className="flex items-center justify-center gap-2 text-[13px] text-white/40">
                <Shield size={16} style={{ color: VANTAGE_GREEN.light }} />
                <span>30-day money-back guarantee • No questions asked</span>
              </div>
            </motion.div>
          </GlassCard>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SOCIAL PROOF FOOTER */}
      {/* ================================================================== */}
      <section className="relative py-16 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div
                className="text-[36px] font-light tracking-tight mb-1"
                style={{ color: VANTAGE_GREEN.light }}
              >
                <AnimatedCounter target={50} suffix="+" />
              </div>
              <div className="text-[13px] text-white/40">Active Operators</div>
            </div>
            <div>
              <div
                className="text-[36px] font-light tracking-tight mb-1"
                style={{ color: VANTAGE_GREEN.light }}
              >
                <AnimatedCounter target={10} />
              </div>
              <div className="text-[13px] text-white/40">Jurisdictions</div>
            </div>
            <div>
              <div
                className="text-[36px] font-light tracking-tight mb-1"
                style={{ color: VANTAGE_GREEN.light }}
              >
                <AnimatedCounter target={119} />
              </div>
              <div className="text-[13px] text-white/40">Articles Covered</div>
            </div>
            <div>
              <div
                className="text-[36px] font-light tracking-tight mb-1"
                style={{ color: VANTAGE_GREEN.light }}
              >
                <AnimatedCounter target={12} suffix="x" />
              </div>
              <div className="text-[13px] text-white/40">Average ROI</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
