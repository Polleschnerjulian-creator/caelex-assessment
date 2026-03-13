"use client";

import { useState } from "react";
import Link from "next/link";
import { CaelexIcon } from "@/components/ui/Logo";
import { ArrowRight, CheckCircle } from "lucide-react";

interface FooterProps {
  theme?: "light" | "dark";
}

const solutionLinks = [
  { label: "Regulatory Compliance", href: "/solutions/regulatory-compliance" },
  {
    label: "Authorization & Licensing",
    href: "/solutions/authorization-licensing",
  },
  { label: "Risk Assessment", href: "/assessment" },
  { label: "Cybersecurity & NIS2", href: "/solutions/cybersecurity-nis2" },
  { label: "Debris Mitigation", href: "/solutions/debris-mitigation" },
  { label: "Environmental Impact", href: "/solutions/environmental-impact" },
  {
    label: "Insurance Requirements",
    href: "/solutions/insurance-requirements",
  },
  { label: "Spectrum & ITU Filing", href: "/solutions/spectrum-itu-filing" },
  { label: "Export Control (ITAR/EAR)", href: "/solutions/export-control" },
  { label: "Document Generation", href: "/solutions/document-generation" },
  { label: "Compliance Monitoring", href: "/solutions/compliance-monitoring" },
  { label: "NCA Submissions", href: "/solutions/nca-submissions" },
  { label: "Audit & Evidence", href: "/solutions/audit-evidence" },
  { label: "Due Diligence", href: "/assure/dashboard" },
  { label: "Investor Readiness", href: "/assure/dashboard" },
  { label: "Stakeholder Network", href: "/solutions/stakeholder-network" },
  { label: "Mission Timeline Planning", href: "/solutions/mission-timeline" },
  { label: "Incident Management", href: "/solutions/incident-management" },
  {
    label: "Authorization Workflow",
    href: "/solutions/authorization-workflow",
  },
  {
    label: "Registration Management",
    href: "/solutions/registration-management",
  },
  {
    label: "Compliance Forecasting",
    href: "/solutions/compliance-forecasting",
  },
  { label: "Supply Chain Security", href: "/solutions/supply-chain-security" },
  { label: "Satellite Tracking", href: "/solutions/satellite-tracking" },
  { label: "Training & Certification", href: "/academy/dashboard" },
  { label: "Data Room Management", href: "/assure/dashboard" },
  { label: "Regulatory Arbitrage", href: "/solutions/regulatory-arbitrage" },
];

const industryLinks = [
  { label: "Spacecraft Operators", href: "/industries/spacecraft-operators" },
  { label: "Launch Providers", href: "/industries/launch-providers" },
  { label: "Launch Site Operators", href: "/industries/launch-site-operators" },
  {
    label: "In-Space Service Operators",
    href: "/industries/in-space-service-operators",
  },
  {
    label: "Collision Avoidance Providers",
    href: "/industries/collision-avoidance-providers",
  },
  {
    label: "Positional Data Providers",
    href: "/industries/positional-data-providers",
  },
  {
    label: "Third Country Operators",
    href: "/industries/third-country-operators",
  },
  {
    label: "Space Agencies & Government",
    href: "/industries/space-agencies-government",
  },
  { label: "Defense & Security", href: "/industries/defense-security" },
  { label: "Insurance & Finance", href: "/assure/dashboard" },
  { label: "Legal & Consulting", href: "/industries/legal-consulting" },
  { label: "Space Startups", href: "/assessment" },
];

const capabilityLinks = [
  { label: "AI-Powered Analysis", href: "/capabilities/ai-powered-analysis" },
  { label: "Real-Time Monitoring", href: "/capabilities/real-time-monitoring" },
  { label: "Document Automation", href: "/capabilities/document-automation" },
  {
    label: "Cryptographic Attestation",
    href: "/capabilities/cryptographic-attestation",
  },
  {
    label: "Zero-Knowledge Proofs",
    href: "/capabilities/zero-knowledge-proofs",
  },
  { label: "Autonomous Agents", href: "/blog/agentic-system" },
  {
    label: "Orbital Mechanics Engine",
    href: "/capabilities/orbital-mechanics-engine",
  },
  {
    label: "Predictive Compliance",
    href: "/capabilities/predictive-compliance",
  },
  { label: "Multi-Jurisdiction Mapping", href: "/jurisdictions" },
  {
    label: "Hash-Chain Audit Trail",
    href: "/capabilities/hash-chain-audit-trail",
  },
  { label: "Anomaly Detection", href: "/capabilities/anomaly-detection" },
  { label: "Risk Classification", href: "/capabilities/risk-classification" },
  {
    label: "Natural Language Processing",
    href: "/capabilities/natural-language-processing",
  },
  {
    label: "Regulatory Graph Engine",
    href: "/capabilities/regulatory-graph-engine",
  },
  { label: "Compliance Scoring", href: "/capabilities/compliance-scoring" },
  {
    label: "Automated Gap Analysis",
    href: "/capabilities/automated-gap-analysis",
  },
  {
    label: "Cross-Regulation Mapping",
    href: "/capabilities/cross-regulation-mapping",
  },
  { label: "Evidence Collection", href: "/capabilities/evidence-collection" },
  {
    label: "Deadline Cascade Modeling",
    href: "/capabilities/deadline-cascade-modeling",
  },
  { label: "Scenario Simulation", href: "/capabilities/scenario-simulation" },
  { label: "Multi-Tenant Encryption", href: "/security" },
  { label: "Webhook & API Integration", href: "/docs/api" },
];

const documentLinks = [
  { label: "Guides", href: "/guides" },
  { label: "Blog", href: "/blog" },
  { label: "Glossary", href: "/glossary" },
  { label: "Modules", href: "/modules" },
  { label: "Jurisdictions", href: "/jurisdictions" },
  { label: "API Documentation", href: "/docs/api" },
  { label: "About", href: "/about" },
  { label: "Security", href: "/security" },
  { label: "Governance", href: "/governance" },
  { label: "Contact", href: "/contact" },
  { label: "Careers", href: "/careers" },
  { label: "Impressum", href: "/legal/impressum" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Cookie Policy", href: "/legal/cookies" },
  { label: "Accessibility", href: "/legal/barrierefreiheit" },
];

const socialLinks = [
  { href: "https://linkedin.com/company/caelex", label: "LINKEDIN" },
  { href: "https://x.com/caboracaelex", label: "X" },
  { href: "https://instagram.com/caelex.eu", label: "INSTAGRAM" },
];

export default function Footer({ theme = "dark" }: FooterProps) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLight = theme === "light";

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribing) return;

    if (!consent) {
      setError("Please agree to the privacy policy to subscribe.");
      return;
    }

    setError(null);
    setSubscribing(true);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Please try again.");
        setSubscribing(false);
        return;
      }

      setSubscribed(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const linkStyle = `text-body-lg transition-all duration-200 ${
    isLight
      ? "text-[#1d1d1f] hover:text-[#6e6e73] hover:translate-x-1"
      : "text-white/60 hover:text-white hover:translate-x-1"
  } inline-block`;

  const headingStyle = `text-micro uppercase tracking-[0.2em] mb-8 ${
    isLight ? "text-[#86868b]" : "text-white/50"
  }`;

  const separatorStyle = `w-full h-px ${isLight ? "bg-[#d2d2d7]" : "bg-white/[0.08]"}`;

  return (
    <footer
      className={
        isLight
          ? "bg-white text-[#1d1d1f] border-t border-[#d2d2d7]"
          : "dark-section bg-black text-white border-t border-white/[0.06]"
      }
    >
      {/* Newsletter Section */}
      <div
        className={`border-b ${isLight ? "border-[#d2d2d7]" : "border-white/[0.06]"}`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-14">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-md">
              <h2
                className={`text-title font-medium mb-2 ${isLight ? "text-[#1d1d1f]" : "text-white"}`}
              >
                Stay ahead of space regulatory changes
              </h2>
              <p
                className={`text-body leading-relaxed ${isLight ? "text-[#86868b]" : "text-white/45"}`}
              >
                Get updates on EU Space Act, NIS2, and national space laws.
                Compliance insights and deadline reminders. Unsubscribe anytime.
              </p>
            </div>

            {subscribed ? (
              <div
                className={`flex items-center gap-2 text-body ${isLight ? "text-[#1d1d1f]" : "text-emerald-400"}`}
                role="status"
                aria-live="polite"
              >
                <CheckCircle size={16} aria-hidden="true" />
                <span>
                  Please check your email to confirm your subscription.
                </span>
              </div>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="w-full md:w-auto"
                aria-label="Newsletter signup"
              >
                <div className="flex">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    aria-required="true"
                    className={`flex-1 md:w-[280px] rounded-l-lg px-4 py-2.5 text-body outline-none transition-colors ${
                      isLight
                        ? "bg-[#f5f5f7] border border-[#d2d2d7] text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#86868b]"
                        : "bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:border-white/30"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={subscribing || !consent}
                    className={`text-body font-medium px-5 py-2.5 rounded-r-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                      isLight
                        ? "bg-[#1d1d1f] text-white hover:bg-[#424245]"
                        : "bg-white text-black hover:bg-white/90"
                    }`}
                  >
                    {subscribing ? (
                      <span>...</span>
                    ) : (
                      <>
                        Subscribe
                        <ArrowRight size={14} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>

                {/* GDPR Consent */}
                <label className="flex items-start gap-2.5 mt-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (e.target.checked) setError(null);
                    }}
                    className={`mt-0.5 w-3.5 h-3.5 rounded cursor-pointer ${
                      isLight
                        ? "border-[#d2d2d7] bg-[#f5f5f7] accent-[#1d1d1f]"
                        : "border-white/20 bg-white/[0.06] accent-white"
                    }`}
                  />
                  <span
                    className={`text-caption leading-relaxed transition-colors ${isLight ? "text-[#86868b]" : "text-white/45"}`}
                  >
                    I agree to receive regulatory updates from Caelex. You can
                    unsubscribe at any time.{" "}
                    <Link
                      href="/legal/privacy"
                      className={`underline ${isLight ? "hover:text-[#1d1d1f]" : "hover:text-white/70"}`}
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>

                {error && (
                  <p className="text-caption text-red-500 mt-2" role="alert">
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-12 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2.5 mb-6">
              <CaelexIcon
                size={28}
                className={isLight ? "text-[#1d1d1f]" : "text-white"}
                aria-hidden="true"
              />
              <span
                className={`text-heading font-medium tracking-[-0.01em] ${isLight ? "text-[#1d1d1f]" : "text-white"}`}
              >
                caelex
              </span>
            </div>

            <p
              className={`text-body-lg leading-relaxed ${isLight ? "text-[#1d1d1f]" : "text-white/60"}`}
            >
              © {new Date().getFullYear()} Caelex.
              <br />
              All rights reserved.
            </p>

            <div className={`${separatorStyle} my-6 max-w-[240px]`} />

            <button
              onClick={() =>
                window.dispatchEvent(new Event("show-cookie-consent"))
              }
              className={`text-body-lg transition-colors ${
                isLight
                  ? "text-[#1d1d1f] hover:text-[#86868b]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Cookie Settings
            </button>

            {/* Region */}
            <div className="flex items-center gap-3 mt-4 mb-8">
              {["EU", "DE"].map((region) => (
                <span
                  key={region}
                  className={`text-body-lg ${isLight ? "text-[#86868b]" : "text-white/30"}`}
                >
                  {region}
                </span>
              ))}
            </div>

            <div className={`${separatorStyle} mb-8 max-w-[240px]`} />

            {/* Social Links — bordered buttons like Palantir */}
            <div className="flex flex-col gap-2.5">
              {socialLinks.map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center w-[200px] py-2.5 rounded-full border text-small font-medium tracking-[0.08em] transition-all ${
                    isLight
                      ? "border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] hover:border-[#86868b]"
                      : "border-white/[0.12] text-white/60 hover:bg-white/[0.04] hover:border-white/25"
                  }`}
                  aria-label={`Follow Caelex on ${label}`}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <nav aria-label="Solutions">
            <h3 className={headingStyle}>Solutions</h3>
            <ul className="space-y-1.5">
              {solutionLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkStyle}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Industries */}
          <nav aria-label="Industries">
            <h3 className={headingStyle}>Industries</h3>
            <ul className="space-y-1.5">
              {industryLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkStyle}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Capabilities */}
          <nav aria-label="Capabilities">
            <h3 className={headingStyle}>Capabilities</h3>
            <ul className="space-y-1.5">
              {capabilityLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkStyle}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Documents */}
          <nav aria-label="Documents">
            <h3 className={headingStyle}>Documents</h3>
            <ul className="space-y-1.5">
              {documentLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkStyle}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Legal Disclaimer */}
      <div
        className={`border-t ${isLight ? "border-[#d2d2d7]" : "border-white/[0.06]"}`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8">
          <p
            className={`text-small leading-relaxed max-w-[1000px] ${
              isLight ? "text-[#86868b]" : "text-white/40"
            }`}
          >
            This platform provides regulatory guidance and compliance tooling
            based on the EU Space Act (COM(2025) 335), NIS2 Directive (EU
            2022/2555), and national space laws across European jurisdictions.
            Information and outputs provided by Caelex — including assessments,
            generated documents, risk scores, and AI-assisted analysis — do not
            constitute legal advice and should not be relied upon as a
            substitute for professional legal counsel. For binding compliance
            decisions, regulatory filings, and formal submissions, always
            consult qualified legal professionals with jurisdiction-specific
            expertise.
          </p>
        </div>
      </div>
    </footer>
  );
}
