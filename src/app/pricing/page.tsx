"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import {
  ArrowLeft,
  Check,
  HelpCircle,
  Zap,
  Building2,
  Rocket,
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
    features: [
      "Compliance Assessment",
      "Basic Dashboard",
      "1 Spacecraft",
      "EU Space Act Resources",
      "Community Support",
    ],
    limits: ["No document management", "No API access", "No team features"],
  },
  {
    name: "Professional",
    description: "For growing space companies",
    icon: Rocket,
    monthlyPrice: 299,
    yearlyPrice: 249,
    priceLabel: null,
    highlighted: true,
    cta: "Start 14-Day Free Trial",
    ctaHref: "/contact?subject=professional",
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
    limits: [],
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
    limits: [],
  },
];

const faqs = [
  {
    question: "Can I switch plans at any time?",
    answer:
      "Yes, you can upgrade or downgrade at any time. When upgrading, the price difference is prorated. When downgrading, remaining credit is applied to your next invoice.",
  },
  {
    question: "What happens after the free trial?",
    answer:
      "After 14 days, you'll be automatically moved to your chosen plan. You can cancel anytime before that. No credit card is required for the trial period.",
  },
  {
    question: "Are there discounts for startups?",
    answer:
      "Yes! We offer a startup program with 50% off in the first year for qualifying space startups. Contact us for details.",
  },
  {
    question: "How does billing work?",
    answer:
      "Billing is monthly or annually in advance via credit card or SEPA direct debit. Enterprise customers can also pay by invoice.",
  },
  {
    question: "What counts as a 'Spacecraft'?",
    answer:
      "A spacecraft is any space object you manage on the platform — whether it's a satellite, a constellation, or a service module. Constellations with identical units can be managed as a single entry.",
  },
  {
    question: "Do you offer training?",
    answer:
      "Professional customers get access to our knowledge base and webinars. Enterprise customers receive dedicated training and onboarding sessions.",
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

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "yearly",
  );

  return (
    <main className="dark-section min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/"
              className="transition-opacity duration-300 hover:opacity-70"
            >
              <Logo size={24} className="text-white" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-12 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-mono text-[11px] text-white/40 uppercase tracking-[0.2em] block mb-4">
              Pricing
            </span>
            <h1 className="text-[clamp(2rem,4vw,3.5rem)] font-light tracking-[-0.02em] mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-[17px] text-white/50 max-w-[500px] mx-auto mb-10">
              Start for free and scale with your compliance needs.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-3 p-1.5 bg-white/[0.03] rounded-full border border-white/[0.08]">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all ${
                  billingPeriod === "monthly"
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-5 py-2 rounded-full text-[13px] font-medium transition-all flex items-center gap-2 ${
                  billingPeriod === "yearly"
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                Yearly
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    billingPeriod === "yearly"
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  -17%
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const price =
                billingPeriod === "yearly"
                  ? plan.yearlyPrice
                  : plan.monthlyPrice;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative rounded-2xl border ${
                    plan.highlighted
                      ? "bg-white/[0.04] border-white/20"
                      : "bg-white/[0.02] border-white/[0.08]"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="text-[10px] font-mono text-black bg-white px-3 py-1 rounded-full">
                        Popular
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          plan.highlighted ? "bg-white/10" : "bg-white/[0.05]"
                        }`}
                      >
                        <Icon size={20} className="text-white/70" />
                      </div>
                      <div>
                        <h3 className="text-[18px] font-medium text-white">
                          {plan.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-[13px] text-white/50 mb-6 h-10">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.priceLabel ? (
                        <div className="text-[32px] font-light text-white">
                          {plan.priceLabel}
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-[32px] font-light text-white">
                            €{price}
                          </span>
                          <span className="text-[14px] text-white/40">
                            /month
                          </span>
                        </div>
                      )}
                      {billingPeriod === "yearly" &&
                        price !== null &&
                        price > 0 && (
                          <p className="text-[12px] text-white/40 mt-1">
                            €{price * 12} billed annually
                          </p>
                        )}
                    </div>

                    {/* CTA */}
                    <Link
                      href={plan.ctaHref}
                      className={`block w-full text-center py-3 rounded-full text-[14px] font-medium transition-all ${
                        plan.highlighted
                          ? "bg-white text-black hover:bg-white/90"
                          : "bg-white/[0.08] text-white hover:bg-white/[0.12]"
                      }`}
                    >
                      {plan.cta}
                    </Link>

                    {/* Features */}
                    <div className="mt-6 pt-6 border-t border-white/[0.06]">
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-3 text-[13px]"
                          >
                            <Check
                              size={16}
                              className="text-emerald-400 flex-shrink-0 mt-0.5"
                            />
                            <span className="text-white/70">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-[24px] font-light text-center mb-12">
            Feature Comparison
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-4 px-4 text-[13px] text-white/40 font-medium">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 text-[13px] text-white/60 font-medium">
                    Starter
                  </th>
                  <th className="text-center py-4 px-4 text-[13px] text-white font-medium bg-white/[0.02]">
                    Professional
                  </th>
                  <th className="text-center py-4 px-4 text-[13px] text-white/60 font-medium">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature) => (
                  <tr
                    key={feature.name}
                    className="border-b border-white/[0.04]"
                  >
                    <td className="py-4 px-4 text-[13px] text-white/70">
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
                    <td className="py-4 px-4 text-center bg-white/[0.02]">
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
                        <span className="text-[13px] text-white/80">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[800px] mx-auto">
          <div className="flex items-center justify-center gap-3 mb-12">
            <HelpCircle size={20} className="text-white/40" />
            <h2 className="text-[24px] font-light">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl"
              >
                <h3 className="text-[15px] font-medium text-white mb-2">
                  {faq.question}
                </h3>
                <p className="text-[14px] text-white/50 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="text-[28px] font-light mb-4">
            Ready for EU Space Act compliance?
          </h2>
          <p className="text-[15px] text-white/50 mb-8">
            Start for free or talk to our team about your requirements.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/assessment"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-black bg-white px-8 py-4 rounded-full hover:bg-white/90 transition-all"
            >
              Start Free Assessment
              <span>→</span>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-[15px] text-white/60 hover:text-white transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
