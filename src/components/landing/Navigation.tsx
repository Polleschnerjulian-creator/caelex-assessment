"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/ui/Logo";
import { Menu, X, ArrowRight, Search } from "lucide-react";

interface NavigationProps {
  theme?: "light" | "dark";
}

// ─── Navigation Structure (Palantir-style multi-section) ────────────────────

const navSections = {
  primary: [
    { label: "Platform", href: "/platform" },
    {
      label: "Modules",
      href: "/modules",
      children: [
        { label: "Authorization", href: "/modules/authorization" },
        { label: "Cybersecurity", href: "/modules/cybersecurity" },
        { label: "Debris Mitigation", href: "/modules/debris" },
        { label: "Environmental", href: "/modules/environmental" },
        { label: "Insurance", href: "/modules/insurance" },
      ],
    },
    { label: "Resources", href: "/resources" },
    { label: "Pricing", href: "/pricing" },
    { label: "Security", href: "/security" },
  ],
  solutions: [
    {
      label: "Regulatory Compliance",
      href: "/solutions/regulatory-compliance",
    },
    {
      label: "Authorization & Licensing",
      href: "/solutions/authorization-licensing",
    },
    { label: "Cybersecurity & NIS2", href: "/solutions/cybersecurity-nis2" },
    { label: "Debris Mitigation", href: "/solutions/debris-mitigation" },
    { label: "Space Insurance", href: "/solutions/space-insurance" },
  ],
  quickLinks: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Documentation", href: "/docs/api" },
  ],
};

export default function Navigation({ theme = "dark" }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isLight = theme === "light";
  const isLandingHero = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // On landing page: start transparent/white over dark hero, transition when scrolled
  // On all other pages: always show dark text (light background, no dark hero)
  const showDarkText = isLight && (isLandingHero ? scrolled : true);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 ${showDarkText ? "" : "dark-section"}`}
        aria-label="Main navigation"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Glass Bar */}
            <div
              className={`flex items-center justify-between w-full rounded-xl px-5 py-2.5 transition-all duration-700 ${
                isLight
                  ? scrolled
                    ? "bg-white/80 backdrop-blur-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                    : "bg-white/[0.03] backdrop-blur-sm border border-white/[0.06]"
                  : scrolled
                    ? "bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]"
              }`}
            >
              {/* Logo */}
              <Link
                href="/"
                className="transition-opacity duration-300 hover:opacity-70"
                aria-label="Caelex — Go to homepage"
              >
                <Logo
                  size={34}
                  className={`transition-colors duration-700 ${showDarkText ? "text-[#111827]" : "text-white"}`}
                />
              </Link>

              {/* Right Side: Get Started + Search/Hamburger */}
              <div className="flex items-center gap-3">
                {/* Get Started CTA — white bg, subtle border, soft radius */}
                <Link
                  href="/assessment"
                  className="hidden sm:inline-flex items-center justify-center h-10 px-5 text-[13px] font-medium tracking-wide rounded-lg bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-all duration-300"
                >
                  Get Started
                </Link>

                {/* Search + Hamburger — white bg, subtle border, soft radius */}
                <div className="flex items-center rounded-lg bg-white border border-[#E5E7EB] overflow-hidden">
                  <button
                    className="flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors duration-200"
                    aria-label="Search"
                  >
                    <Search size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <div className="w-px h-5 bg-[#E5E7EB]" />
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors duration-200"
                    aria-label={menuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={menuOpen}
                    aria-controls="nav-menu"
                  >
                    <Menu size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Full-screen Menu Overlay — Palantir-style multi-column */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Background */}
            <div className="absolute inset-0 bg-[#0A0D14]" />

            {/* Content */}
            <div className="relative h-full flex flex-col overflow-y-auto">
              {/* Header — matches nav bar position */}
              <div className="max-w-[1400px] w-full mx-auto px-6 md:px-12">
                <div className="flex items-center justify-between h-20">
                  <div className="flex items-center justify-between w-full rounded-xl px-5 py-2.5">
                    <Link
                      href="/"
                      onClick={closeMenu}
                      className="transition-opacity duration-300 hover:opacity-70"
                      aria-label="Caelex — Go to homepage"
                    >
                      <Logo size={34} className="text-white" />
                    </Link>

                    <div className="flex items-center gap-3">
                      <Link
                        href="/assessment"
                        onClick={closeMenu}
                        className="hidden sm:inline-flex items-center justify-center h-10 px-5 text-[13px] font-medium tracking-wide rounded-lg bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-all duration-300"
                      >
                        Get Started
                      </Link>
                      <div className="flex items-center rounded-lg bg-white border border-[#E5E7EB] overflow-hidden">
                        <button
                          className="flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors duration-200"
                          aria-label="Search"
                        >
                          <Search
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </button>
                        <div className="w-px h-5 bg-[#E5E7EB]" />
                        <button
                          onClick={closeMenu}
                          className="flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors duration-200"
                          aria-label="Close menu"
                        >
                          <X size={16} strokeWidth={2} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full border-t border-white/[0.06]" />

              {/* Multi-column Menu Body */}
              <div className="flex-1 max-w-[1400px] w-full mx-auto px-6 md:px-12 py-10 md:py-14">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
                  {/* Left Column — Primary Navigation */}
                  <motion.div
                    className="md:col-span-4"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 }}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/30 mb-6">
                      Navigation
                    </p>
                    <nav aria-label="Primary navigation">
                      <div className="flex flex-col">
                        {navSections.primary.map((link) => (
                          <div key={link.label}>
                            <Link
                              href={link.href}
                              onClick={closeMenu}
                              className={`block py-2 text-[28px] md:text-[34px] font-light tracking-[-0.02em] transition-colors duration-200 ${
                                pathname === link.href
                                  ? "text-white"
                                  : "text-white/70 hover:text-white"
                              }`}
                            >
                              {link.label}
                            </Link>
                            {"children" in link &&
                              link.children?.map((child) => (
                                <Link
                                  key={child.label}
                                  href={child.href}
                                  onClick={closeMenu}
                                  className="flex items-center gap-2 py-1.5 pl-1 text-[15px] text-white/40 hover:text-white transition-colors duration-200"
                                >
                                  <span className="text-white/20">&#8627;</span>
                                  {child.label}
                                </Link>
                              ))}
                          </div>
                        ))}
                      </div>

                      {/* Auth below primary nav */}
                      <div className="h-px bg-white/[0.06] my-6" />
                      <div className="flex flex-col gap-1">
                        <Link
                          href="/login"
                          onClick={closeMenu}
                          className="py-1.5 text-[15px] text-white/40 hover:text-white transition-colors duration-200"
                        >
                          Log in
                        </Link>
                        <Link
                          href="/signup"
                          onClick={closeMenu}
                          className="py-1.5 text-[15px] text-white/40 hover:text-white transition-colors duration-200"
                        >
                          Create account
                        </Link>
                      </div>
                    </nav>
                  </motion.div>

                  {/* Middle Column — Solutions */}
                  <motion.div
                    className="md:col-span-4"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.12 }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/30">
                        Solutions
                      </p>
                      <Link
                        href="/solutions/regulatory-compliance"
                        onClick={closeMenu}
                        className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/40 hover:text-white transition-colors"
                      >
                        View All &rarr;
                      </Link>
                    </div>

                    <p className="text-[15px] text-white/50 leading-relaxed mb-6">
                      The compliance intelligence platform for European space
                      operators. Automated regulatory analysis, document
                      generation, and NCA submission across 10 jurisdictions.
                    </p>

                    <div className="space-y-1">
                      {navSections.solutions.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={closeMenu}
                          className="flex items-center gap-2 py-2 text-[14px] text-white/50 hover:text-white transition-colors duration-200 group"
                        >
                          <span className="text-white/20 group-hover:text-white/40 transition-colors">
                            &#8627;
                          </span>
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>

                  {/* Right Column — Quick Links */}
                  <motion.div
                    className="md:col-span-4"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.19 }}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/30 mb-6">
                      Quick Links
                    </p>
                    <div className="space-y-0.5">
                      {navSections.quickLinks.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={closeMenu}
                          className="block py-2 text-[14px] text-white/50 hover:text-white transition-colors duration-200"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-8">
                      <Link
                        href="/demo"
                        onClick={closeMenu}
                        className="inline-flex items-center justify-center h-11 px-7 text-[14px] font-medium rounded-lg border border-white/20 text-white hover:bg-white hover:text-black transition-all duration-300"
                      >
                        Request Demo
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Footer */}
              <motion.div
                className="max-w-[1400px] w-full mx-auto px-6 md:px-12 pb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <div className="border-t border-white/[0.06] pt-6 flex items-center justify-between">
                  <p className="text-[11px] text-white/20">
                    European Space Compliance Intelligence
                  </p>
                  <p className="text-[11px] text-white/20">
                    &copy; {new Date().getFullYear()} Caelex
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
