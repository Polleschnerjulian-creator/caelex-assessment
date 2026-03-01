"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Menu, X } from "lucide-react";

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  return (
    <>
      <motion.nav
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="dark-section fixed top-0 left-0 right-0 z-50"
        aria-label="Main navigation"
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Liquid Glass Bar — wraps logo + nav */}
            <div
              className={`flex items-center justify-between w-full rounded-xl px-5 py-2.5 transition-all duration-700 ${
                scrolled || mobileOpen
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
                <Logo size={28} className="text-white" />
              </Link>

              {/* Right Side Navigation */}
              <div className="flex items-center gap-6">
                {/* Links */}
                <Link
                  href="/platform"
                  className="hidden md:block text-body text-white/45 hover:text-white transition-colors duration-300"
                >
                  Platform
                </Link>
                <Link
                  href="/resources"
                  className="hidden md:block text-body text-white/45 hover:text-white transition-colors duration-300"
                >
                  Resources
                </Link>
                <Link
                  href="/modules"
                  className="hidden md:block text-body text-white/45 hover:text-white transition-colors duration-300"
                >
                  Modules
                </Link>
                <Link
                  href="/pricing"
                  className="hidden md:block text-body text-white/45 hover:text-white transition-colors duration-300"
                >
                  Pricing
                </Link>

                {/* Auth + CTAs */}
                <div className="hidden md:flex items-center gap-4">
                  <Link
                    href="/login"
                    className="text-body text-white/45 hover:text-white transition-colors duration-300"
                  >
                    Log in
                  </Link>
                  <Button href="/demo" variant="white-outline" size="sm">
                    Request Demo
                  </Button>
                  <Button href="/assessment" variant="white" size="sm">
                    Start Assessment
                  </Button>
                </div>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
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
      </motion.nav>

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
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Content */}
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="relative mt-20 mx-6 p-6 rounded-xl bg-dark-surface border border-white/[0.08]"
              role="navigation"
              aria-label="Mobile navigation"
            >
              <div className="flex flex-col gap-1">
                {/* Primary CTAs */}
                <Link
                  href="/assessment"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-black text-body-lg font-medium hover:bg-white/90 transition-colors"
                >
                  Start Assessment
                </Link>
                <Link
                  href="/demo"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white/70 text-body-lg font-medium border border-white/20 hover:border-white/40 transition-colors mt-2"
                >
                  Request Demo
                </Link>
                <div className="h-px bg-white/[0.06] my-3" />
                <Link
                  href="/platform"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-body-lg text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Platform
                </Link>
                <Link
                  href="/resources"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-body-lg text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Resources
                </Link>
                <Link
                  href="/modules"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-body-lg text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Modules
                </Link>
                <Link
                  href="/about"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-body-lg text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  About
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-body-lg text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-body-lg text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  Contact
                </Link>
                <div className="h-px bg-white/[0.06] my-3" />
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 rounded-lg text-body text-white/70 hover:text-white border border-white/[0.08] hover:border-white/20 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 rounded-lg text-body text-white bg-white/[0.08] hover:bg-white/[0.12] transition-colors"
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
