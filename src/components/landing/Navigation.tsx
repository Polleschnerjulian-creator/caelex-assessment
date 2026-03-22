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

// ─── Rotating News Items (2 shown at a time, rotates bi-weekly) ─────────────

const NEWS_ITEMS = [
  {
    date: "March 2026",
    category: "Regulation",
    title:
      "EU Space Act (COM 2025/335) enters trilogue — what operators need to know now",
    href: "/resources/eu-space-act",
    image:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=400&fit=crop",
  },
  {
    date: "March 2026",
    category: "Product",
    title:
      "Caelex Shield: Compliance intelligence layer for collision avoidance",
    href: "/platform",
    image:
      "https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=600&h=400&fit=crop",
  },
  {
    date: "February 2026",
    category: "Compliance",
    title:
      "NIS2 Directive now applies to space — 5 things every operator must do",
    href: "/solutions/cybersecurity-nis2",
    image:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=400&fit=crop",
  },
  {
    date: "February 2026",
    category: "Data",
    title:
      "Caelex integrates ESA DISCOS — European space object catalog now live",
    href: "/platform",
    image:
      "https://images.unsplash.com/photo-1457364887197-9150188c107b?w=600&h=400&fit=crop",
  },
  {
    date: "January 2026",
    category: "Industry",
    title:
      "10 European jurisdictions, one platform — how Caelex maps the regulatory landscape",
    href: "/modules",
    image:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop",
  },
  {
    date: "January 2026",
    category: "Timeline",
    title:
      "Regulatory deadlines 2026–2028: the critical dates for EU space operators",
    href: "/resources/timeline",
    image:
      "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=600&h=400&fit=crop",
  },
];

/** Returns 2 news items based on the current bi-weekly period */
function getCurrentNews() {
  const epoch = new Date("2026-01-01").getTime();
  const biWeekMs = 14 * 24 * 60 * 60 * 1000;
  const period = Math.floor((Date.now() - epoch) / biWeekMs);
  const startIdx = (period * 2) % NEWS_ITEMS.length;
  return [
    NEWS_ITEMS[startIdx % NEWS_ITEMS.length],
    NEWS_ITEMS[(startIdx + 1) % NEWS_ITEMS.length],
  ];
}

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
                    : "bg-[#0d0d0d] backdrop-blur-sm border border-[#1a1a1a]"
                  : scrolled
                    ? "bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "bg-white/[0.04] backdrop-blur-xl border border-[#1a1a1a] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]"
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

      {/* Full-screen Menu Overlay */}
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
            transition={{ duration: 0.2 }}
          >
            {/* Background — pure black for max contrast */}
            <div className="absolute inset-0 bg-black" />

            <div className="relative h-full flex flex-col overflow-y-auto">
              {/* Header */}
              <div className="max-w-[1400px] w-full mx-auto px-6 md:px-12">
                <div className="flex items-center justify-between h-20">
                  <div className="flex items-center justify-between w-full px-5 py-2.5">
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
                        className="hidden sm:inline-flex items-center justify-center h-10 px-5 text-[13px] font-medium tracking-wide rounded-lg bg-white text-black hover:bg-white/90 transition-all duration-300"
                      >
                        Get Started
                      </Link>
                      <div className="flex items-center rounded-lg bg-white overflow-hidden">
                        <button
                          className="flex items-center justify-center w-10 h-10 text-black/50 hover:text-black hover:bg-black/5 transition-colors duration-200"
                          aria-label="Search"
                        >
                          <Search
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </button>
                        <div className="w-px h-5 bg-black/10" />
                        <button
                          onClick={closeMenu}
                          className="flex items-center justify-center w-10 h-10 text-black/50 hover:text-black hover:bg-black/5 transition-colors duration-200"
                          aria-label="Close menu"
                        >
                          <X size={16} strokeWidth={2} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full border-t border-[#1f1f1f]" />

              {/* Multi-column Body */}
              <div className="flex-1 max-w-[1400px] w-full mx-auto px-6 md:px-12 py-10 md:py-14">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-6">
                  {/* Left — Primary Navigation */}
                  <motion.div
                    className="md:col-span-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-8">
                      Navigation
                    </p>
                    <nav aria-label="Primary navigation">
                      <div className="flex flex-col gap-0.5">
                        {navSections.primary.map((link) => (
                          <div key={link.label}>
                            <Link
                              href={link.href}
                              onClick={closeMenu}
                              className={`block py-1.5 text-[32px] md:text-[38px] font-normal tracking-[-0.03em] transition-all duration-200 ${
                                pathname === link.href
                                  ? "text-white"
                                  : "text-white hover:text-[#999]"
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
                                  className="flex items-center gap-2.5 py-1 pl-2 text-[15px] text-[#888] hover:text-white transition-colors duration-200"
                                >
                                  <span className="text-[#555]">&#8627;</span>
                                  {child.label}
                                </Link>
                              ))}
                          </div>
                        ))}
                      </div>

                      <div className="h-px bg-white/[0.08] my-8" />
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href="/login"
                          onClick={closeMenu}
                          className="py-1.5 text-[15px] text-[#888] hover:text-white transition-colors duration-200"
                        >
                          Log in
                        </Link>
                        <Link
                          href="/signup"
                          onClick={closeMenu}
                          className="py-1.5 text-[15px] text-[#888] hover:text-white transition-colors duration-200"
                        >
                          Create account
                        </Link>
                      </div>
                    </nav>
                  </motion.div>

                  {/* Middle — Highlights / News Panel */}
                  <motion.div
                    className="md:col-span-5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-8">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#999]">
                        Latest News
                      </p>
                      <Link
                        href="/blog"
                        onClick={closeMenu}
                        className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#999] hover:text-white transition-colors"
                      >
                        Newsroom &rarr;
                      </Link>
                    </div>

                    {/* News Cards — rotates bi-weekly */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {getCurrentNews().map((news) => (
                        <Link
                          key={news.title}
                          href={news.href}
                          onClick={closeMenu}
                          className="group block"
                        >
                          <div className="aspect-[16/10] rounded-lg overflow-hidden mb-3 bg-[#0d0d0d] border border-[#1a1a1a]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={news.image}
                              alt=""
                              className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
                              loading="lazy"
                            />
                          </div>
                          <p className="text-[11px] text-[#888] mb-1.5 uppercase tracking-wider">
                            {news.category} &middot; {news.date}
                          </p>
                          <p className="text-[14px] text-[#e5e5e5] font-medium leading-snug group-hover:text-white transition-colors">
                            {news.title}
                          </p>
                        </Link>
                      ))}
                    </div>

                    {/* Platform Description */}
                    <div className="mt-8 pt-6 border-t border-[#1f1f1f]">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-4">
                        Platform
                      </p>
                      <p className="text-[14px] text-[#aaa] leading-relaxed">
                        Compliance intelligence for European space operations.
                        10 jurisdictions. 119 regulatory articles. Automated
                        document generation, NCA submission, and cryptographic
                        compliance proof.
                      </p>
                      <Link
                        href="/platform"
                        onClick={closeMenu}
                        className="inline-flex items-center gap-1.5 mt-3 text-[13px] text-[#999] hover:text-white transition-colors"
                      >
                        Learn more
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </motion.div>

                  {/* Right — Quick Links + CTA */}
                  <motion.div
                    className="md:col-span-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#999] mb-8">
                      Quick Links
                    </p>
                    <div className="flex flex-col">
                      {navSections.quickLinks.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={closeMenu}
                          className="py-2.5 text-[14px] text-[#aaa] hover:text-white transition-colors duration-200 border-b border-[#161616] last:border-0"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    <div className="mt-10">
                      <Link
                        href="/demo"
                        onClick={closeMenu}
                        className="inline-flex items-center justify-center w-full h-12 text-[14px] font-medium rounded-lg border border-[#262626] text-white hover:bg-white hover:text-black transition-all duration-300"
                      >
                        Request Demo
                      </Link>
                      <Link
                        href="/assessment"
                        onClick={closeMenu}
                        className="inline-flex items-center justify-center w-full h-12 mt-2 text-[14px] font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-all duration-300"
                      >
                        Start Free Assessment
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Footer */}
              <div className="max-w-[1400px] w-full mx-auto px-6 md:px-12 pb-8">
                <div className="border-t border-[#1a1a1a] pt-5 flex items-center justify-between">
                  <p className="text-[11px] text-[#555]">
                    European Space Compliance Intelligence
                  </p>
                  <p className="text-[11px] text-[#555]">
                    &copy; {new Date().getFullYear()} Caelex
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
