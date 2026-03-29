"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
    { label: "Shield", href: "/platform" },
    { label: "Sentinel", href: "/platform" },
    { label: "Ephemeris", href: "/systems/ephemeris" },
    { label: "Verity", href: "/verity" },
    { label: "Resources", href: "/resources" },
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

// ─── Search Config ──────────────────────────────────────────────────────────

const POPULAR_SEARCHES = [
  { label: "EU Space Act", href: "/resources/eu-space-act" },
  { label: "NIS2", href: "/solutions/cybersecurity-nis2" },
  { label: "Debris Mitigation", href: "/modules/debris" },
  { label: "Authorization", href: "/modules/authorization" },
  { label: "Compliance Assessment", href: "/assessment" },
];

const SEARCH_PAGES = [
  {
    title: "EU Space Act Overview",
    href: "/resources/eu-space-act",
    category: "Regulation",
  },
  {
    title: "NIS2 Cybersecurity Directive",
    href: "/solutions/cybersecurity-nis2",
    category: "Regulation",
  },
  {
    title: "Debris Mitigation Module",
    href: "/modules/debris",
    category: "Module",
  },
  {
    title: "Authorization & Licensing",
    href: "/modules/authorization",
    category: "Module",
  },
  {
    title: "Cybersecurity Module",
    href: "/modules/cybersecurity",
    category: "Module",
  },
  {
    title: "Environmental Compliance",
    href: "/modules/environmental",
    category: "Module",
  },
  { title: "Insurance Module", href: "/modules/insurance", category: "Module" },
  {
    title: "Space Insurance Solutions",
    href: "/solutions/space-insurance",
    category: "Solution",
  },
  { title: "Platform Overview", href: "/platform", category: "Platform" },
  { title: "Pricing Plans", href: "/pricing", category: "Platform" },
  { title: "Security", href: "/security", category: "Platform" },
  {
    title: "Regulatory Timeline",
    href: "/resources/timeline",
    category: "Resource",
  },
  { title: "Glossary", href: "/resources/glossary", category: "Resource" },
  { title: "FAQ", href: "/resources/faq", category: "Resource" },
  { title: "Free Assessment", href: "/assessment", category: "Tool" },
  { title: "API Documentation", href: "/docs/api", category: "Developer" },
  { title: "Verity — Compliance Proof", href: "/verity", category: "Product" },
  {
    title: "Sentinel — Satellite Monitoring",
    href: "/sentinel",
    category: "Product",
  },
  {
    title: "Ephemeris — Compliance Forecasting",
    href: "/systems/ephemeris",
    category: "Product",
  },
  {
    title: "ASTRA — AI Compliance Copilot",
    href: "/dashboard/astra",
    category: "Product",
  },
  { title: "About Caelex", href: "/about", category: "Company" },
  { title: "Contact", href: "/contact", category: "Company" },
  { title: "Request a Demo", href: "/demo", category: "Company" },
  { title: "Blog", href: "/blog", category: "Resource" },
  { title: "Careers", href: "/careers", category: "Company" },
];

export default function Navigation({ theme = "dark" }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
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

  // Close menu/search on route change
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
  }, [pathname]);

  // Prevent body scroll when menu or search is open
  useEffect(() => {
    document.body.style.overflow = menuOpen || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
          setSearchQuery("");
        } else if (menuOpen) {
          setMenuOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, searchOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [searchOpen]);

  // Focus trap for menu overlay (WCAG 2.4.3)
  useEffect(() => {
    if (!menuOpen) return;

    // Focus first link in menu after animation
    const timer = setTimeout(() => {
      const menu = document.getElementById("nav-menu");
      if (!menu) return;
      const firstFocusable = menu.querySelector("a, button") as HTMLElement;
      firstFocusable?.focus();
    }, 100);

    // Focus trap — Tab cycles only within menu
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const menu = document.getElementById("nav-menu");
      if (!menu) return;
      const focusable = menu.querySelectorAll("a, button, input");
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      menuTriggerRef.current?.focus(); // Return focus on close
    };
  }, [menuOpen]);

  // Focus trap for search overlay (WCAG 2.4.3)
  useEffect(() => {
    if (!searchOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const overlay = document.getElementById("search-overlay");
      if (!overlay) return;
      const focusable = overlay.querySelectorAll("a, button, input");
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      searchTriggerRef.current?.focus(); // Return focus on close
    };
  }, [searchOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  // ESC to close search
  useEffect(() => {
    if (!searchOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [searchOpen, closeSearch]);

  const searchResults =
    searchQuery.trim().length >= 2
      ? (() => {
          const q = searchQuery.toLowerCase().trim();
          // Score each page: exact match > starts with > includes > fuzzy
          const scored = SEARCH_PAGES.map((p) => {
            const title = p.title.toLowerCase();
            const cat = p.category.toLowerCase();
            let score = 0;
            if (title === q) score = 100;
            else if (title.startsWith(q)) score = 80;
            else if (title.includes(q)) score = 60;
            else if (cat.includes(q)) score = 40;
            // Simple fuzzy: check if each character of query exists in order
            else {
              let qi = 0;
              for (let i = 0; i < title.length && qi < q.length; i++) {
                if (title[i] === q[qi]) qi++;
              }
              if (qi >= q.length * 0.7) score = 20;
            }
            return { ...p, score };
          })
            .filter((p) => p.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
          return scored;
        })()
      : [];

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
                  href="/get-started"
                  className="hidden sm:inline-flex items-center justify-center h-10 px-5 text-[13px] font-medium tracking-wide rounded-lg bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F9FAFB] transition-all duration-300"
                >
                  Get Started
                </Link>

                {/* Search + Hamburger — white bg, subtle border, soft radius */}
                <div className="flex items-center rounded-lg bg-white border border-[#E5E7EB] overflow-hidden">
                  <button
                    ref={searchTriggerRef}
                    onClick={() => {
                      setSearchOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors duration-200"
                    aria-label="Search"
                  >
                    <Search size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <div className="w-px h-5 bg-[#E5E7EB]" />
                  <button
                    ref={menuTriggerRef}
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
            {/* Background — clean white */}
            <div className="absolute inset-0 bg-white" />

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
                      <Logo size={34} className="text-[#1d1d1f]" />
                    </Link>

                    <div className="flex items-center gap-3">
                      <Link
                        href="/get-started"
                        onClick={closeMenu}
                        className="hidden sm:inline-flex items-center justify-center h-10 px-5 text-[13px] font-medium tracking-wide rounded-lg bg-[#1d1d1f] text-white hover:bg-[#333] transition-all duration-300"
                      >
                        Get Started
                      </Link>
                      <div className="flex items-center rounded-lg bg-[#F3F4F6] overflow-hidden">
                        <button
                          onClick={() => {
                            setSearchOpen(true);
                            setMenuOpen(false);
                          }}
                          className="flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#1d1d1f] hover:bg-[#E5E7EB] transition-colors duration-200"
                          aria-label="Search"
                        >
                          <Search
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </button>
                        <div className="w-px h-5 bg-[#D1D5DB]" />
                        <button
                          onClick={closeMenu}
                          className="flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#1d1d1f] hover:bg-[#E5E7EB] transition-colors duration-200"
                          aria-label="Close menu"
                        >
                          <X size={16} strokeWidth={2} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full border-t border-[#E5E7EB]" />

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
                    <p
                      style={{ color: "#86868b" }}
                      className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-8"
                    >
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
                                  ? "text-[#1d1d1f]"
                                  : "text-[#1d1d1f] hover:text-[#86868b]"
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
                                  className="flex items-center gap-2.5 py-1 pl-2 text-[15px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors duration-200"
                                >
                                  <span className="text-[#c8cacd]">
                                    &#8627;
                                  </span>
                                  {child.label}
                                </Link>
                              ))}
                          </div>
                        ))}
                      </div>

                      {/* Auth — prominent, above divider */}
                      <div className="flex flex-col gap-1 mt-6">
                        <Link
                          href="/login"
                          onClick={closeMenu}
                          className="py-2 text-[18px] font-normal text-[#6e6e73] hover:text-[#1d1d1f] transition-colors duration-200"
                        >
                          Log in
                        </Link>
                        <Link
                          href="/signup"
                          onClick={closeMenu}
                          className="py-2 text-[18px] font-normal text-[#6e6e73] hover:text-[#1d1d1f] transition-colors duration-200"
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
                      <p
                        style={{ color: "#86868b" }}
                        className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                      >
                        Latest News
                      </p>
                      <Link
                        href="/blog"
                        onClick={closeMenu}
                        className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#86868b] hover:text-[#1d1d1f] transition-colors"
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
                          <div className="aspect-[16/10] rounded-lg overflow-hidden mb-3 bg-[#F3F4F6] border border-[#E5E7EB]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={news.image}
                              alt={news.title}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                              loading="lazy"
                            />
                          </div>
                          <p
                            style={{ color: "#9a9ea3" }}
                            className="text-[11px] mb-1.5 uppercase tracking-wider"
                          >
                            {news.category} &middot; {news.date}
                          </p>
                          <p
                            style={{ color: "#2d2d2d" }}
                            className="text-[14px] font-medium leading-snug group-hover:text-[#1d1d1f] transition-colors"
                          >
                            {news.title}
                          </p>
                        </Link>
                      ))}
                    </div>

                    {/* Platform Description */}
                    <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
                      <p
                        style={{ color: "#86868b" }}
                        className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-4"
                      >
                        Platform
                      </p>
                      <p
                        style={{ color: "#6e6e73" }}
                        className="text-[14px] leading-relaxed"
                      >
                        Compliance intelligence for European space operations.
                        10 jurisdictions. 119 regulatory articles. Automated
                        document generation, NCA submission, and cryptographic
                        compliance proof.
                      </p>
                      <Link
                        href="/platform"
                        onClick={closeMenu}
                        className="inline-flex items-center gap-1.5 mt-3 text-[13px] text-[#86868b] hover:text-[#1d1d1f] transition-colors"
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
                    <p
                      style={{ color: "#86868b" }}
                      className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-8"
                    >
                      Quick Links
                    </p>
                    <div className="flex flex-col">
                      {navSections.quickLinks.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={closeMenu}
                          className="py-2.5 text-[14px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors duration-200 border-b border-[#E5E7EB] last:border-0"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    {/* LinkedIn */}
                    <a
                      href="https://www.linkedin.com/company/caelex"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 py-2.5 mt-4 text-[14px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors duration-200 border-b border-[#E5E7EB]"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </a>

                    <div className="mt-8">
                      <Link
                        href="/demo"
                        onClick={closeMenu}
                        className="inline-flex items-center justify-center w-full h-12 text-[14px] font-medium rounded-lg border border-[#E5E7EB] text-[#1d1d1f] hover:bg-[#1d1d1f] hover:text-white transition-all duration-300"
                      >
                        Request Demo
                      </Link>
                      <Link
                        href="/get-started"
                        onClick={closeMenu}
                        className="inline-flex items-center justify-center w-full h-12 mt-2 text-[14px] font-medium rounded-lg bg-white text-black hover:bg-white/90 transition-all duration-300"
                      >
                        Get Started
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Footer */}
              <div className="max-w-[1400px] w-full mx-auto px-6 md:px-12 pb-8">
                <div className="border-t border-[#E5E7EB] pt-5 flex items-center justify-between">
                  <p style={{ color: "#9a9ea3" }} className="text-[11px]">
                    European Space Compliance Intelligence
                  </p>
                  <p style={{ color: "#9a9ea3" }} className="text-[11px]">
                    &copy; {new Date().getFullYear()} Caelex
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Search Overlay — Palantir-style fullscreen search ═══ */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            id="search-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="fixed inset-0 z-[70]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-white" />

            <div className="relative h-full flex flex-col">
              {/* Header */}
              <div className="max-w-[1400px] w-full mx-auto px-6 md:px-12 relative z-10">
                <div className="flex items-center justify-between h-20">
                  <div className="flex items-center justify-between w-full px-5 py-2.5">
                    <Link
                      href="/"
                      onClick={closeSearch}
                      className="transition-opacity duration-300 hover:opacity-70"
                    >
                      <Logo size={34} className="text-[#1d1d1f]" />
                    </Link>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/get-started"
                        onClick={closeSearch}
                        className="hidden sm:inline-flex items-center justify-center h-10 px-5 text-[13px] font-medium tracking-wide rounded-lg bg-[#1d1d1f] text-white hover:bg-[#333] transition-all duration-300"
                      >
                        Get Started
                      </Link>
                      <div className="flex items-center rounded-lg bg-[#F3F4F6] overflow-hidden">
                        <button
                          onClick={() => {
                            closeSearch();
                            setMenuOpen(true);
                          }}
                          className="flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#1d1d1f] hover:bg-[#E5E7EB] transition-colors duration-200"
                          aria-label="Open menu"
                        >
                          <Menu size={16} strokeWidth={2} />
                        </button>
                        <div className="w-px h-5 bg-[#D1D5DB]" />
                        <button
                          onClick={closeSearch}
                          className="flex items-center justify-center w-10 h-10 text-[#6B7280] hover:text-[#1d1d1f] hover:bg-[#E5E7EB] transition-colors duration-200"
                          aria-label="Close search"
                        >
                          <X size={16} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Content — centered vertically */}
              <div className="flex-1 flex flex-col justify-center max-w-[1400px] w-full mx-auto px-11 md:px-[4.25rem] -mt-20">
                {/* Large Search Input */}
                <div className="mb-6">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchResults.length > 0) {
                        router.push(searchResults[0].href);
                        closeSearch();
                      }
                    }}
                    placeholder="Start typing to search"
                    className="w-full bg-transparent text-[clamp(1.5rem,4vw,3rem)] font-light tracking-[-0.02em] placeholder-[#c8cacd] outline-none caret-[#1d1d1f] border-none ring-0 focus:ring-0 focus:outline-none appearance-none"
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      boxShadow: "none",
                      color: "#1d1d1f",
                      WebkitTextFillColor: "#1d1d1f",
                    }}
                  />
                  <div className="h-px bg-[#E5E7EB] mt-4" />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    {searchResults.map((result) => (
                      <Link
                        key={result.href}
                        href={result.href}
                        onClick={closeSearch}
                        className="flex items-center justify-between py-3 group"
                      >
                        <span className="text-[18px] text-[#6e6e73] group-hover:text-[#1d1d1f] transition-colors">
                          {result.title}
                        </span>
                        <span className="text-[12px] uppercase tracking-wider text-[#9a9ea3] group-hover:text-[#6e6e73] transition-colors">
                          {result.category}
                        </span>
                      </Link>
                    ))}
                  </motion.div>
                ) : searchQuery.length > 0 ? (
                  <p style={{ color: "#9a9ea3" }} className="text-[16px]">
                    No results for &ldquo;{searchQuery}&rdquo;
                  </p>
                ) : (
                  /* Popular Searches */
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9a9ea3]">
                      Popular Searches
                    </span>
                    {POPULAR_SEARCHES.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={closeSearch}
                        className="text-[15px] text-[#86868b] hover:text-[#1d1d1f] underline underline-offset-4 decoration-[#d2d2d7] hover:decoration-[#1d1d1f] transition-all duration-200"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
