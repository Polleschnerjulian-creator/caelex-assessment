"use client";

import { useState } from "react";
import Link from "next/link";
import { CaelexIcon } from "@/components/ui/Logo";
import { ArrowRight, CheckCircle } from "lucide-react";

const productLinks = [
  { label: "Platform", href: "/#modules" },
  { label: "Assessment", href: "/assessment" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Pricing", href: "/pricing" },
];

const resourceLinks = [
  { label: "Compliance Timeline", href: "/resources/timeline" },
  { label: "FAQ", href: "/resources/faq" },
  { label: "Glossary", href: "/resources/glossary" },
  { label: "API Documentation", href: "/docs/api" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Careers", href: "/careers" },
];

const legalLinks = [
  { label: "Impressum", href: "/legal/impressum" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Cookie Policy", href: "/legal/cookies" },
];

// Inline SVG icons for social links
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

export default function Footer() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribing) return;

    if (!consent) {
      setError("Please agree to the privacy policy to subscribe.");
      return;
    }

    setError(null);
    setSubscribing(true);

    setTimeout(() => {
      try {
        const signups = JSON.parse(
          localStorage.getItem("caelex-newsletter-signups") || "[]",
        );
        signups.push({
          email,
          consentGiven: true,
          consentTimestamp: new Date().toISOString(),
        });
        localStorage.setItem(
          "caelex-newsletter-signups",
          JSON.stringify(signups),
        );
      } catch {
        // localStorage may be unavailable
      }
      setSubscribed(true);
      setSubscribing(false);
    }, 800);
  };

  return (
    <footer className="dark-section bg-black text-white border-t border-white/[0.06]">
      {/* Newsletter Section */}
      <div className="border-b border-white/[0.04]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-14">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="max-w-md">
              <h3 className="text-[16px] font-medium text-white mb-2">
                Stay ahead of space regulatory changes
              </h3>
              <p className="text-[13px] text-white/40 leading-relaxed">
                Get updates on EU Space Act, NIS2, and national space laws.
                Compliance insights and deadline reminders. Unsubscribe anytime.
              </p>
            </div>

            {subscribed ? (
              <div className="flex items-center gap-2 text-green-400 text-[13px]">
                <CheckCircle size={16} />
                <span>You're subscribed! We'll be in touch.</span>
              </div>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="w-full md:w-auto"
              >
                <div className="flex">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 md:w-[280px] bg-white/[0.06] border border-white/[0.1] rounded-l-lg px-4 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={subscribing || !consent}
                    className="bg-white text-black text-[13px] font-medium px-5 py-2.5 rounded-r-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {subscribing ? (
                      <span>...</span>
                    ) : (
                      <>
                        Subscribe
                        <ArrowRight size={13} />
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
                    className="mt-0.5 w-3.5 h-3.5 rounded border-white/20 bg-white/[0.06] accent-white cursor-pointer"
                  />
                  <span className="text-[11px] text-white/35 leading-relaxed group-hover:text-white/50 transition-colors">
                    I agree to receive regulatory updates from Caelex. You can
                    unsubscribe at any time.{" "}
                    <Link
                      href="/legal/privacy"
                      className="underline hover:text-white/60"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </label>

                {error && (
                  <p className="text-[11px] text-red-400 mt-2">{error}</p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <CaelexIcon size={24} className="text-white" />
              <span className="text-[18px] text-white font-medium">caelex</span>
            </div>
            <p className="text-[13px] text-white/40 leading-relaxed mb-4">
              Space Regulatory Compliance Platform.
              <br />
              EU Space Act · NIS2 · National Laws
            </p>

            <a
              href="mailto:cs@caelex.eu"
              className="text-[13px] text-white/50 hover:text-white transition-colors block mb-6"
            >
              cs@caelex.eu
            </a>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://linkedin.com/company/caelex"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
                aria-label="Follow Caelex on LinkedIn"
              >
                <LinkedInIcon className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://x.com/caboracaelex"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
                aria-label="Follow Caelex on X"
              >
                <XIcon className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://instagram.com/caelex.eu"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] hover:border-white/[0.15] transition-all"
                aria-label="Follow Caelex on Instagram"
              >
                <InstagramIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[11px] text-white/40 uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-white/50 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[11px] text-white/40 uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-white/50 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={() =>
                    window.dispatchEvent(new Event("show-cookie-consent"))
                  }
                  className="text-[13px] text-white/50 hover:text-white transition-colors"
                >
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-[11px] text-white/40 uppercase tracking-wider mb-4">
              Resources
            </h4>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-white/50 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[11px] text-white/40 uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-white/50 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/[0.04]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-white/30">
                © {new Date().getFullYear()} Caelex. All rights reserved.
              </span>
            </div>

            {/* External Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <a
                href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
              >
                EU Space Act
              </a>
              <a
                href="https://eur-lex.europa.eu/eli/dir/2022/2555/oj"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
              >
                NIS2 Directive
              </a>
              <a
                href="https://www.euspa.europa.eu/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
              >
                EUSPA
              </a>
              <a
                href="https://www.esa.int/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
              >
                ESA
              </a>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-white/20 text-center md:text-left mt-6 max-w-[900px] leading-relaxed">
            This platform provides regulatory guidance based on the EU Space Act
            (COM(2025) 335), NIS2 Directive (EU 2022/2555), and national space
            laws across European jurisdictions. Information provided does not
            constitute legal advice. For binding compliance decisions, consult
            qualified legal professionals.
          </p>
        </div>
      </div>
    </footer>
  );
}
