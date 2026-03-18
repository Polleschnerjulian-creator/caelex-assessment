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

const navLinks = [
  { label: "Platform", href: "/platform" },
  { label: "Resources", href: "/resources" },
  { label: "Modules", href: "/modules" },
  { label: "Pricing", href: "/pricing" },
];

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
            transition={{ duration: 0.3 }}
          >
            {/* Dark backdrop */}
            <motion.div
              className="absolute inset-0 bg-[#050A18]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />

            {/* Menu content */}
            <motion.div
              className="relative h-full flex flex-col"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.35,
                delay: 0.05,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              {/* Menu Header */}
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

                    <button
                      onClick={closeMenu}
                      className="p-2 text-white/70 hover:text-white transition-colors duration-300"
                      aria-label="Close menu"
                    >
                      <X size={20} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Menu Links */}
              <div className="flex-1 flex flex-col justify-center max-w-[1400px] w-full mx-auto px-11 md:px-[4.25rem] -mt-20">
                <nav aria-label="Main menu navigation">
                  {/* Primary navigation links */}
                  <div className="flex flex-col gap-1">
                    {navLinks.map((link, i) => (
                      <motion.div
                        key={link.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.1 + i * 0.06,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                      >
                        <Link
                          href={link.href}
                          onClick={closeMenu}
                          className={`group flex items-center gap-4 py-3 md:py-4 text-display-sm md:text-display font-light tracking-[-0.02em] transition-all duration-300 ${
                            pathname === link.href
                              ? "text-white"
                              : "text-white/50 hover:text-white"
                          }`}
                        >
                          <span>{link.label}</span>
                          <ArrowRight
                            size={20}
                            className="opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-300"
                            aria-hidden="true"
                          />
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  {/* Divider */}
                  <motion.div
                    className="h-px bg-white/[0.08] my-6 md:my-8"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    style={{ transformOrigin: "left" }}
                  />

                  {/* Auth links */}
                  <motion.div
                    className="flex flex-col gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.35 }}
                  >
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className="py-2 md:py-3 text-body-lg md:text-subtitle text-white/40 hover:text-white transition-colors duration-300"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={closeMenu}
                      className="py-2 md:py-3 text-body-lg md:text-subtitle text-white/40 hover:text-white transition-colors duration-300"
                    >
                      Sign up
                    </Link>
                  </motion.div>

                  {/* CTA */}
                  <motion.div
                    className="mt-8 md:mt-10"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.45 }}
                  >
                    <Link
                      href="/demo"
                      onClick={closeMenu}
                      className="inline-flex items-center justify-center h-11 px-7 text-subtitle font-medium rounded-full border border-white/30 text-white hover:bg-white hover:text-black transition-all duration-300"
                    >
                      Request Demo
                    </Link>
                  </motion.div>
                </nav>
              </div>

              {/* Bottom bar */}
              <motion.div
                className="max-w-[1400px] w-full mx-auto px-11 md:px-[4.25rem] pb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <p className="text-caption text-white/20">
                  Space regulatory compliance, simplified.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
