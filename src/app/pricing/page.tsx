"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import {
  Check,
  HelpCircle,
  Zap,
  Building2,
  Rocket,
  ArrowRight,
  Sparkles,
  Shield,
  Users,
  X,
} from "lucide-react";

const plans = [
  {
    name: "Starter",
    description: "For small teams taking their first compliance steps",
    icon: Zap,
    monthlyPrice: 0,
    yearlyPrice: 0,
    priceLabel: "Free",
    highlighted: false,
    cta: "Get Started",
    ctaHref: "/assessment",
    gradient: "from-slate-500/20 to-gray-500/20",
    iconColor: "text-slate-400",
    features: [
      "Compliance Assessment",
      "Basic Dashboard",
      "1 Spacecraft",
      "EU Space Act Resources",
      "Community Support",
    ],
    notIncluded: ["Document management", "API access", "Team features"],
  },
  {
    name: "Professional",
    description: "For growing space companies with serious compliance needs",
    icon: Rocket,
    monthlyPrice: 299,
    yearlyPrice: 249,
    priceLabel: null,
    highlighted: true,
    cta: "Start 14-Day Free Trial",
    ctaHref: "/contact?subject=professional",
    gradient: "from-emerald-500/20 to-cyan-500/20",
    iconColor: "text-emerald-400",
    features: [
      "Everything in Starter",
      "Unlimited Spacecraft",
      "Full Compliance Dashboard",
      "Document Management",
      "Audit Trail & Reports",
      "NCA Submission Workflow",
      "Team Access (up to 10 users)",
      "Email Support",
      "API Access",
    ],
    notIncluded: [],
  },
  {
    name: "Enterprise",
    description: "For large organizations with complex requirements",
    icon: Building2,
    monthlyPrice: null,
    yearlyPrice: null,
    priceLabel: "Custom",
    highlighted: false,
    cta: "Contact Sales",
    ctaHref: "/contact?subject=enterprise",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-400",
    features: [
      "Everything in Professional",
      "Unlimited Users",
      "Multi-Organization Support",
      "SSO / SAML Integration",
      "Dedicated Account Manager",
      "Custom Integrations",
      "SLA Guarantee (99.9%)",
      "On-Premise Option",
      "Training & Onboarding",
      "Priority Support",
    ],
    notIncluded: [],
  },
];

const faqs = [
  {
    question: "Can I switch plans at any time?",
    answer:
      "Yes, you can upgrade or downgrade at any time. When upgrading, the price difference is prorated. When downgrading, remaining credit is applied to your next invoice.",
    icon: Sparkles,
  },
  {
    question: "What happens after the free trial?",
    answer:
      "After 14 days, you'll be automatically moved to your chosen plan. You can cancel anytime before that. No credit card is required for the trial period.",
    icon: Shield,
  },
  {
    question: "Are there discounts for startups?",
    answer:
      "Yes! We offer a startup program with 50% off in the first year for qualifying space startups. Contact us for details.",
    icon: Rocket,
  },
  {
    question: "How does billing work?",
    answer:
      "Billing is monthly or annually in advance via credit card or SEPA direct debit. Enterprise customers can also pay by invoice.",
    icon: Building2,
  },
  {
    question: "What counts as a 'Spacecraft'?",
    answer:
      "A spacecraft is any space object you manage on the platform — whether it's a satellite, a constellation, or a service module. Constellations with identical units can be managed as a single entry.",
    icon: Zap,
  },
  {
    question: "Do you offer training?",
    answer:
      "Professional customers get access to our knowledge base and webinars. Enterprise customers receive dedicated training and onboarding sessions.",
    icon: Users,
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
    professional: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    name: "Team Members",
    starter: "1",
    professional: "10",
    enterprise: "Unlimited",
  },
  {
    name: "Document Management",
    starter: false,
    professional: true,
    enterprise: true,
  },
  { name: "Audit Trail", starter: false, professional: true, enterprise: true },
  {
    name: "NCA Submission Workflow",
    starter: false,
    professional: true,
    enterprise: true,
  },
  { name: "API Access", starter: false, professional: true, enterprise: true },
  { name: "SSO / SAML", starter: false, professional: false, enterprise: true },
  {
    name: "Custom Integrations",
    starter: false,
    professional: false,
    enterprise: true,
  },
  {
    name: "SLA Guarantee",
    starter: false,
    professional: "99.5%",
    enterprise: "99.9%",
  },
  {
    name: "Support",
    starter: "Community",
    professional: "Email",
    enterprise: "Priority + AM",
  },
];

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
        relative rounded-2xl
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

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-16 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 60%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 20% 80%, rgba(59, 130, 246, 0.06) 0%, transparent 50%)",
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
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-[11px] font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-4">
              Pricing
            </span>
            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-medium tracking-[-0.03em] leading-[1.1] mb-6">
              Simple, transparent
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                pricing
              </span>
            </h1>
            <p className="text-[17px] md:text-[18px] text-white/50 max-w-[500px] mx-auto mb-10">
              Start for free and scale with your compliance needs. No hidden
              fees.
            </p>

            {/* Billing Toggle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
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
                      billingPeriod === "yearly"
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}
                  >
                    Save 17%
                  </span>
                </button>
              </GlassCard>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative py-12 px-6 md:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
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
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-black bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-1.5 rounded-full shadow-lg">
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
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center`}
                        >
                          <Icon size={24} className={plan.iconColor} />
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
                            <span className="text-[42px] font-light tracking-[-0.02em] text-white">
                              {plan.priceLabel}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-[42px] font-light tracking-[-0.02em] text-white">
                              €{price}
                            </span>
                            <span className="text-[15px] text-white/40">
                              /month
                            </span>
                          </div>
                        )}
                        {billingPeriod === "yearly" &&
                          price !== null &&
                          price > 0 && (
                            <p className="text-[13px] text-white/40 mt-1">
                              €{price * 12} billed annually
                            </p>
                          )}
                      </div>

                      {/* CTA */}
                      <Link
                        href={plan.ctaHref}
                        className={`w-full text-center py-3.5 rounded-xl text-[14px] font-medium transition-all duration-300 mb-6 ${
                          plan.highlighted
                            ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.02]"
                            : "bg-white/[0.08] text-white hover:bg-white/[0.12] border border-white/[0.08]"
                        }`}
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
                              <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check size={12} className="text-emerald-400" />
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
        </div>
      </section>

      {/* Comparison Table */}
      <section className="relative py-24 px-6 md:px-12">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-[1000px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block text-[11px] font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-4">
              Compare Plans
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white">
              Feature Comparison
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
                    <th className="text-center py-5 px-4 text-[13px] text-white/60 font-medium w-[120px]">
                      Starter
                    </th>
                    <th className="text-center py-5 px-4 text-[13px] text-emerald-400 font-medium bg-emerald-500/[0.05] w-[120px]">
                      Professional
                    </th>
                    <th className="text-center py-5 px-4 text-[13px] text-white/60 font-medium w-[120px]">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, i) => (
                    <motion.tr
                      key={feature.name}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/[0.04] last:border-0"
                    >
                      <td className="py-4 px-6 text-[13px] text-white/70">
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
                      <td className="py-4 px-4 text-center bg-emerald-500/[0.03]">
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
                          <span className="text-[13px] text-white/80 font-medium">
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
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-24 px-6 md:px-12">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block text-[11px] font-medium text-emerald-400/70 uppercase tracking-[0.2em] mb-4">
              FAQ
            </span>
            <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-[15px] text-white/40">
              Everything you need to know about our pricing and plans.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {faqs.map((faq, i) => {
              const Icon = faq.icon;
              return (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard className="p-6 h-full">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                        <Icon size={18} className="text-white/40" />
                      </div>
                      <div>
                        <h3 className="text-[15px] font-medium text-white mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-[13px] text-white/50 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6 md:px-12">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(16, 185, 129, 0.1) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-[800px] mx-auto">
          <GlassCard className="p-10 md:p-14 text-center" hover={false}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-medium tracking-[-0.02em] text-white mb-4">
                Ready for EU Space Act compliance?
              </h2>
              <p className="text-[16px] text-white/50 mb-10 max-w-[450px] mx-auto">
                Start for free or talk to our team about your specific
                requirements.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/assessment"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-[15px] font-medium transition-all duration-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:scale-[1.02]"
                >
                  Start Free Assessment
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/[0.12] text-white text-[15px] font-medium transition-all duration-300 hover:bg-white/[0.1] hover:border-white/[0.2]"
                >
                  Contact Sales
                </Link>
              </div>
            </motion.div>
          </GlassCard>
        </div>
      </section>

      <Footer />
    </div>
  );
}
