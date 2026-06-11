"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Logo from "@/components/ui/Logo";
import { Menu, X, Search } from "lucide-react";

interface NavigationProps {
  theme?: "light" | "dark";
  /** Full-bleed header bar (edge-to-edge) instead of the centered floating bar. */
  fullWidth?: boolean;
  /** Transparent bar + outlined (ghost) buttons for floating over a dark hero. */
  ghost?: boolean;
}

// ─── Navigation Structure (Palantir anatomy: ONE flagship family whose
//     large ↳ children are the Our-Software product lineup, then flat
//     secondary entries — mirrors "Generate Alpha → AIP/Foundry/…" +
//     Offerings / Impact Studies / Documentation / Careers / Newsroom) ──────

const navSections = {
  primary: [
    {
      label: "Platform",
      href: "/platform",
      // EXACTLY the SoftwareShowcase lineup (labels + hrefs in parity).
      children: [
        { label: "Comply", href: "/platform" },
        { label: "Trade", href: "/trade-access" },
        { label: "Atlas", href: "/atlas-access" },
        { label: "Sentinel", href: "/sentinel" },
        { label: "Ephemeris", href: "/systems/ephemeris" },
        { label: "Verity", href: "/verity" },
      ],
    },
    { label: "Modules", href: "/modules" },
    { label: "Assessment", href: "/assessment/quick" },
    { label: "Resources", href: "/resources" },
    { label: "Documentation", href: "/docs/api" },
    { label: "Careers", href: "/careers" },
    { label: "Newsroom", href: "/blog" },
  ],
  quickLinks: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Legal Network", href: "/legal-network" },
  ],
};

// ─── Rotating News Items (2 shown at a time, rotates bi-weekly) ─────────────

// Every item must be TRUE and link to a real destination — the menu's
// "Latest News" follows the same disclosure bar as /changelog (no invented
// products, no unverified regulatory claims).
const NEWS_ITEMS = [
  {
    date: "June 2026",
    category: "Product",
    title:
      "Free 3-minute quick check is live — map your EU Space Act obligations",
    href: "/assessment/quick",
    image: "/images/nav/news-1.jpg",
  },
  {
    date: "June 2026",
    category: "Product",
    title: "Passage: export control that explains itself",
    href: "/changelog",
    image: "/images/nav/news-2.jpg",
  },
  {
    date: "February 2026",
    category: "Compliance",
    title:
      "NIS2 Directive now applies to space — 5 things every operator must do",
    href: "/solutions/cybersecurity-nis2",
    image: "/images/nav/news-3.jpg",
  },
  {
    date: "May 2026",
    category: "Product",
    title: "Screening that follows the ownership chain",
    href: "/changelog",
    image: "/images/nav/news-4.jpg",
  },
  {
    date: "January 2026",
    category: "Industry",
    title:
      "10 European jurisdictions, one platform — how Caelex maps the regulatory landscape",
    href: "/modules",
    image: "/images/nav/news-5.jpg",
  },
  {
    date: "January 2026",
    category: "Timeline",
    title:
      "Regulatory deadlines 2026–2028: the critical dates for EU space operators",
    href: "/resources/timeline",
    image: "/images/nav/news-6.jpg",
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
  { label: "Compliance Assessment", href: "/assessment/quick" },
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
  { title: "Security", href: "/security", category: "Platform" },
  {
    title: "Regulatory Timeline",
    href: "/resources/timeline",
    category: "Resource",
  },
  { title: "Glossary", href: "/resources/glossary", category: "Resource" },
  { title: "FAQ", href: "/resources/faq", category: "Resource" },
  { title: "Free Assessment", href: "/assessment/quick", category: "Tool" },
  { title: "Export Control Check", href: "/passage/check", category: "Tool" },
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

export default function Navigation({
  theme = "dark",
  fullWidth = false,
  ghost = false,
}: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const isLight = theme === "light";
  const isLandingHero = pathname === "/";

  // Palantir-style row cascade for the menu overlay: every row slides up
  // with a running stagger. Reduced motion → rows render statically.
  const rowAnim = (idx: number) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.35,
            delay: 0.05 + idx * 0.04,
            ease: "easeOut" as const,
          },
        };

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
        <div
          className={
            fullWidth
              ? "w-full px-3 sm:px-4"
              : // Near-full-width floating bar: a small side margin so the rounded
                // glass pill rounds off just before the viewport edge (not the old
                // narrow max-w-1400 that left big gaps on wide screens).
                "w-full px-3 sm:px-4 md:px-5"
          }
        >
          <div className="flex items-center justify-between h-20">
            {/* Glass Bar */}
            <div
              className={`flex items-center justify-between w-full ${fullWidth ? "rounded-2xl px-6 md:px-8" : "rounded-xl px-5"} py-2.5 transition-all duration-700 ${
                ghost
                  ? "bg-white/[0.08] backdrop-blur-xl backdrop-saturate-150"
                  : isLight
                    ? scrolled
                      ? // Palantir-style near-invisible glass: the bar itself
                        // almost disappears, so the logo + buttons read as
                        // floating over the content instead of living inside
                        // a framed container. No visible border, no shadow,
                        // minimal blur, very low opacity — just enough to
                        // tint the pixels behind the floating elements.
                        //   bg-white/20 (~80% bleed-through, nearly see-through)
                        //   backdrop-blur-sm = 4px (softens but doesn't smear)
                        //   no border, no shadow, no inset highlight
                        "bg-white/20 backdrop-blur-sm backdrop-saturate-150"
                      : "bg-transparent"
                    : scrolled
                      ? "bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
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
                  style={{
                    fontFamily: "var(--font-geist), system-ui, sans-serif",
                  }}
                  className={`hidden sm:inline-flex items-center justify-center h-10 px-8 text-[16px] font-normal rounded-none transition-colors duration-200 ${
                    ghost
                      ? "border border-white/50 bg-transparent text-white hover:bg-white hover:text-[#1E1F2B]"
                      : "bg-white text-[#1E1F2B] border border-[#1E1F2B] hover:bg-[#1E1F2B] hover:text-white"
                  }`}
                >
                  Get Started
                </Link>

                {/* Search + Hamburger — white bg, subtle border, soft radius */}
                <div
                  className={`flex items-center overflow-hidden rounded-none ${
                    ghost
                      ? "border border-white/50 bg-transparent"
                      : "bg-white border border-[#1E1F2B]"
                  }`}
                >
                  <button
                    ref={searchTriggerRef}
                    onClick={() => {
                      setSearchOpen(true);
                      setMenuOpen(false);
                    }}
                    className={`flex items-center justify-center w-10 h-10 transition-colors duration-200 ${
                      ghost
                        ? "text-white/80 hover:text-white hover:bg-white/10"
                        : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
                    }`}
                    aria-label="Search"
                  >
                    <Search size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <div
                    className={`w-px h-5 ${ghost ? "bg-white/25" : "bg-[#E5E7EB]"}`}
                  />
                  <button
                    ref={menuTriggerRef}
                    onClick={() => setMenuOpen(!menuOpen)}
                    className={`flex items-center justify-center w-10 h-10 transition-colors duration-200 ${
                      ghost
                        ? "text-white/80 hover:text-white hover:bg-white/10"
                        : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]"
                    }`}
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
            {/* Background — Palantir near-black */}
            <div className="absolute inset-0 bg-[#0A0A0C]" />

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
                        href="/get-started"
                        onClick={closeMenu}
                        className="hidden sm:inline-flex items-center justify-center h-10 px-8 text-[16px] font-normal rounded-none border border-white/50 bg-transparent text-white hover:bg-white hover:text-[#1E1F2B] transition-colors duration-200"
                      >
                        Get Started
                      </Link>
                      <div className="flex items-center overflow-hidden rounded-none border border-white/50">
                        <button
                          onClick={() => {
                            setSearchOpen(true);
                            setMenuOpen(false);
                          }}
                          className="flex items-center justify-center w-10 h-10 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200"
                          aria-label="Search"
                        >
                          <Search
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </button>
                        <div className="w-px h-5 bg-white/25" />
                        <button
                          onClick={closeMenu}
                          className="flex items-center justify-center w-10 h-10 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200"
                          aria-label="Close menu"
                        >
                          <X size={16} strokeWidth={2} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-column Body */}
              <div className="flex-1 max-w-[1400px] w-full mx-auto px-6 md:px-12 py-10 md:py-14">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-6">
                  {/* Left — Primary Navigation (Palantir anatomy: thin top
                      rule, micro-caps label, large white entries, large
                      ↳-children) */}
                  <motion.div
                    className="md:col-span-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                  >
                    <div className="border-t border-white/30 pt-4 mb-8">
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                        Navigation
                      </p>
                    </div>
                    <nav aria-label="Primary navigation">
                      <div className="flex flex-col gap-0.5">
                        {(() => {
                          // Running row index → one continuous cascade
                          // across parents AND ↳ children (Palantir feel).
                          let row = 0;
                          return navSections.primary.map((link) => (
                            <div key={link.label}>
                              <motion.div {...rowAnim(row++)}>
                                <Link
                                  href={link.href}
                                  onClick={closeMenu}
                                  className="block py-1.5 text-[32px] md:text-[38px] font-normal tracking-[-0.03em] text-white hover:text-white/60 transition-colors duration-200"
                                >
                                  {link.label}
                                </Link>
                              </motion.div>
                              {"children" in link &&
                                link.children?.map((child) => (
                                  <motion.div
                                    key={child.label}
                                    {...rowAnim(row++)}
                                  >
                                    <Link
                                      href={child.href}
                                      onClick={closeMenu}
                                      className="flex items-baseline gap-3 py-1 pl-1 text-[22px] md:text-[26px] font-normal tracking-[-0.02em] text-white/90 hover:text-white/55 transition-colors duration-200"
                                    >
                                      <span
                                        aria-hidden="true"
                                        className="text-white/35 text-[20px]"
                                      >
                                        &#8627;
                                      </span>
                                      {child.label}
                                    </Link>
                                  </motion.div>
                                ))}
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Auth — prominent, above divider */}
                      <div className="flex flex-col gap-1 mt-8">
                        <Link
                          href="/login"
                          onClick={closeMenu}
                          className="py-1.5 text-[17px] font-normal text-white/60 hover:text-white transition-colors duration-200"
                        >
                          Log in
                        </Link>
                        <Link
                          href="/signup"
                          onClick={closeMenu}
                          className="py-1.5 text-[17px] font-normal text-white/60 hover:text-white transition-colors duration-200"
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
                    <div className="border-t border-white/30 pt-4 mb-8 flex items-center justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                        Latest News
                      </p>
                      <Link
                        href="/blog"
                        onClick={closeMenu}
                        className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/70 hover:text-white underline underline-offset-4 decoration-white/40 transition-colors"
                      >
                        Newsroom &#8599;
                      </Link>
                    </div>

                    {/* News Cards — rotates bi-weekly */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {getCurrentNews().map((news, newsIdx) => (
                        <motion.div
                          key={news.title}
                          {...(prefersReducedMotion
                            ? {}
                            : {
                                initial: { opacity: 0, y: 14 },
                                animate: { opacity: 1, y: 0 },
                                transition: {
                                  duration: 0.35,
                                  delay: 0.18 + newsIdx * 0.08,
                                  ease: "easeOut" as const,
                                },
                              })}
                        >
                          <Link
                            href={news.href}
                            onClick={closeMenu}
                            className="group block"
                          >
                            <p className="text-[11px] mb-2 uppercase tracking-wider text-white/50">
                              {news.category} &middot; {news.date}
                            </p>
                            <div className="relative aspect-[16/10] overflow-hidden mb-3 bg-white/[0.06]">
                              <Image
                                src={news.image}
                                alt={news.title}
                                fill
                                sizes="(min-width: 768px) 360px, 90vw"
                                className="object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                              />
                            </div>
                            <p className="text-[15px] font-medium leading-snug text-white group-hover:text-white/80 transition-colors">
                              {news.title}
                            </p>
                            <span className="inline-flex items-baseline gap-2 mt-2 text-[13px] text-white/70 group-hover:text-white underline underline-offset-4 decoration-white/40 transition-colors">
                              <span
                                aria-hidden="true"
                                className="text-white/40"
                              >
                                &#8627;
                              </span>
                              Read more
                            </span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>

                    {/* Resources teaser (Palantir's view-all divider row) */}
                    <div className="mt-8 pt-4 border-t border-white/20 flex justify-end">
                      <Link
                        href="/resources"
                        onClick={closeMenu}
                        className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/70 hover:text-white underline underline-offset-4 decoration-white/40 transition-colors"
                      >
                        View all resources &#8599;
                      </Link>
                    </div>
                  </motion.div>

                  {/* Right — Platform statement (Palantir's "Offerings"
                      anatomy) + plain quick links pinned to the bottom */}
                  <motion.div
                    className="md:col-span-3 flex flex-col"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                  >
                    <div className="border-t border-white/30 pt-4 mb-8 flex items-center justify-between">
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/55">
                        Platform
                      </p>
                      <Link
                        href="/platform"
                        onClick={closeMenu}
                        className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/70 hover:text-white underline underline-offset-4 decoration-white/40 transition-colors"
                      >
                        View all &#8599;
                      </Link>
                    </div>

                    <p className="text-[19px] md:text-[22px] font-normal leading-snug tracking-[-0.01em] text-white">
                      Compliance intelligence for European space operations — 10
                      jurisdictions, 119 regulatory articles, automated document
                      generation, NCA submission, and cryptographic compliance
                      proof.
                    </p>
                    <div className="mt-5 flex flex-col gap-2.5">
                      <Link
                        href="/platform"
                        onClick={closeMenu}
                        className="inline-flex items-baseline gap-2 text-[14px] text-white/80 hover:text-white underline underline-offset-4 decoration-white/40 transition-colors"
                      >
                        <span aria-hidden="true" className="text-white/40">
                          &#8627;
                        </span>
                        Learn more about the Platform
                      </Link>
                      <Link
                        href="/demo"
                        onClick={closeMenu}
                        className="inline-flex items-baseline gap-2 text-[14px] text-white/80 hover:text-white underline underline-offset-4 decoration-white/40 transition-colors"
                      >
                        <span aria-hidden="true" className="text-white/40">
                          &#8627;
                        </span>
                        Request a demo
                      </Link>
                    </div>

                    {/* Bottom-pinned plain links (Palantir bottom-right) */}
                    <div className="mt-auto pt-12 flex flex-col gap-2">
                      {navSections.quickLinks.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={closeMenu}
                          className="text-[15px] text-white/75 hover:text-white transition-colors duration-200"
                        >
                          {link.label}
                        </Link>
                      ))}
                      <a
                        href="https://www.linkedin.com/company/caelex"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[15px] text-white/75 hover:text-white transition-colors duration-200"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        LinkedIn
                      </a>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Footer */}
              <div className="max-w-[1400px] w-full mx-auto px-6 md:px-12 pb-8">
                <div className="border-t border-white/15 pt-5 flex items-center justify-between">
                  <p className="text-[11px] text-white/40">
                    European Space Compliance Intelligence
                  </p>
                  <p className="text-[11px] text-white/40">
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
            <div className="absolute inset-0 bg-[#0A0A0C]" />

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
                      <Logo size={34} className="text-white" />
                    </Link>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/get-started"
                        onClick={closeSearch}
                        className="hidden sm:inline-flex items-center justify-center h-10 px-8 text-[16px] font-normal rounded-none border border-white/50 bg-transparent text-white hover:bg-white hover:text-[#1E1F2B] transition-colors duration-200"
                      >
                        Get Started
                      </Link>
                      <div className="flex items-center overflow-hidden rounded-none border border-white/50">
                        <button
                          onClick={() => {
                            closeSearch();
                            setMenuOpen(true);
                          }}
                          className="flex items-center justify-center w-10 h-10 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200"
                          aria-label="Open menu"
                        >
                          <Menu size={16} strokeWidth={2} />
                        </button>
                        <div className="w-px h-5 bg-white/25" />
                        <button
                          onClick={closeSearch}
                          className="flex items-center justify-center w-10 h-10 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200"
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
                    className="w-full bg-transparent text-[clamp(1.5rem,4vw,3rem)] font-light tracking-[-0.02em] placeholder-white/30 outline-none caret-white border-none ring-0 focus:ring-0 focus:outline-none appearance-none"
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      boxShadow: "none",
                      color: "#ffffff",
                      WebkitTextFillColor: "#ffffff",
                    }}
                  />
                  <div className="h-px bg-white/20 mt-4" />
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
                        <span className="text-[18px] text-white/70 group-hover:text-white transition-colors">
                          {result.title}
                        </span>
                        <span className="text-[12px] uppercase tracking-wider text-white/40 group-hover:text-white/70 transition-colors">
                          {result.category}
                        </span>
                      </Link>
                    ))}
                  </motion.div>
                ) : searchQuery.length > 0 ? (
                  <p className="text-[16px] text-white/40">
                    No results for &ldquo;{searchQuery}&rdquo;
                  </p>
                ) : (
                  /* Popular Searches */
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
                      Popular Searches
                    </span>
                    {POPULAR_SEARCHES.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={closeSearch}
                        className="text-[15px] text-white/65 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-all duration-200"
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
