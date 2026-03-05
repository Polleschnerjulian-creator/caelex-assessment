"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Menu, X } from "lucide-react";

interface NavigationProps {
  theme?: "light" | "dark";
}

export default function Navigation({ theme = "dark" }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // Close mobile menu on route change / resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // On landing page: start transparent/white over dark hero, transition when scrolled
  // On all other pages: always show dark text (light background, no dark hero)
  const showDarkText =
    isLight && (isLandingHero ? scrolled || mobileOpen : true);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 ${showDarkText ? "" : "dark-section"}`}
        aria-label="Main navigation"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Glass Bar — transparent at top, solid when scrolled */}
            <div
              className={`flex items-center justify-between w-full rounded-xl px-5 py-2.5 transition-all duration-700 ${
                isLight
                  ? scrolled || mobileOpen
                    ? "bg-white/80 backdrop-blur-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
                    : "bg-white/[0.03] backdrop-blur-sm border border-white/[0.06]"
                  : scrolled || mobileOpen
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
                  size={28}
                  className={`transition-colors duration-700 ${showDarkText ? "text-[#111827]" : "text-white"}`}
                />
              </Link>

              {/* Right Side Navigation */}
              <div className="flex items-center gap-6">
                {/* Links */}
                {["Platform", "Resources", "Modules"].map((label) => (
                  <Link
                    key={label}
                    href={`/${label.toLowerCase()}`}
                    className={`hidden md:block text-body transition-colors duration-700 ${
                      showDarkText
                        ? "text-[#4B5563] hover:text-[#111827]"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                ))}

                {/* Auth + CTAs */}
                <div className="hidden md:flex items-center gap-4">
                  <Link
                    href="/login"
                    className={`text-body transition-colors duration-700 ${
                      showDarkText
                        ? "text-[#4B5563] hover:text-[#111827]"
                        : "text-white/45 hover:text-white"
                    }`}
                  >
                    Log in
                  </Link>
                  <Button
                    href="/demo"
                    variant={showDarkText ? "landing-outline" : "white-outline"}
                    size="sm"
                  >
                    Request Demo
                  </Button>
                  <Button
                    href="/assessment"
                    variant={showDarkText ? "landing-primary" : "white"}
                    size="sm"
                  >
                    Start Assessment
                  </Button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className={`md:hidden p-2 transition-colors duration-700 ${
                    showDarkText
                      ? "text-[#4B5563] hover:text-[#111827]"
                      : "text-white/70 hover:text-white"
                  }`}
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-menu"
                >
                  {mobileOpen ? (
                    <X size={20} aria-hidden="true" />
                  ) : (
                    <Menu size={20} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 md:hidden"
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            {/* Backdrop */}
            <div
              className={`absolute inset-0 ${
                isLight
                  ? "bg-black/20 backdrop-blur-sm"
                  : "bg-black/80 backdrop-blur-sm"
              }`}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Content */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className={`relative mt-20 mx-6 p-6 rounded-xl border ${
                isLight
                  ? "bg-white border-[#E5E7EB] shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
                  : "bg-dark-surface border-white/[0.08]"
              }`}
              role="navigation"
              aria-label="Mobile navigation"
            >
              <div className="flex flex-col gap-1">
                {/* Primary CTAs */}
                <Link
                  href="/assessment"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-body-lg font-medium transition-colors ${
                    isLight
                      ? "bg-[#111827] text-white hover:bg-[#374151]"
                      : "bg-white text-black hover:bg-white/90"
                  }`}
                >
                  Start Assessment
                </Link>
                <Link
                  href="/demo"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-body-lg font-medium border transition-colors mt-2 ${
                    isLight
                      ? "text-[#4B5563] border-[#D1D5DB] hover:border-[#111827]"
                      : "text-white/70 border-white/20 hover:border-white/40"
                  }`}
                >
                  Request Demo
                </Link>
                <div
                  className={`h-px my-3 ${isLight ? "bg-[#E5E7EB]" : "bg-white/[0.06]"}`}
                />
                {["Platform", "Resources", "Modules", "About", "Contact"].map(
                  (label) => (
                    <Link
                      key={label}
                      href={`/${label.toLowerCase()}`}
                      onClick={() => setMobileOpen(false)}
                      className={`px-4 py-3 rounded-lg text-body-lg transition-colors ${
                        isLight
                          ? "text-[#4B5563] hover:text-[#111827] hover:bg-[#F1F3F5]"
                          : "text-white/70 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {label}
                    </Link>
                  ),
                )}
                <div
                  className={`h-px my-3 ${isLight ? "bg-[#E5E7EB]" : "bg-white/[0.06]"}`}
                />
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className={`flex-1 text-center px-4 py-2.5 rounded-lg text-body border transition-colors ${
                      isLight
                        ? "text-[#4B5563] border-[#E5E7EB] hover:border-[#D1D5DB]"
                        : "text-white/70 border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className={`flex-1 text-center px-4 py-2.5 rounded-lg text-body transition-colors ${
                      isLight
                        ? "text-[#111827] bg-[#F1F3F5] hover:bg-[#E9ECEF]"
                        : "text-white bg-white/[0.08] hover:bg-white/[0.12]"
                    }`}
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
