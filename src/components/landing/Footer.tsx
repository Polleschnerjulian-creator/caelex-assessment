"use client";

import { useState } from "react";
import Link from "next/link";
import { CaelexIcon } from "@/components/ui/Logo";
import { ArrowRight, CheckCircle } from "lucide-react";

interface FooterProps {
  theme?: "light" | "dark";
}

const solutionLinks = [
  { label: "Regulatory Compliance", href: "/platform" },
  { label: "Authorization & Licensing", href: "/platform" },
  { label: "Risk Assessment", href: "/assessment" },
  { label: "Cybersecurity & NIS2", href: "/platform" },
  { label: "Debris Mitigation", href: "/platform" },
  { label: "Environmental Impact", href: "/platform" },
  { label: "Insurance Requirements", href: "/platform" },
  { label: "Spectrum & ITU Filing", href: "/platform" },
  { label: "Export Control (ITAR/EAR)", href: "/platform" },
  { label: "Document Generation", href: "/platform" },
  { label: "Compliance Monitoring", href: "/platform" },
  { label: "NCA Submissions", href: "/platform" },
  { label: "Audit & Evidence", href: "/platform" },
  { label: "Due Diligence", href: "/assure/dashboard" },
  { label: "Investor Readiness", href: "/assure/dashboard" },
  { label: "Stakeholder Network", href: "/platform" },
];

const industryLinks = [
  { label: "Spacecraft Operators", href: "/platform" },
  { label: "Launch Providers", href: "/platform" },
  { label: "Launch Site Operators", href: "/platform" },
  { label: "In-Space Service Operators", href: "/platform" },
  { label: "Collision Avoidance Providers", href: "/platform" },
  { label: "Positional Data Providers", href: "/platform" },
  { label: "Third Country Operators", href: "/platform" },
  { label: "Space Agencies & Government", href: "/platform" },
  { label: "Defense & Security", href: "/platform" },
  { label: "Insurance & Finance", href: "/assure/dashboard" },
  { label: "Legal & Consulting", href: "/platform" },
  { label: "Space Startups", href: "/assessment" },
];

const capabilityLinks = [
  { label: "Comply", href: "/platform" },
  { label: "Shield", href: "/platform" },
  { label: "Sentinel", href: "/blog/agentic-system" },
  { label: "Ephemeris", href: "/platform" },
  { label: "Verity", href: "/platform" },
  { label: "HUB", href: "/dashboard/hub" },
  { label: "Assure", href: "/assure/dashboard" },
  { label: "Academy", href: "/academy/dashboard" },
  { label: "Astra AI", href: "/platform" },
  { label: "Mission Control", href: "/platform" },
  { label: "Digital Twin", href: "/platform" },
  { label: "Regulatory Feed", href: "/platform" },
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
];

// Inline SVG icons for social links
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

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

  const linkStyle = `text-body transition-colors ${
    isLight
      ? "text-[#4B5563] hover:text-[#111827]"
      : "text-white/45 hover:text-white"
  }`;

  const headingStyle = `text-micro uppercase tracking-[0.15em] mb-6 ${
    isLight ? "text-[#9CA3AF]" : "text-white/25"
  }`;

  return (
    <footer
      className={
        isLight
          ? "bg-[#F7F8FA] text-[#111827] border-t border-[#E5E7EB]"
          : "dark-section bg-black text-white border-t border-white/[0.06]"
      }
    >
      {/* Newsletter Section */}
      <div
        className={`border-b ${isLight ? "border-[#E5E7EB]" : "border-white/[0.06]"}`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-14">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-md">
              <h2
                className={`text-title font-medium mb-2 ${isLight ? "text-[#111827]" : "text-white"}`}
              >
                Stay ahead of space regulatory changes
              </h2>
              <p
                className={`text-body leading-relaxed ${isLight ? "text-[#4B5563]" : "text-white/45"}`}
              >
                Get updates on EU Space Act, NIS2, and national space laws.
                Compliance insights and deadline reminders. Unsubscribe anytime.
              </p>
            </div>

            {subscribed ? (
              <div
                className={`flex items-center gap-2 text-body ${isLight ? "text-[#374151]" : "text-emerald-400"}`}
                role="status"
                aria-live="polite"
              >
                <CheckCircle size={16} aria-hidden="true" />
                <span>You&apos;re subscribed! We&apos;ll be in touch.</span>
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
                        ? "bg-white border border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#D1D5DB]"
                        : "bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:border-white/30"
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={subscribing || !consent}
                    className={`text-body font-medium px-5 py-2.5 rounded-r-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                      isLight
                        ? "bg-[#111827] text-white hover:bg-[#1f2937]"
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
                        ? "border-[#D1D5DB] bg-white accent-[#111827]"
                        : "border-white/20 bg-white/[0.06] accent-white"
                    }`}
                  />
                  <span
                    className={`text-caption leading-relaxed transition-colors ${isLight ? "text-[#4B5563]" : "text-white/45"}`}
                  >
                    I agree to receive regulatory updates from Caelex. You can
                    unsubscribe at any time.{" "}
                    <Link
                      href="/legal/privacy"
                      className={`underline ${isLight ? "hover:text-[#111827]" : "hover:text-white/70"}`}
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

      {/* Main Footer — Palantir-style: brand left, 4 long columns right */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <CaelexIcon
                size={24}
                className={isLight ? "text-[#111827]" : "text-white"}
                aria-hidden="true"
              />
              <span
                className={`text-heading font-medium ${isLight ? "text-[#111827]" : "text-white"}`}
              >
                caelex
              </span>
            </div>
            <p
              className={`text-body leading-relaxed mb-2 ${isLight ? "text-[#4B5563]" : "text-white/45"}`}
            >
              © {new Date().getFullYear()} Caelex.
              <br />
              All rights reserved.
            </p>

            <button
              onClick={() =>
                window.dispatchEvent(new Event("show-cookie-consent"))
              }
              className={`text-body transition-colors mb-8 ${
                isLight
                  ? "text-[#4B5563] hover:text-[#111827]"
                  : "text-white/45 hover:text-white"
              }`}
            >
              Cookie Settings
            </button>

            {/* Social Links */}
            <div className="flex flex-col gap-2.5">
              {[
                {
                  href: "https://linkedin.com/company/caelex",
                  label: "LinkedIn",
                },
                { href: "https://x.com/caboracaelex", label: "X" },
                {
                  href: "https://instagram.com/caelex.eu",
                  label: "Instagram",
                },
              ].map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-body uppercase tracking-wide transition-colors ${
                    isLight
                      ? "text-[#4B5563] hover:text-[#111827]"
                      : "text-white/45 hover:text-white"
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Solutions */}
          <nav aria-label="Solutions">
            <h3 className={headingStyle}>Solutions</h3>
            <ul className="space-y-2.5">
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
            <ul className="space-y-2.5">
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
            <ul className="space-y-2.5">
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
            <ul className="space-y-2.5">
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
    </footer>
  );
}
